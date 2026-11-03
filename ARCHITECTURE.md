# RYZ Auth — Enterprise-Grade Architecture & Security Specification

**Version:** 1.1.0  
**Author:** R ! Y 4 Z  
**Classification:** Open Architecture / Zero-Knowledge Cryptographic Standard  
**Target Environment:** Windows 10/11 (x86_64, aarch64), Linux (Wayland/X11), macOS (Apple Silicon / Intel)

---

## 1. Executive Summary

**RYZ Auth** is an open-standard, security-first desktop authenticator built on **Tauri v2**, **Rust**, and **React 19 + TypeScript**. It eliminates the common architectural vulnerabilities present in legacy electronic authenticators: plaintext database caches, unzeroed runtime memory, cloud telemetry leakage, and web-view secret exfiltration.

### Core Value Pillars
- **Zero-Trust Local Core:** The frontend webview *never* receives, caches, or touches raw cryptographic secrets (TOTP base32/hex seeds). The Rust core computes time-step HMAC codes in a protected enclave and passes only transient ephemeral display tokens across IPC.
- **Envelope Encryption at Rest:** Vault records are protected using **XChaCha20-Poly1305** authenticated encryption with keys derived via **Argon2id** (memory-hard, side-channel resistant), wrapped natively with **Windows DPAPI** and **Windows Hello (User Credential Cryptographic Provider)**.
- **End-to-End Encrypted (E2EE) Zero-Knowledge Cloud Sync:** Remote synchronization stores strictly client-encrypted blobs; the remote cloud infrastructure is completely blind to vault plaintext, device identities, and master keys.
- **Sub-Second Native Performance:** Instant startup (<400ms cold, <80ms warm), zero idle CPU footprint (0.0%), and under 35 MB base memory footprint.

---

## 2. Security Architecture

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                   |
|                 (React 19, TypeScript, Tailwind, shadcn)                |
|                                                                         |
|  - Ephemeral 6/8 Digit Display Cache (auto-invalidating, 30s max)      |
|  - ZERO plaintext base32 secrets in JS memory                          |
|  - Zero secrets in localStorage / IndexedDB / session storage           |
+----------------------------------------------------+--------------------+
                                                     |
                               Typed IPC Boundary    | (Invoke commands)
                               (Tauri v2 Scoped IPC) |
                                                     v
+----------------------------------------------------+--------------------+
|                             RUST BACKEND                                |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Cryptographic Core (`zeroize`, `secrecy`, `ring`, `argon2`)        |  |
|  | - RFC 6238 (TOTP) / RFC 4226 (HOTP) Engine                        |  |
|  | - Constant-time HMAC computation (SHA1, SHA256, SHA512)            |  |
|  | - Volatile memory zeroization on drop                              |  |
|  +----------------------------------+--------------------------------+  |
|                                     |                                   |
|  +----------------------------------v--------------------------------+  |
|  | Key Derivation & Platform Integration                            |  |
|  | - Master Password -> Argon2id (t=3, m=64MB, p=4)                  |  |
|  | - Windows DPAPI (`CryptProtectData`)                             |  |
|  | - Windows Hello (Biometric Credential Key wrapping)              |  |
|  +----------------------------------+--------------------------------+  |
|                                     |                                   |
|  +----------------------------------v--------------------------------+  |
|  | Storage Engine (SQLCipher 256-bit AES / Encrypted KV)             |  |
|  | - Encrypted at rest via XChaCha20-Poly1305 (24-byte random nonce) |  |
|  | - Write-Ahead Logging (WAL) with secure unlinked temp files      |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

### Defense-in-Depth Cryptographic Isolation
1. **Frontend Sandboxing:** IPC isolation prevents any XSS script injection from issuing direct storage reads. The IPC surface exposes *zero* queries that return raw secret strings.
2. **Process Memory Protection:** Secrets are allocated inside Rust pinned heap buffers wrapped with `zeroize::ZeroizeOnDrop` and `secrecy::Secret<Vec<u8>>`. Upon completion of HMAC calculations, sensitive intermediate buffers (`K`, `ipad`, `opad`) are wiped using assembly-level memory barriers (`std::sync::atomic::compiler_fence`).
3. **Anti-Dumping Countermeasures (Windows):** `SetProcessMitigationPolicy` flags enabled on boot:
   - `ProcessSignaturePolicy` (prevent loading unsigned DLLs)
   - `ProcessStrictHandleCheckPolicy`
   - Memory-enclave VirtualAlloc flags preventing external debugger memory dumps where possible.

---

## 3. Cryptographic Design

