use data_encoding::BASE32_NOPAD;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use std::time::{SystemTime, UNIX_EPOCH};
use zeroize::{Zeroize, ZeroizeOnDrop};

type HmacSha1 = Hmac<Sha1>;
type HmacSha256 = Hmac<Sha256>;
type HmacSha512 = Hmac<Sha512>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Algorithm {
    SHA1,
    SHA256,
    SHA512,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TotpConfig {
    pub algorithm: Algorithm,
    pub digits: u32,
    pub period: u64,
}

impl Default for TotpConfig {
    fn default() -> Self {
        Self {
            algorithm: Algorithm::SHA1,
            digits: 6,
            period: 30,
        }
    }
}

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretBuffer(pub Vec<u8>);

pub struct OtpEngine;

impl OtpEngine {
    /// Decodes base32 secret safely into a zeroizable buffer
    pub fn decode_secret(secret_base32: &str) -> Result<SecretBuffer, String> {
        let clean = secret_base32
            .trim()
            .replace(' ', "")
            .replace('-', "")
            .to_uppercase();

        let raw = BASE32_NOPAD
            .decode(clean.trim_end_matches('=').as_bytes())
            .map_err(|e| format!("Base32 decode failure: {}", e))?;

        Ok(SecretBuffer(raw))
    }

    /// Computes RFC 4226 HOTP code for a given monotonic counter
    pub fn compute_hotp(
        secret: &SecretBuffer,
        counter: u64,
        config: &TotpConfig,
    ) -> Result<String, String> {
        let counter_bytes = counter.to_be_bytes();

        let hash_bytes: Vec<u8> = match config.algorithm {
            Algorithm::SHA1 => {
                let mut mac = HmacSha1::new_from_slice(&secret.0)
                    .map_err(|e| format!("HMAC key failure: {}", e))?;
                mac.update(&counter_bytes);
                mac.finalize().into_bytes().to_vec()
            }
            Algorithm::SHA256 => {
                let mut mac = HmacSha256::new_from_slice(&secret.0)
                    .map_err(|e| format!("HMAC key failure: {}", e))?;
                mac.update(&counter_bytes);
                mac.finalize().into_bytes().to_vec()
            }
            Algorithm::SHA512 => {
                let mut mac = HmacSha512::new_from_slice(&secret.0)
                    .map_err(|e| format!("HMAC key failure: {}", e))?;
                mac.update(&counter_bytes);
                mac.finalize().into_bytes().to_vec()
            }
        };

        // RFC 4226 Dynamic Truncation
        let offset = (hash_bytes.last().unwrap() & 0x0f) as usize;
        let binary_code = ((hash_bytes[offset] as u32 & 0x7f) << 24)
            | ((hash_bytes[offset + 1] as u32 & 0xff) << 16)
            | ((hash_bytes[offset + 2] as u32 & 0xff) << 8)
            | (hash_bytes[offset + 3] as u32 & 0xff);

        let modulo = 10u32.pow(config.digits);
        let otp = binary_code % modulo;

        Ok(format!("{:0width$}", otp, width = config.digits as usize))
    }

    /// Computes RFC 6238 TOTP code for a given timestamp
    pub fn compute_totp(
        secret: &SecretBuffer,
        unix_time: u64,
        config: &TotpConfig,
    ) -> Result<(String, u64), String> {
        if config.period == 0 {
            return Err("Invalid period 0".to_string());
        }

        let time_step = unix_time / config.period;
        let remaining_seconds = config.period - (unix_time % config.period);
        let code = Self::compute_hotp(secret, time_step, config)?;

        Ok((code, remaining_seconds))
    }

    /// Computes current TOTP code using current system epoch
    pub fn compute_current_totp(
        secret: &SecretBuffer,
        config: &TotpConfig,
    ) -> Result<(String, u64), String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs();

        Self::compute_totp(secret, now, config)
    }
}
