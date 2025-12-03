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

### Modules

**Web Modules:**
- ✅ Backend Framework (Fastify + Node.js) - REST API with TypeScript
- ✅ Frontend Toolkit (Tailwind CSS) - Modern UI components
- ✅ Database (SQLite) - User, Game, and Tournament data storage
- ✅ API Integration - Frontend-Backend communication

**User Management:**
- 🔄 Standard User Management (registration, login, profiles)
- 🔄 Remote Authentication (OAuth 2.0)

**Gameplay:**
- 🔄 Remote Players (WebSocket multiplayer)
- 🔄 Multiplayer (more than 2 players)
- 🔄 Live Chat

**AI & Stats:**
- 🔄 AI Opponent
- 🔄 User and Game Stats Dashboards

**Security:**
- 🔄 2FA + JWT
- 🔄 WAF/ModSecurity + HashiCorp Vault
- 🔄 GDPR Compliance

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
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service
│   │   ├── game/         # Game logic
│   │   └── router.ts     # SPA routing
│   └── package.json
├── backend/              # Fastify + Node.js + TypeScript
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Request middleware
│   │   └── index.ts      # Server entry point
│   └── package.json
├── database/              # SQLite database files
│   ├── schema.sql        # Database schema
│   └── transcendence.db # Database file (auto-generated)
├── nginx/                # Nginx configuration
│   ├── nginx.conf        # Nginx config
│   └── ssl/              # SSL certificates (auto-generated)
├── docs/                  # Documentation
├── docker-compose.yml     # Docker orchestration
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
The SQLite database is automatically created on first backend startup. The schema is defined in `database/schema.sql` and includes:
- `users` - User accounts and profiles
- `games` - Game matches and results
- `tournaments` - Tournament information
- `tournament_participants` - Tournament player registration
- `tournament_matches` - Tournament match scheduling

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID

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

### Health Check
- `GET /health` - Server health status

## Game Controls

### Local Game (2 players on same keyboard)
- **Player 1**: W (up) / S (down)
- **Player 2**: ↑ (up) / ↓ (down)

## Tournament System

1. Register players by entering aliases
2. Start tournament (minimum 2 players)
3. Matches are organized automatically
4. Complete matches to progress through the tournament

## Security

- ✅ HTTPS/WSS for all connections (self-signed certificates for development)
- ✅ CORS configured for frontend-backend communication
- ✅ SQL injection protection (prepared statements with better-sqlite3)
- ✅ Input validation on both client and server
- ✅ Error handling middleware
- 🔄 JWT tokens for authentication (planned)
- 🔄 2FA support (planned)
- 🔄 Password hashing with bcrypt/argon2 (planned)

## Technologies

- **Frontend**: TypeScript, Tailwind CSS, Vite
- **Backend**: Fastify, Node.js, TypeScript
- **Database**: SQLite
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx
- **Security**: JWT, 2FA, WAF/ModSecurity, HashiCorp Vault

## Browser Compatibility

- ✅ Mozilla Firefox (latest stable)
- ✅ Chrome/Edge
- ✅ Safari

## License

42 School Project

