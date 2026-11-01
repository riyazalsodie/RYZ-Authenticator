import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  getBiometricUnlockLabel,
  getBiometricErrorMessage,
} from '../utils/platform';
import {
  faKey,
  faFingerprint,
  faLock,
  faArrowRight,
  faCircleExclamation,
  faArrowsRotate,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

interface UnlockScreenProps {
  onUnlockPassword: (password: string) => Promise<void>;
  onUnlockWindowsHello: () => Promise<void>;
  onResetVault: () => Promise<void>;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  onUnlockPassword,
  onUnlockWindowsHello,
  onResetVault,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your master password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onUnlockPassword(password);
    } catch (err: any) {
      setError('Invalid master password. Vault remains securely locked.');
    } finally {
      setLoading(false);
    }
  };

  const handleHello = async () => {
    setError(null);
    setLoading(true);
    try {
      await onUnlockWindowsHello();
    } catch (err: any) {
      setError(getBiometricErrorMessage());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-transparent select-none overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-5 bg-[#030504] border border-[#00FF88]/20 rounded-2xl p-7 shadow-[0_0_60px_rgba(0,255,136,0.12)]">
        {/* Brand Icon Shield */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00FF88] to-[#10B981] flex items-center justify-center shadow-xl shadow-[#00FF88]/25">
          <FontAwesomeIcon icon={faLock} className="w-6 h-6 text-black" />
        </div>

        <div>
          <h2 className="text-base font-bold text-white tracking-wider">UNLOCK RYZ AUTH</h2>
          <p className="text-[11px] text-neutral-400 mt-1">XChaCha20-Poly1305 Encrypted Vault</p>
        </div>

        {error && (
          <div className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-left">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Biometric / Quick Instant Unlock */}
        <button
          type="button"
          onClick={handleHello}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 transition-all hover:border-[#00FF88]/40 cursor-pointer active:scale-98"
        >
          <FontAwesomeIcon icon={faFingerprint} className="w-4 h-4 text-[#00FF88]" />
          <span>{getBiometricUnlockLabel()}</span>
        </button>

        <div className="flex items-center w-full my-1">
          <div className="flex-1 border-t border-white/10"></div>
          <span className="px-3 text-[10px] text-neutral-500 font-semibold tracking-wider">OR MASTER PASSWORD</span>
          <div className="flex-1 border-t border-white/10"></div>
        </div>

        {/* Master Password Input Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          <div className="relative">
            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                placeholder="Enter master password..."
                autoFocus
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md ml-1.5 focus:outline-none"
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-4 h-4" />
              </button>
            </div>
            {capsLock && (
              <p className="text-[10px] text-amber-400 text-left mt-1 pl-1">
                ⚠️ Caps Lock is active
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
          >
            <span>{loading ? 'Decrypting Vault...' : 'Unlock Vault'}</span>
            <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Reset Vault Option for testing */}
        <div className="pt-2 border-t border-white/5 w-full">
          {showConfirmReset ? (
            <div className="space-y-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <p className="text-[11px] text-red-300 font-medium">
                Reset vault and delete local key file?
              </p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={async () => {
                    await onResetVault();
                    setShowConfirmReset(false);
                  }}
                  className="px-2.5 py-1 bg-red-500 text-white rounded text-[10px] font-bold"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-2.5 py-1 bg-neutral-800 text-neutral-300 rounded text-[10px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors flex items-center justify-center space-x-1.5 mx-auto"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="w-3 h-3" />
              <span>Forgot password? Reset Vault</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
