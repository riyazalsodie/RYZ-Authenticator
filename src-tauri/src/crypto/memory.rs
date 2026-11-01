use std::sync::atomic::{compiler_fence, Ordering};
use zeroize::Zeroize;

/// Secure memory cleanup helper enforcing compiler memory fences
pub fn secure_wipe<T: Zeroize>(val: &mut T) {
    val.zeroize();
    compiler_fence(Ordering::SeqCst);
}
