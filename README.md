# ft_transcendence

Full-stack web application for the Pong tournament platform - 42 School project.

## Overview

This project is a comprehensive web application that allows users to play Pong games and participate in tournaments. It includes real-time multiplayer capabilities, user management, and various advanced features.

## Features

### Mandatory Features
- ✅ Single Page Application (SPA) with browser history support
- ✅ Local Pong game (2 players on same keyboard)
- ✅ Tournament system with matchmaking
- ✅ Player registration with aliases
- ✅ HTTPS/WSS security
- ✅ User authentication and registration
- ✅ Password hashing (bcrypt)
- ✅ SQL injection protection (prepared statements)

### Modules

**Web Modules:**
- ✅ Backend Framework (Fastify + Node.js) - REST API with TypeScript
- ✅ Frontend Toolkit (Tailwind CSS) - Modern UI components
- ✅ Database (SQLite) - User, Game, and Tournament data storage
- ✅ API Integration - Frontend-Backend communication

**User Management:**
- ✅ Standard User Management (registration, login, profiles, friends, stats)
- ✅ Remote Authentication (OAuth 2.0 - Google & GitHub)

**Gameplay:**
- ✅ Remote Players (WebSocket multiplayer with reconnection)
- ✅ Multiplayer (4-player mode on square field)
- ✅ Live Chat (DMs, blocking, game invites, online status)

**AI & Stats:**
- ✅ AI Opponent (3 difficulty levels, ball trajectory prediction)
- 🔄 User and Game Stats Dashboards

**Security:**
- ✅ 2FA + JWT (TOTP, refresh rotation, backup codes)
- ✅ WAF/ModSecurity + HashiCorp Vault (OWASP CRS, secret management)
- ✅ GDPR Compliance (data export, anonymization, account deletion)

**DevOps:**
- 🔄 ELK Stack Logging
- 🔄 Monitoring (Prometheus/Grafana)
- 🔄 Microservices Architecture

**Graphics & Advanced:**
- 🔄 3D Graphics (Babylon.js)
- 🔄 Server-Side Pong + API
- 🔄 CLI for Pong
- 🔄 Blockchain Integration (Avalanche)
- 🔄 Game Customization Options
- 🔄 Another Game + Matchmaking

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ft_transcendence-solo
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application (one command)**
   ```bash
   make
   ```
   This will automatically generate SSL certificates and start all services.

4. **Access the application**
   - Frontend: https://localhost (or http://localhost:5173 in dev mode)
   - Backend API: https://localhost/api (or http://localhost:3000 in dev mode)

### Other Makefile commands

- `make up` - Start all services
- `make down` - Stop all services
- `make build` - Build all containers
- `make rebuild` - Rebuild and restart all services
- `make clean` - Stop services and remove volumes
- `make ssl` - Generate SSL certificates
- `make logs` - Show logs from all services
- `make format` - Format code using ESLint/Prettier
- `make help` - Show all available commands

## Project Structure

