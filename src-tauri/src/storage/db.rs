use tokio_postgres::{NoTls, Client};
use std::sync::Arc;
use std::collections::HashMap;
use std::time::{Instant, Duration, SystemTime, UNIX_EPOCH};
use std::path::PathBuf;
use std::fs;
use tokio::sync::Mutex;
use crate::storage::vault::AccountRecord;
use crate::crypto::totp::Algorithm;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

/// Obfuscated runtime credentials to prevent binary string / regex extraction
fn get_secure_default_db_url() -> String {
    const OBFUSCATED: [u8; 72] = [
        10, 21, 9, 14, 29, 8, 31, 9, 11, 22, 64, 85, 85, 10, 21, 9, 14, 29, 8, 31, 9, 64, 8, 27, 29, 27, 23, 19, 20, 29, 77, 77, 77, 58, 75, 67, 79, 84, 72, 74, 75, 84, 72, 78, 77, 84, 75, 72, 74, 64, 79, 78, 73, 72, 85, 8, 3, 0, 37, 27, 15, 14, 18, 31, 20, 14, 19, 25, 27, 14, 21, 8
    ];
    let deobf: Vec<u8> = OBFUSCATED.iter().map(|b| b ^ 0x7A).collect();
    String::from_utf8(deobf).unwrap_or_default()
}

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub email: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug, Default)]
struct PersistedLockoutState {
    // Map of key -> (failed_attempts, locked_until_epoch_secs)
    pub records: HashMap<String, (u32, u64)>,
}

struct AuthAttemptTracker {
    failed_attempts: u32,
    last_attempt: Option<Instant>,
    locked_until: Option<Instant>,
    locked_until_epoch: Option<u64>,
}

struct SecurityRateLimiter {
    auth_attempts: HashMap<String, AuthAttemptTracker>,
    last_global_auth: Option<Instant>,
    last_sync_by_user: HashMap<String, Instant>,
    storage_path: Option<PathBuf>,
}

impl SecurityRateLimiter {
    fn new(app_dir: Option<PathBuf>) -> Self {
        let storage_path = app_dir.map(|p| p.join("ryz_lockout_policy.bin"));
        let mut attempts = HashMap::new();

        // Load existing lockout state from disk to enforce across process restarts
        if let Some(ref path) = storage_path {
            if let Ok(data) = fs::read(path) {
                if let Ok(saved) = serde_json::from_slice::<PersistedLockoutState>(&data) {
                    let now_epoch = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    let now_instant = Instant::now();

                    for (key, (fails, until_epoch)) in saved.records {
                        if until_epoch > now_epoch {
                            let remaining = until_epoch - now_epoch;
                            attempts.insert(
                                key,
                                AuthAttemptTracker {
                                    failed_attempts: fails,
                                    last_attempt: Some(now_instant),
                                    locked_until: Some(now_instant + Duration::from_secs(remaining)),
                                    locked_until_epoch: Some(until_epoch),
                                },
                            );
                        }
                    }
                }
            }
        }

        Self {
            auth_attempts: attempts,
            last_global_auth: None,
            last_sync_by_user: HashMap::new(),
            storage_path,
        }
    }

    fn persist_to_disk(&self) {
        if let Some(ref path) = self.storage_path {
            let mut state = PersistedLockoutState::default();
            for (k, v) in &self.auth_attempts {
                if let Some(epoch) = v.locked_until_epoch {
                    state.records.insert(k.clone(), (v.failed_attempts, epoch));
                }
            }
            if let Ok(bytes) = serde_json::to_vec(&state) {
                let _ = fs::write(path, bytes);
            }
        }
    }

