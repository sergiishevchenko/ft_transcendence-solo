# SSL Certificates in This Project

For general SSL/TLS concepts see [SSL/TLS theory](../theory/ssl-tls.md).

## Overview

Nginx requires TLS certificates to serve HTTPS on port 443. The project uses **self-signed** certificates for local development.

## Generation

The Makefile generates certificates automatically if they are missing:

```bash
make ssl
```

This command:

- Creates `nginx/ssl/` if it does not exist
- Generates `cert.pem` and `key.pem` via OpenSSL
- Sets validity to 365 days
- Uses RSA 2048-bit keys
- Sets Common Name to `localhost`

### Certificate subject

| Field | Value |
|-------|-------|
| Country (C) | CH |
| State (ST) | Lausanne |
| Locality (L) | Lausanne |
| Organization (O) | 42 |
| Common Name (CN) | localhost |

## File Locations

| File | Path |
|------|------|
| Certificate | `nginx/ssl/cert.pem` |
| Private key | `nginx/ssl/key.pem` |
| Nginx config | `nginx/nginx.conf` |
| Makefile target | `make ssl` (lines 85–96) |

Private keys are gitignored — never commit `key.pem`.

## Nginx Configuration

Certificates are mounted read-only into the nginx container:

```yaml
volumes:
  - ./nginx/ssl:/etc/nginx/ssl:ro
```

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
}
```

HTTP on port 80 redirects to HTTPS:

```nginx
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

See [Nginx](../theory/nginx.md) for full proxy and TLS setup.

## Why HTTPS Is Required Here

- Project spec requires HTTPS/WSS for all connections
- JWT and OAuth tokens must not travel over plain HTTP
- WebSocket endpoints (`/ws/game`, `/ws/chat`) require WSS
- Frontend `VITE_API_URL` points to `https://localhost/api`

## Troubleshooting

### nginx fails to start — certificate error

```bash
make ssl
```

### Browser security warning

Expected with self-signed certificates on `https://localhost`:

1. Open "Advanced" / "Show Details"
2. Proceed to localhost

### Certificate expired

```bash
rm nginx/ssl/cert.pem nginx/ssl/key.pem
make ssl
```

### Verify certificate contents

```bash
openssl x509 -in nginx/ssl/cert.pem -text -noout
```
