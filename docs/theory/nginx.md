# Nginx

## What Is Nginx

Nginx (pronounced "engine-x") is a high-performance web server and reverse proxy. It accepts incoming HTTP/HTTPS connections from clients (browsers) and either serves static files directly or forwards requests to other servers upstream.

In this project, nginx is the **single public entry point**. Users never talk to the frontend or backend containers directly — they connect to nginx on ports 80 and 443, and nginx decides where to route each request.

```
                    ┌─────────────────────────────────────┐
  Browser           │         transcendence-nginx         │
  https://localhost │                                     │
        ──────────► │  :443  TLS decrypt                  │
                    │         │                           │
                    │    /    ├──────► frontend:5173      │
                    │  /api   ├──────► backend:3000       │
                    │   /ws   ├──────► backend:3000       │
                    └─────────────────────────────────────┘
```

## Why Use Nginx Here

| Problem | How nginx solves it |
|---------|---------------------|
| Multiple services (frontend + backend) on one domain | Routes by URL path (`/`, `/api`, `/ws`) |
| HTTPS required by project spec | Terminates TLS in one place; inner services stay on plain HTTP |
| WebSocket support (planned) | Proxies upgrade headers to backend |
| Security headers | Adds `X-Frame-Options`, `X-Content-Type-Options`, etc. on every response |
| Single port for users | Browser sees `https://localhost`, not `:5173` or `:3000` |

## How Nginx Works Internally

### Process model

Nginx runs as a **master process** and one or more **worker processes**. The master reads configuration and manages workers. Workers handle actual connections — each worker is single-threaded and event-driven (epoll/kqueue), so one worker can handle thousands of idle connections efficiently.

```
master process
    ├── worker 1  ← handles connections
    ├── worker 2
    └── worker N
```

### Configuration structure

Nginx config is hierarchical. Top-level blocks contain nested blocks:

```
events { ... }          ← connection limits per worker
http { ... }            ← all HTTP/HTTPS settings
    upstream { ... }    ← named backend server groups
    server { ... }      ← virtual host (one site)
        location { ... }← URL path rules
```

Nginx reads config at startup. Changes require a reload (`nginx -s reload`) or container restart.

### Request processing pipeline

When a request arrives:

1. **Listen** — nginx matches `listen` port and `server_name` to pick a `server` block
2. **Location** — longest prefix match selects a `location` block (`/api` beats `/`)
3. **Action** — serve a file, redirect, or `proxy_pass` to upstream
4. **Response** — headers added (`add_header`), body sent back to client

## Core Concepts

### Web server vs reverse proxy

**Web server** — serves files from disk (`root`, `try_files`).

**Reverse proxy** — forwards the request to another server and returns that server's response. The client does not know about the upstream; it only sees nginx.

This project uses nginx purely as a reverse proxy. Vite and Fastify do the actual work.

### Upstream

An `upstream` block defines a named group of backend servers:

```nginx
upstream frontend {
    server frontend:5173;
}

upstream backend {
    server backend:3000;
}
```

`frontend` and `backend` are Docker service names resolved by Docker's internal DNS on the `transcendence-network` bridge network. Inside the nginx container, `frontend:5173` points to the Vite dev server container.

Multiple `server` lines in one upstream enable load balancing (not used here — single server per group).

### `proxy_pass`

Forwards the request to an upstream:

```nginx
location /api {
    proxy_pass http://backend;
}
```

**Important URI behavior:**

| `proxy_pass` value | Request `GET /api/users` | Sent to upstream as |
|--------------------|--------------------------|---------------------|
| `http://backend` (no trailing path) | `/api/users` | `/api/users` |
| `http://backend/` (with trailing slash) | `/api/users` | `/users` |

This project uses `http://backend` without a trailing slash, so the full path including `/api` is passed to Fastify. Fastify routes are registered with prefix `/api`, so `GET /api/users` matches correctly.

### `location` matching

Nginx picks the most specific matching `location`:

| Prefix | Handler | Purpose |
|--------|---------|---------|
| `/api` | `proxy_pass http://backend` | REST API |
| `/ws` | `proxy_pass http://backend` | WebSocket (future) |
| `/` | `proxy_pass http://frontend` | Everything else — SPA pages, assets |

Order in the config file does not matter for prefix locations — specificity wins. `/api/auth/login` matches `location /api`, not `location /`.

### Proxy headers

When nginx forwards a request, the upstream sees nginx's connection, not the original client. Headers restore client context:

