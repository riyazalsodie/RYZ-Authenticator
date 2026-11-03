use crate::crypto::totp::Algorithm;
use crate::crypto::dpapi::{save_remembered_session, load_remembered_session, clear_remembered_session};
use crate::platform::autostart::{is_autostart_enabled, set_autostart};
use crate::storage::db::{Database, UserProfile};
use crate::storage::vault::{ActiveCodeDTO, SafeVaultState, VaultSettings};
use std::sync::Arc;
use tauri::State;

pub type SafeDatabaseState = Arc<Database>;

#[derive(serde::Serialize)]
pub struct VaultStatusResponse {
    pub exists: bool,
    pub is_unlocked: bool,
    pub user: Option<UserProfile>,
}

#[tauri::command]
pub fn check_vault_status(state: State<'_, SafeVaultState>) -> Result<VaultStatusResponse, String> {
    let vault = state.lock().map_err(|e| e.to_string())?;
    Ok(VaultStatusResponse {
        exists: vault.vault_exists() || vault.current_user.is_some(),
        is_unlocked: vault.is_unlocked,
        user: vault.current_user.clone(),
    })
}

#[tauri::command]
pub async fn register_user(
    username: String,
    email: String,
    password: String,
    remember_me: Option<bool>,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<UserProfile, String> {
    let profile = db.create_user(&username, &email, &password).await?;

    let (crypto_to_upload, accounts_to_upload) = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        vault.current_user = Some(profile.clone());

        if vault.vault_exists() {
            if vault.unlock_with_password(&password).is_err() {
                let _ = vault.initialize_new_vault(&password);
            }
        } else {
            let _ = vault.initialize_new_vault(&password);
        }

        if let Some(header) = vault.header.as_mut() {
            header.user = Some(profile.clone());
        }
        let _ = vault.save_to_disk();

        let crypto = vault
            .header
            .as_ref()
            .zip(vault.master_key)
            .map(|(h, k)| (h.salt.clone(), k));
        let accs = vault
            .header
            .as_ref()
            .map(|h| h.accounts.clone())
            .unwrap_or_default();
        (crypto, accs)
    };

    if let Some((salt, key)) = crypto_to_upload {
        let _ = db.update_user_crypto(&profile.id, &salt, &key).await;
    }

    for acc in accounts_to_upload {
        let _ = db.save_vault_account(&profile.id, &acc).await;
    }

    if remember_me.unwrap_or(false) {
        let _ = save_remembered_session(&username, &password);
    } else {
        clear_remembered_session();
    }

    Ok(profile)
}

#[tauri::command]
pub async fn login_user(
    identifier: String,
    password: String,
    remember_me: Option<bool>,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<UserProfile, String> {
    let profile = db.login_user(&identifier, &password).await?;
    let (db_salt, db_key) = db.get_user_crypto(&profile.id).await.unwrap_or((None, None));
    let db_accounts = db.load_vault_accounts(&profile.id).await.unwrap_or_default();

    let (to_upload, crypto_to_upload) = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        vault.current_user = Some(profile.clone());

        if vault.vault_exists() {
            let _ = vault.unlock_with_password(&password);
        } else {
            let _ = vault.initialize_new_vault_with_salt(&password, db_salt.clone());
        }

        let _ = vault.sync_crypto_with_cloud(
            &password,
            db_salt.as_deref(),
            db_key.as_deref(),
        );

        let mut unuploaded = Vec::new();
        let mut local_crypto_for_cloud = None;
        let master_key_copy = vault.master_key;

        if let Some(header) = vault.header.as_mut() {
            header.user = Some(profile.clone());

            if (db_salt.is_none() || db_key.is_none()) && !header.salt.is_empty() {
                if let Some(k) = master_key_copy {
                    local_crypto_for_cloud = Some((header.salt.clone(), k));
                }
            }

            for acc in db_accounts.iter() {
                if let Some(existing) = header.accounts.iter_mut().find(|a| a.id == acc.id) {
                    if acc.updated_at > existing.updated_at {
                        *existing = acc.clone();
                    } else if existing.updated_at > acc.updated_at {
                        unuploaded.push(existing.clone());
                    }
                } else {
                    header.accounts.push(acc.clone());
                }
            }
            for acc in header.accounts.iter() {
                if !db_accounts.iter().any(|a| a.id == acc.id) {
                    unuploaded.push(acc.clone());
                }
            }
        }

        vault.is_unlocked = true;
        let _ = vault.save_to_disk();
        (unuploaded, local_crypto_for_cloud)
    };

    if let Some((salt, key)) = crypto_to_upload {
        let _ = db.update_user_crypto(&profile.id, &salt, &key).await;
    }

    for acc in to_upload {
        let _ = db.save_vault_account(&profile.id, &acc).await;
    }

    if remember_me.unwrap_or(false) {
        let _ = save_remembered_session(&identifier, &password);
    } else {
        clear_remembered_session();
    }

    Ok(profile)
}