### Standards Adherence
- **RFC 6238 (TOTP):** Time-based One-Time Password Algorithm. Supports 30s default step, arbitrary intervals (e.g., 15s, 60s), and arbitrary offsets.
- **RFC 4226 (HOTP):** HMAC-Based One-Time Password Algorithm with monotonic persistent counter incrementation and re-synchronization look-ahead windows.
- **Digest Algorithms:** SHA-1 (legacy compatibility), SHA-256 (standard), SHA-512 (high security).

### Cryptographic Primitive Evaluation

| Primitive | Category | Status | Justification |
| :--- | :--- | :--- | :--- |
| **Argon2id** | KDF | **Selected** | Superior resistance to GPU/ASIC brute forcing and cache-timing side-channel attacks compared to PBKDF2 or scrypt. OWASP recommended parameters: $m=64\text{MB}, t=3, p=4$. |
| **XChaCha20-Poly1305**| AEAD | **Selected** | 192-bit extended nonce eliminates the risk of nonce reuse when generating billions of encrypted records across multi-device sync, with constant-time software performance immune to AES cache-timing attacks on non-AES-NI architectures. |
| **AES-256-GCM** | AEAD | *Secondary / DB Core* | Utilized inside SQLCipher hardware-accelerated block storage when AES-NI is present, but XChaCha20-Poly1305 is the definitive payload envelope standard. |

### Windows Native Integration Matrix

```
                      +-----------------------------+
                      |       Vault Secret Key      |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
    +-------------------+                         +-------------------+
    |   Windows DPAPI   |                         |   Windows Hello   |
    | (CryptProtectData)|                         |  (NCrypt Key ISO) |
    +---------+---------+                         +---------+---------+
              |                                             |
              | User-Context Local Machine Secret           | Hardware TPM 2.0 Pinned
              +----------------------+----------------------+
                                     |
                                     v
                  +-------------------------------------+
                  | Master Key Encryption Key (MKEK)    |
                  +-------------------------------------+
```

1. **Windows DPAPI (`CryptProtectData`):** Used to bind local application state to the active Windows user profile SID and login credentials. Protects against offline disk-theft scenarios when paired with BitLocker.
2. **TPM 2.0 & Windows Hello (`NCryptRegisterKeyProtectionProvider`):** Enables biometric / PIN unlock. An asymmetric keypair (ECDSA P-256) is generated in the TPM. The vault decryption key is encrypted with the public key; private key decryption requires successful biometric verification through Windows Hello APIs.

---

## 4. Cloud Sync Architecture (Zero-Knowledge E2EE)

The cloud backend is fundamentally zero-knowledge. Even a complete compromised database dump gives attackers only non-deterministic high-entropy ciphertexts.

```
Device A (Author)                                  Device B (Receiver)
[ Plaintext Vault ]                                 [ Plaintext Vault ]
        |                                                   ^
        v (Argon2id + XChaCha20-Poly1305)                   | (Decrypt)
[ Ciphertext Record ]                               [ Ciphertext Record ]
  + Sync Meta (Vector Clock)                          + Sync Meta (Vector Clock)
        |                                                   ^
        +------------> [ Untrusted Relay ] -----------------+
                       (Cloudflare / Rust Relay)
                       - Zero Vault Plaintext
                       - Zero Master Keys
                       - Zero OTP Derivations
```

### Sync Protocol Specification
- **Storage Backend Selection:** Recommends **Cloudflare Workers + D1 / Durable Objects** (or a self-hostable stateless Rust relay server) for ultra-low latency globally distributed edge endpoints with zero credential awareness.
- **Conflict Resolution:** **State-based CRDT (Conflict-free Replicated Data Type)** with Vector Clocks. Deleted items use monotonic tombstone flags ($t_{\text{deleted}}$) to ensure synchronization consistency across offline partitions.
- **Device Pairing Exchange:** PAKE protocol (SPAKE2+ or SAS-verified ephemeral X25519 ECDH exchange over QR code) allowing pairing between two devices without exposing master credentials.

---

## 5. Threat Modeling (STRIDE / Attacker Matrix)

