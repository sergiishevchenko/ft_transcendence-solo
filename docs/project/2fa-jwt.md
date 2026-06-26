# 2FA + JWT

## Overview

Two-Factor Authentication adds a second verification step after password login. Combined with enhanced JWT token management including proper refresh token rotation and token revocation.

**Stage**: 5 (Security)
**Module type**: Major (Cybersecurity)
**Status**: Not yet implemented

## Current State

The project already uses JWT for authentication (`backend/src/services/auth.service.ts`):
- Access token: 15-minute expiry
- Refresh token: 7-day expiry
- Both signed with `JWT_SECRET` from environment
- No refresh endpoint — tokens are issued at login only
- No token revocation — tokens valid until expiry

## Planned Implementation

### Enhanced JWT

#### Token Rotation

```
Login → access_token (15min) + refresh_token (7d)
                                    │
              access expired ◄──────┘
                    │
    POST /api/auth/refresh { refreshToken }
                    │
              new access_token + new refresh_token
              (old refresh_token invalidated)
```

#### Token Blacklist

Store revoked tokens in a database table:

```sql
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_jti TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Each JWT includes a `jti` (JWT ID) claim. On logout or token rotation, the old token's `jti` is added to the blacklist. Auth middleware checks blacklist before accepting a token.

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/refresh` | Exchange refresh token for new token pair |
| POST | `/api/auth/logout` | Revoke current tokens |
| POST | `/api/auth/logout-all` | Revoke all user tokens |

### Two-Factor Authentication

#### Method: TOTP (Time-based One-Time Password)

Compatible with Google Authenticator, Authy, and similar apps.

#### Setup Flow

```
1. User navigates to Profile → Security → Enable 2FA
2. Backend generates TOTP secret (base32)
3. Backend returns secret as QR code (otpauth:// URI)
4. User scans QR with authenticator app
5. User enters 6-digit code to verify setup
6. Backend saves secret and generates backup codes
7. User shown backup codes (one-time display)
```

#### Login Flow with 2FA

```
1. POST /api/auth/login { username, password }
2. If 2FA enabled → response: { requires2FA: true, tempToken }
3. POST /api/auth/verify-2fa { tempToken, code }
4. Server verifies TOTP code
5. If valid → return full access_token + refresh_token
6. If invalid → 401
```

The `tempToken` is a short-lived JWT (5 min) that only grants access to the 2FA verification endpoint.

#### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/2fa/setup` | Yes | Generate TOTP secret and QR code |
| POST | `/api/auth/2fa/verify-setup` | Yes | Verify code and enable 2FA |
| POST | `/api/auth/2fa/disable` | Yes | Disable 2FA (requires current code) |
| POST | `/api/auth/verify-2fa` | Temp | Verify 2FA code during login |
| POST | `/api/auth/2fa/backup-codes` | Yes | Regenerate backup codes |

#### Database Changes

```sql
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS backup_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code_hash TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Backup Codes

- 10 single-use backup codes generated on 2FA setup
- Each code is a random 8-character alphanumeric string
- Stored hashed (bcrypt) in the database
- Used codes marked as consumed
- Can be regenerated (invalidates all previous codes)

### Dependencies

```json
{
    "otplib": "^12.0.0",
    "qrcode": "^1.5.0"
}
```

- `otplib` — TOTP generation and verification
- `qrcode` — QR code generation for authenticator setup

### Frontend UI

Profile page → Security section:

```
┌─────────────────────────────────┐
│ Two-Factor Authentication       │
│                                 │
│ Status: ● Disabled              │
│                                 │
│ [Enable 2FA]                    │
│                                 │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                 │
│ Active Sessions                 │
│ • Chrome on macOS  [Revoke]     │
│ • Firefox on Linux [Revoke]     │
│                                 │
│ [Logout All Devices]            │
└─────────────────────────────────┘
```

Login page with 2FA:

```
┌─────────────────────────────────┐
│ Two-Factor Authentication       │
│                                 │
│ Enter the 6-digit code from     │
│ your authenticator app:         │
│                                 │
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐      │
│ │ │ │ │ │ │ │ │ │ │ │ │        │
│ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘      │
│                                 │
│ [Verify]                        │
│                                 │
│ Use backup code instead         │
└─────────────────────────────────┘
```

### Security Considerations

- TOTP secrets encrypted at rest (or stored in Vault if available)
- Backup codes hashed with bcrypt
- Rate limiting on 2FA verification (max 5 attempts per temp token)
- Temp tokens cannot access any endpoint except `/verify-2fa`
- TOTP window: ±1 period (30 seconds) to account for clock drift
