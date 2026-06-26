# GDPR Compliance

## Overview

The application implements GDPR (General Data Protection Regulation) compliance features, allowing users to exercise their rights regarding personal data: access, export, rectification, anonymization, and deletion.

**Stage**: 5 (Security)
**Module type**: Minor (Cybersecurity)
**Status**: Implemented

## User Rights

| Right | Implementation |
|-------|---------------|
| Right to Access | Data export (JSON download) |
| Right to Rectification | Profile editing (display name, avatar) |
| Right to Erasure | Account deletion with cascade |
| Right to Data Portability | Full data export in JSON format |
| Right to Be Forgotten | Account anonymization |

## Data Export

**Endpoint**: `GET /api/gdpr/export`

Returns a JSON file containing all personal data:

```json
{
  "profile": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "display_name": "User",
    "avatar": null,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "games": [...],
  "messages": [...],
  "tournaments": [...],
  "friends": [...]
}
```

The response includes:
- **Profile**: username, email, display name, avatar, registration date
- **Games**: all match history with scores and results
- **Messages**: all sent and received chat messages
- **Tournaments**: tournament participation records
- **Friends**: friend connections

Downloaded as `my-data.json` via the frontend Privacy page.

## Account Anonymization

**Endpoint**: `POST /api/gdpr/anonymize`

Replaces personal data with anonymous identifiers while preserving game statistics:

| Field | Before | After |
|-------|--------|-------|
| username | `user123` | `deleted_a3f7b2c1` |
| email | `user@example.com` | `deleted_a3f7b2c1@anonymous.local` |
| display_name | `Cool User` | `NULL` |
| avatar | `/uploads/avatar.jpg` | `NULL` |
| password | `$2b$...` | `NULL` |
| oauth_provider | `google` | `NULL` |
| is_active | `1` | `0` |

Additional cleanup:
- TOTP secrets and 2FA settings deleted
- Refresh tokens revoked
- Friend connections removed
- Block lists cleared
- Chat messages replaced with `[deleted]`

Requires password confirmation for security.

## Account Deletion

**Endpoint**: `DELETE /api/gdpr/account`

Permanently removes all user data using a transactional cascade delete:

```
1. Delete from user_totp
2. Delete from refresh_tokens
3. Delete from friends
4. Delete from blocked_users
5. Delete from chat_messages
6. Delete from games
7. Delete from users
```

Requires:
- Password confirmation
- Typing `DELETE` as explicit confirmation
- Frontend shows a browser `confirm()` dialog

All operations run in a single SQLite transaction for atomicity.

## Privacy Policy

The frontend Privacy page (`/privacy`) displays:

| Section | Content |
|---------|---------|
| Data Collection | What data is collected (username, email, game stats, messages) |
| Data Usage | Service provision only, no third-party sharing |
| Data Storage | Local SQLite database |
| User Rights | Access, export, rectify, delete rights under GDPR |
| Cookies | localStorage tokens only, no tracking cookies |
| Contact | System administrator reference |

## Frontend Privacy Page

Located at `/privacy`, accessible from Profile → "Privacy & Data":

### Data Management Tools

| Tool | Action | Confirmation |
|------|--------|-------------|
| Export Data | Downloads JSON file | None required |
| Anonymize | Replaces personal data | Password + confirm dialog |
| Delete Account | Removes all data | Password + type "DELETE" + confirm dialog |

### Profile Integration

The Profile page (`/profile`) includes a "Security & Privacy" section with links to:
- Two-Factor Authentication setup (`/2fa`)
- Privacy & Data management (`/privacy`)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gdpr/export` | Yes | Download personal data as JSON |
| POST | `/api/gdpr/anonymize` | Yes | Anonymize account (requires password) |
| DELETE | `/api/gdpr/account` | Yes | Delete account (requires password + "DELETE") |

## File Structure

```
backend/src/
├── services/
│   └── gdpr.service.ts    ← Data export, anonymization, deletion logic
├── routes/
│   └── gdpr.routes.ts     ← REST endpoints with auth middleware

frontend/src/
├── pages/
│   ├── Privacy.ts         ← Privacy policy + data management UI
│   └── Profile.ts         ← Updated: links to /2fa and /privacy
```

## Data Collected

| Category | Data Fields | Purpose |
|----------|-------------|---------|
| Account | username, email, password_hash | Authentication |
| Profile | display_name, avatar_url | Personalization |
| Social | friends, blocked_users | Social features |
| Games | scores, opponents, timestamps | Game history |
| Chat | messages, sender/receiver | Communication |
| Security | totp_secret, refresh_tokens | 2FA and sessions |

## Security Measures

- Password verification before destructive actions
- Double confirmation for account deletion (password + "DELETE" text)
- Browser `confirm()` dialog for additional safety
- Transactional deletion (all-or-nothing)
- Session cleared after anonymization/deletion (redirect to home)
- Anonymized usernames are random hex strings (non-reversible)
