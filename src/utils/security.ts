/**
 * Cryptographic & Secret Sanitization / Validation Utilities
 * Strict RFC 4648 Base32 Verification for TOTP / HOTP Authenticator Secrets
 */

export interface Base32ValidationResult {
  valid: boolean;
  cleanSecret: string;
  charCount: number;
  error?: string;
  warning?: string;
}

/**
 * Strips whitespace, hyphens, and converts to uppercase standard Base32
 */
export function sanitizeBase32(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[\s\-_:]/g, '').toUpperCase();
}

/**
 * Validates whether a secret key matches RFC 4648 standard Base32:
 * Alphabet: A-Z, 2-7, optional '=' padding.
 * Also detects common human OCR/transcription mistakes (0->O, 1->I/L, 8->B).
 */
export function validateBase32Secret(raw: string): Base32ValidationResult {
  const clean = sanitizeBase32(raw);

  if (!clean) {
    return {
      valid: false,
      cleanSecret: '',
      charCount: 0,
      error: 'Secret key cannot be empty.',
    };
  }

  // Detect illegal characters
  const illegalChars = clean.replace(/[A-Z2-7=]/g, '');
  if (illegalChars.length > 0) {
    const uniqueBad = Array.from(new Set(illegalChars.split(''))).join(', ');
    
    // Provide intelligent tips for common substitutions
    let hint = '';
    if (illegalChars.includes('0')) hint += ' "0" may be "O";';
    if (illegalChars.includes('1')) hint += ' "1" may be "I" or "L";';
    if (illegalChars.includes('8')) hint += ' "8" may be "B";';

    return {
      valid: false,
      cleanSecret: clean,
      charCount: clean.length,
      error: `Invalid Base32 character(s): ${uniqueBad}.${hint ? ` Note:${hint}` : ''} Base32 only accepts A-Z and 2-7.`,
    };
  }

  // Check padding: '=' can only appear at the end
  const paddingIndex = clean.indexOf('=');
  if (paddingIndex !== -1) {
    const afterPadding = clean.slice(paddingIndex);
    if (/[^=]/.test(afterPadding)) {
      return {
        valid: false,
        cleanSecret: clean,
        charCount: clean.length,
        error: 'Invalid Base32 padding: "=" must only appear at the end of the secret.',
      };
    }
  }

  // Check secret entropy length:
  // Standard RFC 6238 recommends at least 128 bits (16 Base32 characters) or 160 bits (32 Base32 characters)
  const unpaddedLen = clean.replace(/=+$/, '').length;
  let warning: string | undefined;

  if (unpaddedLen < 8) {
    return {
      valid: false,
      cleanSecret: clean,
      charCount: unpaddedLen,
      error: 'Secret key is too short (< 8 characters). Security risk: insufficient entropy.',
    };
  } else if (unpaddedLen < 16) {
    warning = 'Short secret key (< 16 chars). 16-32 Base32 characters recommended for full security.';
  }

  return {
    valid: true,
    cleanSecret: clean,
    charCount: unpaddedLen,
    warning,
  };
}
