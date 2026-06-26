# Project Documentation

Documentation for implemented features and project setup.

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Docker, nginx, HTTPS, WebSocket, project layout |
| [Frontend](./frontend.md) | SPA routing, pages, game modes, WebSocket client |
| [Backend API](./backend-api.md) | Fastify server, REST routes, WebSocket endpoints, services |
| [Authentication](./authentication.md) | Registration, login, JWT, OAuth |
| [User Management](./user-management.md) | Profiles, friends, statistics, online status |
| [Pong Game](./pong-game.md) | Local, online, 4-player, and AI game modes |
| [Remote Multiplayer](./remote-multiplayer.md) | WebSocket game sync, rooms, disconnect handling |
| [AI Opponent](./ai-opponent.md) | AI algorithm, difficulty levels, ball prediction |
| [Live Chat](./live-chat.md) | Direct messages, blocking, game invites, online status |
| [Tournament](./tournament.md) | Client-side tournament flow |
| [Database](./database.md) | SQLite schema and data access |
| [SSL Certificates](./ssl-certificates.md) | HTTPS certificate setup |

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