#[tauri::command]
pub async fn try_auto_login(
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<Option<UserProfile>, String> {
    let session = match load_remembered_session() {
        Ok(Some(s)) => s,
        _ => return Ok(None),
    };

    match login_user(session.identifier.clone(), session.password.clone(), Some(true), db, state.clone()).await {
        Ok(profile) => Ok(Some(profile)),
        Err(_) => {
            // Offline fallback: if cloud DB is temporarily unreachable, unlock local vault with remembered session
            let mut vault = state.lock().map_err(|e| e.to_string())?;
            if vault.vault_exists() && vault.unlock_with_password(&session.password).is_ok() {
                return Ok(vault.current_user.clone());
            }
            Ok(None)
        }
    }
}


#[tauri::command]
pub async fn sync_vault_to_database(
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<usize, String> {
    let (user_id, accounts) = {
        let vault = state.lock().map_err(|e| e.to_string())?;
        let user = vault.current_user.as_ref().ok_or("User not logged in")?;
        let header = vault.header.as_ref().ok_or("Vault not initialized")?;
        (user.id.clone(), header.accounts.clone())
    };

    // Rate-limit / debounce rapid duplicate sync bursts within 800ms
    if !db.should_allow_sync(&format!("push:{}", user_id), 800).await {
        return Ok(accounts.len());
    }

    let count = accounts.len();
    for acc in &accounts {
        db.save_vault_account(&user_id, acc).await?;
    }

    Ok(count)
}

#[tauri::command]
pub async fn sync_vault_from_database(
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<usize, String> {
    let profile = {
        let vault = state.lock().map_err(|e| e.to_string())?;
        vault.current_user.clone()
    }.ok_or("User not logged in. Cloud synchronization requires an active authenticated session.")?;

    // Rate-limit / debounce rapid duplicate pull bursts within 800ms
    if !db.should_allow_sync(&format!("pull:{}", profile.id), 800).await {
        return Ok(0);
    }

    let (db_salt, db_key) = db.get_user_crypto(&profile.id).await.unwrap_or((None, None));
    let accounts = db.load_vault_accounts(&profile.id).await?;
    let mut count = 0;

    let mut vault = state.lock().map_err(|e| e.to_string())?;
    vault.current_user = Some(profile.clone());
    if let Some(ref ck) = db_key {
        if ck.len() == 32 {
            let _ = vault.sync_crypto_with_cloud("", db_salt.as_deref(), Some(ck));
        }
    }

    if let Some(header) = vault.header.as_mut() {
        header.user = Some(profile);
        for acc in accounts {
            if let Some(existing) = header.accounts.iter_mut().find(|a| a.id == acc.id) {
                if acc.updated_at > existing.updated_at {
                    *existing = acc;
                    count += 1;
                }
            } else {
                header.accounts.push(acc);
                count += 1;
            }
        }
    }
    let _ = vault.save_to_disk();

    Ok(count)
}

#[tauri::command]
pub fn logout_user(state: State<'_, SafeVaultState>) -> Result<(), String> {
    let mut vault = state.lock().map_err(|e| e.to_string())?;
    vault.lock();
    vault.current_user = None;
    if let Some(header) = vault.header.as_mut() {
        header.user = None;
    }
    let _ = vault.save_to_disk();
    clear_remembered_session();
    Ok(())
}

#[tauri::command]
pub fn setup_master_password(password: String, state: State<'_, SafeVaultState>) -> Result<(), String> {
    let mut vault = state.lock().map_err(|e| e.to_string())?;
    vault.initialize_new_vault(&password)
}

#[tauri::command]
pub fn unlock_vault(password: String, state: State<'_, SafeVaultState>) -> Result<(), String> {
    let mut vault = state.lock().map_err(|e| e.to_string())?;
    vault.unlock_with_password(&password)
}

#[tauri::command]
pub async fn unlock_with_windows_hello(
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<(), String> {
    let user_profile = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        if !vault.vault_exists() {
            return Err("No local vault found on this device. Please create or sign in with your master account first.".to_string());
        }
        vault.unlock_with_dpapi()?;
        vault.current_user.clone()
    };

    if let Some(profile) = user_profile {
        let (db_salt, db_key) = db.get_user_crypto(&profile.id).await.unwrap_or((None, None));
        if let Ok(db_accounts) = db.load_vault_accounts(&profile.id).await {
            let mut to_upload = Vec::new();
            {
                if let Ok(mut vault) = state.lock() {
                    vault.current_user = Some(profile.clone());
                    if let Some(ref ck) = db_key {
                        if ck.len() == 32 {
                            let _ = vault.sync_crypto_with_cloud("", db_salt.as_deref(), Some(ck));
                        }
                    }
                    if let Some(header) = vault.header.as_mut() {
                        header.user = Some(profile.clone());
                        let local_accounts = header.accounts.clone();
                        for acc in db_accounts.iter() {
                            if let Some(existing) = header.accounts.iter_mut().find(|a| a.id == acc.id) {
                                if acc.updated_at > existing.updated_at {
                                    *existing = acc.clone();
                                } else if existing.updated_at > acc.updated_at {
                                    to_upload.push(existing.clone());
                                }
                            } else {
                                header.accounts.push(acc.clone());
                            }
                        }
                        for acc in local_accounts.iter() {
                            if !db_accounts.iter().any(|a| a.id == acc.id) {
                                to_upload.push(acc.clone());
                            }
                        }
                    }
                    let _ = vault.save_to_disk();
                }
            }
            for acc in to_upload {
                let _ = db.save_vault_account(&profile.id, &acc).await;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn clear_clipboard(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text("").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn lock_vault(state: State<'_, SafeVaultState>) -> Result<(), String> {
    let mut vault = state.lock().map_err(|e| e.to_string())?;
    vault.lock();
    Ok(())
}

#[tauri::command]
pub fn reset_vault(state: State<'_, SafeVaultState>) -> Result<(), String> {
    let mut vault = state.lock().map_err(|e| e.to_string())?;
    if vault.vault_file.exists() {
        let _ = std::fs::remove_file(&vault.vault_file);
    }
    vault.header = None;
    vault.master_key = None;
    vault.is_unlocked = false;
    vault.current_user = None;
    Ok(())
}

#[tauri::command]
pub fn get_active_codes(state: State<'_, SafeVaultState>) -> Result<Vec<ActiveCodeDTO>, String> {
    let vault = state.lock().map_err(|e| e.to_string())?;
    vault.compute_active_codes()
}

#[tauri::command]
pub async fn add_account(
    issuer: String,
    label: String,
    secret: String,
    algorithm: Option<Algorithm>,
    digits: Option<u32>,
    period: Option<u64>,
    is_hotp: Option<bool>,
    group_id: Option<String>,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<String, String> {
    let (id, user_id, acc_clone) = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        let id = vault.add_account(
            issuer,
            label,
            &secret,
            algorithm.unwrap_or(Algorithm::SHA1),
            digits.unwrap_or(6),
            period.unwrap_or(30),
            is_hotp.unwrap_or(false),
            group_id,
        )?;

        let user_id = vault.current_user.as_ref().map(|u| u.id.clone());
        let acc = vault
            .header
            .as_ref()
            .and_then(|h| h.accounts.iter().find(|a| a.id == id).cloned());

        (id, user_id, acc)
    };

    // If user is authenticated to PostgreSQL, sync and upload record directly to database
    if let (Some(uid), Some(acc)) = (user_id, acc_clone) {
        let _ = db.save_vault_account(&uid, &acc).await;
    }

    Ok(id)
}

#[tauri::command]
pub async fn delete_account(
    id: String,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<(), String> {
    let user_id = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        vault.delete_account(&id)?;
        vault.current_user.as_ref().map(|u| u.id.clone())
    };

    if let Some(uid) = user_id {
        let _ = db.delete_vault_account(&uid, &id).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn edit_account(
    id: String,
    issuer: String,
    label: String,
    new_secret: Option<String>,
    algorithm: Option<Algorithm>,
    digits: Option<u32>,
    period: Option<u64>,
    group_id: Option<String>,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<(), String> {
    let (user_id, acc_clone) = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        vault.edit_account(
            &id,
            issuer,
            label,
            new_secret,
            algorithm,
            digits,
            period,
            Some(group_id),
        )?;

        let user_id = vault.current_user.as_ref().map(|u| u.id.clone());
        let acc = vault
            .header
            .as_ref()
            .and_then(|h| h.accounts.iter().find(|a| a.id == id).cloned());

        (user_id, acc)
    };

    if let (Some(uid), Some(acc)) = (user_id, acc_clone) {
        let _ = db.save_vault_account(&uid, &acc).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn assign_account_group(
    id: String,
    group_id: Option<String>,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<(), String> {
    let (user_id, acc_clone) = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        vault.assign_account_group(&id, group_id)?;
        let user_id = vault.current_user.as_ref().map(|u| u.id.clone());
        let acc = vault
            .header
            .as_ref()
            .and_then(|h| h.accounts.iter().find(|a| a.id == id).cloned());
        (user_id, acc)
    };

    if let (Some(uid), Some(acc)) = (user_id, acc_clone) {
        let _ = db.save_vault_account(&uid, &acc).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn toggle_favorite(
    id: String,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<bool, String> {
    let (fav, user_id, acc_clone) = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        let fav = vault.toggle_favorite(&id)?;
        let user_id = vault.current_user.as_ref().map(|u| u.id.clone());
        let acc = vault
            .header
            .as_ref()
            .and_then(|h| h.accounts.iter().find(|a| a.id == id).cloned());

        (fav, user_id, acc)
    };

    if let (Some(uid), Some(acc)) = (user_id, acc_clone) {
        let _ = db.save_vault_account(&uid, &acc).await;
    }

    Ok(fav)
}

#[tauri::command]
pub fn get_vault_settings(state: State<'_, SafeVaultState>) -> Result<VaultSettings, String> {
    let vault = state.lock().map_err(|e| e.to_string())?;
    let mut s = vault.get_settings();
    s.autostart = is_autostart_enabled();
    Ok(s)
}

#[tauri::command]
pub fn update_vault_settings(settings: VaultSettings, state: State<'_, SafeVaultState>) -> Result<(), String> {
    let _ = set_autostart(settings.autostart);
    let mut vault = state.lock().map_err(|e| e.to_string())?;
    vault.update_settings(settings)
}

#[tauri::command]
pub fn export_encrypted_backup(state: State<'_, SafeVaultState>) -> Result<String, String> {
    let vault = state.lock().map_err(|e| e.to_string())?;
    vault.export_encrypted_vault()
}

#[tauri::command]
pub fn import_encrypted_backup(backup_json: String, state: State<'_, SafeVaultState>) -> Result<usize, String> {
    let mut vault = state.lock().map_err(|e| e.to_string())?;
    vault.import_encrypted_vault(&backup_json)
}

#[tauri::command]
pub async fn export_vault_dialog(app: tauri::AppHandle, state: State<'_, SafeVaultState>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let backup_json = {
        let vault = state.lock().map_err(|e| e.to_string())?;
        vault.export_encrypted_vault()?
    };

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let default_name = format!("ryz_vault_backup_{}.ryzbackup", today);

    let file_path = app
        .dialog()
        .file()
        .set_title("Export Encrypted RYZ Vault")
        .set_file_name(&default_name)
        .add_filter("RYZ Backup (*.ryzbackup, *.json)", &["ryzbackup", "json"])
        .blocking_save_file();

    if let Some(path) = file_path {
        let dest = path.as_path().ok_or("Invalid destination path")?;
        std::fs::write(dest, backup_json.as_bytes())
            .map_err(|e| format!("Failed to save backup file: {}", e))?;
        Ok(Some(dest.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn import_vault_dialog(
    app: tauri::AppHandle,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<Option<usize>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .set_title("Import Encrypted RYZ Vault")
        .add_filter("RYZ Backup (*.ryzbackup, *.json, *.bin)", &["ryzbackup", "json", "bin"])
        .blocking_pick_file();

    if let Some(path) = file_path {
        let src = path.as_path().ok_or("Invalid source path")?;
        let content = std::fs::read_to_string(src)
            .map_err(|e| format!("Failed to read backup file: {}", e))?;
        
        let (count, user_id, accounts_to_sync) = {
            let mut vault = state.lock().map_err(|e| e.to_string())?;
            let count = vault.import_encrypted_vault(&content)?;
            let user_id = vault.current_user.as_ref().map(|u| u.id.clone());
            let accounts = vault.header.as_ref().map(|h| h.accounts.clone()).unwrap_or_default();
            (count, user_id, accounts)
        };

        if let Some(uid) = user_id {
            for acc in accounts_to_sync {
                let _ = db.save_vault_account(&uid, &acc).await;
            }
        }

        Ok(Some(count))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn minimize_window(window: tauri::Window) -> Result<(), String> {
    #[cfg(desktop)]
    {
        window.minimize().map_err(|e| e.to_string())
    }
    #[cfg(not(desktop))]
    {
        let _ = window;
        Ok(())
    }
}

#[tauri::command]
pub fn toggle_maximize_window(window: tauri::Window) -> Result<bool, String> {
    #[cfg(desktop)]
    {
        if window.is_maximized().unwrap_or(false) {
            window.unmaximize().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            window.maximize().map_err(|e| e.to_string())?;
            Ok(true)
        }
    }
    #[cfg(not(desktop))]
    {
        let _ = window;
        Ok(false)
    }
}

#[tauri::command]
pub fn close_window(window: tauri::Window, state: State<'_, SafeVaultState>) -> Result<(), String> {
    let close_to_tray = {
        let vault = state.lock().map_err(|e| e.to_string())?;
        vault.get_settings().close_to_tray
    };

    if close_to_tray {
        window.hide().map_err(|e| e.to_string())
    } else {
        window.close().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn drag_window(window: tauri::Window) -> Result<(), String> {
    #[cfg(desktop)]
    {
        window.start_dragging().map_err(|e| e.to_string())
    }
    #[cfg(not(desktop))]
    {
        let _ = window;
        Ok(())
    }
}

#[derive(serde::Deserialize)]
pub struct GoogleAuthImportPayload {
    pub url: String,
}

#[tauri::command]
pub async fn import_google_migration_url(
    payload: GoogleAuthImportPayload,
    db: State<'_, SafeDatabaseState>,
    state: State<'_, SafeVaultState>,
) -> Result<usize, String> {
    let raw_url = payload.url.trim();
    let data_b64 = if raw_url.contains("data=") {
        let parts: Vec<&str> = raw_url.split("data=").collect();
        let query_part = parts.get(1).ok_or("Invalid migration url")?;
        let clean = query_part.split('&').next().unwrap_or(query_part);
        // URL decode standard %xx
        urlencoding_decode(clean)?
    } else {
        raw_url.to_string()
    };

    let payload_bytes = data_encoding::BASE64
        .decode(data_b64.as_bytes())
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    let accounts = parse_google_migration_protobuf(&payload_bytes)?;
    if accounts.is_empty() {
        return Err("No accounts detected in migration payload".to_string());
    }

    let mut added_count = 0;
    let mut to_sync = Vec::new();
    let user_id = {
        let mut vault = state.lock().map_err(|e| e.to_string())?;
        let user_id = vault.current_user.as_ref().map(|u| u.id.clone());

        for acc in accounts {
            match vault.add_account(
                acc.issuer,
                acc.label,
                &acc.secret,
                acc.algorithm,
                acc.digits,
                acc.period,
                acc.is_hotp,
                None,
            ) {
                Ok(new_id) => {
                    added_count += 1;
                    if let (Some(ref uid), Some(header)) = (&user_id, &vault.header) {
                        if let Some(record) = header.accounts.iter().find(|a| a.id == new_id) {
                            to_sync.push((uid.clone(), record.clone()));
                        }
                    }
                }
                Err(e) => eprintln!("Skipped account import error: {}", e),
            }
        }
        user_id
    };

    if user_id.is_some() {
        for (uid, record) in to_sync {
            let _ = db.save_vault_account(&uid, &record).await;
        }
    }

    Ok(added_count)
}

struct ParsedOtp {
    issuer: String,
    label: String,
    secret: String,
    algorithm: Algorithm,
    digits: u32,
    period: u64,
    is_hotp: bool,
}

fn urlencoding_decode(input: &str) -> Result<String, String> {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let h1 = chars.next().ok_or("Incomplete percent hex")?;
            let h2 = chars.next().ok_or("Incomplete percent hex")?;
            let hex_str = format!("{}{}", h1, h2);
            let byte = u8::from_str_radix(&hex_str, 16).map_err(|_| "Invalid hex byte")?;
            out.push(byte as char);
        } else if c == '+' {
            out.push(' ');
        } else {
            out.push(c);
        }
    }
    Ok(out)
}

fn decode_varint(data: &[u8], offset: &mut usize) -> Result<u64, String> {
    let mut res: u64 = 0;
    let mut shift: u32 = 0;
    loop {
        if *offset >= data.len() {
            return Err("Unexpected EOF reading varint".into());
        }
        let b = data[*offset];
        *offset += 1;
        res |= ((b & 0x7F) as u64) << shift;
        if (b & 0x80) == 0 {
            break;
        }
        shift += 7;
        if shift > 64 {
            return Err("Varint overflow".into());
        }
    }
    Ok(res)
}

fn parse_google_migration_protobuf(payload: &[u8]) -> Result<Vec<ParsedOtp>, String> {
    let mut offset = 0;
    let mut accounts = Vec::new();

    while offset < payload.len() {
        let tag = decode_varint(payload, &mut offset)?;
        let field_num = tag >> 3;
        let wire_type = tag & 0x07;

        if field_num == 1 && wire_type == 2 {
            let length = decode_varint(payload, &mut offset)? as usize;
            if offset + length > payload.len() {
                return Err("Invalid protobuf message bounds".into());
            }
            let sub = &payload[offset..offset + length];
            offset += length;

            let mut sub_off = 0;
            let mut secret_bytes = Vec::new();
            let mut name = String::new();
            let mut issuer = String::new();
            let mut algo = 1u64;
            let mut digits = 1u64;
            let mut otype = 2u64;

            while sub_off < sub.len() {
                let stag = decode_varint(sub, &mut sub_off)?;
                let sfield = stag >> 3;
                let swire = stag & 0x07;

                match sfield {
                    1 => {
                        let slen = decode_varint(sub, &mut sub_off)? as usize;
                        if sub_off + slen > sub.len() {
                            break;
                        }
                        secret_bytes = sub[sub_off..sub_off + slen].to_vec();
                        sub_off += slen;
                    }
                    2 => {
                        let slen = decode_varint(sub, &mut sub_off)? as usize;
                        if sub_off + slen > sub.len() {
                            break;
                        }
                        name = String::from_utf8_lossy(&sub[sub_off..sub_off + slen]).to_string();
                        sub_off += slen;
                    }
                    3 => {
                        let slen = decode_varint(sub, &mut sub_off)? as usize;
                        if sub_off + slen > sub.len() {
                            break;
                        }
                        issuer = String::from_utf8_lossy(&sub[sub_off..sub_off + slen]).to_string();
                        sub_off += slen;
                    }
                    4 => {
                        algo = decode_varint(sub, &mut sub_off)?;
                    }
                    5 => {
                        digits = decode_varint(sub, &mut sub_off)?;
                    }
                    6 => {
                        otype = decode_varint(sub, &mut sub_off)?;
                    }
                    _ => {
                        if swire == 0 {
                            let _ = decode_varint(sub, &mut sub_off)?;
                        } else if swire == 2 {
                            let skip = decode_varint(sub, &mut sub_off)? as usize;
                            sub_off += skip;
                        }
                    }
                }
            }

            if !secret_bytes.is_empty() {
                let secret_b32 = data_encoding::BASE32_NOPAD.encode(&secret_bytes);
                let algorithm = match algo {
                    2 => Algorithm::SHA256,
                    3 => Algorithm::SHA512,
                    _ => Algorithm::SHA1,
                };
                let digit_val = if digits == 2 { 8 } else { 6 };
                let is_hotp = otype == 1;

                let (final_issuer, final_label) = if !issuer.is_empty() {
                    (issuer, name)
                } else if name.contains(':') {
                    let parts: Vec<&str> = name.splitn(2, ':').collect();
                    (parts[0].trim().to_string(), parts[1].trim().to_string())
                } else if name.contains(" - ") {
                    let parts: Vec<&str> = name.splitn(2, " - ").collect();
                    (parts[0].trim().to_string(), parts[1].trim().to_string())
                } else {
                    let label = name.clone();
                    (name, label)
                };

                accounts.push(ParsedOtp {
                    issuer: final_issuer,
                    label: final_label,
                    secret: secret_b32,
                    algorithm,
                    digits: digit_val,
                    period: 30,
                    is_hotp,
                });
            }
        } else if wire_type == 0 {
            let _ = decode_varint(payload, &mut offset)?;
        } else if wire_type == 2 {
            let skip = decode_varint(payload, &mut offset)? as usize;
            offset += skip;
        } else {
            break;
        }
    }

    Ok(accounts)
}
