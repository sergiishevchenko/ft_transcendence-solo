# Docker Setup

## Overview

The project runs as three Docker containers orchestrated by Docker Compose. A single `make` command builds everything, generates SSL certificates, and starts all services.

```
┌────────────────────────────────────────────────────┐
│                  Docker Compose                    │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  frontend   │  │  backend    │  │   nginx    │  │
│  │  :5173      │  │  :3000      │  │  :80 :443  │  │
│  │  node:20    │  │  node:20    │  │  alpine    │  │
│  └─────────────┘  └─────────────┘  └────────────┘  │
│                                                    │
│            transcendence-network (bridge)          │
└────────────────────────────────────────────────────┘
```

## docker-compose.yml

File: `docker-compose.yml`

### Frontend Service

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: transcendence-frontend
  ports:
    - "${FRONTEND_PORT:-5173}:5173"
  volumes:
    - ./frontend:/app
    - /app/node_modules
  environment:
    - NODE_ENV=development
    - VITE_API_URL=https://localhost/api
  depends_on:
    - backend
```

| Setting | Purpose |
|---------|---------|
| `context: ./frontend` | Build from frontend directory |
| `ports 5173:5173` | Direct access for debugging (bypasses nginx) |
| `./frontend:/app` | Live source code mount for hot reload |
| `/app/node_modules` | Anonymous volume prevents host overwrite |
| `VITE_API_URL` | API base URL used by frontend fetch calls |
| `depends_on: backend` | Start order (does not wait for readiness) |

### Backend Service

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: transcendence-backend
  ports:
    - "${PORT:-3000}:3000"
  volumes:
    - ./backend:/app
    - /app/node_modules
    - ./database:/app/database
  environment:
    - NODE_ENV=development
    - PORT=3000
    - DB_PATH=/app/database/transcendence.db
```

| Setting | Purpose |
|---------|---------|
| `./database:/app/database` | SQLite file persists on host |
| `DB_PATH` | Where backend looks for the database file |
| Port 3000 exposed for direct API debugging |

### Nginx Service

```yaml
nginx:
  image: nginx:alpine
  container_name: transcendence-nginx
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
  depends_on:
    - frontend
    - backend
```

| Setting | Purpose |
|---------|---------|
| `nginx:alpine` | Minimal image (~40 MB) |
| Ports 80, 443 | Public-facing HTTP/HTTPS |
| `:ro` suffix | Read-only mounts for security |
| `depends_on` | Nginx starts after both app containers |

### Network

```yaml
networks:
  transcendence-network:
    driver: bridge
```

All three containers share a bridge network. Docker DNS resolves service names: `frontend`, `backend` become hostnames reachable within the network.

## Dockerfiles

### Frontend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

| Step | What it does |
|------|-------------|
| `node:20-alpine` | Lightweight Node.js 20 base image |
| `COPY package*.json` + `RUN npm install` | Install dependencies (cached layer) |
| `COPY . .` | Copy source code |
| `--host 0.0.0.0` | Vite listens on all interfaces (required in Docker) |

In development, `./frontend:/app` volume overrides the `COPY . .` step, so changes reflect immediately via Vite HMR.

### Backend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

`npm run dev` runs `tsx watch src/index.ts` — TypeScript execution with file watching for auto-restart.

## Makefile

The `Makefile` provides shortcuts for all Docker operations.

### `make` (default target)

Runs three steps in order:
1. `make env` — creates `.env` from `.env.example` or with defaults if missing
2. `make ssl` — generates self-signed SSL certificates if missing
3. `docker compose up -d` — starts all containers in detached mode

### All Targets

| Target | Command | Description |
|--------|---------|-------------|
| `make` / `make all` | env + ssl + up | Full project start |
| `make up` | `docker compose up -d` | Start containers |
| `make down` | `docker compose down` | Stop containers |
| `make build` | `docker compose build` | Build images |
| `make rebuild` | down + build (no-cache) + up | Full rebuild |
| `make clean` | `docker compose down -v` + prune | Remove everything |
| `make ssl` | `openssl req -x509 ...` | Generate certificates |
| `make env` | `cp .env.example .env` | Create env file |
| `make logs` | `docker compose logs -f` | Follow all logs |
| `make format` | ESLint + Prettier | Format code |
| `make help` | — | Show commands |

### SSL Generation

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=CH/ST=Lausanne/L=Lausanne/O=42/CN=localhost"
```

Only runs if `cert.pem` or `key.pem` are missing.

### Environment File

If `.env` doesn't exist, `make env` creates one with defaults:

```
NODE_ENV=development
PORT=3000
FRONTEND_PORT=5173
DB_PATH=./database/transcendence.db
JWT_SECRET=your-secret-key-change-in-production
SESSION_SECRET=your-session-secret-change-in-production
```

## Volume Strategy

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `./frontend` | `/app` | Source code (hot reload) |
| `./backend` | `/app` | Source code (watch restart) |
| `./database` | `/app/database` | SQLite persistence |
| `./nginx/nginx.conf` | `/etc/nginx/nginx.conf` | Nginx config |
| `./nginx/ssl` | `/etc/nginx/ssl` | TLS certificates |

Anonymous volume `/app/node_modules` prevents host `node_modules` (if any) from overriding container dependencies. This handles platform-specific native modules (e.g., `better-sqlite3`).

## .gitignore

Key entries for Docker-related files:

```
*.db          # SQLite database
*.pem         # SSL certificates
*.key         # Private keys
.env          # Environment secrets
node_modules/ # Dependencies
```

The database and certificates are auto-generated on first `make`. They should never be committed.

## Common Operations

### First time setup

```bash
git clone <repo-url>
cd ft_transcendence-solo
make
```

### View logs

```bash
make logs                           # all services
docker compose logs -f backend      # backend only
docker compose logs -f nginx        # nginx only
```

### Restart a single service

```bash
docker compose restart backend
```

### Rebuild after dependency changes

```bash
docker compose build backend
docker compose up -d
```

### Full reset

```bash
make clean
rm -f database/transcendence.db
make
```

### Enter a container

```bash
docker compose exec backend sh
docker compose exec frontend sh
docker compose exec nginx sh
```

### Check container status

```bash
docker compose ps
```

## Troubleshooting

### Container exits immediately

```bash
docker compose logs <service>
```

Common causes: missing `.env`, port conflict, npm install failure.

### Port already in use

```bash
lsof -i :3000  # find process
lsof -i :5173
lsof -i :443
```

Change ports in `.env` (`PORT`, `FRONTEND_PORT`) or stop conflicting processes.

### node_modules platform mismatch

If switching between local and Docker development:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database locked

SQLite doesn't support concurrent writers. Stop any direct connections before restarting the backend.

## Related Documentation

- [Architecture](./architecture.md) — system overview
- [SSL Certificates](./ssl-certificates.md) — HTTPS setup
- [Backend API](./backend-api.md) — server configuration
- [Frontend](./frontend.md) — Vite dev server
