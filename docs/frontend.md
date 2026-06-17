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
| `/` | Home | Landing page with links to game and tournament |
| `/game` | Game | Local Pong canvas |
| `/tournament` | Tournament | Player registration and match schedule |
| `/login` | Login | Username/email + password, OAuth buttons |
| `/register` | Register | Account creation form |
| `/profile` | Profile | User profile, stats, friends (auth required) |
| `/auth/callback` | — | OAuth token handoff from backend redirect |

Unknown paths redirect to `/`.

## Layout

`Layout.ts` wraps every page with:

- Top navigation bar (Home, Play, Tournament, Login/Profile)
- Active route highlighting
- Auth-aware nav (shows profile link when logged in)

## Services

### AuthService (`services/auth.service.ts`)

- Stores JWT access/refresh tokens and user object in `localStorage`
- Methods: `register`, `login`, `getCurrentUser`, `getAuthHeaders`, `getOAuthUrl`
- Prefix for storage keys: `transcendence_`

### ApiService (`services/api.service.ts`)

- Generic fetch wrapper for public API endpoints (games, tournaments, users)
- Base URL from `VITE_API_URL` (default: `https://localhost/api`)

## Pages

Each page is a function returning an `HTMLElement`. Pages build their own DOM and attach event listeners. There is no virtual DOM framework.

## Entry Point

`main.ts` imports CSS, creates the router, registers all routes, and calls `router.init()`.

## Build and Dev

```bash
cd frontend
npm install
npm run dev      # development with hot reload
npm run build    # production build
```

In Docker, the source is mounted as a volume and Vite serves on port 5173.
