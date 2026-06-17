# Backend API

## Stack

- **Fastify** — HTTP server
- **TypeScript** — typed source
- **better-sqlite3** — synchronous SQLite driver with prepared statements
- **bcrypt** — password hashing
- **jsonwebtoken** — JWT access and refresh tokens
- **@fastify/cors** — cross-origin requests
- **@fastify/multipart** — avatar uploads (max 5 MB)
- **@fastify/static** — serve files from `uploads/`

## Entry Point

`backend/src/index.ts`:

1. Registers CORS (all origins, credentials enabled)
2. Registers multipart and static file plugins
3. Sets global error handler
4. Mounts route groups under `/api`
5. Initializes SQLite on startup
6. Listens on `0.0.0.0:3000`

## Route Groups

### `/api/auth` — `auth.routes.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Authenticate |
| GET | `/me` | Yes | Current user |
| GET | `/oauth/:provider/authorize` | No | Redirect to OAuth provider |
| GET | `/oauth/:provider/callback` | No | Handle OAuth callback |

Providers: `google`, `github`.

### `/api/users` — `user.routes.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:id` | No | User by ID |
| GET | `/:id/stats` | No | Wins, losses, win rate, match history |
| PUT | `/profile` | Yes | Update display name |
| POST | `/profile/avatar` | Yes | Upload avatar image |
| POST | `/friends/request` | Yes | Send friend request |
| POST | `/friends/accept/:id` | Yes | Accept friend request |
| GET | `/friends/list` | Yes | List accepted friends |
| GET | `/search?q=` | No | Search users by username/display name |

### `/api` — `api.ts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | All users |
| GET | `/users/:id` | User by ID |
| GET | `/games` | All games |
| GET | `/games/:id` | Game by ID |
| POST | `/games` | Create game record |
| GET | `/tournaments` | All tournaments |
| GET | `/tournaments/:id` | Tournament with participants and matches |
| POST | `/tournaments` | Create tournament |
| POST | `/tournaments/:id/participants` | Add participant |
| GET | `/tournaments/:id/matches` | Tournament matches |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ status: "ok" }` |

## Middleware

### Authentication (`auth.middleware.ts`)

Reads `Authorization: Bearer <token>`, verifies JWT, attaches `request.user` with `id`, `username`, `email`. Returns 401 if missing or invalid.

Used as `preHandler` on protected routes.

### Error Handler (`error.middleware.ts`)

Catches unhandled errors, logs them, returns JSON `{ error, message, statusCode }`. Hides internal details on 500 responses.

## Models

Data access layer in `backend/src/models/`:

- `user.model.ts` — CRUD for users
- `game.model.ts` — CRUD for games
- `tournament.model.ts` — tournaments, participants, matches

All queries use prepared statements via better-sqlite3.

## Services

| Service | File | Responsibility |
|---------|------|----------------|
| AuthService | `auth.service.ts` | Hash/verify passwords, generate/verify JWT |
| OAuthService | `oauth.service.ts` | Google/GitHub OAuth flow |
| FriendsService | `friends.service.ts` | Friend requests and accepted friends |
| StatsService | `stats.service.ts` | Win/loss counts and match history |
| DatabaseService | `database.service.ts` | SQLite connection and schema init |

## Development

```bash
cd backend
npm install
npm run dev    # tsx watch, hot reload on port 3000
```
