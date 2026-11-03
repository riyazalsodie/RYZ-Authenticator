import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faFloppyDisk,
  faCircleExclamation,
  faArrowsRotate,
  faKey,
  faTag,
  faUser,
  faEye,
  faEyeSlash,
  faCircleCheck,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { ActiveAccount, Algorithm, DEFAULT_GROUPS } from '../types';
import { BrandIcon, POPULAR_PRESETS } from './BrandIcon';
import { CustomDropdown } from './CustomDropdown';
import { isMobile } from '../utils/platform';
import { validateBase32Secret } from '../utils/security';

interface EditAccountModalProps {
  isOpen: boolean;
  account: ActiveAccount | null;
  availableGroups?: string[];
  onClose: () => void;
  onUpdateAccount: (payload: {
    id: string;
    issuer: string;
    label: string;
    new_secret?: string;
    algorithm?: Algorithm;
    digits?: number;
    period?: number;
    group_id?: string | null;
  }) => Promise<void>;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  account,
  availableGroups = [],
  onClose,
  onUpdateAccount,
}) => {
  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA1');
  const [digits, setDigits] = useState<number>(6);
  const [period, setPeriod] = useState<number>(30);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setIssuer(account.issuer);
      setLabel(account.label);
      setAlgorithm(account.algorithm);
      setDigits(account.digits);
      setPeriod(account.period);
      setNewSecret('');
      setError(null);
      setSelectedGroup(account.group_id || '');
      setIsAddingNewGroup(false);
      setNewGroupName('');
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!issuer.trim() && !label.trim()) {
      setError('Issuer or Account Label is required');
      return;
    }

    let cleanedSecret: string | undefined = undefined;
    if (newSecret.trim()) {
      const validation = validateBase32Secret(newSecret);
      if (!validation.valid) {
        setError(validation.error || 'Invalid Base32 secret key.');
        return;
      }
      cleanedSecret = validation.cleanSecret;
    }

    setLoading(true);
    try {
      const effectiveGroup = selectedGroup.trim() || null;
      await onUpdateAccount({
        id: account.id,
        issuer: issuer.trim(),
        label: label.trim(),
        new_secret: cleanedSecret,
        algorithm,
        digits,
        period,
        group_id: effectiveGroup,
      });
      onClose();
    } catch (err: any) {
      setError(err?.toString() || 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in ${
      isMobile() ? 'rounded-none' : 'rounded-2xl'
    }`}>
      <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#030504] border border-[#00FF88]/20 shadow-[0_0_50px_rgba(0,255,136,0.12)] p-4 sm:p-6 rounded-2xl`}>
        {/* Neon accent corner glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF88]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#10B981]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#080D0A] border border-[#00FF88]/30 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(0,255,136,0.15)]">
              <BrandIcon name={issuer || account.issuer} size={20} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-wide">Edit Account</h3>
              <p className="text-xs text-neutral-400">Update security parameters and service profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 relative z-10">
          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Service & Icon Presets Switcher */}
          <div>
            <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
              Select Account Icon / Service Preset (Rockstar Games & 30+ More)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-28 overflow-y-auto pr-1">
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
                    }}
                    className={`flex items-center space-x-1.5 p-1.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#00FF88]/15 border-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                        : 'bg-[#080D0A] border-white/5 hover:border-[#00FF88]/30 hover:bg-[#0C140F]'
                    }`}
                  >
                    <BrandIcon name={preset.name} size={15} className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-medium text-neutral-200 truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Service / Issuer
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faTag} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="Google, GitHub, AWS..."
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Account Label
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="user@domain.com"
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-300">
                Rotate Secret Key (Optional Base32)
              </label>
              {newSecret.trim() ? (
                <span className={`text-[10px] font-medium flex items-center space-x-1 ${
                  validateBase32Secret(newSecret).valid ? 'text-[#00FF88]' : 'text-red-400'
                }`}>
                  <FontAwesomeIcon icon={validateBase32Secret(newSecret).valid ? faCircleCheck : faTriangleExclamation} className="w-3 h-3 mr-1" />
                  {validateBase32Secret(newSecret).valid ? `Valid (${validateBase32Secret(newSecret).charCount} chars)` : 'Invalid'}
                </span>
              ) : (
                <span className="text-[11px] text-neutral-500">Leave blank to keep current secret</span>
              )}
            </div>
            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type={showSecret ? "text" : "password"}
                value={newSecret}
                onChange={(e) => setNewSecret(e.target.value)}
                placeholder="Enter new Base32 secret (e.g. JBSWY3DPEHPK3PXP)"
                className="w-full bg-transparent font-mono text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider uppercase"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="ml-2 text-neutral-500 hover:text-white transition-colors p-1"
                title={showSecret ? "Mask Secret" : "Reveal Secret"}
              >
                <FontAwesomeIcon icon={showSecret ? faEyeSlash : faEye} className="w-3.5 h-3.5" />
              </button>
            </div>
            {newSecret.trim() && !validateBase32Secret(newSecret).valid && (
              <p className="text-[11px] text-red-400 mt-1 flex items-start space-x-1">
                <span>{validateBase32Secret(newSecret).error}</span>
              </p>
            )}
            {newSecret.trim() && validateBase32Secret(newSecret).valid && validateBase32Secret(newSecret).warning && (
              <p className="text-[11px] text-amber-400 mt-1 flex items-start space-x-1">
                <span>{validateBase32Secret(newSecret).warning}</span>
              </p>
            )}
          </div>

          {/* Cryptographic Parameters */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Algorithm
              </label>
              <CustomDropdown
                value={algorithm}
                onChange={(val) => setAlgorithm(val as Algorithm)}
                direction="up"
                options={[
                  { value: 'SHA1', label: 'SHA-1 (Default)' },
                  { value: 'SHA256', label: 'SHA-256' },
                  { value: 'SHA512', label: 'SHA-512' },
                ]}
                size="sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Digits
              </label>
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
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Period
              </label>
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
          <div className="pt-1">
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
                  Remove from Group
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faArrowsRotate} className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFloppyDisk} className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
