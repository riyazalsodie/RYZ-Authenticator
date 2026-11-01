#[cfg(windows)]
use windows::core::PCWSTR;
#[cfg(windows)]
use windows::Win32::System::Registry::{
    RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW, HKEY,
    HKEY_CURRENT_USER, KEY_READ, KEY_WRITE, REG_SZ,
};

#[cfg(windows)]
const RUN_SUBKEY: PCWSTR = windows::core::w!("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
#[cfg(windows)]
const APP_NAME: PCWSTR = windows::core::w!("RYZAuthenticator");

/// Checks if autostart is enabled in Windows Registry
pub fn is_autostart_enabled() -> bool {
    #[cfg(windows)]
    unsafe {
        let mut hkey: HKEY = HKEY::default();
        if RegOpenKeyExW(HKEY_CURRENT_USER, RUN_SUBKEY, 0, KEY_READ, &mut hkey).is_ok() {
            let mut data_len = 0u32;
            let result = RegQueryValueExW(
                hkey,
                APP_NAME,
                None,
                None,
                None,
                Some(&mut data_len),
            );
            let _ = RegCloseKey(hkey);
            result.is_ok() && data_len > 0
        } else {
            false
        }
    }
    #[cfg(not(windows))]
    false
}

/// Enables or disables autostart on Windows logon
pub fn set_autostart(_enable: bool) -> Result<(), String> {
    #[cfg(windows)]
    unsafe {
        let enable = _enable;
        let mut hkey: HKEY = HKEY::default();
        let open_res = RegOpenKeyExW(
            HKEY_CURRENT_USER,
            RUN_SUBKEY,
            0,
            KEY_READ | KEY_WRITE,
            &mut hkey,
        );
        if open_res.is_err() {
            return Err("Failed to open Windows Run registry key".to_string());
        }

        let res = if enable {
            let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let exe_str = current_exe.to_string_lossy();
            let mut wide_val: Vec<u16> = exe_str.encode_utf16().collect();
            wide_val.push(0); // Null terminator

            RegSetValueExW(
                hkey,
                APP_NAME,
                0,
                REG_SZ,
                Some(std::slice::from_raw_parts(
                    wide_val.as_ptr() as *const u8,
                    wide_val.len() * 2,
                )),
            )
        } else {
            RegDeleteValueW(hkey, APP_NAME)
        };

        let _ = RegCloseKey(hkey);
        if res.is_ok() {
            Ok(())
        } else {
            Err(format!("Registry operation failed with code: {:?}", res))
        }
    }

    #[cfg(not(windows))]
    Ok(())
}
