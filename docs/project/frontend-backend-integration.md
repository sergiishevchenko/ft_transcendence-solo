# Frontend-Backend Integration

## Overview

The frontend SPA communicates with the Fastify backend through two channels: REST API calls over HTTPS and WebSocket connections over WSS. All traffic goes through nginx, which handles TLS termination and routing.

```
Frontend (browser)
    │
    ├── HTTPS fetch()  ──► nginx /api ──► backend:3000  (REST)
    ├── WSS WebSocket  ──► nginx /ws/ ──► backend:3000  (real-time)
    └── HTTPS assets   ──► nginx /    ──► frontend:5173 (Vite)
```

## REST API Integration

### API Service

**File**: `frontend/src/services/api.service.ts`

Generic fetch wrapper that prepends the base URL and handles JSON parsing:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://localhost/api'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message)
    }
    return response.json()
}
```

Public endpoints (games, tournaments, users) use this service without authentication.

### Auth Service

**File**: `frontend/src/services/auth.service.ts`

Handles authenticated requests by attaching JWT tokens:

```typescript
static getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
}
```

Used for protected endpoints: profile updates, friend management, chat history.

### Request Flow

```
1. Frontend calls api.getGames() or fetch() with AuthService headers
2. Browser sends HTTPS request to https://localhost/api/games
3. Nginx terminates TLS
4. Nginx matches location /api → proxies to backend:3000
5. Fastify route handler processes request
6. Response JSON flows back: Fastify → nginx → browser
7. Frontend updates DOM with response data
```

### CORS

Backend allows all origins with credentials:

```typescript
fastify.register(cors, { origin: true, credentials: true })
```

This permits the frontend at `https://localhost` to call the API at `https://localhost/api` (same origin via nginx) or directly at `http://localhost:3000` during development.

### Environment Variable

The API base URL is configurable:

| Context | `VITE_API_URL` | Resolves to |
|---------|----------------|-------------|
| Docker (via nginx) | `https://localhost/api` | nginx → backend |
| Local dev (direct) | `http://localhost:3000` | backend directly |

Set in `docker-compose.yml` for containerized mode. For local development without Docker, set in a `.env` file in the `frontend/` directory.

## WebSocket Integration

### WebSocket Service

**File**: `frontend/src/services/websocket.service.ts`

Two singleton instances for game and chat:

```typescript
const gameWs = getGameWebSocket()   // connects to /ws/game
const chatWs = getChatWebSocket()   // connects to /ws/chat
```

### Connection

WebSocket URL is derived from the current page location:

```typescript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const host = window.location.host
const url = `${protocol}//${host}/ws/game?token=${jwt}`
```

This ensures it goes through nginx (same host as the page), which proxies to the backend.

### Authentication

JWT token is passed as a query parameter since the browser WebSocket API doesn't support custom headers:

```
wss://localhost/ws/game?token=eyJhbG...
```

The backend verifies the token on connection and maps the socket to a user ID.

### Reconnection

The WebSocket service automatically reconnects on disconnect:

- Up to 5 attempts
- Increasing delay: attempt × 1000ms
- Resets on successful connection

### Event System

Message-based routing using `type` field:

```typescript
ws.on('game_state', (data) => { /* update canvas */ })
ws.on('new_message', (data) => { /* show chat message */ })
ws.on('user_online', (data) => { /* update indicator */ })
```

## Authentication Flow

### Registration / Login

```
Frontend                        Backend
   │                               │
   ├── POST /api/auth/register ──►│
   │   { username, email, pass }   │
   │                               ├── hash password (bcrypt)
   │                               ├── insert into users table
   │                               ├── generate JWT tokens
   │◄── { user, tokens } ─────────│
   │                               │
   ├── store in localStorage       │
   │   - transcendence_accessToken │
   │   - transcendence_refreshToken│
   │   - transcendence_user        │
