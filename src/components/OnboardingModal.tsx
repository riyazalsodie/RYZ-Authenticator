import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faCircleCheck,
  faCircleExclamation,
  faKey,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

interface OnboardingModalProps {
  onSetupMasterPassword: (password: string) => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onSetupMasterPassword,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Master password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await onSetupMasterPassword(password);
    } catch (err: any) {
      setError(err?.toString() || 'Failed to initialize vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-transparent overflow-y-auto">
      <div className="w-full max-w-md bg-[#030504] border border-[#00FF88]/20 rounded-2xl shadow-[0_0_60px_rgba(0,255,136,0.12)] p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00FF88] to-[#10B981] flex items-center justify-center text-black font-extrabold shadow-lg shadow-[#00FF88]/20">
            <FontAwesomeIcon icon={faShieldHalved} className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">INITIALIZE RYZ AUTH</h2>
            <p className="text-xs text-neutral-500">Create your zero-knowledge master password</p>
          </div>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Your master password derives your cryptographic key using <strong>Argon2id</strong>. 
          Your secrets are encrypted with <strong>XChaCha20-Poly1305</strong> before writing to disk. 
          We never store or transmit your master password.
        </p>

        {error && (
          <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
              MASTER PASSWORD
            </label>
            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters..."
                autoFocus
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md ml-1.5 focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
              CONFIRM MASTER PASSWORD
            </label>
            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password..."
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md ml-1.5 focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-[#00FF88] text-black font-semibold text-xs hover:bg-[#00E676] active:scale-95 transition-all shadow-[0_0_25px_rgba(0,255,136,0.25)] disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
            <span>{loading ? 'Deriving Keys...' : 'Create Vault'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