| Threat Vector | Attack Scenario | RYZ Auth Mitigation Strategy | Residual Risk |
| :--- | :--- | :--- | :--- |
| **Malware File Read** | Infostealer steals `%APPDATA%/RYZAuth/vault.db` | Whole-file envelope encryption (XChaCha20-Poly1305) + Argon2id master key. Attacker acquires unusable high-entropy ciphertext. | Master password dictionary attacks if user chooses an insecure password (mitigated via zxcvbn entropy floor). |
| **Memory Scraping** | Dump of `ryz-auth.exe` process heap via tools like Mimikatz or ProcDump. | Rust `ZeroizeOnDrop`, pinned short-lived buffers, secrets never passed to webview memory. Code computation done strictly in ephemeral stack allocations. | Kernel-level drivers with active hypervisor inspection (inherent OS-level limitation). |
| **Stolen Laptop** | Physical access to powered-off laptop. | DPAPI user context + TPM 2.0 binding + optional cold master password lock requirement. | Cold-boot memory attacks on unhibernated RAM (mitigated by prompt auto-lock timer). |
| **Cloud Breach** | Central sync server compromised. | Server stores only opaque ciphertext blobs, zero cryptographic keys, and zero account metadata. | Metadata analysis (record payload sizes and sync frequency). Mitigated with deterministic padding. |
| **Clipboard Snooping** | Third-party background apps monitoring clipboard events. | Native OS clipboard timeout (wipes clipboard after 30 seconds) + custom Windows clipboard sequence token checking. | Instant clipboard grabbers reading buffer during the active 30s window. |
| **MitM / DNS Poisoning**| TLS interception on sync channel. | TLS 1.3 only, Certificate Pinning on sync client endpoints, payload encrypted client-side prior to network transit. | Compromised enterprise root CA installed directly on client OS (mitigated by E2EE layer). |

---

## 6. UI & Design System

### Visual Language & Aesthetic Formula
- **Base Canvas:** True OLED Deep Black (`#08090A` / `#000000`)
- **Card Surfaces:** Semi-translucent Glass (`rgba(18, 20, 24, 0.72)`) with subtle border lines (`rgba(255, 255, 255, 0.08)`) and high backdrop-blur (`16px`).
- **Brand Accents:** Radiant Electric Cyan (`#00F2FE`) and Deep Indigo Blue (`#4FACFE`).
- **Countdown Indicator:** Smooth circular SVG countdown with dynamic color shifts (Cyan > Amber > Crimson on last 5 seconds).

### Typography Hierarchy
- **Primary Display Font:** Inter or Geist Sans (`font-sans`)
- **OTP Code Typography:** JetBrains Mono or Geist Mono (`font-mono`) with tabular figures (`font-variant-numeric: tabular-nums`) for zero layout shifts during digit transitions.

---

## 7. Database & Storage Architecture

### Schema Definition (SQLCipher / SQLite)

```sql
-- Vault Metadata and Configuration
CREATE TABLE IF NOT EXISTS vault_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Vault Records (Payload Encrypted with Record-Specific Derived Keys)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,          -- UUIDv4
    issuer TEXT NOT NULL,                  -- Searchable index (plain or blind index)
    label TEXT NOT NULL,                   -- Searchable account name (e.g. user@domain.com)
    encrypted_secret BLOB NOT NULL,        -- XChaCha20-Poly1305 ciphertext (contains OTP secret)
    algorithm TEXT NOT NULL DEFAULT 'SHA1',-- SHA1, SHA256, SHA512
    digits INTEGER NOT NULL DEFAULT 6,     -- 6 or 8
    period INTEGER NOT NULL DEFAULT 30,    -- 30s, 60s
    counter INTEGER DEFAULT 0,             -- HOTP counter
    type TEXT NOT NULL DEFAULT 'TOTP',     -- 'TOTP' or 'HOTP'
    group_id TEXT,                         -- Foreign key to groups
    is_favorite INTEGER NOT NULL DEFAULT 0,
    icon_svg TEXT,
    created_at INTEGER NOT NULL,           -- Unix timestamp ms
    updated_at INTEGER NOT NULL,           -- Unix timestamp ms
    version INTEGER NOT NULL DEFAULT 1,    -- CRDT vector sequence
    is_deleted INTEGER NOT NULL DEFAULT 0  -- Tombstone flag for synchronization
);

-- Grouping & Categorization
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Registered Devices (For Sync & Audit)
CREATE TABLE IF NOT EXISTS registered_devices (
    device_id TEXT PRIMARY KEY NOT NULL,
    device_name TEXT NOT NULL,
    public_key BLOB NOT NULL,
    last_synced INTEGER NOT NULL
);
```

---

## 8. Rust Backend Module Layout

