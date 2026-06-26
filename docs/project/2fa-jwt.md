# 2FA + JWT

## Overview

Two-Factor Authentication adds a second verification step after password login using TOTP (Time-based One-Time Password). Combined with JWT refresh token rotation and token revocation for enhanced security.

**Stage**: 5 (Security)
**Module type**: Major (Cybersecurity)
**Status**: Implemented

## JWT Token Management

### Token Types

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Obtain new access/refresh pair |
| Temp Token | 5 minutes | 2FA verification during login |

### Token Rotation

```
Login → access_token (15min) + refresh_token (7d)
                                    │
              access expired ◄──────┘
                    │
    POST /api/auth/refresh { refreshToken }
                    │
              new access_token + new refresh_token
              (old refresh_token revoked)
```

Each refresh token is stored hashed (SHA-256) in the `refresh_tokens` table. When used, the old token is revoked and a new pair is issued. This prevents token reuse attacks.

### Refresh Token Storage

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Frontend Auto-Refresh

The `AuthService` on the frontend automatically attempts token refresh when a 401 response is received:

1. API call returns 401
2. `refreshTokens()` sends refresh token to backend
3. New tokens stored in `localStorage`
4. Original request retried with new access token
5. If refresh fails, user is logged out

A deduplication mechanism (`refreshPromise`) prevents multiple concurrent refresh requests.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/refresh` | No | Exchange refresh token for new token pair |
| POST | `/api/auth/logout` | Yes | Revoke refresh token, clear session |

## Two-Factor Authentication (TOTP)

### Method

TOTP — compatible with Google Authenticator, Authy, Microsoft Authenticator, and similar apps.

Library: `otpauth` (TypeScript-native TOTP implementation)

### Setup Flow

```
1. User navigates to Profile → Security → Enable 2FA
2. POST /api/auth/2fa/setup → generates TOTP secret
3. Backend returns QR code (data URL) + secret (base32)
4. User scans QR with authenticator app
5. User enters 6-digit code from app
6. POST /api/auth/2fa/enable { code }
7. Backend verifies code, enables 2FA
8. Backend returns 8 backup codes (one-time display)
```

### Login Flow with 2FA

```
1. POST /api/auth/login { usernameOrEmail, password }
2. Password verified ✓
3. 2FA enabled? → response: { requires2FA: true, tempToken }
4. Frontend shows 2FA input form
5. POST /api/auth/verify-2fa { tempToken, code }
6. Server verifies TOTP code (window: ±1 period)
7. Valid → return access_token + refresh_token
8. Invalid → 401 error
```

The `tempToken` is a JWT with `purpose: '2fa_verification'` and 5-minute expiry. It only grants access to the verify-2fa endpoint.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/2fa/setup` | Yes | Generate TOTP secret and QR code |
| POST | `/api/auth/2fa/enable` | Yes | Verify code and enable 2FA, returns backup codes |
| POST | `/api/auth/2fa/disable` | Yes | Disable 2FA (requires current code) |
| GET | `/api/auth/2fa/status` | Yes | Check if 2FA is enabled |
| POST | `/api/auth/verify-2fa` | Temp | Verify 2FA code during login |

### Database

```sql
CREATE TABLE IF NOT EXISTS user_totp (
    user_id INTEGER PRIMARY KEY,
    secret TEXT NOT NULL,
    enabled INTEGER DEFAULT 0,
    backup_codes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- `secret`: Base32-encoded TOTP secret
- `enabled`: Whether 2FA is active (0/1)
- `backup_codes`: JSON array of SHA-256 hashed backup codes

### Backup Codes

- 8 single-use codes generated on 2FA enable
- Each code is 8 hex characters (e.g., `A3F7B2C1`)
- Stored hashed with SHA-256
- Used codes removed from the array
- Can be used instead of TOTP code during login

### Frontend Pages

**2FA Setup Page** (`/2fa`):
- Shows current 2FA status (enabled/disabled)
- Enable flow: QR code display → code verification → backup codes display
- Disable flow: enter current TOTP code to confirm
- Manual entry option (base32 secret for copy-paste)

**Login Page** (`/login`):
- Standard username/password form
- If 2FA required: switches to code input view
- Supports both TOTP codes and backup codes
- "Back to login" button to return to credentials form

### File Structure

```
backend/src/
├── services/
│   ├── totp.service.ts    ← TOTP generation, verification, backup codes, refresh tokens
│   └── auth.service.ts    ← Updated: 2FA login flow, token rotation
├── routes/
│   └── auth.routes.ts     ← Updated: 2FA and refresh endpoints

frontend/src/
├── pages/
│   ├── Login.ts           ← Updated: 2FA verification step
│   └── TwoFactorSetup.ts  ← New: 2FA setup page
├── services/
│   └── auth.service.ts    ← Updated: verify2FA(), refreshTokens(), logout()
```

### Security Considerations

- TOTP verification window: ±1 period (30 seconds) to account for clock drift
- Temp tokens restricted to `2fa_verification` purpose
- Refresh tokens hashed before storage (SHA-256)
- Expired/revoked tokens cleaned up periodically
- Backup codes are one-time use
- `POST /api/auth/logout` revokes the associated refresh token

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `otpauth` | latest | TOTP generation and verification |
| `qrcode` | latest | QR code generation (data URL format) |