| Header | Value | Why |
|--------|-------|-----|
| `Host` | `$host` | Original hostname (`localhost`) |
| `X-Real-IP` | `$remote_addr` | Client IP address |
| `X-Forwarded-For` | `$proxy_add_x_forwarded_for` | Chain of proxy IPs |
| `X-Forwarded-Proto` | `$scheme` | `https` — tells backend the client used HTTPS |

Backend uses `X-Forwarded-Proto` if it needs to generate absolute URLs or enforce HTTPS.

### WebSocket proxying

WebSocket starts as a normal HTTP request with upgrade headers:

```
Upgrade: websocket
Connection: Upgrade
```

For the connection to upgrade through a proxy, nginx must forward these headers:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Without HTTP/1.1 and these headers, WebSocket handshake fails. The `/ws` location and frontend `/` location both include them — Vite's hot module reload (HMR) also uses WebSocket.

### TLS termination

**TLS termination** means nginx decrypts HTTPS and talks to upstream over plain HTTP:

```
Browser ──[HTTPS/TLS]──► nginx ──[HTTP]──► frontend:5173
                         nginx ──[HTTP]──► backend:3000
```

Certificates live in `nginx/ssl/` and are mounted read-only into the container:

```yaml
volumes:
  - ./nginx/ssl:/etc/nginx/ssl:ro
```

See [SSL/TLS Certificates](../project/ssl-certificates.md) for certificate generation.

### HTTP → HTTPS redirect

Port 80 server block returns `301 Moved Permanently` to the HTTPS URL:

```nginx
server {
    listen 80;
    server_name localhost;
    return 301 https://$server_name$request_uri;
}
```

`$request_uri` preserves path and query string: `http://localhost/api/users` → `https://localhost/api/users`.

### Security headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

| Header | Effect |
|--------|--------|
| `X-Frame-Options: SAMEORIGIN` | Page cannot be embedded in `<iframe>` on other domains (clickjacking protection) |
| `X-Content-Type-Options: nosniff` | Browser won't MIME-sniff response content type |
| `X-XSS-Protection: 1; mode=block` | Legacy XSS filter in older browsers |

`always` ensures headers are added even on error responses (4xx, 5xx).

### HTTP/2

```nginx
listen 443 ssl http2;
```

HTTP/2 multiplexes multiple requests over one TCP connection, reducing latency. Requires TLS in practice (browsers only enable h2 over HTTPS).

## This Project's Configuration — Full Walkthrough

File: `nginx/nginx.conf`

### `events` block

```nginx
events {
    worker_connections 1024;
}
```

Each worker can handle up to 1024 simultaneous connections. Sufficient for local development.

### `upstream` blocks

```nginx
upstream frontend {
    server frontend:5173;
}

upstream backend {
    server backend:3000;
}
```

Maps symbolic names to Docker internal addresses. These names are only reachable inside `transcendence-network`.

### HTTPS server block

```nginx
server {
    listen 443 ssl http2;
    server_name localhost;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ...
}
```

Listens on 443 with TLS and HTTP/2. `server_name localhost` matches requests with `Host: localhost`.

### Frontend location

```nginx
location / {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

All non-API traffic goes to Vite:

- `GET https://localhost/` → Home page
- `GET https://localhost/game` → Game page (SPA routing handled by frontend JS)
- `GET https://localhost/src/main.ts` → Vite serves source files in dev mode
- WebSocket for Vite HMR → upgrade headers forwarded

`proxy_cache_bypass $http_upgrade` skips cache when connection upgrades (relevant if caching were enabled).

### API location

```nginx
location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

API requests go to Fastify on port 3000:

- `POST https://localhost/api/auth/login` → `backend:3000/api/auth/login`
- `GET https://localhost/api/users/1/stats` → `backend:3000/api/users/1/stats`
- `GET https://localhost/health` → **not** matched here (no `/api` prefix) → goes to frontend, which does not have this route

Note: `/health` is on the backend root, not under `/api`. It is only reachable directly at `http://localhost:3000/health`, not through nginx as currently configured.

### WebSocket location

```nginx
location /ws {
    proxy_pass http://backend;
    ...
}
```

Reserved for future real-time features (remote Pong, chat). Same proxy settings as `/api`. When WebSocket server is implemented on backend at `/ws`, this location will forward upgrade requests.

## Docker Integration

From `docker-compose.yml`:

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
  networks:
    - transcendence-network
