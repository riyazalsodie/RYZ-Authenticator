use std::fs;
use std::path::PathBuf;
use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

#[cfg(windows)]
use windows::core::PCWSTR;
#[cfg(windows)]
use windows::Win32::Foundation::{LocalFree, HLOCAL};
#[cfg(windows)]
use windows::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
};
#[cfg(windows)]
use windows::Win32::System::Registry::{RegGetValueA, HKEY_LOCAL_MACHINE, RRF_RT_REG_SZ};

#[cfg(not(windows))]
use crate::crypto::cipher::{encrypt_envelope, decrypt_envelope};
#[cfg(not(windows))]
use crate::crypto::kdf::derive_master_key;

#[derive(Serialize, Deserialize, Zeroize)]
#[zeroize(drop)]
pub struct RememberedSession {
    pub identifier: String,
    pub password: String,
    pub created_at: i64,
}

/// Generates machine-bound hardware entropy combining system identifiers
/// so the encrypted session cannot be decrypted on another machine.
fn get_device_entropy() -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(b"RYZ_AUTH_HARDWARE_ENTROPY_V2_ANTI_STEAL");

    #[cfg(windows)]
    {
        // Read MachineGuid from Windows registry
        let mut buf = [0u8; 128];
        let mut len = buf.len() as u32;
        unsafe {
            let subkey = windows::core::s!(r"SOFTWARE\Microsoft\Cryptography");
            let val_name = windows::core::s!("MachineGuid");
            let res = RegGetValueA(
                HKEY_LOCAL_MACHINE,
                subkey,
                val_name,
                RRF_RT_REG_SZ,
                None,
                Some(buf.as_mut_ptr() as *mut _),
                Some(&mut len),
            );
            if res.is_ok() && len > 0 {
                hasher.update(&buf[..len as usize]);
            }
        }
        if let Ok(cname) = std::env::var("COMPUTERNAME") {
            hasher.update(cname.as_bytes());
        }
        if let Ok(uname) = std::env::var("USERNAME") {
            hasher.update(uname.as_bytes());
        }
        if let Ok(windir) = std::env::var("WINDIR") {
            hasher.update(windir.as_bytes());
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS: Query IOPlatformUUID or machine hostname
        if let Ok(content) = std::fs::read_to_string("/Library/Preferences/com.apple.windowserver.plist") {
            hasher.update(content.as_bytes());
        }
        if let Ok(user) = std::env::var("USER") {
            hasher.update(user.as_bytes());
        }
        if let Ok(home) = std::env::var("HOME") {
            hasher.update(home.as_bytes());
        }
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux: Query system machine-id
        if let Ok(mid) = std::fs::read_to_string("/etc/machine-id") {
            hasher.update(mid.trim().as_bytes());
        } else if let Ok(mid) = std::fs::read_to_string("/var/lib/dbus/machine-id") {
            hasher.update(mid.trim().as_bytes());
        }
        if let Ok(user) = std::env::var("USER") {
            hasher.update(user.as_bytes());
        }
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        if let Ok(user) = std::env::var("USER") {
            hasher.update(user.as_bytes());
        }
        if let Ok(home) = std::env::var("HOME") {
            hasher.update(home.as_bytes());
        }
    }

    hasher.finalize().to_vec()
}

/// Encrypts data using Windows Data Protection API (DPAPI) on Windows,
/// or hardware-entropy derived XChaCha20-Poly1305 on macOS / Linux / Mobile.
#[cfg(windows)]
pub fn protect_bytes(data: &[u8]) -> Result<Vec<u8>, String> {
    let entropy = get_device_entropy();

    let data_in = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut u8,
    };

    let entropy_blob = CRYPT_INTEGER_BLOB {
        cbData: entropy.len() as u32,
        pbData: entropy.as_ptr() as *mut u8,
    };

    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    let desc: Vec<u16> = "RYZ_AUTH_SECURE_SESSION\0".encode_utf16().collect();

    unsafe {
        let res = CryptProtectData(
            &data_in,
            PCWSTR::from_raw(desc.as_ptr()),
            Some(&entropy_blob),
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut data_out,
        );

        if res.is_err() {
            return Err("DPAPI hardware protection failed".to_string());
        }

        let slice = std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize);
        let result = slice.to_vec();
        let _ = LocalFree(HLOCAL(data_out.pbData as _));
        Ok(result)
    }
}

