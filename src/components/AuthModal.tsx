import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  getRememberLabel,
  getBiometricUnlockLabel,
  getBiometricErrorMessage,
  getAppTagline,
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

  // Debounced values (300ms) for real-time security validation without UI jank
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [debouncedPassword, setDebouncedPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Rate limiting & brute-force lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lastSubmitTimeRef = useRef<number>(0);

  // Debounce input changes (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedUsername(regUsername.trim());
      setDebouncedEmail(regEmail.trim());
      setDebouncedPassword(regPassword);
    }, 300);
    return () => clearTimeout(t);
  }, [regUsername, regEmail, regPassword]);

  // Countdown timer for brute-force rate limit lockout
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

  // Password strength & security audit metrics
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
    // 800ms submission debounce guard
    if (now - lastSubmitTimeRef.current < 800) {
      setError('Submission debounced: Please wait a moment before clicking again.');
      return false;
    }
    if (lockoutSeconds > 0) {
      setError(`Rate limit active: Please wait ${lockoutSeconds}s before trying again.`);
      return false;
    }
    lastSubmitTimeRef.current = now;
    return true;
  };

  const handleAuthError = (err: any, fallbackMsg: string) => {
    const msg = err?.toString() || fallbackMsg;
    setError(msg);

    // Parse backend rate-limit seconds if present
    const match = msg.match(/(\d+)s/);
    if (msg.toLowerCase().includes('rate limit') && match) {
      setLockoutSeconds(parseInt(match[1], 10));
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      const penalty = Math.min(30 * Math.pow(2, nextAttempts - 5), 300);
      setLockoutSeconds(penalty);
      setError(`Brute-force protection triggered: Locked for ${penalty}s after ${nextAttempts} failed attempts.`);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSubmissionGuard()) return;

    const cleanId = identifier.trim();
    if (!cleanId || !loginPassword) {
      setError('Please provide your Username or Gmail, and your password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLogin(cleanId, loginPassword, rememberMe);
      setFailedAttempts(0);
    } catch (err: any) {
      handleAuthError(err, 'Invalid credentials or failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSubmissionGuard()) return;
    setError(null);

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
      await onRegister(cleanUser, cleanMail, regPassword, rememberMe);
      setFailedAttempts(0);
    } catch (err: any) {
      handleAuthError(err, 'Failed to register account with PostgreSQL database');
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
        {/* Brand Icon Shield */}
        <img
          src="/logo.png"
          alt="RYZ Auth"
          className="w-14 h-14 object-contain filter drop-shadow-[0_0_18px_rgba(0,255,136,0.55)]"
        />

        <div>
          <h2 className="text-base font-bold text-white tracking-wider">
            {mode === 'login' ? 'SIGN IN TO RYZ AUTH' : 'CREATE SECURE ACCOUNT'}
          </h2>
          <div className="flex items-center justify-center space-x-1.5 mt-1 text-[11px] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
            <span>{getAppTagline()}</span>
          </div>
        </div>

        {/* Animated Sliding Toggle Switch */}
        <div className="relative w-full h-11 bg-white/5 border border-white/10 rounded-xl flex p-1 box-border">
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
                mode === 'login'
                  ? 'text-black font-bold scale-105'
                  : 'text-neutral-400 font-medium hover:text-white'
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
                mode === 'register'
                  ? 'text-black font-bold scale-105'
                  : 'text-neutral-400 font-medium hover:text-white'
              }`}
            >
              Create Account
            </span>
          </button>
        </div>

        {/* Rate Limit / Error Banner */}
        {error && (
          <div className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-left">
            <FontAwesomeIcon
              icon={faCircleExclamation}
              className="w-4 h-4 flex-shrink-0 text-red-400"
            />
            <span className="break-words">{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          <>
            {/* Biometric / Quick Instant Unlock */}
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
                  disabled={lockoutSeconds > 0}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider disabled:opacity-50"
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
                {capsLock && (
                  <p className="text-[10px] text-amber-400 text-left mt-1 pl-1">
                    ⚠️ Caps Lock is active
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between px-1 py-1">
                <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                  <div className="relative flex items-center justify-center">
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
                        <svg
                          className="w-2.5 h-2.5 text-black stroke-[3]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-300 group-hover:text-white transition-colors font-medium">
                    {getRememberLabel()}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0 || !identifier || !loginPassword}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
              >
                <span>
                  {lockoutSeconds > 0
                    ? `Rate Limited (${lockoutSeconds}s)`
                    : loading
                    ? 'Authenticating...'
                    : 'Sign In'}
                </span>
                <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          /* Registration Form: Username, Gmail, Password, Confirm Password + Live Security Audit */
          <form onSubmit={handleRegisterSubmit} className="w-full space-y-3 text-left">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                USERNAME
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon
                  icon={faUser}
                  className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5"
                />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. ryz_operator"
                  autoFocus
                  disabled={lockoutSeconds > 0}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                />
              </div>
              {usernameValidationMsg && (
                <p className="text-[10px] text-amber-400 mt-1 pl-1">{usernameValidationMsg}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                GMAIL / EMAIL
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5"
                />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  disabled={lockoutSeconds > 0}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                />
              </div>
              {emailValidationMsg && (
                <p className="text-[10px] text-amber-400 mt-1 pl-1">{emailValidationMsg}</p>
              )}
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-semibold text-neutral-400">
                  PASSWORD (MIN 8 CHARS)
                </label>
                <span className="text-[10px] font-bold text-[#00FF88]">{passwordAudit.label}</span>
              </div>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon
                  icon={faKey}
                  className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="Enter strong password..."
                  disabled={lockoutSeconds > 0}
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

              {/* 4-Bar Entropy Meter */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      passwordAudit.score >= bar ? passwordAudit.color : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1.5 text-[9px] text-neutral-400">
                <span className={passwordAudit.hasMinLen ? 'text-[#00FF88]' : ''}>
                  {passwordAudit.hasMinLen ? '✓' : '○'} 8+ Characters
                </span>
                <span className={passwordAudit.hasUpperLower ? 'text-[#00FF88]' : ''}>
                  {passwordAudit.hasUpperLower ? '✓' : '○'} Upper & Lowercase
                </span>
                <span className={passwordAudit.hasNumber ? 'text-[#00FF88]' : ''}>
                  {passwordAudit.hasNumber ? '✓' : '○'} Number (0-9)
                </span>
                <span className={passwordAudit.hasSymbol ? 'text-[#00FF88]' : ''}>
                  {passwordAudit.hasSymbol ? '✓' : '○'} Special Symbol
                </span>
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                CONFIRM PASSWORD
              </label>
              <div className="group flex items-center h-[46px] bg-[#050806] border border-white/10 rounded-xl px-3.5 focus-within:border-[#00FF88] focus-within:ring-2 focus-within:ring-[#00FF88]/20 focus-within:shadow-[0_0_20px_rgba(0,255,136,0.18)] transition-all">
                <FontAwesomeIcon
                  icon={faKey}
                  className="w-4 h-4 text-neutral-500 group-focus-within:text-[#00FF88] transition-colors shrink-0 mr-2.5"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  placeholder="Confirm password..."
                  disabled={lockoutSeconds > 0}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none tracking-wider"
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between px-1 py-1">
              <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center">
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
                      <svg
                        className="w-2.5 h-2.5 text-black stroke-[3]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-neutral-300 group-hover:text-white transition-colors font-medium">
                  {getRememberLabel()}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0 || !regUsername || !regEmail || !regPassword}
              className="w-full flex items-center justify-center space-x-2 py-3 mt-2 rounded-xl bg-[#00FF88] text-black font-bold text-xs hover:bg-[#00E676] active:scale-98 transition-all shadow-[0_0_25px_rgba(0,255,136,0.3)] disabled:opacity-40 cursor-pointer"
            >
              <span>
                {lockoutSeconds > 0
                  ? `Rate Limited (${lockoutSeconds}s)`
                  : loading
                  ? 'Registering to DB...'
                  : 'Create Account & Initialize'}
              </span>
              <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Reset Vault Option */}
        <div className="pt-1 border-t border-white/5 w-full">
          {showConfirmReset ? (
            <div className="space-y-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <p className="text-[11px] text-red-300 font-medium">Reset local vault cache?</p>
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