```

| Setting | Meaning |
|---------|---------|
| `nginx:alpine` | Minimal nginx image (~40 MB) |
| `ports 80:443` | Only nginx exposes ports to the host |
| `nginx.conf:ro` | Config mounted read-only; edit locally, restart container to apply |
| `ssl:ro` | Certificates mounted read-only |
| `depends_on` | Start order only — does not wait for services to be ready |

Frontend and backend also expose ports `5173` and `3000` to the host for direct development access, bypassing nginx.

## Request Flow Examples

### Loading the home page

```
1. Browser → GET https://localhost/
2. TLS handshake with nginx (cert.pem)
3. nginx matches server :443, location /
4. nginx → GET http://frontend:5173/
5. Vite returns index.html
6. nginx adds security headers, returns to browser
7. Browser loads JS/CSS from https://localhost/... (all via nginx → Vite)
```

### Login API call

```
1. Frontend JS → POST https://localhost/api/auth/login
   Body: { "usernameOrEmail": "...", "password": "..." }
2. nginx matches location /api
3. nginx → POST http://backend:3000/api/auth/login
   Headers: Host: localhost, X-Forwarded-Proto: https, ...
4. Fastify validates, returns JSON + tokens
5. nginx forwards response to browser
```

### OAuth redirect

```
1. Browser → GET https://localhost/api/auth/oauth/google/authorize
2. nginx → backend
3. Fastify returns 302 redirect to Google
4. (Google auth flow happens outside nginx)
5. Google → GET https://localhost/api/auth/oauth/google/callback?code=...
6. nginx → backend → Fastify → redirect to frontend with tokens
```

### HTTP access attempt

```
1. Browser → GET http://localhost/game
2. nginx port 80 server block
3. 301 → https://localhost/game
4. Browser follows redirect to HTTPS flow above
```

## Direct Access vs Through Nginx

| URL | Goes through nginx | Notes |
|-----|-------------------|-------|
| `https://localhost` | Yes | Production-like path |
| `https://localhost/api/...` | Yes | `VITE_API_URL` points here |
| `http://localhost:5173` | No | Direct Vite, no TLS |
| `http://localhost:3000/api/...` | No | Direct Fastify, no TLS |
| `http://localhost:3000/health` | No | Health check, not proxied |

For normal use, always go through `https://localhost`.

## Configuration Changes

After editing `nginx/nginx.conf`:

```bash
docker compose restart nginx
```

Or full restart:

```bash
make down && make up
```

Validate config inside container:

```bash
docker compose exec nginx nginx -t
```

## Troubleshooting

### nginx fails to start — certificate error

```
SSL_CTX_use_PrivateKey_file failed
```

Certificates missing. Run:

```bash
make ssl
```

### 502 Bad Gateway

nginx is running but upstream is unreachable:

- Frontend or backend container is down — check `docker compose ps`
- Service not ready yet — wait and retry
- Wrong upstream address — verify Docker service names match `docker-compose.yml`

```bash
docker compose logs nginx
docker compose logs frontend
docker compose logs backend
```

### 404 on API routes through nginx

Check `proxy_pass` trailing slash behavior. This project keeps `/api` prefix — Fastify routes must include `/api` prefix (they do).

### WebSocket connection fails

Verify upgrade headers in the relevant `location` block. For `/ws`, backend must implement WebSocket listener (not yet done).

### Browser certificate warning

Expected with self-signed certs. Accept manually for `localhost` in development.

### Config syntax error

```bash
docker compose exec nginx nginx -t
```

Shows file and line number of the error.

## Nginx vs Alternatives

| Tool | Role | This project |
|------|------|--------------|
| **Nginx** | Web server, reverse proxy, TLS | Used |
| **Apache** | Web server with modules | Not used |
| **Caddy** | Auto-TLS reverse proxy | Not used |
| **Traefik** | Docker-native reverse proxy | Not used |
| **HAProxy** | TCP/HTTP load balancer | Not used |

Nginx is a common choice for 42 projects: simple config, low resource usage, well-documented TLS and WebSocket proxying.

## Related Files

| File | Purpose |
|------|---------|
| `nginx/nginx.conf` | Main configuration |
| `nginx/ssl/cert.pem` | TLS certificate |
| `nginx/ssl/key.pem` | TLS private key |
| `docker-compose.yml` | nginx service definition |
| `Makefile` | `make ssl` generates certificates |
| `docs/project/ssl-certificates.md` | Certificate details |
| `docs/project/architecture.md` | Overall system architecture |

## Further Reading

- [Nginx official documentation](https://nginx.org/en/docs/)
- [Nginx reverse proxy guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [WebSocket proxying](https://nginx.org/en/docs/http/websocket.html)
