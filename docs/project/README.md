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

- Docker infrastructure (frontend, backend, nginx)
- HTTPS via self-signed certificates
- TypeScript SPA with browser history support
- Tailwind CSS UI
- Fastify REST API with SQLite
- User registration and login (JWT)
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

### Not Yet Implemented

- XSS protection (CSP)
- 2FA and enhanced JWT
- WAF/ModSecurity + HashiCorp Vault
- GDPR compliance
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
