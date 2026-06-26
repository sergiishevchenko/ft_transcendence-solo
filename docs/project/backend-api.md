# Backend API

## Stack

- **Fastify** — HTTP server
- **@fastify/websocket** — WebSocket support via ws
- **TypeScript** — typed source
- **better-sqlite3** — synchronous SQLite driver with prepared statements
- **bcrypt** — password hashing
- **jsonwebtoken** — JWT access and refresh tokens
- **otpauth** — TOTP generation and verification (2FA)
- **qrcode** — QR code generation for authenticator setup
- **node-vault** — HashiCorp Vault client for secret management
- **@fastify/cors** — cross-origin requests
- **@fastify/multipart** — avatar uploads (max 5 MB)
- **@fastify/static** — serve files from `uploads/`

## Entry Point

`backend/src/index.ts`:

1. Registers CORS (all origins, credentials enabled)
2. Registers WebSocket, multipart, and static file plugins
3. Sets global error handler and XSS sanitization middleware
4. Mounts route groups under `/api` (auth, users, chat, gdpr)
5. Registers WebSocket handlers for game and chat
6. Initializes SQLite, ChatService, TotpService tables, and Vault on startup
7. Listens on `0.0.0.0:3000`

## REST Route Groups

### `/api/auth` — `auth.routes.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Authenticate (returns tokens or 2FA prompt) |
| POST | `/verify-2fa` | Temp | Verify TOTP code during login |
| POST | `/refresh` | No | Refresh access token (rotate pair) |
| POST | `/logout` | Yes | Revoke refresh token |
| GET | `/me` | Yes | Current user (includes totpEnabled) |
| POST | `/2fa/setup` | Yes | Generate TOTP secret + QR code |
| POST | `/2fa/enable` | Yes | Verify code and enable 2FA |
| POST | `/2fa/disable` | Yes | Disable 2FA (requires code) |
| GET | `/2fa/status` | Yes | Check 2FA enabled status |
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

### `/api/chat` — `chat.routes.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/conversations` | Yes | Conversation list with last message and unread count |
| GET | `/messages/:userId` | Yes | Message history with a specific user |
| POST | `/block/:userId` | Yes | Block a user |
| DELETE | `/block/:userId` | Yes | Unblock a user |
| GET | `/blocked` | Yes | Get blocked user IDs |
| GET | `/unread` | Yes | Get total unread message count |

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