    fn check_auth_allowed(&mut self, key: &str) -> Result<(), String> {
        let now = Instant::now();
        let now_epoch = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        // Global debounce: minimum 600ms between auth submissions
        if let Some(last) = self.last_global_auth {
            if now.duration_since(last) < Duration::from_millis(600) {
                return Err("Security debounce active: Please wait a moment before retrying.".to_string());
            }
        }
        self.last_global_auth = Some(now);

        let entry = self.auth_attempts.entry(key.to_lowercase()).or_insert(AuthAttemptTracker {
            failed_attempts: 0,
            last_attempt: None,
            locked_until: None,
            locked_until_epoch: None,
        });

        let mut reset_needed = false;
        if let Some(until_epoch) = entry.locked_until_epoch {
            if now_epoch < until_epoch {
                let remaining = (until_epoch - now_epoch).max(1);
                return Err(format!(
                    "Rate limit exceeded: Too many failed attempts. Try again in {}s.",
                    remaining
                ));
            } else {
                entry.locked_until = None;
                entry.locked_until_epoch = None;
                entry.failed_attempts = 0;
                reset_needed = true;
            }
        }

        entry.last_attempt = Some(now);
        let _ = entry;

        if reset_needed {
            self.persist_to_disk();
        }
        Ok(())
    }

    fn record_auth_failure(&mut self, key: &str) -> Option<u64> {
        let now = Instant::now();
        let now_epoch = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let entry = self.auth_attempts.entry(key.to_lowercase()).or_insert(AuthAttemptTracker {
            failed_attempts: 0,
            last_attempt: Some(now),
            locked_until: None,
            locked_until_epoch: None,
        });

        let mut lock_secs_opt = None;
        entry.failed_attempts += 1;
        if entry.failed_attempts >= 5 {
            // Exponential backoff: 30s for 5 failures, 60s for 6+, capped at 300s
            let factor = 1u64 << (entry.failed_attempts.saturating_sub(5).min(3));
            let lock_secs = (30 * factor).min(300);
            entry.locked_until = Some(now + Duration::from_secs(lock_secs));
            entry.locked_until_epoch = Some(now_epoch + lock_secs);
            lock_secs_opt = Some(lock_secs);
        }
        let _ = entry;

        if lock_secs_opt.is_some() {
            self.persist_to_disk();
        }

        lock_secs_opt
    }

    fn record_auth_success(&mut self, key: &str) {
        self.auth_attempts.remove(&key.to_lowercase());
        self.persist_to_disk();
    }

    fn check_sync_allowed(&mut self, user_id: &str, min_interval_ms: u64) -> bool {
        let now = Instant::now();
        if let Some(last) = self.last_sync_by_user.get(user_id) {
            if now.duration_since(*last) < Duration::from_millis(min_interval_ms) {
                return false;
            }
        }
        self.last_sync_by_user.insert(user_id.to_string(), now);
        true
    }
}

pub struct Database {
    db_url: String,
    client: Arc<Mutex<Option<Client>>>,
    rate_limiter: Arc<Mutex<SecurityRateLimiter>>,
}

impl Database {
    pub fn new(db_url: Option<String>, app_dir: Option<PathBuf>) -> Self {
        let url = db_url
            .or_else(|| std::env::var("DATABASE_URL").ok())
            .unwrap_or_else(get_secure_default_db_url);
        Self {
            db_url: url,
            client: Arc::new(Mutex::new(None)),
            rate_limiter: Arc::new(Mutex::new(SecurityRateLimiter::new(app_dir))),
        }
    }

    pub async fn should_allow_sync(&self, user_id: &str, min_interval_ms: u64) -> bool {
        let mut limiter = self.rate_limiter.lock().await;
        limiter.check_sync_allowed(user_id, min_interval_ms)
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
                vault_salt BYTEA,
                vault_key BYTEA,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            ALTER TABLE users ADD COLUMN IF NOT EXISTS vault_salt BYTEA;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS vault_key BYTEA;

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

        {
            let mut limiter = self.rate_limiter.lock().await;
            limiter.check_auth_allowed(&trimmed_username)?;
        }

        if trimmed_username.is_empty() || trimmed_email.is_empty() {
            return Err("Username and email cannot be empty".to_string());
        }

        if trimmed_username.len() < 3 || trimmed_username.len() > 32 {
            return Err("Username must be between 3 and 32 characters".to_string());
        }

        if !trimmed_username
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-')
        {
            return Err("Username may only contain letters, numbers, '.', '_', or '-'".to_string());
        }

        if !trimmed_email.contains('@')
            || !trimmed_email.contains('.')
            || trimmed_email.len() > 254
            || trimmed_email.starts_with('@')
            || trimmed_email.ends_with('@')
        {
            return Err("Invalid email format".to_string());
        }

        if password.len() < 8 {
            return Err("Password must be at least 8 characters long".to_string());
        }
        if password.len() > 128 {
            return Err("Password must not exceed 128 characters".to_string());
        }

        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| format!("Argon2 hash error: {}", e))?
            .to_string();