```

### Authenticated Requests

```
Frontend                              Backend
   │                                     │
   ├── GET /api/auth/me ──────────────►│
   │   Authorization: Bearer <token>    │
   │                                     ├── verify JWT
   │                                     ├── decode { id, username, email }
   │                                     ├── query users table
   │◄── { user } ───────────────────────│
```

### OAuth Flow

```
Frontend          Backend              OAuth Provider
   │                 │                       │
   ├── click OAuth ──│                       │
   │                 ├── redirect ──────────►│
   │                 │                       ├── user authenticates
   │                 │◄── callback + code ───│
   │                 ├── exchange code       │
   │                 │   for access token ──►│
   │                 │◄── token ─────────────│
   │                 ├── fetch user info ───►│
   │                 │◄── profile ───────────│
   │                 ├── create/update user  │
   │                 ├── generate JWT        │
   │◄── redirect     │                       │
   │   /auth/callback│                       │
   │   ?token=...    │                       │
   ├── store tokens  │                       │
   ├── redirect /    │                       │
```

## File Upload

Avatar upload uses `multipart/form-data` instead of JSON:

```typescript
const formData = new FormData()
formData.append('file', avatarFile)
const response = await fetch(`${API_URL}/api/users/profile/avatar`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
})
```

Note: `Content-Type` header is omitted — the browser sets it automatically with the correct boundary for multipart data.

Backend uses `@fastify/multipart` to parse the upload:

```typescript
const data = await request.file()
const buffer = await data.toBuffer()
await writeFile(filepath, buffer)
```

Files are saved to `backend/uploads/avatars/` and served via `@fastify/static` at `/uploads/avatars/`.

## Static File Serving

```
Avatar request:
  https://localhost/uploads/avatars/1-1234567890.jpg
    → nginx matches location /uploads/
    → proxy to backend:3000/uploads/avatars/...
    → @fastify/static serves from backend/uploads/
```

## Error Handling

### Frontend

```typescript
try {
    const data = await api.createGame({ ... })
} catch (error) {
    errorMessage = error.message || 'Request failed'
    render()
}
```

API errors return `{ error: "message" }` or `{ message: "message" }` JSON. The frontend displays them in red alert boxes.

### Backend

Global error handler catches unhandled exceptions:

```typescript
reply.status(statusCode).send({
    error: true,
    message: statusCode === 500 ? 'Internal Server Error' : error.message,
    statusCode
})
```

Internal details are hidden on 500 errors. Client errors (400, 401, 404) include descriptive messages.

## Data Flow Examples

### Profile Page Load

```
1. ProfilePage() checks AuthService.getUser() from localStorage
2. If no user → redirect to /login
3. Parallel fetch:
   - GET /api/users/:id/stats (with auth headers)
   - GET /api/users/friends/list (with auth headers)
4. Render stats grid, friends list, edit form
```

### Sending a Chat Message

```
1. User types message, presses Enter
2. ChatPage sends via WebSocket:
   { type: "send_message", receiverId: 5, content: "Hello" }
3. Backend ChatService.saveMessage() → SQLite
4. Backend sends new_message to both sender and receiver via WebSocket
5. Both clients append message to UI and scroll to bottom
6. Backend sends updated conversation list
```

### Starting a Remote Game

```
1. User clicks "Online 1v1" on Game page
2. RemotePongGame connects to /ws/game?token=JWT
3. Sends { type: "quick_match", mode: "1v1" }
4. Backend finds or creates a waiting room
5. Sends room_joined with initial state
6. When second player joins → countdown (3, 2, 1)
7. Game starts → server broadcasts game_state at 60fps
8. Client renders state on canvas
9. Client sends { type: "input", input: { up, down } } on key events
```

## Related Documentation

- [Backend API](./backend-api.md) — all REST and WebSocket endpoints
- [Frontend](./frontend.md) — SPA routing and services
- [Authentication](./authentication.md) — JWT and OAuth details
- [Architecture](./architecture.md) — nginx proxy configuration
- [Docker Setup](./docker-setup.md) — container networking
