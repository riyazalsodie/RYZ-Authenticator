use crate::crypto::cipher::{decrypt_envelope, encrypt_envelope};
use crate::crypto::kdf::{derive_master_key, generate_salt};
use crate::crypto::totp::{Algorithm, OtpEngine, TotpConfig};

use crate::platform::dpapi::{dpapi_protect, dpapi_unprotect};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use zeroize::Zeroize;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountRecord {
    pub id: String,
    pub issuer: String,
    pub label: String,
    pub encrypted_secret: Vec<u8>,
    pub algorithm: Algorithm,
    pub digits: u32,
    pub period: u64,
    pub counter: u64,
    pub is_hotp: bool,
    pub is_favorite: bool,
    pub group_id: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultSettings {
    pub autostart: bool,
    pub minimize_to_tray: bool,
    pub close_to_tray: bool,
    pub auto_lock_minutes: u32,
    pub clipboard_clear_seconds: u32,
}

impl Default for VaultSettings {
    fn default() -> Self {
        Self {
            autostart: false,
            minimize_to_tray: true,
            close_to_tray: true,
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultHeader {
    pub version: u32,
    pub salt: Vec<u8>,
    pub dpapi_wrapped_verifier: Option<Vec<u8>>,
    pub accounts: Vec<AccountRecord>,
    pub settings: Option<VaultSettings>,
    #[serde(default)]
    pub user: Option<crate::storage::db::UserProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankLevelBackupEnvelope {
    pub magic: String,
    pub kdf: String,
    pub cipher: String,
    pub salt: Vec<u8>,
    pub envelope: Vec<u8>,
}

#[derive(Default)]
pub struct VaultStorage {
    pub vault_file: PathBuf,
    pub master_key: Option<[u8; 32]>,
    pub header: Option<VaultHeader>,
    pub is_unlocked: bool,
    pub current_user: Option<crate::storage::db::UserProfile>,
}

impl VaultStorage {
    pub fn new(app_dir: PathBuf) -> Self {
        let vault_file = app_dir.join("ryz_vault.bin");
        let cached_user = fs::read(&vault_file)
            .ok()
            .and_then(|raw| serde_json::from_slice::<VaultHeader>(&raw).ok())
            .and_then(|h| h.user);
        Self {
            vault_file,
            master_key: None,
            header: None,
            is_unlocked: false,
            current_user: cached_user,
        }
    }


    /// Checks if a vault file exists on disk
    pub fn vault_exists(&self) -> bool {
        self.vault_file.exists()
    }

    /// Initializes a brand new vault with master password
    pub fn initialize_new_vault(&mut self, password: &str) -> Result<(), String> {
        self.initialize_new_vault_with_salt(password, None)
    }

    /// Initializes a vault with master password and optional pre-existing cloud salt
    pub fn initialize_new_vault_with_salt(
        &mut self,
        password: &str,
        custom_salt: Option<Vec<u8>>,
    ) -> Result<(), String> {
        let salt_vec = custom_salt.unwrap_or_else(|| generate_salt().to_vec());
        let derived = derive_master_key(password, &salt_vec)?;

        // Wrap master verification token with DPAPI for fast biometric/local unlocking
        let dpapi_wrapped = dpapi_protect(&derived.0).ok();

        let existing_accounts = self
            .header
            .as_ref()
            .map(|h| h.accounts.clone())
            .unwrap_or_default();
        let existing_settings = self
            .header
            .as_ref()
            .and_then(|h| h.settings.clone())
            .or_else(|| Some(VaultSettings::default()));

        let header = VaultHeader {
            version: 1,
            salt: salt_vec,
            dpapi_wrapped_verifier: dpapi_wrapped,
            accounts: existing_accounts,
            settings: existing_settings,
            user: self.current_user.clone(),
        };

        self.master_key = Some(derived.0);
        self.header = Some(header);
        self.is_unlocked = true;

        self.save_to_disk()
    }

    /// Unlocks vault via master password
    pub fn unlock_with_password(&mut self, password: &str) -> Result<(), String> {
        if !self.vault_exists() {
            return Err("Vault file does not exist".to_string());
        }

        let raw = fs::read(&self.vault_file)
            .map_err(|e| format!("Failed to read vault: {}", e))?;

        let header: VaultHeader = serde_json::from_slice(&raw)
            .map_err(|e| format!("Failed to parse vault format: {}", e))?;

        let derived = derive_master_key(password, &header.salt)?;

        if self.current_user.is_none() {
            self.current_user = header.user.clone();
        }
        self.master_key = Some(derived.0);
        self.header = Some(header);
        self.is_unlocked = true;

        Ok(())
    }

    /// Synchronizes local vault salt and master key with cloud salt/key, re-encrypting any local-only records
    pub fn sync_crypto_with_cloud(
        &mut self,
        password: &str,
        cloud_salt: Option<&[u8]>,
        cloud_key: Option<&[u8]>,
    ) -> Result<(), String> {
        let target_salt = cloud_salt
            .map(|s| s.to_vec())
            .or_else(|| self.header.as_ref().map(|h| h.salt.clone()))
            .unwrap_or_else(|| generate_salt().to_vec());

        let new_key_bytes: [u8; 32] = if let Some(ck) = cloud_key {
            if ck.len() == 32 {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(ck);
                arr
            } else {
                derive_master_key(password, &target_salt)?.0
            }
        } else {
            derive_master_key(password, &target_salt)?.0
        };

        let old_key = self.master_key;

        if let Some(header) = self.header.as_mut() {
            let mut valid_accounts = Vec::new();
            for mut acc in header.accounts.drain(..) {
                if decrypt_envelope(&new_key_bytes, &acc.encrypted_secret).is_ok() {
                    valid_accounts.push(acc);
                } else if let Some(ref ok) = old_key {
                    if let Ok(plain) = decrypt_envelope(ok, &acc.encrypted_secret) {
                        if let Ok(re_enc) = encrypt_envelope(&new_key_bytes, &plain.0) {
                            acc.encrypted_secret = re_enc;
                            valid_accounts.push(acc);
                        }
                    }
                }
            }
            header.accounts = valid_accounts;
            header.salt = target_salt;
            header.dpapi_wrapped_verifier = dpapi_protect(&new_key_bytes).ok();
        }

        self.master_key = Some(new_key_bytes);
        self.is_unlocked = true;
        self.save_to_disk()
    }

    /// Unlocks vault automatically via Windows DPAPI local credentials
    pub fn unlock_with_dpapi(&mut self) -> Result<(), String> {
        if !self.vault_exists() {
            return Err("Vault file does not exist".to_string());
        }

        let raw = fs::read(&self.vault_file)
            .map_err(|e| format!("Failed to read vault: {}", e))?;

        let header: VaultHeader = serde_json::from_slice(&raw)
            .map_err(|e| format!("Failed to parse vault format: {}", e))?;

        if let Some(wrapped) = &header.dpapi_wrapped_verifier {
            let unwrapped = dpapi_unprotect(wrapped)?;
            if unwrapped.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&unwrapped);
                if self.current_user.is_none() {
                    self.current_user = header.user.clone();
                }
                self.master_key = Some(key);
                self.header = Some(header);
                self.is_unlocked = true;
                return Ok(());
            }
        }

        Err("DPAPI credential unlock not configured or unavailable".to_string())
    }

    /// Locks vault and wipes cryptographic keys from memory
    pub fn lock(&mut self) {
        if let Some(mut key) = self.master_key.take() {
            key.zeroize();
        }
        self.is_unlocked = false;
    }

    /// Adds an account and encrypts its raw secret using XChaCha20-Poly1305
    pub fn add_account(
        &mut self,
        issuer: String,
        label: String,
        raw_base32_secret: &str,
        algorithm: Algorithm,
        digits: u32,
        period: u64,
        is_hotp: bool,
        group_id: Option<String>,
    ) -> Result<String, String> {
        let key = self.master_key.as_ref().ok_or("Vault is locked")?;

        // Validate that secret can be decoded
        let _ = OtpEngine::decode_secret(raw_base32_secret)?;

        let encrypted_secret = encrypt_envelope(key, raw_base32_secret.as_bytes())?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let record = AccountRecord {
            id: id.clone(),
            issuer,
            label,
            encrypted_secret,
            algorithm,
            digits,
            period,
            counter: 0,
            is_hotp,
            is_favorite: false,
            group_id,
            created_at: now,
            updated_at: now,
        };

        if let Some(header) = self.header.as_mut() {
            header.accounts.push(record);
        }

        self.save_to_disk()?;
        Ok(id)
    }

    /// Deletes an account
    pub fn delete_account(&mut self, id: &str) -> Result<(), String> {
        if let Some(header) = self.header.as_mut() {
            header.accounts.retain(|a| a.id != id);
            self.save_to_disk()?;
            Ok(())
        } else {
            Err("Vault not loaded".to_string())
        }
    }

    /// Edits an existing account's details and optionally rotates its secret
    pub fn edit_account(
        &mut self,
        id: &str,
        issuer: String,
        label: String,
        new_secret: Option<String>,
        algorithm: Option<Algorithm>,
        digits: Option<u32>,
        period: Option<u64>,
        group_id: Option<Option<String>>,
    ) -> Result<(), String> {
        let key = self.master_key.as_ref().ok_or("Vault is locked")?;
        let header = self.header.as_mut().ok_or("Vault not loaded")?;

        let acc = header
            .accounts
            .iter_mut()
            .find(|a| a.id == id)
            .ok_or_else(|| "Account not found".to_string())?;

        acc.issuer = issuer;
        acc.label = label;
        if let Some(alg) = algorithm {
            acc.algorithm = alg;
        }
        if let Some(d) = digits {
            acc.digits = d;
        }
        if let Some(p) = period {
            acc.period = p;
        }
        if let Some(grp) = group_id {
            acc.group_id = grp;
        }

        if let Some(secret) = new_secret {
            let trimmed = secret.trim();
            if !trimmed.is_empty() {
                let _ = OtpEngine::decode_secret(trimmed)?;
                acc.encrypted_secret = encrypt_envelope(key, trimmed.as_bytes())?;
            }
        }

        acc.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.save_to_disk()
    }

    /// Assigns an account to a group or clears it
    pub fn assign_account_group(&mut self, id: &str, group_id: Option<String>) -> Result<(), String> {
        let header = self.header.as_mut().ok_or("Vault not loaded")?;
        let acc = header
            .accounts
            .iter_mut()
            .find(|a| a.id == id)
            .ok_or_else(|| "Account not found".to_string())?;

        acc.group_id = group_id;
        acc.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.save_to_disk()
    }

    /// Toggles account favorite status
    pub fn toggle_favorite(&mut self, id: &str) -> Result<bool, String> {
        if let Some(header) = self.header.as_mut() {
            if let Some(acc) = header.accounts.iter_mut().find(|a| a.id == id) {
                acc.is_favorite = !acc.is_favorite;
                let new_val = acc.is_favorite;
                self.save_to_disk()?;
                return Ok(new_val);
            }
        }
        Err("Account not found".to_string())
    }

    /// Computes transient OTP codes for all active accounts without leaking secrets
    pub fn compute_active_codes(&self) -> Result<Vec<ActiveCodeDTO>, String> {
        let key = self.master_key.as_ref().ok_or("Vault is locked")?;
        let header = self.header.as_ref().ok_or("Vault not initialized")?;

        let mut results = Vec::new();

        for acc in &header.accounts {
            let Ok(decrypted) = decrypt_envelope(key, &acc.encrypted_secret) else {
                continue;
            };
            let Ok(secret_str) = std::str::from_utf8(&decrypted.0) else {
                continue;
            };

            let Ok(secret_buf) = OtpEngine::decode_secret(secret_str) else {
                continue;
            };
            let config = TotpConfig {
                algorithm: acc.algorithm,
                digits: acc.digits,
                period: acc.period,
            };

            let (code, remaining) = if acc.is_hotp {
                let Ok(c) = OtpEngine::compute_hotp(&secret_buf, acc.counter, &config) else {
                    continue;
                };
                (c, 0)
            } else {
                let Ok(res) = OtpEngine::compute_current_totp(&secret_buf, &config) else {
                    continue;
                };
                res
            };

            results.push(ActiveCodeDTO {
                id: acc.id.clone(),
                issuer: acc.issuer.clone(),
                label: acc.label.clone(),
                current_code: code,
                remaining_seconds: remaining,
                period: acc.period,
                digits: acc.digits,
                algorithm: acc.algorithm,
                is_favorite: acc.is_favorite,
                group_id: acc.group_id.clone(),
            });
        }

        Ok(results)
    }

    /// Retrieves current vault settings or default
    pub fn get_settings(&self) -> VaultSettings {
        self.header
            .as_ref()
            .and_then(|h| h.settings.clone())
            .unwrap_or_default()
    }

    /// Updates vault settings and persists to disk
    pub fn update_settings(&mut self, settings: VaultSettings) -> Result<(), String> {
        if let Some(header) = self.header.as_mut() {
            header.settings = Some(settings);
            self.save_to_disk()
        } else {
            Err("Vault not loaded".to_string())
        }
    }

    /// Exports vault as an encrypted JSON backup bundle
    pub fn export_encrypted_vault(&self) -> Result<String, String> {
        let key = self.master_key.as_ref().ok_or("Vault is locked. Unlock before exporting.")?;
        let header = self.header.as_ref().ok_or("Vault not loaded")?;

        // Bank-Level Zero-Knowledge Architecture:
        // Encrypt the entire account array (including all issuers, labels, algorithms, and secrets)
        // so NO plaintext metadata is visible to any forensic analyst or file sniffer.
        let plaintext_bytes = serde_json::to_vec(&header.accounts)
            .map_err(|e| format!("Serialization failure: {}", e))?;

        let envelope = encrypt_envelope(key, &plaintext_bytes)?;

        let backup = BankLevelBackupEnvelope {
            magic: "RYZ_VAULT_AEAD_V2".to_string(),
            kdf: "Argon2id-v13-m64MB-t3-p4".to_string(),
            cipher: "XChaCha20-Poly1305-256bit-AEAD".to_string(),
            salt: header.salt.clone(),
            envelope,
        };

        serde_json::to_string_pretty(&backup)
            .map_err(|e| format!("Export encoding failure: {}", e))
    }

    /// Imports accounts from an encrypted backup bundle matching current key
    pub fn import_encrypted_vault(&mut self, backup_json: &str) -> Result<usize, String> {
        let key = self.master_key.as_ref().ok_or("Vault is locked. Unlock before importing.")?;

        // Detect format: V2 Bank-Level Zero-Knowledge vs Legacy V1
        let imported_accounts: Vec<AccountRecord> = if let Ok(v2_pkg) = serde_json::from_str::<BankLevelBackupEnvelope>(backup_json) {
            if v2_pkg.magic != "RYZ_VAULT_AEAD_V2" {
                return Err("Unrecognized or tampered backup signature".to_string());
            }
            let decrypted = decrypt_envelope(key, &v2_pkg.envelope)
                .map_err(|_| "Decryption failed: incorrect master password or corrupted backup file.".to_string())?;
            serde_json::from_slice(&decrypted.0)
                .map_err(|e| format!("Corrupted accounts payload: {}", e))?
        } else if let Ok(v1_pkg) = serde_json::from_str::<VaultHeader>(backup_json) {
            // Legacy V1 fallback compatibility
            v1_pkg.accounts
        } else {
            return Err("Invalid or unparseable backup file format".to_string());
        };

        if let Some(header) = self.header.as_mut() {
            let mut count = 0;
            for acc in imported_accounts {
                if !header.accounts.iter().any(|a| a.id == acc.id) {
                    header.accounts.push(acc);
                    count += 1;
                }
            }
            self.save_to_disk()?;
            Ok(count)
        } else {
            Err("Vault not loaded".to_string())
        }
    }

    pub fn save_to_disk(&self) -> Result<(), String> {
        if let Some(header) = &self.header {
            if let Some(parent) = self.vault_file.parent() {
                let _ = fs::create_dir_all(parent);
            }
            let serialized = serde_json::to_vec_pretty(header)
                .map_err(|e| format!("Serialization failure: {}", e))?;
            fs::write(&self.vault_file, serialized)
                .map_err(|e| format!("Disk write failure: {}", e))?;
            Ok(())
        } else {
            Err("No active vault header to save".to_string())
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveCodeDTO {
    pub id: String,
    pub issuer: String,
    pub label: String,
    pub current_code: String,
    pub remaining_seconds: u64,
    pub period: u64,
    pub digits: u32,
    pub algorithm: Algorithm,
    pub is_favorite: bool,
    pub group_id: Option<String>,
}

pub type SafeVaultState = Arc<Mutex<VaultStorage>>;
