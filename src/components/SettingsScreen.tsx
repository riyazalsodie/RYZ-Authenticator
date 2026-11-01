import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faDesktop,
  faPowerOff,
  faClock,
  faClipboard,
  faDownload,
  faUpload,
  faCircleCheck,
  faCircleExclamation,
  faFingerprint,
} from '@fortawesome/free-solid-svg-icons';
import { CustomDropdown } from './CustomDropdown';
import {
  getAutostartInfo,
  getProtectionStatus,
  isMobile,
} from '../utils/platform';

export interface VaultSettings {
  autostart: boolean;
  minimize_to_tray: boolean;
  close_to_tray: boolean;
  auto_lock_minutes: number;
  clipboard_clear_seconds: number;
}

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<VaultSettings>({
    autostart: false,
    minimize_to_tray: true,
    close_to_tray: true,
    auto_lock_minutes: 5,
    clipboard_clear_seconds: 30,
  });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await invoke<VaultSettings>('get_vault_settings');
      setSettings(s);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const updateSetting = async <K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await invoke('update_vault_settings', { settings: newSettings });
      showNotification('Settings saved successfully');
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to save settings');
    }
  };

  const showNotification = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      const savedPath = await invoke<string | null>('export_vault_dialog');
      if (savedPath) {
        showNotification(`Encrypted vault exported to: ${savedPath}`);
      }
    } catch (err: any) {
      setErrorMessage('Export failed: ' + err?.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      setLoading(true);
      const importedCount = await invoke<number | null>('import_vault_dialog');
      if (importedCount !== null && importedCount !== undefined) {
        showNotification(`Successfully restored ${importedCount} accounts from backup`);
      }
    } catch (err: any) {
      setErrorMessage('Import failed: ' + err?.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto space-y-6 text-neutral-200">
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
          <span>APPLICATION & SECURITY SETTINGS</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Configure native system integration, autostart, and backup parameters.
        </p>
      </div>

      {savedMessage && (
        <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4 flex-shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* System Integration Section */}
      <section className="space-y-4 rounded-2xl bg-[#030504] p-5 border border-[#00FF88]/15 shadow-[0_0_30px_rgba(0,255,136,0.05)]">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
          <FontAwesomeIcon icon={faDesktop} className="w-3.5 h-3.5 text-[#00FF88]" />
          <span>System & Window Behavior</span>
        </h3>

        {/* Platform-Adaptive Autostart / Launch */}
        {getAutostartInfo().supported && (
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div>
              <div className="text-xs font-semibold text-white flex items-center space-x-2">
                <FontAwesomeIcon icon={faPowerOff} className="w-3.5 h-3.5 text-neutral-400" />
                <span>{getAutostartInfo().title}</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {getAutostartInfo().description}
              </p>
            </div>
            <button
              onClick={() => updateSetting('autostart', !settings.autostart)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                settings.autostart ? 'bg-[#00FF88]' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  settings.autostart ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Desktop System Tray Controls */}
        {!isMobile() && (
          <>
            {/* Minimize to Tray */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">Minimize to System Tray</div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Keeps RYZ Auth running in taskbar notification tray when window is minimized.
                </p>
              </div>
              <button
                onClick={() => updateSetting('minimize_to_tray', !settings.minimize_to_tray)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                  settings.minimize_to_tray ? 'bg-[#00FF88]' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.minimize_to_tray ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Close to Tray */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">Close to System Tray</div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Closing the window hides it to system tray instead of terminating the process.
                </p>
              </div>
              <button
                onClick={() => updateSetting('close_to_tray', !settings.close_to_tray)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                  settings.close_to_tray ? 'bg-[#00FF88]' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.close_to_tray ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {/* Auto-Lock Timer */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-xs font-semibold text-white flex items-center space-x-2">
              <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 text-neutral-400" />
              <span>Vault Auto-Lock Inactivity</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Locks the vault and purges cryptographic keys from memory after inactivity.
            </p>
          </div>
          <div className="w-48">
            <CustomDropdown
              value={settings.auto_lock_minutes}
              onChange={(val) => updateSetting('auto_lock_minutes', Number(val))}
              options={[
                { value: 1, label: '1 Minute' },
                { value: 5, label: '5 Minutes (Default)' },
                { value: 15, label: '15 Minutes' },
                { value: 30, label: '30 Minutes' },
                { value: 0, label: 'Never (Not Recommended)' },
              ]}
              size="sm"
            />
          </div>
        </div>
      </section>

      {/* Security & Cryptography Section */}
      <section className="space-y-4 rounded-2xl bg-[#030504] p-5 border border-[#00FF88]/15 shadow-[0_0_30px_rgba(0,255,136,0.05)]">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
          <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 text-[#00FF88]" />
          <span>Security & Clipboard Protection</span>
        </h3>

        {/* Hardware / Biometric Protection Status */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div>
            <div className="text-xs font-semibold text-white flex items-center space-x-2">
              <FontAwesomeIcon icon={faFingerprint} className="w-3.5 h-3.5 text-[#00FF88]" />
              <span>{getProtectionStatus().title}</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {getProtectionStatus().description}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 text-[10px] font-semibold text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.15)]">
            ENABLED
          </span>
        </div>

        {/* Clipboard Clear Timeout */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-xs font-semibold text-white flex items-center space-x-2">
              <FontAwesomeIcon icon={faClipboard} className="w-3.5 h-3.5 text-neutral-400" />
              <span>Auto-Clear Clipboard</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Automatically erases copied OTP codes from system clipboard.
            </p>
          </div>
          <div className="w-48">
            <CustomDropdown
              value={settings.clipboard_clear_seconds}
              onChange={(val) => updateSetting('clipboard_clear_seconds', Number(val))}
              options={[
                { value: 10, label: '10 Seconds' },
                { value: 30, label: '30 Seconds (Default)' },
                { value: 60, label: '60 Seconds' },
              ]}
              size="sm"
            />
          </div>
        </div>
      </section>

      {/* Encrypted Backup & Restore Section */}
      <section className="space-y-4 rounded-2xl bg-[#030504] p-5 border border-[#00FF88]/15 shadow-[0_0_30px_rgba(0,255,136,0.05)]">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
          <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5 text-[#00FF88]" />
          <span>Encrypted Vault Backup & Restore</span>
        </h3>
        <p className="text-xs text-neutral-400">
          Backups are encrypted using <strong>XChaCha20-Poly1305</strong>. Plaintext secrets are never stored unencrypted in backups.
        </p>

        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleExportBackup}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 hover:border-[#00FF88]/40 transition-all hover:text-[#00FF88]"
          >
            <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5 text-[#00FF88]" />
            <span>Export Encrypted Vault</span>
          </button>

          <button
            onClick={handleImportBackup}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 hover:border-[#00FF88]/40 transition-all hover:text-[#00FF88]"
          >
            <FontAwesomeIcon icon={faUpload} className="w-3.5 h-3.5 text-neutral-400" />
            <span>Restore From Backup</span>
          </button>
        </div>
      </section>
    </div>
  );
};