#[cfg(not(windows))]
pub fn protect_bytes(data: &[u8]) -> Result<Vec<u8>, String> {
    let entropy = get_device_entropy();
    let salt = b"RYZ_DEVICE_SALT_V1_KEY_BIND";
    let hex_entropy = data_encoding::HEXLOWER.encode(&entropy);
    let derived = derive_master_key(&hex_entropy, salt)?;
    encrypt_envelope(&derived.0, data)
}

/// Decrypts data using Windows Data Protection API (DPAPI) on Windows,
/// or hardware-entropy derived XChaCha20-Poly1305 on macOS / Linux / Mobile.
#[cfg(windows)]
pub fn unprotect_bytes(encrypted: &[u8]) -> Result<Vec<u8>, String> {
    let entropy = get_device_entropy();

    let data_in = CRYPT_INTEGER_BLOB {
        cbData: encrypted.len() as u32,
        pbData: encrypted.as_ptr() as *mut u8,
    };

    let entropy_blob = CRYPT_INTEGER_BLOB {
        cbData: entropy.len() as u32,
        pbData: entropy.as_ptr() as *mut u8,
    };

    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    unsafe {
        let res = CryptUnprotectData(
            &data_in,
            None,
            Some(&entropy_blob),
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut data_out,
        );

        if res.is_err() {
            return Err("DPAPI decryption failed: session invalid, expired, or attempted replay from another machine".to_string());
        }

        let slice = std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize);
        let result = slice.to_vec();
        let _ = LocalFree(HLOCAL(data_out.pbData as _));
        Ok(result)
    }
}

#[cfg(not(windows))]
pub fn unprotect_bytes(encrypted: &[u8]) -> Result<Vec<u8>, String> {
    let entropy = get_device_entropy();
    let salt = b"RYZ_DEVICE_SALT_V1_KEY_BIND";
    let hex_entropy = data_encoding::HEXLOWER.encode(&entropy);
    let derived = derive_master_key(&hex_entropy, salt)?;
    let plaintext = decrypt_envelope(&derived.0, encrypted)?;
    Ok(plaintext.0.clone())
}

/// Returns the cross-platform path to the encrypted persistent session file.
/// - Windows: %LOCALAPPDATA%/RYZ Authenticator/secure_session.dat
/// - macOS: ~/Library/Application Support/RYZ Authenticator/secure_session.dat
/// - Linux: ~/.local/share/ryz-authenticator/secure_session.dat
fn get_session_file_path() -> Result<PathBuf, String> {
    #[cfg(windows)]
    {
        let local_app_data = std::env::var("LOCALAPPDATA")
            .or_else(|_| std::env::var("APPDATA"))
            .map_err(|_| "Could not determine LOCALAPPDATA directory".to_string())?;

        let mut dir = PathBuf::from(local_app_data);
        dir.push("RYZ Authenticator");
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
        dir.push("secure_session.dat");
        Ok(dir)
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "Could not resolve HOME directory".to_string())?;
        let mut dir = PathBuf::from(home);
        dir.push("Library");
        dir.push("Application Support");
        dir.push("RYZ Authenticator");
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
        dir.push("secure_session.dat");
        Ok(dir)
    }

    #[cfg(target_os = "android")]
    {
        let mut dir = PathBuf::from("/data/data/com.ryz.auth/files");
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
        dir.push("secure_session.dat");
        Ok(dir)
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "android")))]
    {
        let base = if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
            PathBuf::from(xdg)
        } else if let Ok(home) = std::env::var("HOME") {
            let mut p = PathBuf::from(home);
            p.push(".local");
            p.push("share");
            p
        } else {
            PathBuf::from(".")
        };

        let mut dir = base;
        dir.push("ryz-authenticator");
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
        dir.push("secure_session.dat");
        Ok(dir)
    }
}

