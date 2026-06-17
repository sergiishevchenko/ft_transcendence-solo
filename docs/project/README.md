# Project Documentation

Documentation for implemented features and project setup.

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Docker, nginx, HTTPS, project layout |
| [Frontend](./frontend.md) | SPA routing, pages, UI toolkit |
| [Backend API](./backend-api.md) | Fastify server, routes, middleware |
| [Authentication](./authentication.md) | Registration, login, JWT, OAuth |
| [User Management](./user-management.md) | Profiles, friends, statistics |
| [Pong Game](./pong-game.md) | Local 2-player game mechanics |
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

### Not Yet Implemented

- Remote multiplayer (WebSocket)
- Live chat
- AI opponent
- XSS protection (CSP)
- Online friend status
- Frontend integration with tournament/game API persistence
