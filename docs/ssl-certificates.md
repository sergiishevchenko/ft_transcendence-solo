# SSL/TLS Certificates

## Overview

SSL/TLS certificates are digital documents that authenticate the identity of a server and enable encrypted HTTPS connections. In this project, SSL certificates are required for nginx to serve content over HTTPS.

## What are SSL Certificates?

SSL (Secure Sockets Layer) and TLS (Transport Layer Security) certificates serve two main purposes:

1. **Server Authentication**: Verify that you are connecting to the intended server (e.g., `localhost`)
2. **Data Encryption**: Enable secure HTTPS connections where data is transmitted in encrypted form

## Certificate Components

A certificate consists of two files:

- **cert.pem** (Certificate): Contains the public key and server information
- **key.pem** (Private Key): Contains the secret key used for decryption

## Certificate Generation in This Project

The Makefile automatically generates self-signed SSL certificates if they don't exist:

```bash
make ssl
```

This command:
- Creates the `nginx/ssl/` directory if it doesn't exist
- Generates a self-signed certificate using OpenSSL
- Sets the certificate to expire in 365 days
- Configures the certificate for `localhost` domain
- Uses RSA 2048-bit encryption

### Certificate Details

- **Country (C)**: CH (Switzerland)
- **State (ST)**: Lausanne
- **Locality (L)**: Lausanne
- **Organization (O)**: 42
- **Common Name (CN)**: localhost

## How Certificates Are Used

### Nginx Configuration

The certificates are mounted into the nginx container and configured in `nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name localhost;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ...
}
```

### HTTP to HTTPS Redirect

All HTTP traffic (port 80) is automatically redirected to HTTPS (port 443):

```nginx
server {
    listen 80;
    server_name localhost;
    return 301 https://$server_name$request_uri;
}
```

## Why SSL Certificates Are Needed

1. **Secure Connections**: Enable HTTPS protocol for encrypted data transmission
2. **WebSocket Support**: Secure WebSocket connections over `/ws` endpoint
3. **Authentication**: Required for secure authentication and data protection
4. **Browser Requirements**: Modern browsers require HTTPS for certain APIs (WebRTC, Geolocation, etc.)
5. **Project Requirements**: The project is configured to use HTTPS by default

## Self-Signed vs. Trusted Certificates

### Self-Signed Certificates (Development)

- **Current Setup**: The project uses self-signed certificates
- **Pros**: Free, easy to generate, suitable for local development
- **Cons**: Browsers will show security warnings, not trusted by default

### Trusted Certificates (Production)

For production environments, you should use certificates from a trusted Certificate Authority (CA):

- **Let's Encrypt**: Free, automated certificates
- **Commercial CAs**: Paid certificates with extended validation
- **Pros**: No browser warnings, trusted by all clients
- **Cons**: Requires domain ownership and verification

## Security Considerations

1. **Never commit private keys** (`key.pem`) to version control
2. **Keep certificates secure**: Private keys should have restricted file permissions
3. **Rotate certificates**: Renew certificates before expiration
4. **Use strong encryption**: The project uses RSA 2048-bit keys

## Troubleshooting

### Certificate Not Found

If nginx fails to start with certificate errors:

```bash
make ssl
```

This will regenerate the certificates if they are missing.

### Browser Security Warning

When accessing `https://localhost`, browsers will show a security warning because the certificate is self-signed. This is expected behavior for development:

1. Click "Advanced" or "Show Details"
2. Click "Proceed to localhost" or "Accept the Risk"

### Certificate Expiration

Self-signed certificates expire after 365 days. To regenerate:

```bash
rm nginx/ssl/cert.pem nginx/ssl/key.pem
make ssl
```

## File Locations

- **Certificate files**: `nginx/ssl/cert.pem` and `nginx/ssl/key.pem`
- **Nginx config**: `nginx/nginx.conf`
- **Makefile target**: `make ssl` (line 85-96)

## Additional Resources

- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