/// Saves the remembered session using hardware entropy isolation.
/// Zero cookies or browser tokens are used.
pub fn save_remembered_session(identifier: &str, password: &str) -> Result<(), String> {
    let session = RememberedSession {
        identifier: identifier.to_string(),
        password: password.to_string(),
        created_at: chrono::Utc::now().timestamp(),
    };

    let json_bytes = serde_json::to_vec(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;

    let protected = protect_bytes(&json_bytes)?;

    let path = get_session_file_path()?;
    fs::write(&path, protected).map_err(|e| format!("Failed to write secure session file: {}", e))?;

    Ok(())
}

/// Loads and decrypts the remembered session if it exists.
pub fn load_remembered_session() -> Result<Option<RememberedSession>, String> {
    let path = get_session_file_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let encrypted = fs::read(&path).map_err(|e| format!("Failed to read secure session file: {}", e))?;
    let decrypted = match unprotect_bytes(&encrypted) {
        Ok(d) => d,
        Err(_) => {
            // Anti-tamper: If decryption fails (e.g. copied to another machine or modified), destroy file immediately
            let _ = fs::remove_file(&path);
            return Ok(None);
        }
    };

    let session: RememberedSession = match serde_json::from_slice(&decrypted) {
        Ok(s) => s,
        Err(_) => {
            let _ = fs::remove_file(&path);
            return Ok(None);
        }
    };

    Ok(Some(session))
}

/// Securely clears and deletes the remembered session file on logout or unticking remember-me.
pub fn clear_remembered_session() {
    if let Ok(path) = get_session_file_path() {
        if path.exists() {
            // Overwrite with zeroes before unlinking to prevent file carving
            if let Ok(meta) = fs::metadata(&path) {
                let zeroes = vec![0u8; meta.len() as usize];
                let _ = fs::write(&path, zeroes);
            }
            let _ = fs::remove_file(&path);
        }
    }
}

/// Securely persists arbitrary configuration (e.g. user cloud database URL)
/// using OS-level hardware-bound DPAPI/envelope encryption.
pub fn save_encrypted_config(name: &str, data: &[u8]) -> Result<(), String> {
    let base_path = get_session_file_path()?;
    let dir = base_path.parent().ok_or_else(|| "Invalid storage path".to_string())?;
    let target = dir.join(format!("{}.dat", name));
    let protected = protect_bytes(data)?;
    fs::write(&target, protected).map_err(|e| format!("Failed to write encrypted config {}: {}", name, e))?;
    Ok(())
}

/// Loads and decrypts previously saved hardware-bound configuration.
pub fn load_encrypted_config(name: &str) -> Option<Vec<u8>> {
    let base_path = get_session_file_path().ok()?;
    let dir = base_path.parent()?;
    let target = dir.join(format!("{}.dat", name));
    if !target.exists() {
        return None;
    }
    let encrypted = fs::read(&target).ok()?;
    unprotect_bytes(&encrypted).ok()
}

/// Securely removes previously saved hardware-bound configuration.
pub fn clear_encrypted_config(name: &str) {
    if let Ok(base_path) = get_session_file_path() {
        if let Some(dir) = base_path.parent() {
            let target = dir.join(format!("{}.dat", name));
            if target.exists() {
                if let Ok(meta) = fs::metadata(&target) {
                    let zeroes = vec![0u8; meta.len() as usize];
                    let _ = fs::write(&target, zeroes);
                }
                let _ = fs::remove_file(&target);
            }
        }
    }
}