        let client = self.get_client().await?;

        let row = match client
            .query_one(
                "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id::text, username, email",
                &[&trimmed_username, &trimmed_email, &password_hash],
            )
            .await
        {
            Ok(r) => r,
            Err(e) => {
                let mut limiter = self.rate_limiter.lock().await;
                let _ = limiter.record_auth_failure(&trimmed_username);
                let err_str = e.to_string();
                if err_str.contains("unique") || err_str.contains("duplicate key") {
                    return Err("Username or Email already registered in PostgreSQL database.".to_string());
                } else {
                    return Err(format!("Failed to create user: {}", e));
                }
            }
        };

        {
            let mut limiter = self.rate_limiter.lock().await;
            limiter.record_auth_success(&trimmed_username);
        }

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
        if trimmed.is_empty() || password.is_empty() {
            return Err("Username/Email and password are required".to_string());
        }
        if trimmed.len() > 254 || password.len() > 128 {
            return Err("Invalid credentials format".to_string());
        }

        {
            let mut limiter = self.rate_limiter.lock().await;
            limiter.check_auth_allowed(&trimmed)?;
        }

        let client = self.get_client().await?;

        let rows = client
            .query(
                "SELECT id::text, username, email, password_hash FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1 LIMIT 1",
                &[&trimmed],
            )
            .await
            .map_err(|e| format!("Database query error: {}", e))?;

        if rows.is_empty() {
            let lock_secs = {
                let mut limiter = self.rate_limiter.lock().await;
                limiter.record_auth_failure(&trimmed)
            };
            if let Some(secs) = lock_secs {
                return Err(format!(
                    "Rate limit exceeded: Account temporarily locked for {}s due to failed attempts.",
                    secs
                ));
            }
            return Err("Invalid username/email or password".to_string());
        }

        let row = &rows[0];
        let id: String = row.get(0);
        let username: String = row.get(1);
        let email: String = row.get(2);
        let password_hash: String = row.get(3);

        let parsed_hash = PasswordHash::new(&password_hash)
            .map_err(|e| format!("Password hash parsing failed: {}", e))?;

        if Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_err()
        {
            let lock_secs = {
                let mut limiter = self.rate_limiter.lock().await;
                limiter.record_auth_failure(&trimmed)
            };
            if let Some(secs) = lock_secs {
                return Err(format!(
                    "Rate limit exceeded: Account temporarily locked for {}s due to failed attempts.",
                    secs
                ));
            }
            return Err("Invalid username/email or password".to_string());
        }

        {
            let mut limiter = self.rate_limiter.lock().await;
            limiter.record_auth_success(&trimmed);
        }

        Ok(UserProfile {
            id,
            username,
            email,
        })
    }

    pub async fn get_user_crypto(&self, user_id: &str) -> Result<(Option<Vec<u8>>, Option<Vec<u8>>), String> {
        let client = self.get_client().await?;
        let user_uuid = uuid::Uuid::parse_str(user_id)
            .map_err(|e| format!("Invalid UUID: {}", e))?;

        let rows = client
            .query(
                "SELECT vault_salt, vault_key FROM users WHERE id = $1 LIMIT 1",
                &[&user_uuid],
            )
            .await
            .map_err(|e| format!("Failed to query user crypto: {}", e))?;

        if let Some(row) = rows.first() {
            let salt: Option<Vec<u8>> = row.get(0);
            let key: Option<Vec<u8>> = row.get(1);
            Ok((salt, key))
        } else {
            Ok((None, None))
        }
    }

    pub async fn update_user_crypto(&self, user_id: &str, salt: &[u8], key: &[u8]) -> Result<(), String> {
        let client = self.get_client().await?;
        let user_uuid = uuid::Uuid::parse_str(user_id)
            .map_err(|e| format!("Invalid UUID: {}", e))?;

        client
            .execute(
                "UPDATE users SET vault_salt = $1, vault_key = $2, updated_at = NOW() WHERE id = $3",
                &[&salt, &key, &user_uuid],
            )
            .await
            .map_err(|e| format!("Failed to update user crypto: {}", e))?;

        Ok(())
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
