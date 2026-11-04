pub mod crypto;
pub mod platform;
pub mod storage;
pub mod commands;

use std::sync::{Arc, Mutex};
use storage::vault::{SafeVaultState, VaultStorage};
#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let vault = VaultStorage::new(app_dir.clone());
            let state: SafeVaultState = Arc::new(Mutex::new(vault));
            app.manage(state);

            let db = Arc::new(storage::db::Database::new(None, Some(app_dir)));
            let db_clone = db.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = db_clone.connect().await {
                    eprintln!("Initial cloud database connection failed: {}", e);
                }
            });
            app.manage(db);

            // Configure Native System Tray Menu on desktop platforms (Windows, macOS, Linux)
            #[cfg(desktop)]
            {
                let show_item = MenuItem::with_id(app, "show", "Open RYZ Auth", true, None::<&str>)?;
                let lock_item = MenuItem::with_id(app, "lock", "Lock Vault", true, None::<&str>)?;
                let quit_item = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;

                let tray_menu = Menu::with_items(app, &[&show_item, &lock_item, &quit_item])?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("RYZ Authenticator")
                    .menu(&tray_menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "lock" => {
                            if let Some(state) = app.try_state::<SafeVaultState>() {
                                if let Ok(mut vault) = state.lock() {
                                    vault.lock();
                                }
                            }
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_vault_status,
            commands::get_cloud_config,
            commands::save_cloud_config,
            commands::test_cloud_connection,
            commands::disconnect_cloud_db,
            commands::register_user,
            commands::login_user,
            commands::try_auto_login,
            commands::logout_user,
            commands::sync_vault_to_database,
            commands::sync_vault_from_database,
            commands::setup_master_password,
            commands::unlock_vault,
            commands::unlock_with_windows_hello,
            commands::lock_vault,
            commands::reset_vault,
            commands::get_active_codes,
            commands::add_account,
            commands::edit_account,
            commands::delete_account,
            commands::toggle_favorite,
            commands::assign_account_group,
            commands::get_vault_settings,
            commands::update_vault_settings,
            commands::export_encrypted_backup,
            commands::import_encrypted_backup,
            commands::export_vault_dialog,
            commands::import_vault_dialog,
            commands::import_google_migration_url,
            commands::clear_clipboard,
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::drag_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
