use argon2::{Algorithm, Argon2, Params, Version};
use zeroize::{Zeroize, ZeroizeOnDrop};


#[derive(Zeroize, ZeroizeOnDrop)]
pub struct DerivedKey(pub [u8; 32]);

/// Derives a 256-bit symmetric key from master password using Argon2id (m=64MB, t=3, p=4)
pub fn derive_master_key(password: &str, salt: &[u8]) -> Result<DerivedKey, String> {
    if salt.len() < 16 {
        return Err("Salt must be at least 16 bytes for cryptographically secure KDF".to_string());
    }

    // OWASP Recommended parameters for password hashing & key derivation
    let params = Params::new(
        64 * 1024, // 64 MB memory
        3,         // 3 iterations
        4,         // 4 parallel threads
        Some(32),  // 32-byte key output
    )
    .map_err(|e| format!("Argon2 params initialization failed: {}", e))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key_bytes = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key_bytes)
        .map_err(|e| format!("Argon2id derivation failed: {}", e))?;

    Ok(DerivedKey(key_bytes))
}

/// Generates a cryptographically random 16-byte salt
pub fn generate_salt() -> [u8; 16] {
    use rand::RngCore;
    let mut salt = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    salt
}