```
ft_transcendence-solo/
├── frontend/              # TypeScript + Tailwind CSS + Vite
│   ├── src/
│   │   ├── components/   # UI components (Layout)
│   │   ├── pages/        # Page components (Home, Game, Chat, etc.)
│   │   ├── services/     # API, Auth, WebSocket services
│   │   ├── game/         # Game logic (PongGame, RemotePongGame)
│   │   └── router.ts     # SPA routing
│   └── package.json
├── backend/              # Fastify + Node.js + TypeScript
│   ├── src/
│   │   ├── routes/       # API routes (auth, users, games, chat, gdpr)
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic (auth, game, chat, AI, totp, vault, gdpr)
│   │   ├── websocket/    # WebSocket handlers (game, chat)
│   │   ├── middleware/   # Request middleware (auth, error, sanitize)
│   │   └── index.ts      # Server entry point
│   └── package.json
├── database/              # SQLite database files
│   ├── schema.sql        # Database schema
│   └── transcendence.db  # Database file (auto-generated)
├── nginx/                # Nginx configuration (fallback)
│   ├── nginx.conf        # Nginx config (HTTPS + WebSocket proxy)
│   └── ssl/              # SSL certificates (auto-generated)
├── modsecurity/          # WAF configuration
│   ├── nginx.conf        # Nginx with ModSecurity module
│   └── modsecurity.conf  # WAF rules (XSS, SQLi, rate limiting)
├── vault/                # HashiCorp Vault
│   └── config/vault.hcl  # Vault server configuration
├── docs/                  # Documentation
│   ├── project/           # Features and setup
│   └── theory/            # Technology concepts
├── docker-compose.yml     # Docker orchestration (nginx+modsec, vault)
├── Makefile              # Build and deployment commands
└── .env                  # Environment variables (not in git)
```

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` with hot reload.

### Backend Development
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:3000` with hot reload using `tsx watch`.

### Database
The SQLite database is automatically created on first backend startup. The schema includes:
- `users` - User accounts and profiles (username, email, password_hash, display_name, avatar_url)
- `games` - Game matches and results (player1_id, player2_id, scores, winner_id)
- `tournaments` - Tournament information
- `tournament_participants` - Tournament player registration
- `tournament_matches` - Tournament match scheduling
- `friendships` - Friend relationships between users
- `chat_messages` - Direct messages between users
- `blocked_users` - User blocking relationships

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (returns tokens or 2FA prompt)
- `POST /api/auth/verify-2fa` - Verify 2FA code during login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke refresh token
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/2fa/setup` - Generate TOTP secret and QR code
- `POST /api/auth/2fa/enable` - Enable 2FA after verification
- `POST /api/auth/2fa/disable` - Disable 2FA
- `GET /api/auth/2fa/status` - Check 2FA status
- `GET /api/auth/oauth/:provider/authorize` - OAuth authorization (Google/GitHub)
- `GET /api/auth/oauth/:provider/callback` - OAuth callback

### GDPR
- `GET /api/gdpr/export` - Download personal data (requires auth)
- `POST /api/gdpr/anonymize` - Anonymize account (requires auth + password)
- `DELETE /api/gdpr/account` - Delete account (requires auth + password + "DELETE")

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:id/stats` - Get user statistics
- `PUT /api/users/profile` - Update user profile (requires auth)
- `POST /api/users/profile/avatar` - Upload avatar (requires auth)
- `GET /api/users/search?q=query` - Search users
- `POST /api/users/friends/request` - Send friend request (requires auth)
- `POST /api/users/friends/accept/:id` - Accept friend request (requires auth)
- `GET /api/users/friends/list` - Get friends list (requires auth)

### Games
- `GET /api/games` - Get all games
- `GET /api/games/:id` - Get game by ID
- `POST /api/games` - Create a new game

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get tournament with participants and matches
- `POST /api/tournaments` - Create a new tournament
- `POST /api/tournaments/:id/participants` - Add participant to tournament
- `GET /api/tournaments/:id/matches` - Get tournament matches

### Chat
- `GET /api/chat/conversations` - Get conversation list (requires auth)
- `GET /api/chat/messages/:userId` - Get messages with a user (requires auth)
- `POST /api/chat/block/:userId` - Block a user (requires auth)
- `DELETE /api/chat/block/:userId` - Unblock a user (requires auth)
- `GET /api/chat/blocked` - Get blocked user IDs (requires auth)
- `GET /api/chat/unread` - Get unread message count (requires auth)

### Health Check
- `GET /health` - Server health status

## WebSocket Endpoints

### Game WebSocket (`/ws/game`)

Connect with optional `?token=JWT` for authenticated play. Messages:

