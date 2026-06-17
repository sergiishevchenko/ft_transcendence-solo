# SSL/TLS

## What Is TLS

TLS (Transport Layer Security) is a cryptographic protocol that secures communication over a network. Its predecessor was SSL (Secure Sockets Layer). In practice both terms are used interchangeably — "SSL certificate" usually means a TLS certificate.

TLS provides two guarantees:

1. **Encryption** — data in transit cannot be read by third parties
2. **Authentication** — the client can verify it is talking to the intended server

HTTPS is HTTP wrapped in TLS. The URL uses `https://` and the default port is 443.

## TLS Handshake (simplified)

When a browser connects to `https://example.com`:

```
Client                                    Server
  │                                          │
  │──── ClientHello (supported ciphers) ────►│
  │◄─── ServerHello + certificate ───────────│
  │                                          │
  │  Client verifies certificate             │
  │  (signed by trusted CA or self-signed)   │
  │                                          │
  │──── Key exchange ───────────────────────►│
  │◄─── Session keys agreed ─────────────────│
  │                                          │
  │════ Encrypted HTTP traffic ══════════════│
```

After the handshake, all HTTP requests and responses travel encrypted.

## Certificate Components

A TLS certificate binds a **public key** to an identity (domain name, organization).

| File | Contents | Visibility |
|------|----------|------------|
| Certificate (`cert.pem`) | Public key, domain, issuer, expiry | Public — sent to every client |
| Private key (`key.pem`) | Secret key for decryption/signing | Private — must never leak |

The server proves ownership of the private key during the handshake without transmitting it.

### What a certificate contains

- **Subject** — who the cert is for (e.g. `CN=localhost`)
- **Issuer** — who signed it (CA name or same as subject for self-signed)
- **Validity period** — not before / not after dates
- **Public key** — used for key exchange
- **Signature** — CA's proof that the certificate is authentic

## Certificate Authorities (CA)

A **Certificate Authority** is a trusted third party that signs certificates. Browsers and operating systems ship with a list of trusted root CAs.

```
You → request cert for example.com → CA verifies domain ownership → CA signs cert → browsers trust it
```

### Chain of trust

```
Root CA certificate (built into OS/browser)
    └── Intermediate CA certificate
            └── Your server certificate (example.com)
```

Browsers validate the full chain back to a trusted root.

## Self-Signed vs Trusted Certificates

| | Self-signed | CA-signed (trusted) |
|---|-------------|----------------------|
| **Signer** | You sign your own cert | Trusted CA signs it |
| **Browser trust** | Warning shown | Trusted automatically |
| **Use case** | Local development, internal tools | Production, public sites |
| **Cost** | Free | Free (Let's Encrypt) or paid |
| **Domain verification** | None required | Required |

Self-signed certificates are cryptographically valid — encryption works. The problem is **trust**: nobody vouches for the identity, so browsers warn the user.

## Symmetric vs Asymmetric Encryption

TLS uses both:

- **Asymmetric** (public/private key) — during handshake to agree on session keys securely
- **Symmetric** (shared secret) — for actual data transfer (faster)

## Common File Formats

| Extension | Format | Notes |
|-----------|--------|-------|
| `.pem` | Base64-encoded DER | Most common in nginx, OpenSSL |
| `.crt` / `.cer` | Often PEM, sometimes DER | Certificate only |
| `.key` | PEM private key | Must be protected |
| `.p12` / `.pfx` | PKCS#12 bundle | Cert + key in one password-protected file |

This project uses PEM files: `cert.pem` and `key.pem`.

## TLS Termination

**TLS termination** means one server decrypts HTTPS and forwards plain HTTP to internal services:

```
Browser ──[HTTPS]──► nginx (decrypts) ──[HTTP]──► backend
```

Benefits:

- Centralized certificate management
- Inner services don't need TLS configuration
- Offloads crypto work from application servers

See [Nginx](./nginx.md) for how this project terminates TLS in nginx.

## Why HTTPS Matters for Web Apps

- **Passwords and tokens** — login forms, JWT, cookies must not travel in plain text
- **WebSocket (WSS)** — secure WebSocket requires HTTPS origin in browsers
- **Browser APIs** — Geolocation, WebRTC, Service Workers often require secure context
- **Mixed content** — HTTPS pages cannot load insecure HTTP resources
- **User trust** — padlock icon, no browser warnings

## Key Security Rules

1. **Never commit private keys** to version control
2. **Restrict file permissions** on `key.pem` (e.g. `chmod 600`)
3. **Rotate before expiry** — expired certs break all HTTPS traffic
4. **Use strong keys** — RSA 2048-bit minimum; ECDSA is also common today
5. **Keep TLS versions current** — disable SSLv3, TLS 1.0, TLS 1.1 in production

## Production Options

| Provider | Cost | Automation | Notes |
|----------|------|------------|-------|
| [Let's Encrypt](https://letsencrypt.org/) | Free | ACME protocol, certbot | 90-day certs, auto-renewal |
| Commercial CA | Paid | Varies | Extended validation (EV) for enterprise |
| Cloud provider | Often free | Built into load balancers | AWS ACM, Cloudflare, etc. |

## OpenSSL Basics

Generate a self-signed certificate (what `make ssl` does under the hood):

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/CN=localhost"
```

| Flag | Meaning |
|------|---------|
| `-x509` | Output a certificate, not a CSR |
| `-nodes` | No password on private key |
| `-days 365` | Valid for one year |
| `-newkey rsa:2048` | Generate new 2048-bit RSA key pair |
| `-subj` | Certificate subject fields |

Inspect a certificate:

```bash
openssl x509 -in cert.pem -text -noout
```

## Related Documentation

- [SSL Certificates in this project](../project/ssl-certificates.md) — `make ssl`, file paths, troubleshooting
- [Nginx](./nginx.md) — TLS termination and HTTPS redirect configuration

## Further Reading

- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [RFC 8446 — TLS 1.3](https://datatracker.ietf.org/doc/html/rfc8446)
