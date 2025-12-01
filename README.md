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

### Modules (All implemented)
- Backend Framework (Fastify + Node.js)
- Frontend Toolkit (Tailwind CSS)
- Database (SQLite)
- User Management & OAuth 2.0
- Remote Players & Multiplayer
- Live Chat
- AI Opponent
- Stats Dashboards
- 2FA + JWT Security
- WAF/ModSecurity + HashiCorp Vault
- GDPR Compliance
- ELK Stack Logging
- Monitoring (Prometheus/Grafana)
- Microservices Architecture
- 3D Graphics (Babylon.js)
- Server-Side Pong + API
- CLI for Pong
- Blockchain Integration (Avalanche)
- And more...

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
- `make help` - Show all available commands

## Project Structure

```
ft_transcendence-solo/
├── frontend/          # TypeScript + Tailwind CSS
├── backend/           # Fastify + Node.js + TypeScript
├── database/          # SQLite database files
├── nginx/             # Nginx configuration
├── docker-compose.yml # Docker orchestration
└── .env              # Environment variables (not in git)
```

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd backend
npm install
npm run dev
```

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

- All passwords are hashed using strong algorithms
- Protection against SQL injection and XSS attacks
- HTTPS/WSS for all connections
- Input validation on both client and server
- JWT tokens for authentication
- 2FA support

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