| Client → Server | Description |
|-----------------|-------------|
| `quick_match` | Join matchmaking queue (1v1 or 4-player) |
| `create_room` | Create a private game room |
| `join_room` | Join an existing room by ID |
| `play_ai` | Start a game against AI (easy/medium/hard) |
| `input` | Send paddle input (`{ up, down }`) |
| `leave_room` | Leave current game |
| `get_rooms` | List available rooms |

| Server → Client | Description |
|-----------------|-------------|
| `connected` | Connection confirmed with socket ID and game constants |
| `room_joined` | Joined a room with initial state |
| `player_joined` | Another player joined the room |
| `countdown` | Countdown before game starts (3, 2, 1) |
| `game_started` | Game has begun |
| `game_state` | Real-time game state update (60fps) |
| `player_disconnected` | A player disconnected (15s reconnect window) |
| `player_left` | A player left the game |

### Chat WebSocket (`/ws/chat`)

Requires `?token=JWT` for authentication. Messages:

| Client → Server | Description |
|-----------------|-------------|
| `send_message` | Send a direct message |
| `get_conversations` | Get conversation list |
| `get_messages` | Get message history with a user |
| `mark_read` | Mark messages as read |
| `block_user` | Block a user |
| `unblock_user` | Unblock a user |
| `game_invite` | Send a game invitation |
| `get_online_users` | Get list of online user IDs |

| Server → Client | Description |
|-----------------|-------------|
| `connected` | Connection confirmed with online users list |
| `new_message` | New message received |
| `user_online` | A user came online |
| `user_offline` | A user went offline |
| `tournament_notification` | Tournament match notification |

## Game Modes

### Local Game (2 players, same keyboard)
- **Player 1**: W (up) / S (down)
- **Player 2**: ↑ (up) / ↓ (down)
- No server connection required

### Online 1v1
- Quick matchmaking via WebSocket
- Server-side game loop at 60fps
- 15-second reconnection window on disconnect
- Game results saved to database

### 4-Player Battle
- Square playing field (800×800)
- Each player guards one wall (left, right, top, bottom)
- Ball can exit through any unguarded wall
- Points awarded to all other players when someone loses

### vs AI
- Three difficulty levels: Easy, Medium, Hard
- AI updates its view once per second (spec requirement)
- Ball trajectory prediction with bounce simulation
- Configurable error margin per difficulty

## Security

- ✅ HTTPS/WSS for all connections (self-signed certificates for development)
- ✅ CORS configured for frontend-backend communication
- ✅ SQL injection protection (prepared statements with better-sqlite3)
- ✅ Input validation on both client and server
- ✅ Error handling middleware
- ✅ JWT tokens with refresh token rotation and revocation
- ✅ Two-Factor Authentication (TOTP with backup codes)
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ OAuth 2.0 secure authentication
- ✅ WebSocket authentication via JWT token
- ✅ XSS protection (Content Security Policy + input sanitization)
- ✅ WAF/ModSecurity with OWASP CRS (XSS, SQLi, path traversal detection)
- ✅ Rate limiting (API: 30r/s, auth: 5r/s)
- ✅ HashiCorp Vault for secret management
- ✅ Security headers (HSTS, X-Frame-Options, Permissions-Policy)
- ✅ GDPR compliance (data export, anonymization, account deletion)

## Technologies

- **Frontend**: TypeScript, Tailwind CSS, Vite
- **Backend**: Fastify, Node.js, TypeScript
- **Database**: SQLite (better-sqlite3)
- **Real-time**: WebSocket (@fastify/websocket, ws)
- **Authentication**: JWT, bcrypt, OAuth 2.0 (Google, GitHub), TOTP (otpauth)
- **Security**: ModSecurity (OWASP CRS), HashiCorp Vault, CSP
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx + ModSecurity (WAF, reverse proxy, TLS termination)

## Browser Compatibility

- ✅ Mozilla Firefox (latest stable)
- ✅ Chrome/Edge
- ✅ Safari

## License

42 School Project
