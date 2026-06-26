# Frontend

## Stack

- **TypeScript** — typed JavaScript
- **Vite** — dev server and bundler
- **Tailwind CSS** — utility-first styling

## SPA Routing

Routing is handled by a custom `Router` class (`frontend/src/router.ts`). It does not use a framework router.

### How it works

1. Routes are registered as path → handler mappings.
2. `router.navigate(path)` calls `history.pushState` and re-renders the page.
3. `popstate` listener handles browser Back/Forward buttons.
4. Internal links intercept clicks and use `pushState` instead of full page reloads.

### Registered routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Home | Landing page with game mode links |
| `/game` | Game | Game mode selection and play area |
| `/tournament` | Tournament | Player registration and match schedule |
| `/login` | Login | Username/email + password, OAuth buttons |
| `/register` | Register | Account creation form |
| `/profile` | Profile | User profile, stats, friends (auth required) |
| `/chat` | Chat | Direct messages, online users (auth required) |
| `/2fa` | TwoFactorSetup | 2FA setup, enable/disable (auth required) |
| `/privacy` | Privacy | Privacy policy, data export/delete (GDPR) |
| `/auth/callback` | — | OAuth token handoff from backend redirect |

Unknown paths redirect to `/`.

Query parameters on `/game`:
- `?mode=local` — skip menu, start local game
- `?mode=remote` — skip menu, start online 1v1
- `?mode=4player` — skip menu, start 4-player mode
- `?mode=ai` — skip menu, start AI game

## Layout

`Layout.ts` wraps every page with:

- Top navigation bar (Home, Play, Tournament, Chat, Login/Profile)
- Active route highlighting
- Auth-aware nav (shows Chat + Profile when logged in, Login when not)

## Services

### AuthService (`services/auth.service.ts`)

- Stores JWT access/refresh tokens and user object in `localStorage`
- Methods: `register`, `login`, `verify2FA`, `refreshTokens`, `logout`, `getCurrentUser`, `getAuthHeaders`, `getOAuthUrl`
- Automatic token refresh on 401 responses (with deduplication)
- 2FA support: `login()` returns `{ requires2FA, tempToken }` when 2FA is enabled
- Prefix for storage keys: `transcendence_`

### ApiService (`services/api.service.ts`)

- Generic fetch wrapper for public API endpoints (games, tournaments, users)
- Base URL from `VITE_API_URL` (default: `https://localhost/api`)

### WebSocketService (`services/websocket.service.ts`)

- WebSocket client with automatic reconnection (5 attempts, increasing delay)
- Event-based message handling via `on(type, handler)` / `off(type, handler)`
- Two singleton instances: `getGameWebSocket()` and `getChatWebSocket()`
- Connects to `/ws/game` and `/ws/chat` with JWT token in query string
- `disconnectAll()` to clean up both connections

## Game Components

### PongGame (`game/PongGame.ts`)

Local two-player game on HTML5 canvas. Player 1 uses W/S, Player 2 uses arrow keys. No server connection.

### RemotePongGame (`game/RemotePongGame.ts`)

Remote game renderer that connects via WebSocket. Supports:

- **1v1 mode** — standard Pong field (800×400), two paddles
- **4-player mode** — square field (800×800), paddles on all four walls
- **AI mode** — 1v1 against server-side AI
- Real-time state rendering from server at 60fps
- Countdown display before game starts
- Win/loss screen with player names
- Keyboard input forwarding to server
- Auto-cleanup on exit

## Pages

Each page is a function returning an `HTMLElement`. Pages build their own DOM and attach event listeners. There is no virtual DOM framework.

### Game Page

Shows a mode selection menu:
- **Local Game** — 2 players on same keyboard
- **Online 1v1** — WebSocket quick match
- **4-Player Battle** — 4-player mode
- **vs AI** — with Easy/Medium/Hard buttons

### Chat Page

Full chat interface with:
- Conversation list with unread badges and online indicators
- User search to start new conversations
- Real-time message delivery via WebSocket
- Game invite button
- Block/unblock users
- Tournament notifications as toast alerts

### Login Page

Two-step login flow:
- Step 1: Username/email + password form with OAuth buttons
- Step 2: If 2FA enabled, shows TOTP code input (6 digits or backup code)
- Automatic redirect after successful authentication

### 2FA Setup Page (`/2fa`)

Full 2FA lifecycle management:
- Status display (enabled/disabled)
- QR code generation for authenticator app setup
- Manual secret entry option
- Code verification to enable 2FA
- Backup codes display (one-time)
- Disable 2FA with code confirmation

### Privacy Page (`/privacy`)

GDPR compliance tools:
- Privacy policy text
- Data export (JSON download)
- Account anonymization (password confirmation)
- Account deletion (password + "DELETE" text + confirm dialog)
- Profile page links to this page via "Security & Privacy" section

## Entry Point

`main.ts` imports CSS, creates the router, registers all routes (including `/chat`, `/2fa`, `/privacy`), and calls `router.init()`.

## Build and Dev

```bash
cd frontend
npm install
npm run dev      # development with hot reload
npm run build    # production build
```

In Docker, the source is mounted as a volume and Vite serves on port 5173.
