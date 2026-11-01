use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct PlaintextPayload(pub Vec<u8>);

/// Encrypts sensitive payload using XChaCha20-Poly1305 with random 24-byte nonce
pub fn encrypt_envelope(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| format!("Cipher key initialization failure: {}", e))?;

    let mut nonce_bytes = [0u8; 24];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failure: {}", e))?;

    // Prepend 24-byte nonce to ciphertext payload
    let mut envelope = Vec::with_capacity(24 + ciphertext.len());
    envelope.extend_from_slice(&nonce_bytes);
    envelope.extend_from_slice(&ciphertext);

    Ok(envelope)
}

/// Decrypts envelope payload using XChaCha20-Poly1305
pub fn decrypt_envelope(key: &[u8; 32], envelope: &[u8]) -> Result<PlaintextPayload, String> {
    if envelope.len() < 24 + 16 {
        // 24-byte nonce + 16-byte Poly1305 tag minimum
        return Err("Malformed ciphertext envelope: insufficient length".to_string());
    }

    let (nonce_bytes, ciphertext) = envelope.split_at(24);
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| format!("Cipher key initialization failure: {}", e))?;

    let nonce = XNonce::from_slice(nonce_bytes);
    let decrypted = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Authentication tag mismatch or corrupted ciphertext".to_string())?;

    Ok(PlaintextPayload(decrypted))
}