### `/api/gdpr` — `gdpr.routes.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/export` | Yes | Download all personal data as JSON |
| POST | `/anonymize` | Yes | Anonymize account (requires password) |
| DELETE | `/account` | Yes | Delete account (password + "DELETE" confirmation) |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ status: "ok", vault: boolean }` |

## WebSocket Endpoints

### `/ws/game` — `websocket/game.socket.ts`

Optional `?token=JWT` query parameter for authenticated play.

**Client → Server messages:**

| Type | Payload | Description |
|------|---------|-------------|
| `create_room` | `{ mode }` | Create a new game room (1v1 or 4player) |
| `join_room` | `{ roomId }` | Join an existing room |
| `quick_match` | `{ mode }` | Join matchmaking (auto-creates room if needed) |
| `play_ai` | `{ difficulty }` | Start a game against AI (easy/medium/hard) |
| `input` | `{ input: { up, down } }` | Send paddle movement input |
| `leave_room` | — | Leave current game room |
| `get_rooms` | `{ mode }` | List waiting rooms |

**Server → Client messages:**

| Type | Key Fields | Description |
|------|------------|-------------|
| `connected` | `socketId, constants` | Connection established |
| `room_created` | `roomId, player, state` | Room created by this client |
| `room_joined` | `roomId, player, state` | Successfully joined a room |
| `player_joined` | `player, state` | Another player joined |
| `countdown` | `value` | Countdown (3, 2, 1) |
| `game_started` | `state` | Game has begun |
| `game_state` | `state` | Real-time state (60fps broadcast) |
| `player_disconnected` | `socketId, state` | Player disconnected |
| `player_left` | `socketId, state` | Player left |
| `room_list` | `rooms` | Available rooms |
| `room_left` | — | Confirmation of leaving |
| `error` | `message` | Error message |

Game state includes: ball position/velocity, paddle positions, scores, player info, game status.

### `/ws/chat` — `websocket/chat.socket.ts`

Requires `?token=JWT` query parameter.

**Client → Server messages:**

| Type | Payload | Description |
|------|---------|-------------|
| `send_message` | `{ receiverId, content }` | Send a direct message |
| `get_conversations` | — | Get conversation list |
| `get_messages` | `{ userId, limit, offset }` | Get message history |
| `mark_read` | `{ userId }` | Mark messages as read |
| `block_user` | `{ userId }` | Block a user |
| `unblock_user` | `{ userId }` | Unblock a user |
| `get_blocked` | — | Get blocked user list |
| `game_invite` | `{ receiverId, roomId }` | Send a game invitation |
| `get_online_users` | — | Get online user IDs |

**Server → Client messages:**

| Type | Key Fields | Description |
|------|------------|-------------|
| `connected` | `userId, onlineUsers, unreadCount` | Connection confirmed |
| `new_message` | `message` | New message (sent or received) |
| `conversation_list` | `conversations` | List of conversations |
| `messages` | `userId, messages` | Message history |
| `messages_read` | `userId` | Messages marked as read |
| `user_online` | `userId, username, displayName` | User came online |
| `user_offline` | `userId` | User went offline |
| `user_blocked` | `userId` | User blocked confirmation |
| `user_unblocked` | `userId` | User unblocked confirmation |
| `blocked_list` | `blockedUserIds` | Blocked user IDs |
| `tournament_notification` | `tournamentName, matchInfo` | Tournament match alert |
| `error` | `message` | Error message |

## Middleware

### Authentication (`auth.middleware.ts`)

Reads `Authorization: Bearer <token>`, verifies JWT, attaches `request.user` with `id`, `username`, `email`. Returns 401 if missing or invalid.

Used as `preHandler` on protected routes.

### Error Handler (`error.middleware.ts`)

Catches unhandled errors, logs them, returns JSON `{ error, message, statusCode }`. Hides internal details on 500 responses.

### XSS Sanitizer (`sanitize.middleware.ts`)

Global `preHandler` hook that checks request body and query parameters for XSS patterns (`<script>`, `javascript:`, `on*=` handlers, `<iframe>`, etc.). Sanitizes HTML entities in body content and rejects dangerous query strings with 400 status.

## Models

Data access layer in `backend/src/models/`:

- `user.model.ts` — CRUD for users
- `game.model.ts` — CRUD for games
- `tournament.model.ts` — tournaments, participants, matches

All queries use prepared statements via better-sqlite3.

## Services

| Service | File | Responsibility |
|---------|------|----------------|
| AuthService | `auth.service.ts` | Hash/verify passwords, JWT with rotation, 2FA login flow |
| TotpService | `totp.service.ts` | TOTP generation, verification, backup codes, refresh tokens |
| VaultService | `vault.service.ts` | HashiCorp Vault client, secret retrieval, env fallback |
| GdprService | `gdpr.service.ts` | Data export, anonymization, cascade account deletion |
| OAuthService | `oauth.service.ts` | Google/GitHub OAuth flow |
| GameService | `game.service.ts` | Server-side game engine (rooms, physics, scoring) |
| ChatService | `chat.service.ts` | Message persistence, blocking, conversation tracking |
| AIService | `ai.service.ts` | AI opponent with ball prediction and difficulty levels |
| FriendsService | `friends.service.ts` | Friend requests and accepted friends |
| StatsService | `stats.service.ts` | Win/loss counts and match history |
| DatabaseService | `database.service.ts` | SQLite connection and schema init |

## Development

```bash
cd backend
npm install
npm run dev    # tsx watch, hot reload on port 3000
```