```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── src/
│   ├── main.rs                   # Entry point, single-instance lock, window config
│   ├── lib.rs                    # Tauri setup and plugin registrations
│   ├── error.rs                  # Strongly typed error system
│   ├── crypto/                   # Cryptographic engine
│   │   ├── mod.rs
│   │   ├── kdf.rs                # Argon2id implementation
│   │   ├── cipher.rs             # XChaCha20-Poly1305 encrypt/decrypt
│   │   ├── totp.rs               # RFC 6238 / RFC 4226 implementation
│   │   └── memory.rs             # Secure zeroized allocations & guards
│   ├── platform/                 # Windows OS Specifics
│   │   ├── mod.rs
│   │   ├── dpapi.rs              # Windows DPAPI bindings
│   │   ├── hello.rs              # Windows Hello & TPM 2.0 WebAuthn/NCrypt
│   │   └── clipboard.rs          # Auto-clearing secure clipboard manager
│   ├── storage/                  # Persistence layer
│   │   ├── mod.rs
│   │   ├── db.rs                 # SQLite connection & migrations
│   │   └── repository.rs         # Account and Group CRUD operations
│   ├── sync/                     # Cloud synchronization engine
│   │   ├── mod.rs
│   │   ├── crdt.rs               # State vector reconciliation
│   │   └── client.rs             # E2EE sync networking client
│   └── commands/                 # IPC Dispatchers (Zero raw secret leakage)
│       ├── mod.rs
│       ├── auth_commands.rs      # Unlock, lock, check status
│       ├── vault_commands.rs     # Get codes, add account, delete, favorite
│       └── backup_commands.rs    # Export/import encrypted backups
```

---

## 9. Frontend Architecture (React + TypeScript)

```
src/
├── index.html
├── main.tsx                      # App bootstrap & provider wrapping
├── App.tsx                       # Root layout & state switcher (Locked/Unlocked)
├── assets/                       # Static SVGs, icons
├── components/
│   ├── ui/                       # shadcn/ui primitives (button, dialog, input, etc.)
│   ├── layout/                   # Sidebar, Header, WindowFrame controls
│   ├── vault/
│   │   ├── AccountList.tsx       # Virtualized list of TOTP accounts
│   │   ├── AccountCard.tsx       # Individual card with timer & code
│   │   ├── CountdownRing.tsx     # High-efficiency SVG countdown
│   │   ├── SearchBar.tsx         # Instant client search & tag filters
│   │   └── AddAccountModal.tsx   # QR Scanner / Manual Entry wizard
│   ├── settings/
│   │   ├── SecuritySettings.tsx  # Master password, Windows Hello toggle
│   │   ├── CloudSettings.tsx     # Sync config & paired devices
│   │   └── BackupSettings.tsx    # Encrypted export & paper backup
│   └── shared/
│       ├── KeyCombo.tsx
│       └── CopyBadge.tsx
├── hooks/
│   ├── useTotpStream.ts          # Synchronized time-step state tick
│   ├── useVault.ts               # TanStack query wrapper for vault commands
│   └── useClipboard.ts           # Auto-clearing clipboard trigger
├── store/
│   ├── useAuthStore.ts           # Vault locked status, active session state
│   └── useUIStore.ts             # Active group, search query, display options
└── types/
    └── index.ts                  # Shared IPC payload types
```

---

## 10. Typed Tauri IPC Interface

```typescript
// IPC Commands Contract (Frontend <-> Rust Backend)

export interface AccountSummary {
  id: string;
  issuer: string;
  label: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  isFavorite: boolean;
  groupId?: string;
  currentCode: string;   // Computed exclusively in Rust, transient
  remainingSeconds: number;
}

export interface UnlockVaultRequest {
  password?: string;
  useWindowsHello?: boolean;
}

export interface AddAccountPayload {
  issuer: string;
  label: string;
  secret: string; // Transferred once over IPC, immediately encrypted & zeroized
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
  counter?: number;
  type?: 'TOTP' | 'HOTP';
}
```

---

## 11. Performance Benchmarks & Targets

- **Cold Startup Time:** $\le 450\text{ms}$ on standard NVMe SSDs.
- **Memory Footprint:** $\le 35\text{MB}$ working set (Rust core + Webview runtime).
- **Idle CPU Utilization:** $0.00\%$ (all UI timers synchronized to OS monotonic epoch intervals without unaligned high-frequency polling).
- **Search Latency:** $< 2\text{ms}$ for 1,000 vault items using in-memory indexed prefix lookup.
- **IPC Latency:** $< 0.4\text{ms}$ per roundtrip code-refresh cycle.

---

## 12. Verification & Implementation Roadmap

- [x] **Milestone 1:** Architecture, Cryptography & Threat Specification
- [ ] **Milestone 2:** Tauri v2 Project Scaffolding & Rust Cryptographic Enclave
- [ ] **Milestone 3:** Windows DPAPI & Windows Hello Biometric Binding
- [ ] **Milestone 4:** React 19 Frontend with Tailwind, shadcn & Smooth Ring Timer
- [ ] **Milestone 5:** QR Code Vision Pipeline (Screen Capture + Webcam)
- [ ] **Milestone 6:** Zero-Knowledge E2EE Cloud Sync & Encrypted Vault Backups
