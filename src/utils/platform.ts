export type PlatformType = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown';

export function getPlatform(): PlatformType {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/mac/i.test(ua)) return 'mac';
  if (/win/i.test(ua)) return 'windows';
  if (/linux/i.test(ua)) return 'linux';
  return 'unknown';
}

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent
  );
}

export function isWindows(): boolean {
  return getPlatform() === 'windows';
}

export function isMac(): boolean {
  return getPlatform() === 'mac';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

export function getAppTagline(): string {
  const p = getPlatform();
  if (p === 'android' || p === 'ios') return 'No-Bloat Authenticator for Mobile';
  if (p === 'mac') return 'No-Bloat Authenticator for Mac';
  if (p === 'linux') return 'No-Bloat Authenticator for Linux';
  return 'No-Bloat Authenticator for PC';
}

/**
 * Platform-adaptive label for "Remember me" session persistence
 */
export function getRememberLabel(): string {
  const p = getPlatform();
  switch (p) {
    case 'android':
    case 'ios':
      return 'Remember me on this Device';
    case 'mac':
      return 'Remember me on this Mac';
    case 'linux':
      return 'Remember me on this Computer';
    case 'windows':
    default:
      return 'Remember me on this PC';
  }
}

/**
 * Platform-adaptive security badge metadata
 */
export function getHardwareSecurityBadge(): { title: string; label: string } {
  const p = getPlatform();
  switch (p) {
    case 'android':
      return {
        title: 'Protected by Android Hardware Keystore & device-bound encryption. Zero cloud session leak vulnerability.',
        label: 'Hardware Keystore',
      };
    case 'ios':
      return {
        title: 'Protected by Apple Secure Enclave & Keychain hardware encryption. Zero cloud session leak vulnerability.',
        label: 'Secure Enclave',
      };
    case 'mac':
      return {
        title: 'Protected by Apple Secure Enclave & macOS Keychain encryption. Zero cloud session leak vulnerability.',
        label: 'Secure Enclave',
      };
    case 'linux':
      return {
        title: 'Protected by Hardware-derived machine entropy & System Keyring. Zero cloud session leak vulnerability.',
        label: 'Hardware Guard',
      };
    case 'windows':
    default:
      return {
        title: 'Protected by Windows DPAPI hardware-bound encryption. No browser cookies or cloud session tokens exist to steal.',
        label: 'DPAPI Anti-Theft',
      };
  }
}

/**
 * Platform-adaptive Biometric / Quick Unlock button label
 */
export function getBiometricUnlockLabel(): string {
  const p = getPlatform();
  switch (p) {
    case 'android':
      return 'Unlock with Biometrics / Fingerprint';
    case 'ios':
      return 'Unlock with Face ID / Touch ID';
    case 'mac':
      return 'Unlock with Touch ID';
    case 'linux':
      return 'Unlock with System Keyring';
    case 'windows':
    default:
      return 'Unlock with Windows Hello / DPAPI';
  }
}

/**
 * Platform-adaptive error message on biometric unlock failure
 */
export function getBiometricErrorMessage(): string {
  const p = getPlatform();
  switch (p) {
    case 'android':
      return 'Biometric or device credential authentication failed.';
    case 'ios':
      return 'Face ID / Touch ID authentication failed.';
    case 'mac':
      return 'Touch ID authentication failed.';
    case 'linux':
      return 'System Keyring authentication failed.';
    case 'windows':
    default:
      return 'Windows Hello biometric or PIN authentication failed.';
  }
}

/**
 * Platform-adaptive settings autostart text
 */
export function getAutostartInfo(): { title: string; description: string; supported: boolean } {
  const p = getPlatform();
  if (p === 'android' || p === 'ios') {
    return {
      title: 'Background Service',
      description: 'Keeps 2FA verification and OTP engine responsive in background.',
      supported: false, // mobile handles background via OS lifecycle
    };
  }
  if (p === 'mac') {
    return {
      title: 'Launch on macOS Login',
      description: 'Automatically starts RYZ Auth in the menu bar when you log into macOS.',
      supported: true,
    };
  }
  if (p === 'linux') {
    return {
      title: 'Launch on System Startup',
      description: 'Automatically starts RYZ Auth upon desktop session startup.',
      supported: true,
    };
  }
  return {
    title: 'Launch on Windows Startup',
    description: 'Automatically starts RYZ Auth in background when you sign in to Windows.',
    supported: true,
  };
}

/**
 * Platform-adaptive protection status in Settings
 */
export function getProtectionStatus(): { title: string; description: string } {
  const p = getPlatform();
  switch (p) {
    case 'android':
      return {
        title: 'Android Keystore / Hardware Enclave',
        description: 'Active. Master keys are hardware-bound using device cryptographic entropy.',
      };
    case 'ios':
      return {
        title: 'Apple Secure Enclave / Keychain',
        description: 'Active. Master keys are hardware-bound using Apple Secure Enclave.',
      };
    case 'mac':
      return {
        title: 'macOS Keychain / Secure Enclave',
        description: 'Active. Master keys are bound to your macOS user keychain.',
      };
    case 'linux':
      return {
        title: 'Secret Service / Hardware Guard',
        description: 'Active. Master keys are bound to machine-id and local user keyring.',
      };
    case 'windows':
    default:
      return {
        title: 'Windows Hello / DPAPI Protection',
        description: 'Active. Vault keys are bound to your Windows user profile credentials.',
      };
  }
}
