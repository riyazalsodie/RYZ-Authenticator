import React, { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faQrcode,
  faKey,
  faUpload,
  faCircleCheck,
  faCircleExclamation,
  faTag,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import jsQR from 'jsqr';
import { BrandIcon, POPULAR_PRESETS } from './BrandIcon';
import { CustomDropdown } from './CustomDropdown';
import { DEFAULT_GROUPS } from '../types';
import { isMobile } from '../utils/platform';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGroups?: string[];
  defaultGroup?: string | null;
  onAddAccount: (payload: {
    issuer: string;
    label: string;
    secret: string;
    algorithm: 'SHA1' | 'SHA256' | 'SHA512';
    digits: number;
    period: number;
    group?: string | null;
  }) => Promise<void>;
  onAccountsImported?: () => Promise<void>;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  availableGroups = [],
  defaultGroup = null,
  onAddAccount,
  onAccountsImported,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('manual');
  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [algorithm, setAlgorithm] = useState<'SHA1' | 'SHA256' | 'SHA512'>('SHA1');
  const [digits, setDigits] = useState<number>(6);
  const [period, setPeriod] = useState<number>(30);
  const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroup || '');
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedGroup(defaultGroup || '');
      setIsAddingNewGroup(false);
      setNewGroupName('');
    }
  }, [isOpen, defaultGroup]);

  if (!isOpen) return null;

  // Parses otpauth://totp/ or otpauth-migration:// format
  const parseOtpUri = async (uri: string) => {
    try {
      const trimmed = uri.trim();
      // Handle Google Authenticator multi-account migration QR
      if (trimmed.startsWith('otpauth-migration:') || trimmed.includes('data=')) {
        setLoading(true);
        setError(null);
        const importedCount = await invoke<number>('import_google_migration_url', {
          payload: { url: trimmed }
        });
        setSuccessMsg(`Imported ${importedCount} accounts from Google Authenticator!`);
        if (onAccountsImported) {
          await onAccountsImported();
        }
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      const url = new URL(trimmed);
      if (url.protocol !== 'otpauth:') throw new Error('Not an otpauth URL');

      const pathname = decodeURIComponent(url.pathname.replace(/^\/\//, ''));
      let extractedIssuer = '';
      let extractedLabel = pathname;

      if (pathname.includes(':')) {
        const parts = pathname.split(':');
        extractedIssuer = parts[0].trim();
        extractedLabel = parts[1].trim();
      }

      const params = url.searchParams;
      const parsedSecret = params.get('secret');
      if (!parsedSecret) throw new Error('Missing secret in URI');

      const queryIssuer = params.get('issuer');
      if (queryIssuer) extractedIssuer = queryIssuer;

      const parsedAlgorithm = (params.get('algorithm') || 'SHA1').toUpperCase();
      const parsedDigits = parseInt(params.get('digits') || '6', 10);
      const parsedPeriod = parseInt(params.get('period') || '30', 10);

      setIssuer(extractedIssuer);
      setLabel(extractedLabel);
      setSecret(parsedSecret);
      if (['SHA1', 'SHA256', 'SHA512'].includes(parsedAlgorithm)) {
        setAlgorithm(parsedAlgorithm as any);
      }
      setDigits(parsedDigits);
      setPeriod(parsedPeriod);
      setActiveTab('manual');
      setError(null);
    } catch (err: any) {
      setError('Invalid OTP QR code or URI format: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          parseOtpUri(code.data);
        } else {
          setError('No QR code detected in the selected image');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!secret.trim()) {
      setError('Secret key is required');
      return;
    }

    try {
      setLoading(true);
      const effectiveGroup = selectedGroup.trim() || null;
      await onAddAccount({
        issuer: issuer.trim() || 'Service',
        label: label.trim() || 'Account',
        secret: secret.trim(),
        algorithm,
        digits,
        period,
        group: effectiveGroup,
      });
      onClose();
      // Reset form
      setIssuer('');
      setLabel('');
      setSecret('');
      setSelectedGroup(defaultGroup || '');
      setIsAddingNewGroup(false);
      setNewGroupName('');
    } catch (err: any) {
      setError(err?.toString() || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden ${
      isMobile() ? 'rounded-none' : 'rounded-2xl'
    }`}>
      <div className={`relative w-full max-w-md bg-[#030504] border border-[#00FF88]/20 shadow-[0_0_50px_rgba(0,255,136,0.12)] p-6 overflow-hidden ${
        isMobile() ? 'rounded-none' : 'rounded-2xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center text-[#00FF88]">
              <FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">ADD NEW ACCOUNT</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {/* Animated Sliding Tab Switch */}
        <div className="relative h-11 my-4 bg-white/5 border border-white/10 rounded-xl flex p-1 box-border">
          {/* Sliding Pill Indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-[#00FF88] shadow-[0_2px_15px_rgba(0,255,136,0.35)] transition-all duration-300 ease-out pointer-events-none z-0"
            style={{
              width: 'calc(50% - 2px)',
              left: activeTab === 'manual' ? '2px' : 'calc(50%)',
            }}
          />

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className="relative flex-1 flex items-center justify-center space-x-2 z-10 focus:outline-none cursor-pointer"
          >
            <FontAwesomeIcon
              icon={faKey}
              className={`w-3.5 h-3.5 relative z-20 transition-colors duration-200 ${
                activeTab === 'manual' ? 'text-black' : 'text-neutral-400'
              }`}
            />
            <span
              className={`relative z-20 text-xs transition-all duration-200 ${
                activeTab === 'manual' ? 'text-black font-bold scale-105' : 'text-neutral-400 font-medium hover:text-white'
              }`}
            >
              Manual Entry
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className="relative flex-1 flex items-center justify-center space-x-2 z-10 focus:outline-none cursor-pointer"
          >
            <FontAwesomeIcon
              icon={faQrcode}
              className={`w-3.5 h-3.5 relative z-20 transition-colors duration-200 ${
                activeTab === 'qr' ? 'text-black' : 'text-neutral-400'
              }`}
            />
            <span
              className={`relative z-20 text-xs transition-all duration-200 ${
                activeTab === 'qr' ? 'text-black font-bold scale-105' : 'text-neutral-400 font-medium hover:text-white'
              }`}
            >
              Scan QR / Image
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center space-x-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center space-x-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'qr' ? (
          <div className="space-y-4 py-4 text-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-[#00FF88]/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/[0.02]"
            >
              <FontAwesomeIcon icon={faUpload} className="w-8 h-8 text-neutral-500 mb-2 group-hover:text-[#00FF88]" />
              <p className="text-xs text-neutral-300 font-medium">Upload QR Screenshot or Image</p>
              <p className="text-[10px] text-neutral-500 mt-1">Supports Google Authenticator Export QR & Standard TOTP QRs</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Quick Provider Presets */}
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                Select Service Preset
              </label>
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {POPULAR_PRESETS.map((preset) => {
                  const isSelected = issuer.toLowerCase() === preset.name.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setIssuer(preset.name);
                        setAlgorithm(preset.algorithm);
                        setDigits(preset.digits);
                        setPeriod(preset.period);
                        if (!label) setLabel(preset.defaultLabel);
                      }}
                      className={`flex items-center space-x-1.5 p-1.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#00FF88]/15 border-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                          : 'bg-[#080D0A] border-white/5 hover:border-[#00FF88]/30 hover:bg-[#0C140F]'
                      }`}
                    >
                      <BrandIcon name={preset.name} size={16} className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-medium text-neutral-200 truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  ISSUER / SERVICE NAME
                </label>
                <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                  <FontAwesomeIcon icon={faTag} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                  <input
                    type="text"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="e.g. GitHub, Google"
                    className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                  ACCOUNT / USERNAME
                </label>
                <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                  <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. user@domain.com"
                    className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                SECRET KEY (BASE32)
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.trim().startsWith('otpauth:') || val.trim().startsWith('otpauth-migration:') || val.trim().includes('data=')) {
                      parseOtpUri(val.trim());
                    } else {
                      setSecret(val);
                    }
                  }}
                  placeholder="Paste Secret Key or otpauth / migration URI"
                  className="w-full bg-transparent text-sm font-mono text-white placeholder-neutral-500 focus:outline-none tracking-wider uppercase"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 mb-1">ALGORITHM</label>
                <CustomDropdown
                  value={algorithm}
                  onChange={(val) => setAlgorithm(val as any)}
                  direction="up"
                  options={[
                    { value: 'SHA1', label: 'SHA-1' },
                    { value: 'SHA256', label: 'SHA-256' },
                    { value: 'SHA512', label: 'SHA-512' },
                  ]}
                  size="sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 mb-1">DIGITS</label>
                <CustomDropdown
                  value={digits}
                  onChange={(val) => setDigits(Number(val))}
                  direction="up"
                  options={[
                    { value: 6, label: '6 Digits' },
                    { value: 8, label: '8 Digits' },
                  ]}
                  size="sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 mb-1">PERIOD</label>
                <CustomDropdown
                  value={period}
                  onChange={(val) => setPeriod(Number(val))}
                  direction="up"
                  options={[
                    { value: 30, label: '30s' },
                    { value: 60, label: '60s' },
                  ]}
                  size="sm"
                />
              </div>
            </div>

            {/* Simplified Group Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-semibold text-neutral-400">
                  ASSIGN TO GROUP
                </label>
                {selectedGroup && (
                  <button
                    type="button"
                    onClick={() => setSelectedGroup('')}
                    className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors"
                  >
                    Clear (No Group)
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 items-center">
                {Array.from(new Set([...DEFAULT_GROUPS, ...availableGroups])).map((grp) => {
                  const isSelected = selectedGroup.toLowerCase() === grp.toLowerCase();
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSelectedGroup(isSelected ? '' : grp)}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00FF88] text-black font-bold border-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.35)] scale-105'
                          : 'bg-[#060A07] text-neutral-400 border-white/10 hover:border-[#00FF88]/40 hover:text-white'
                      }`}
                    >
                      {isSelected ? `✓ ${grp}` : grp}
                    </button>
                  );
                })}

                {isAddingNewGroup ? (
                  <div className="flex items-center space-x-1.5 bg-[#080D0A] border border-[#00FF88]/50 rounded-xl px-2.5 py-1 shadow-[0_0_12px_rgba(0,255,136,0.2)]">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newGroupName.trim()) {
                            setSelectedGroup(newGroupName.trim());
                            setIsAddingNewGroup(false);
                            setNewGroupName('');
                          }
                        } else if (e.key === 'Escape') {
                          setIsAddingNewGroup(false);
                        }
                      }}
                      placeholder="Group name..."
                      autoFocus
                      className="w-24 bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newGroupName.trim()) {
                          setSelectedGroup(newGroupName.trim());
                          setIsAddingNewGroup(false);
                          setNewGroupName('');
                        }
                      }}
                      className="text-[11px] font-bold text-[#00FF88] hover:text-white px-1"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewGroup(false)}
                      className="text-[11px] text-neutral-500 hover:text-white px-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewGroup(true)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-dashed border-white/20 text-neutral-400 hover:text-[#00FF88] hover:border-[#00FF88]/40 hover:bg-[#00FF88]/5 transition-all cursor-pointer"
                  >
                    + New Group
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,136,0.25)] disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
                <span>{loading ? 'Encrypting...' : 'Save Account'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
