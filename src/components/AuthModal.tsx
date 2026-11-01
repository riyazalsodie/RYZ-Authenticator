import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  getRememberLabel,
  getHardwareSecurityBadge,
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
  faUser,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';

interface AuthModalProps {
  onLogin: (identifier: string, pass: string, rememberMe: boolean) => Promise<void>;
  onRegister: (username: string, email: string, pass: string, rememberMe: boolean) => Promise<void>;
  onUnlockWindowsHello: () => Promise<void>;
  onResetVault: () => Promise<void>;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLogin,
  onRegister,
  onUnlockWindowsHello,
  onResetVault,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !loginPassword) {
      setError('Please provide your Username or Gmail, and your password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLogin(identifier.trim(), loginPassword, rememberMe);
    } catch (err: any) {
      setError(err?.toString() || 'Invalid credentials or failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      setError('All fields are required to register');
      return;
    }

    if (!regEmail.includes('@')) {
      setError('Please enter a valid Gmail / Email address');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await onRegister(regUsername.trim(), regEmail.trim(), regPassword, rememberMe);
    } catch (err: any) {
      setError(err?.toString() || 'Failed to register account with PostgreSQL database');
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
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4 bg-[#030504] border border-[#00FF88]/20 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,255,136,0.12)]">
        {/* Brand Icon Shield */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00FF88] to-[#10B981] flex items-center justify-center shadow-xl shadow-[#00FF88]/25">
          <FontAwesomeIcon icon={faLock} className="w-5 h-5 text-black" />
        </div>

        <div>
          <h2 className="text-base font-bold text-white tracking-wider">
            {mode === 'login' ? 'SIGN IN TO RYZ AUTH' : 'CREATE SECURE ACCOUNT'}
          </h2>
          <div className="flex items-center justify-center space-x-1.5 mt-1 text-[11px] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
            <span>No-Bloat Authenticator for PC</span>
          </div>
        </div>

        {/* Animated Sliding Toggle Switch */}
        <div className="relative w-full h-11 bg-white/5 border border-white/10 rounded-xl flex p-1 box-border">
          {/* Animated Sliding Indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-[#00FF88] shadow-[0_2px_15px_rgba(0,255,136,0.35)] transition-all duration-300 ease-out pointer-events-none z-0"
            style={{
              width: 'calc(50% - 2px)',
              left: mode === 'login' ? '2px' : 'calc(50%)',
            }}
          />

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className="relative flex-1 flex items-center justify-center z-10 focus:outline-none cursor-pointer"
          >
            <span
              className={`relative z-20 text-xs transition-all duration-200 ${
                mode === 'login' ? 'text-black font-bold scale-105' : 'text-neutral-400 font-medium hover:text-white'
              }`}
            >
              Sign In
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className="relative flex-1 flex items-center justify-center z-10 focus:outline-none cursor-pointer"
          >
            <span
              className={`relative z-20 text-xs transition-all duration-200 ${
                mode === 'register' ? 'text-black font-bold scale-105' : 'text-neutral-400 font-medium hover:text-white'
              }`}
            >
              Create Account
            </span>
          </button>
        </div>

        {error && (
          <div className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-left">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span className="break-all">{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          <>
            {/* Biometric / Quick Instant Unlock */}
            <button
              type="button"
              onClick={handleHello}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 transition-all hover:border-[#00FF88]/40 cursor-pointer active:scale-98"
            >
              <FontAwesomeIcon icon={faFingerprint} className="w-4 h-4 text-[#00FF88]" />
              <span>{getBiometricUnlockLabel()}</span>
            </button>

            <div className="flex items-center w-full my-0.5">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="px-2 text-[10px] text-neutral-500 font-semibold tracking-wider">
                OR CREDENTIALS
              </span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            {/* Login Form: Username or Gmail + Password */}
            <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon
                  icon={faUser}
                  className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5"
                />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter Username or Gmail..."
                  autoFocus
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                />
              </div>

              <div className="relative">
                <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                  <FontAwesomeIcon
                    icon={faKey}
                    className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                    onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                    placeholder="Enter password..."
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
                {capsLock && (
                  <p className="text-[10px] text-amber-400 text-left mt-1 pl-1">
                    ⚠️ Caps Lock is active
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox & Anti-Theft Hardware Badge */}
              <div className="flex items-center justify-between px-1 py-1">
                <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
                      rememberMe
                        ? 'bg-[#00FF88] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]'
                        : 'bg-[#080D0A] border-white/20 group-hover:border-[#00FF88]/50'
                    }`}>
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-black stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-300 group-hover:text-white transition-colors font-medium">
                    {getRememberLabel()}
                  </span>
                </label>
                <div
                  className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium"
                  title={getHardwareSecurityBadge().title}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{getHardwareSecurityBadge().label}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier || !loginPassword}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In & Sync Vault'}</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          /* Registration Form: Username, Gmail, Password, Confirm Password */
          <form onSubmit={handleRegisterSubmit} className="w-full space-y-3 text-left">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                USERNAME
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. ryz_operator"
                  autoFocus
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                GMAIL / EMAIL
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                PASSWORD (MIN 8 CHARS)
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="Enter strong password..."
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
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                CONFIRM PASSWORD
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="Confirm password..."
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

            {/* Remember Me Checkbox & Anti-Theft Hardware Badge */}
            <div className="flex items-center justify-between px-1 py-1">
              <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
                    rememberMe
                      ? 'bg-[#00FF88] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]'
                      : 'bg-[#080D0A] border-white/20 group-hover:border-[#00FF88]/50'
                  }`}>
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5 text-black stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-neutral-300 group-hover:text-white transition-colors font-medium">
                  {getRememberLabel()}
                </span>
              </label>
              <div
                className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium"
                title={getHardwareSecurityBadge().title}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{getHardwareSecurityBadge().label}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !regUsername || !regEmail || !regPassword}
              className="w-full flex items-center justify-center space-x-2 py-3 mt-2 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
            >
              <span>{loading ? 'Registering to DB...' : 'Create Account & Initialize'}</span>
              <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Reset Vault Option for testing */}
        <div className="pt-2 border-t border-white/5 w-full">
          {showConfirmReset ? (
            <div className="space-y-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <p className="text-[11px] text-red-300 font-medium">
                Reset local vault cache?
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
              className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors flex items-center justify-center space-x-1.5 mx-auto"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="w-2.5 h-2.5" />
              <span>Reset Local Cache</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
