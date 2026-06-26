# Project Documentation

Documentation for implemented features and project setup.

## Contents

### Stage 1: Base
| Document | Description |
|----------|-------------|
| [Docker Setup](./docker-setup.md) | Dockerfiles, docker-compose, Makefile, volumes |
| [Architecture](./architecture.md) | System overview, nginx, service diagram |
| [Frontend](./frontend.md) | SPA routing, pages, TypeScript structure |
| [Pong Game](./pong-game.md) | Local, online, 4-player, and AI game modes |
| [Tournament](./tournament.md) | Client-side tournament flow |

### Stage 2: Backend & Database
| Document | Description |
|----------|-------------|
| [Backend API](./backend-api.md) | Fastify server, REST routes, WebSocket endpoints |
| [Database](./database.md) | SQLite schema, tables, data access |
| [Tailwind CSS](./tailwind-css.md) | CSS framework setup, design system, UI components |
| [Frontend-Backend Integration](./frontend-backend-integration.md) | API calls, WebSocket, auth flow, file uploads |

### Stage 3: Users
| Document | Description |
|----------|-------------|
| [Authentication](./authentication.md) | Registration, login, JWT, OAuth 2.0 |
| [User Management](./user-management.md) | Profiles, friends, statistics, online status |
| [Tournament Integration](./tournament-integration.md) | User-tournament binding, game linking, API |

### Stage 4: Game Experience
| Document | Description |
|----------|-------------|
| [Remote Multiplayer](./remote-multiplayer.md) | WebSocket game sync, rooms, disconnect handling |
| [AI Opponent](./ai-opponent.md) | AI algorithm, difficulty levels, ball prediction |
| [Live Chat](./live-chat.md) | Direct messages, blocking, game invites, online status |

### Stage 5: Security
| Document | Description |
|----------|-------------|
| [2FA + JWT](./2fa-jwt.md) | TOTP authentication, refresh tokens, backup codes |
| [WAF/ModSecurity + Vault](./waf-vault.md) | WAF rules, ModSecurity, HashiCorp Vault secrets |
| [GDPR Compliance](./gdpr-compliance.md) | Data export, anonymization, account deletion, privacy |

### Setup & Security
| Document | Description |
|----------|-------------|
| [SSL Certificates](./ssl-certificates.md) | HTTPS certificate generation and setup |

## Quick Start

```bash
make
```

- Frontend: https://localhost
- Backend API: https://localhost/api

## Implementation Status

### Done

- Docker infrastructure (frontend, backend, nginx, vault)
- HTTPS via self-signed certificates
- TypeScript SPA with browser history support
- Tailwind CSS UI
- Fastify REST API with SQLite
- User registration and login (JWT with refresh rotation)
- OAuth 2.0 (Google, GitHub)
- User profiles, avatars, friends, stats
- Local Pong game (2 players, one keyboard)
- Client-side tournament (round-robin matchmaking)
- Password hashing (bcrypt), prepared SQL statements
- Remote multiplayer via WebSocket (1v1)
- 4-player multiplayer mode (square field)
- AI opponent (easy/medium/hard with ball prediction)
- Live chat (DMs, blocking, game invites, online status)
- Online/offline status tracking
- Two-factor authentication (TOTP with backup codes)
- JWT refresh token rotation and revocation
- WAF/ModSecurity with OWASP CRS
- HashiCorp Vault secret management
- XSS protection (CSP + input sanitization)
- GDPR compliance (data export, anonymization, deletion)
- Privacy policy page

### Not Yet Implemented

- ELK Stack logging
- Prometheus/Grafana monitoring
- Microservices architecture
- Stats dashboards with charts
- Game customization options
- Additional game + matchmaking
- 3D graphics (Babylon.js)
- Server-side Pong API
- CLI for Pong
- Blockchain integration
- Accessibility modules
- SSR integration
