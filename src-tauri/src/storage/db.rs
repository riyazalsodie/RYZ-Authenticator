use tokio_postgres::{NoTls, Client};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::storage::vault::AccountRecord;
use crate::crypto::totp::Algorithm;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub const DEFAULT_DB_URL: &str = "host=127.0.0.1 user=postgres dbname=ryz_auth port=5432";

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub email: String,
}

pub struct Database {
    db_url: String,
    client: Arc<Mutex<Option<Client>>>,
}

impl Database {
    pub fn new(db_url: Option<String>) -> Self {
        let url = db_url
            .or_else(|| std::env::var("DATABASE_URL").ok())
            .unwrap_or_else(|| DEFAULT_DB_URL.to_string());
        Self {
            db_url: url,
            client: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn connect(&self) -> Result<(), String> {
        let (client, connection) = tokio_postgres::connect(&self.db_url, NoTls)
            .await
            .map_err(|e| format!("Failed to connect to PostgreSQL: {}", e))?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("PostgreSQL connection error: {}", e);
            }
        });

        // Ensure database tables exist
        self.init_schema(&client).await?;

        let mut lock = self.client.lock().await;
        *lock = Some(client);
        Ok(())
    }

    async fn init_schema(&self, client: &Client) -> Result<(), String> {
        let sql = r#"
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS vault_items (
                id VARCHAR(64) PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                issuer VARCHAR(255) NOT NULL,
                label VARCHAR(255) NOT NULL,
                encrypted_secret BYTEA NOT NULL,
                algorithm VARCHAR(16) NOT NULL,
                digits INT NOT NULL,
                period BIGINT NOT NULL,
                counter BIGINT NOT NULL,
                is_hotp BOOLEAN NOT NULL,
                is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
                group_id VARCHAR(64),
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
        "#;

        client
            .batch_execute(sql)
            .await
            .map_err(|e| format!("Database schema initialization error: {}", e))?;

        Ok(())
    }

    async fn get_client(&self) -> Result<Client, String> {
        {
            let lock = self.client.lock().await;
            if let Some(_) = &*lock {
                // To reuse without cloning non-cloneable Client, we can re-connect or hold client reference
            }
        }
        
        let (client, connection) = tokio_postgres::connect(&self.db_url, NoTls)
            .await
            .map_err(|e| format!("PostgreSQL connection failure: {}", e))?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Connection error: {}", e);
            }
        });

        Ok(client)
    }

    pub async fn create_user(
        &self,
        username: &str,
        email: &str,
        password: &str,
    ) -> Result<UserProfile, String> {
        let trimmed_username = username.trim().to_lowercase();
        let trimmed_email = email.trim().to_lowercase();

        if trimmed_username.is_empty() || trimmed_email.is_empty() {
            return Err("Username and email cannot be empty".to_string());
        }

        if !trimmed_email.contains('@') {
            return Err("Invalid email format".to_string());
        }

        if password.len() < 8 {
            return Err("Password must be at least 8 characters long".to_string());
        }

        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| format!("Argon2 hash error: {}", e))?
            .to_string();

        let client = self.get_client().await?;

        let row = client
            .query_one(
                "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id::text, username, email",
                &[&trimmed_username, &trimmed_email, &password_hash],
            )
            .await
            .map_err(|e| {
                let err_str = e.to_string();
                if err_str.contains("unique") || err_str.contains("duplicate key") {
                    "Username or Email already registered in PostgreSQL database.".to_string()
                } else {
                    format!("Failed to create user: {}", e)
                }
            })?;

        let id: String = row.get(0);
        let user: String = row.get(1);
        let mail: String = row.get(2);

        Ok(UserProfile {
            id,
            username: user,
            email: mail,
        })
    }

    pub async fn login_user(
        &self,
        identifier: &str,
        password: &str,
    ) -> Result<UserProfile, String> {
        let trimmed = identifier.trim().to_lowercase();
        let client = self.get_client().await?;

        let rows = client
            .query(
                "SELECT id::text, username, email, password_hash FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1 LIMIT 1",
                &[&trimmed],
            )
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if rows.is_empty() {
            return Err("Invalid username/email or password".to_string());
        }

        let row = &rows[0];
        let id: String = row.get(0);
        let username: String = row.get(1);
        let email: String = row.get(2);
        let password_hash: String = row.get(3);

        let parsed_hash = PasswordHash::new(&password_hash)
            .map_err(|e| format!("Password hash parsing failed: {}", e))?;

        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| "Invalid username/email or password".to_string())?;

        Ok(UserProfile {
            id,
            username,
            email,
        })
    }

    pub async fn load_vault_accounts(&self, user_id: &str) -> Result<Vec<AccountRecord>, String> {
        let client = self.get_client().await?;
        let user_uuid = uuid::Uuid::parse_str(user_id)
            .map_err(|e| format!("Invalid UUID: {}", e))?;

        let rows = client
            .query(
                "SELECT id, issuer, label, encrypted_secret, algorithm, digits, period, counter, is_hotp, is_favorite, group_id, created_at, updated_at FROM vault_items WHERE user_id = $1 ORDER BY created_at ASC",
                &[&user_uuid],
            )
            .await
            .map_err(|e| format!("Failed to fetch accounts from DB: {}", e))?;

        let mut accounts = Vec::new();
        for row in rows {
            let id: String = row.get(0);
            let issuer: String = row.get(1);
            let label: String = row.get(2);
            let encrypted_secret: Vec<u8> = row.get(3);
            let alg_str: String = row.get(4);
            let digits: i32 = row.get(5);
            let period: i64 = row.get(6);
            let counter: i64 = row.get(7);
            let is_hotp: bool = row.get(8);
            let is_favorite: bool = row.get(9);
            let group_id: Option<String> = row.get(10);
            let created_at: i64 = row.get(11);
            let updated_at: i64 = row.get(12);

            let algorithm = match alg_str.as_str() {
                "SHA256" => Algorithm::SHA256,
                "SHA512" => Algorithm::SHA512,
                _ => Algorithm::SHA1,
            };

            accounts.push(AccountRecord {
                id,
                issuer,
                label,
                encrypted_secret,
                algorithm,
                digits: digits as u32,
                period: period as u64,
                counter: counter as u64,
                is_hotp,
                is_favorite,
                group_id,
                created_at: created_at as u64,
                updated_at: updated_at as u64,
            });
        }

        Ok(accounts)
    }

    pub async fn save_vault_account(&self, user_id: &str, acc: &AccountRecord) -> Result<(), String> {
        let client = self.get_client().await?;
        let user_uuid = uuid::Uuid::parse_str(user_id)
            .map_err(|e| format!("Invalid UUID: {}", e))?;

        let alg_str = match acc.algorithm {
            Algorithm::SHA1 => "SHA1",
            Algorithm::SHA256 => "SHA256",
            Algorithm::SHA512 => "SHA512",
        };

        client
            .execute(
                r#"
                INSERT INTO vault_items (
                    id, user_id, issuer, label, encrypted_secret, algorithm, digits, period, counter, is_hotp, is_favorite, group_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET
                    issuer = EXCLUDED.issuer,
                    label = EXCLUDED.label,
                    encrypted_secret = EXCLUDED.encrypted_secret,
                    algorithm = EXCLUDED.algorithm,
                    digits = EXCLUDED.digits,
                    period = EXCLUDED.period,
                    counter = EXCLUDED.counter,
                    is_hotp = EXCLUDED.is_hotp,
                    is_favorite = EXCLUDED.is_favorite,
                    group_id = EXCLUDED.group_id,
                    updated_at = EXCLUDED.updated_at
                "#,
                &[
                    &acc.id,
                    &user_uuid,
                    &acc.issuer,
                    &acc.label,
                    &acc.encrypted_secret,
                    &alg_str,
                    &(acc.digits as i32),
                    &(acc.period as i64),
                    &(acc.counter as i64),
                    &acc.is_hotp,
                    &acc.is_favorite,
                    &acc.group_id,
                    &(acc.created_at as i64),
                    &(acc.updated_at as i64),
                ],
            )
            .await
            .map_err(|e| format!("Failed to save account to PostgreSQL: {}", e))?;

        Ok(())
    }

    pub async fn delete_vault_account(&self, user_id: &str, account_id: &str) -> Result<(), String> {
        let client = self.get_client().await?;
        let user_uuid = uuid::Uuid::parse_str(user_id)
            .map_err(|e| format!("Invalid UUID: {}", e))?;

        client
            .execute(
                "DELETE FROM vault_items WHERE id = $1 AND user_id = $2",
                &[&account_id, &user_uuid],
            )
            .await
            .map_err(|e| format!("Failed to delete account from PostgreSQL: {}", e))?;

        Ok(())
    }
}
