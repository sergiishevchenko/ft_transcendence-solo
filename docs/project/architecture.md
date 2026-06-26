# Architecture

## Overview

Transcendence is a full-stack web application for playing Pong and running tournaments. Three Docker containers run behind nginx, which terminates HTTPS and proxies traffic to the frontend and backend.

```
Browser
   │
   ▼
nginx :443 (HTTPS/WSS)
   ├── /        → frontend:5173  (Vite dev server)
   ├── /api     → backend:3000   (Fastify REST API)
   └── /ws/     → backend:3000   (WebSocket: game + chat)
```

HTTP on port 80 redirects to HTTPS.

## Services

### Frontend (`transcendence-frontend`)

- **Stack**: TypeScript, Vite, Tailwind CSS
- **Port**: 5173 (exposed via `FRONTEND_PORT` in `.env`)
- **Role**: Single Page Application — all pages are rendered client-side
- **WebSocket**: connects to `/ws/game` and `/ws/chat` for real-time features

### Backend (`transcendence-backend`)

- **Stack**: Node.js, Fastify, TypeScript, better-sqlite3, ws
- **Port**: 3000 (exposed via `PORT` in `.env`)
- **Role**: REST API, WebSocket server (game + chat), authentication, AI opponent, database access, static file serving for uploaded avatars

### Nginx (`transcendence-nginx`)

- **Image**: nginx:alpine
- **Ports**: 80, 443
- **Role**: TLS termination, reverse proxy, WebSocket proxy (with 86400s timeout), security headers

## Real-time Architecture

```
                  ┌─────────────────────────────────┐
                  │          Backend Server          │
                  │                                  │
  /ws/game  ───▶  │  GameService     ◄── AIService  │
                  │    ├── Room management           │
                  │    ├── Game loop (60fps)          │
                  │    ├── Input handling             │
                  │    └── Score persistence          │
                  │                                  │
  /ws/chat  ───▶  │  ChatService                    │
                  │    ├── Direct messages            │
                  │    ├── Online tracking            │
                  │    ├── User blocking              │
                  │    └── Game invites               │
                  └─────────────────────────────────┘
```

- Game state runs at 60 ticks/second on the server
- AI updates its target once per second
- Disconnected players get a 15-second reconnection window before forfeit
- Chat tracks online/offline status via WebSocket connection lifecycle

## Makefile Workflow

| Command | Action |
|---------|--------|
| `make` | Create `.env` if missing, generate SSL certs, start all containers |
| `make up` | Start containers |
| `make down` | Stop containers |
| `make build` | Build images |
| `make rebuild` | Rebuild without cache and restart |
| `make ssl` | Generate self-signed certificates in `nginx/ssl/` |
| `make logs` | Follow container logs |
| `make clean` | Stop containers, remove volumes, prune Docker |

## Environment Variables

Created automatically by `make env` if `.env` does not exist:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | development | Runtime mode |
| `PORT` | 3000 | Backend port |
| `FRONTEND_PORT` | 5173 | Frontend port |
| `DB_PATH` | ./database/transcendence.db | SQLite file path |
| `JWT_SECRET` | (placeholder) | JWT signing key |
| `SESSION_SECRET` | (placeholder) | Reserved for sessions |
| `OAUTH_GOOGLE_CLIENT_ID` | — | Google OAuth (optional) |
| `OAUTH_GOOGLE_CLIENT_SECRET` | — | Google OAuth (optional) |
| `OAUTH_GITHUB_CLIENT_ID` | — | GitHub OAuth (optional) |
| `OAUTH_GITHUB_CLIENT_SECRET` | — | GitHub OAuth (optional) |

## Project Layout

```
ft_transcendence-solo/
├── frontend/          SPA source (TypeScript + Vite + Tailwind)
│   └── src/
│       ├── game/      PongGame (local), RemotePongGame (online/AI)
│       ├── pages/     Home, Game, Chat, Tournament, Profile, Login, Register
│       └── services/  API, Auth, WebSocket clients
├── backend/           API + WebSocket server (Fastify + TypeScript)
│   └── src/
│       ├── routes/    REST endpoints (auth, users, games, chat)
│       ├── websocket/ WebSocket handlers (game, chat)
│       ├── services/  GameService, ChatService, AIService, AuthService
│       ├── models/    Database models (User, Game, Tournament)
│       └── middleware/ Auth, error handling
├── database/          schema.sql + transcendence.db
├── nginx/             nginx.conf + ssl/
├── docs/
│   ├── project/       Feature and setup documentation
│   └── theory/        Technology concepts
├── docker-compose.yml
├── Makefile
└── .env               Local secrets (not in git)
```

## Security Headers (nginx)

Nginx adds on every HTTPS response:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

See [Nginx](../theory/nginx.md) for reverse proxy details, [SSL/TLS](../theory/ssl-tls.md) for certificate concepts, and [SSL Certificates](./ssl-certificates.md) for project setup.

## Local Development (without Docker)

```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
cd backend  && npm install && npm run dev   # http://localhost:3000
```

Set `VITE_API_URL` in the frontend environment to point at the backend.
