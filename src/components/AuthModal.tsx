import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  getRememberLabel,
  getBiometricUnlockLabel,
  getBiometricErrorMessage,
  isMobile,
} from '../utils/platform';
import {
  faKey,
  faFingerprint,
  faArrowRight,
  faCircleExclamation,
  faArrowsRotate,
  faEye,
  faEyeSlash,
  faUser,
  faEnvelope,
  faShieldHalved,
  faCloud,
} from '@fortawesome/free-solid-svg-icons';

export interface AuthModalProps {
  onLogin: (identifier: string, pass: string, rememberMe: boolean) => Promise<void>;
  onRegister: (username: string, email: string, pass: string, rememberMe: boolean) => Promise<void>;
  onLocalUnlock: (pass: string, rememberMe: boolean) => Promise<void>;
  onLocalSetup: (pass: string, rememberMe: boolean) => Promise<void>;
  onUnlockWindowsHello: () => Promise<void>;
  onResetVault: () => Promise<void>;
  initialMode?: 'local-unlock' | 'local-setup' | 'cloud-login' | 'cloud-register';
  cloudConfigured?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLogin,
  onRegister,
  onLocalUnlock,
  onLocalSetup,
  onUnlockWindowsHello,
  onResetVault,
  initialMode = 'local-unlock',
  cloudConfigured = false,
}) => {
  const [mode, setMode] = useState<'local-unlock' | 'local-setup' | 'cloud-login' | 'cloud-register'>(initialMode);

  // Local Vault fields
  const [localPassword, setLocalPassword] = useState('');
  const [localConfirmPassword, setLocalConfirmPassword] = useState('');

  // Cloud fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Debounced values (300ms) for validation
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [debouncedPassword, setDebouncedPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Rate limiting & lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lastSubmitTimeRef = useRef<number>(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedUsername(regUsername.trim());
      setDebouncedEmail(regEmail.trim());
      setDebouncedPassword(mode === 'local-setup' ? localPassword : regPassword);
    }, 300);
    return () => clearTimeout(t);
  }, [regUsername, regEmail, regPassword, localPassword, mode]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const passwordAudit = useMemo(() => {
    const pwd = debouncedPassword;
    const hasMinLen = pwd.length >= 8;
    const hasUpperLower = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    const score = [hasMinLen, hasUpperLower, hasNumber, hasSymbol].filter(Boolean).length;
    const labels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = [
      'bg-red-500',
      'bg-red-500',
      'bg-amber-400',
      'bg-emerald-400',
      'bg-[#00FF88]',
    ];
    return {
      hasMinLen,
      hasUpperLower,
      hasNumber,
      hasSymbol,
      score,
      label: pwd.length === 0 ? 'Enter Password' : labels[score],
      color: colors[score],
    };
  }, [debouncedPassword]);

  const usernameValidationMsg = useMemo(() => {
    if (!debouncedUsername) return null;
    if (debouncedUsername.length < 3) return 'Username must be at least 3 characters';
    if (debouncedUsername.length > 32) return 'Username max 32 characters';
    if (!/^[a-zA-Z0-9_.-]+$/.test(debouncedUsername)) {
      return 'Only letters, numbers, ".", "_", and "-" allowed';
    }
    return null;
  }, [debouncedUsername]);

  const emailValidationMsg = useMemo(() => {
    if (!debouncedEmail) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail)) {
      return 'Enter a valid email address (e.g. name@gmail.com)';
    }
    return null;
  }, [debouncedEmail]);

  const checkSubmissionGuard = (): boolean => {
    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 800) {
      setError('Please wait a moment before clicking again.');
      return false;
    }
    lastSubmitTimeRef.current = now;
    return true;
  };

  const handleAuthError = (err: any, fallback: string) => {
    const msg = err?.toString() || fallback;
    const cleanMsg = msg.replace(/^Error:\s*/i, '');
    setError(cleanMsg);

    const lockMatch = cleanMsg.match(/lockout\s*active.*?wait\s*(\d+)\s*s/i) || cleanMsg.match(/try again in\s*(\d+)\s*s/i);
    if (lockMatch && lockMatch[1]) {
      setLockoutSeconds(parseInt(lockMatch[1], 10));
    } else {
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= 5) {
          const lockTime = Math.min(30 * Math.pow(2, next - 5), 300);
          setLockoutSeconds(lockTime);
        }
        return next;
      });
    }
  };

  // Local Unlock Submit
  const handleLocalUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSubmissionGuard()) return;
    if (!localPassword) {
      setError('Please enter your master password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLocalUnlock(localPassword, rememberMe);
      setFailedAttempts(0);
    } catch (err: any) {
      handleAuthError(err, 'Invalid master password. Vault remains securely locked.');
    } finally {
      setLoading(false);
    }
  };

  // Local Setup Submit
  const handleLocalSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSubmissionGuard()) return;
    if (localPassword.length < 8) {
      setError('Master password must be at least 8 characters long');
      return;
    }
    if (localPassword !== localConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLocalSetup(localPassword, rememberMe);
      setFailedAttempts(0);
    } catch (err: any) {
      handleAuthError(err, 'Failed to initialize local vault');
    } finally {
      setLoading(false);
    }
  };

  // Cloud Login Submit
  const handleCloudLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSubmissionGuard()) return;
    const cleanId = identifier.trim();
    if (!cleanId || !loginPassword) {
      setError('Please enter both your identifier and password');
      return;
    }
    setLoading(true);
    try {
      await onLogin(cleanId, loginPassword, rememberMe);
      setFailedAttempts(0);
    } catch (err: any) {
      handleAuthError(err, 'Cloud authentication failed. Check your network or credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Cloud Register Submit
  const handleCloudRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSubmissionGuard()) return;
    const cleanUser = regUsername.trim();
    const cleanMail = regEmail.trim();

    if (!cleanUser || !cleanMail || !regPassword) {
      setError('All fields are required to register');
      return;
    }
    if (cleanUser.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      setError('Username must be 3-32 characters (letters, numbers, ., _, -)');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanMail)) {
      setError('Please enter a valid email address');
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
      await onRegister(cleanUser, cleanMail, regPassword, rememberMe);
      setFailedAttempts(0);
    } catch (err: any) {
      handleAuthError(err, 'Failed to register cloud account');
    } finally {
      setLoading(false);
    }
  };

  const handleHello = async () => {
    if (!checkSubmissionGuard()) return;
    setError(null);
    setLoading(true);
    try {
      await onUnlockWindowsHello();
      setFailedAttempts(0);
    } catch (err: any) {
      setError(getBiometricErrorMessage());
    } finally {
      setLoading(false);
    }
  };

  const isLocal = mode === 'local-unlock' || mode === 'local-setup';

  return (
    <div
      className={`w-full h-full flex flex-col items-center select-none overflow-y-auto overflow-x-hidden ${
        isMobile()
          ? 'px-4 pt-[max(env(safe-area-inset-top),2.25rem)] pb-[max(env(safe-area-inset-bottom),2rem)] bg-[#000000]'
          : 'p-6 justify-center bg-transparent'
      }`}
    >
      <div
        className={`w-full max-w-sm my-auto flex flex-col items-center text-center space-y-4 bg-[#030504] ${
          isMobile()
            ? 'border-0 rounded-none shadow-none p-2'
            : 'border border-[#00FF88]/20 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,255,136,0.12)]'
        }`}
      >
        {/* Brand Icon */}
        <img
          src="/logo.png"
          alt="RYZ Auth"
          className="w-14 h-14 object-contain filter drop-shadow-[0_0_18px_rgba(0,255,136,0.55)]"
        />

        <div>
          <h2 className="text-base font-bold text-white tracking-wider uppercase">
            {mode === 'local-unlock'
              ? 'Unlock Local Vault'
              : mode === 'local-setup'
              ? 'Create Local Vault'
              : mode === 'cloud-login'
              ? 'Cloud Account Sign In'
              : 'Create Cloud Account'}
          </h2>
          <div className="flex items-center justify-center space-x-1.5 mt-1 text-[11px] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
            <span>
              {isLocal
                ? '100% Offline · Local AES-256-GCM Vault'
                : 'PostgreSQL Zero-Knowledge Sync'}
            </span>
          </div>
        </div>

        {/* Mode Selector Pill: Local (Offline) vs Cloud */}
        <div className="relative w-full h-10 bg-white/5 border border-white/10 rounded-xl flex p-1 box-border">
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-[#00FF88] shadow-[0_2px_12px_rgba(0,255,136,0.35)] transition-all duration-300 ease-out pointer-events-none z-0"
            style={{
              width: 'calc(50% - 2px)',
              left: isLocal ? '2px' : 'calc(50%)',
            }}
          />

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'local-setup' ? 'local-setup' : 'local-unlock');
              setError(null);
            }}
            className="relative flex-1 flex items-center justify-center space-x-1.5 z-10 focus:outline-none cursor-pointer"
          >
            <FontAwesomeIcon icon={faShieldHalved} className={`w-3 h-3 ${isLocal ? 'text-black' : 'text-neutral-400'}`} />
            <span
              className={`relative z-20 text-xs transition-all duration-200 ${
                isLocal ? 'text-black font-bold scale-105' : 'text-neutral-400 font-medium hover:text-white'
              }`}
            >
              Local Vault
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('cloud-login');
              setError(null);
            }}
            className="relative flex-1 flex items-center justify-center space-x-1.5 z-10 focus:outline-none cursor-pointer"
          >
            <FontAwesomeIcon icon={faCloud} className={`w-3 h-3 ${!isLocal ? 'text-black' : 'text-neutral-400'}`} />
            <span
              className={`relative z-20 text-xs transition-all duration-200 ${
                !isLocal ? 'text-black font-bold scale-105' : 'text-neutral-400 font-medium hover:text-white'
              }`}
            >
              Cloud Sync
            </span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-left">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span className="break-words">
              {error}
              {failedAttempts >= 3 && lockoutSeconds === 0 && ` (${failedAttempts} failed attempts)`}
            </span>
          </div>
        )}

        {/* ==================== 1. LOCAL UNLOCK MODE ==================== */}
        {mode === 'local-unlock' && (
          <form onSubmit={handleLocalUnlockSubmit} className="w-full space-y-3.5">
            <button
              type="button"
              onClick={handleHello}
              disabled={loading || lockoutSeconds > 0}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 transition-all hover:border-[#00FF88]/40 cursor-pointer active:scale-98 disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faFingerprint} className="w-4 h-4 text-[#00FF88]" />
              <span>{getBiometricUnlockLabel()}</span>
            </button>

            <div className="flex items-center w-full my-0.5">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="px-2 text-[10px] text-neutral-500 font-semibold tracking-wider">OR MASTER PASSWORD</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <div className="relative">
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="Enter master password..."
                  autoFocus
                  disabled={lockoutSeconds > 0}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider disabled:opacity-50"
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
              {capsLock && <p className="text-[10px] text-amber-400 text-left mt-1 pl-1">⚠️ Caps Lock is active</p>}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between px-1 py-1">
              <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
                    rememberMe
                      ? 'bg-[#00FF88] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]'
                      : 'bg-[#080D0A] border-white/20 group-hover:border-[#00FF88]/50'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-black stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-neutral-300 group-hover:text-white transition-colors font-medium">
                  {getRememberLabel()}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setMode('local-setup')}
                className="text-[11px] text-neutral-400 hover:text-[#00FF88] transition-colors cursor-pointer"
              >
                Reset / New
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0 || !localPassword}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faArrowsRotate} className="w-3.5 h-3.5 animate-spin" />
                  <span>Decrypting Vault...</span>
                </>
              ) : (
                <>
                  <span>Unlock Local Vault</span>
                  <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ==================== 2. LOCAL SETUP MODE ==================== */}
        {mode === 'local-setup' && (
          <form onSubmit={handleLocalSetupSubmit} className="w-full space-y-3.5">
            <p className="text-xs text-neutral-400 text-left">
              Set a master password to encrypt your accounts locally using AES-256-GCM. No cloud account required.
            </p>

            <div className="relative">
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  placeholder="Create master password (min 8 chars)..."
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

            {/* Password Strength Meter */}
            {localPassword && (
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-medium">Strength:</span>
                  <span className="text-[#00FF88] font-bold">{passwordAudit.label}</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex space-x-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        passwordAudit.score >= step ? passwordAudit.color : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={localConfirmPassword}
                onChange={(e) => setLocalConfirmPassword(e.target.value)}
                placeholder="Confirm master password..."
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
            </div>

            <div className="flex items-center justify-between px-1 py-1">
              <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
                    rememberMe
                      ? 'bg-[#00FF88] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]'
                      : 'bg-[#080D0A] border-white/20 group-hover:border-[#00FF88]/50'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-black stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-neutral-300 group-hover:text-white transition-colors font-medium">
                  {getRememberLabel()}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setMode('local-unlock')}
                className="text-[11px] text-neutral-400 hover:text-[#00FF88] transition-colors cursor-pointer"
              >
                Back to Unlock
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !localPassword || localPassword.length < 8 || localPassword !== localConfirmPassword}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faArrowsRotate} className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Vault...</span>
                </>
              ) : (
                <>
                  <span>Create Local Vault</span>
                  <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ==================== 3. CLOUD LOGIN MODE ==================== */}
        {mode === 'cloud-login' && (
          <form onSubmit={handleCloudLoginSubmit} className="w-full space-y-3.5">
            {!cloudConfigured && (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs text-left">
                ℹ️ No cloud database URL configured. You can set <code className="text-white bg-black/40 px-1 py-0.5 rounded font-mono">DATABASE_URL</code> or switch to <strong>Local Vault</strong>.
              </div>
            )}

            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or Email..."
                autoFocus
                disabled={lockoutSeconds > 0}
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider disabled:opacity-50"
              />
            </div>

            <div className="relative">
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password..."
                  disabled={lockoutSeconds > 0}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider disabled:opacity-50"
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

            <div className="flex items-center justify-between px-1 py-1">
              <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
                    rememberMe
                      ? 'bg-[#00FF88] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]'
                      : 'bg-[#080D0A] border-white/20 group-hover:border-[#00FF88]/50'
                  }`}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-black stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-neutral-300 group-hover:text-white transition-colors font-medium">
                  {getRememberLabel()}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setMode('cloud-register')}
                className="text-[11px] text-neutral-400 hover:text-[#00FF88] transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0 || !identifier || !loginPassword}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faArrowsRotate} className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Cloud</span>
                  <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ==================== 4. CLOUD REGISTER MODE ==================== */}
        {mode === 'cloud-register' && (
          <form onSubmit={handleCloudRegisterSubmit} className="w-full space-y-3">
            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Choose username..."
                autoFocus
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
            </div>
            {usernameValidationMsg && (
              <p className="text-[11px] text-amber-400 text-left pl-1">{usernameValidationMsg}</p>
            )}

            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
            </div>
            {emailValidationMsg && (
              <p className="text-[11px] text-amber-400 text-left pl-1">{emailValidationMsg}</p>
            )}

            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Password (min 8 chars)..."
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
            </div>

            <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
              <FontAwesomeIcon icon={faKey} className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Confirm password..."
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
              />
            </div>

            <div className="flex items-center justify-between px-1 py-1">
              <button
                type="button"
                onClick={() => setMode('cloud-login')}
                className="text-[11px] text-neutral-400 hover:text-[#00FF88] transition-colors cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !regUsername || !regEmail || !regPassword || regPassword !== regConfirmPassword}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faArrowsRotate} className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <span>Create Cloud Account</span>
                  <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Reset Confirmation Modal */}
        {showConfirmReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-[#080D0A] border border-red-500/40 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <FontAwesomeIcon icon={faCircleExclamation} className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Local Vault?</h3>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  This will securely shred your local encrypted vault on this device. Make sure you have exported a backup.
                </p>
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onResetVault();
                    setShowConfirmReset(false);
                    setMode('local-setup');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
