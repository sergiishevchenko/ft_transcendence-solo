# WAF/ModSecurity + HashiCorp Vault

## Overview

Web Application Firewall (WAF) using ModSecurity with OWASP CRS protects the application from common web attacks. HashiCorp Vault provides centralized secret management for sensitive configuration values.

**Stage**: 5 (Security)
**Module type**: Major (Cybersecurity)
**Status**: Implemented

## ModSecurity WAF

### Architecture

```
Client → Nginx + ModSecurity → Backend/Frontend
              │
              ├── OWASP CRS rules
              ├── Custom rules (XSS, SQLi, path traversal)
              └── Request filtering and logging
```

The nginx container uses the `owasp/modsecurity-crs:nginx-alpine` image, which bundles nginx with the ModSecurity module and OWASP Core Rule Set pre-installed.

### Docker Configuration

```yaml
nginx:
  image: owasp/modsecurity-crs:nginx-alpine
  volumes:
    - ./modsecurity/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./modsecurity/modsecurity.conf:/etc/modsecurity.d/modsecurity.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
  environment:
    - MODSEC_RULE_ENGINE=On
    - PARANOIA=1
    - ANOMALY_INBOUND=5
    - ANOMALY_OUTBOUND=4
```

### WAF Rules

**Custom Rules** (`modsecurity/modsecurity.conf`):

| Rule ID | Type | Description |
|---------|------|-------------|
| 200002 | XSS | Detects cross-site scripting patterns in arguments |
| 200003 | SQLi | Detects SQL injection patterns in arguments |
| 200004 | File | Blocks access to backup/temp files (.bak, .old, .tmp) |
| 200005 | File | Blocks access to hidden files (except .well-known) |
| 200006 | Header | Rejects requests with empty User-Agent |
| 200007 | Method | Allows only GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH |
| 200008 | Header | Requires Host header |
| 200009 | Path | Blocks path traversal attempts (../) |

**OWASP CRS Configuration**:

| Parameter | Value | Description |
|-----------|-------|-------------|
| Paranoia Level | 1 | Standard detection level |
| Inbound Anomaly Threshold | 5 | Points before blocking request |
| Outbound Anomaly Threshold | 4 | Points before blocking response |

### Request Limits

| Zone | Rate | Purpose |
|------|------|---------|
| `api` | 30 req/s, burst 50 | General API rate limiting |
| `auth` | 5 req/s, burst 10 | Auth endpoints (login, register, 2FA) |
| `addr` | 50 connections | Per-IP connection limit |

### Security Headers

All responses include:

| Header | Value |
|--------|-------|
| `X-Frame-Options` | SAMEORIGIN |
| `X-Content-Type-Options` | nosniff |
| `X-XSS-Protection` | 1; mode=block |
| `Referrer-Policy` | strict-origin-when-cross-origin |
| `Content-Security-Policy` | default-src 'self'; script-src 'self' 'unsafe-inline'; ... |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=() |
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains |

### TLS Configuration

- Protocols: TLSv1.2 and TLSv1.3 only
- Ciphers: ECDHE-based (forward secrecy)
- Session cache: 10MB shared SSL cache

### Backend XSS Middleware

In addition to WAF, the backend has an XSS sanitization middleware (`sanitize.middleware.ts`) as defense-in-depth:

- Checks request body and query parameters for XSS patterns
- Detects `<script>`, `javascript:`, `on*=` event handlers, `<iframe>`, `<object>`, `<embed>`
- Sanitizes HTML entities: `&`, `<`, `>`, `"`, `'`
- Rejects dangerous query parameters with 400 status

### Audit Logging

ModSecurity audit logs capture:
- Request headers and body
- Response headers
- Matched rules
- Stored at `/var/log/modsecurity/modsec_audit.log`

## HashiCorp Vault

### Architecture

```
Backend ──→ Vault API ──→ Secret Storage
  │                          │
  └── Fallback to .env ◄────┘ (if Vault unavailable)
```

### Docker Configuration

```yaml
vault:
  image: hashicorp/vault:1.15
  ports:
    - "8200:8200"
  volumes:
    - ./vault/config:/vault/config:ro
    - vault-data:/vault/data
  environment:
    - VAULT_DEV_ROOT_TOKEN_ID=transcendence-dev-token
    - VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200
  cap_add:
    - IPC_LOCK
  command: server -dev
```

Runs in dev mode for development. Production would use proper initialization, unsealing, and authentication.

### Vault Configuration

```hcl
ui = true
storage "file" { path = "/vault/data" }
listener "tcp" { address = "0.0.0.0:8200"; tls_disable = 1 }
```

### Secret Path

All application secrets stored at `secret/data/transcendence`:

| Key | Description |
|-----|-------------|
| `jwt_secret` | JWT signing key |
| `session_secret` | Session encryption key |
| `oauth_google_client_id` | Google OAuth client ID |
| `oauth_google_client_secret` | Google OAuth client secret |
| `oauth_github_client_id` | GitHub OAuth client ID |
| `oauth_github_client_secret` | GitHub OAuth client secret |

### Backend Integration

`VaultService` (`backend/src/services/vault.service.ts`):

- `initialize()` — connects to Vault, seeds secrets from env vars
- `getSecret(key)` — reads a secret from Vault
- `getJwtSecret()` — returns JWT secret (Vault → env var fallback)
- `getOAuthCredentials(provider)` — returns OAuth credentials
- `isEnabled()` — checks if Vault is connected

### Graceful Fallback

The service falls back to environment variables when:
- `VAULT_ENABLED` is not `true`
- Vault container is not running
- Vault connection fails

This ensures the application works without Vault in development.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_ADDR` | `http://vault:8200` | Vault API address |
| `VAULT_TOKEN` | `transcendence-dev-token` | Vault authentication token |
| `VAULT_ENABLED` | `false` | Enable/disable Vault integration |

### Health Check

The `/health` endpoint reports Vault status:

```json
{
  "status": "ok",
  "vault": true
}
```

## File Structure

```
modsecurity/
├── nginx.conf             ← Nginx config with ModSecurity module
└── modsecurity.conf       ← WAF rules and configuration

vault/
└── config/
    └── vault.hcl          ← Vault server configuration

backend/src/
├── services/
│   └── vault.service.ts   ← Vault client integration
├── middleware/
│   └── sanitize.middleware.ts ← XSS input sanitization

nginx/
└── nginx.conf             ← Updated with security headers and CSP

docker-compose.yml         ← Added vault and modsecurity services
```
