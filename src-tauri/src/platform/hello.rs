//! Biometric Credential Provider Stubs for RYZ Auth
//! Provides integration interface with Windows Hello / Touch ID / Android Biometrics.

pub fn is_windows_hello_available() -> bool {
    #[cfg(windows)]
    {
        // Queries presence of TPM 2.0 / Windows Hello biometric enrolment
        true
    }

    #[cfg(target_os = "macos")]
    {
        // Touch ID capability
        true
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        // Mobile fingerprint / Face ID biometric capability
        true
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "android", target_os = "ios")))]
    {
        false
    }
}
