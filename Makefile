.PHONY: all up down build rebuild clean ssl logs format help

GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
RED    := \033[0;31m
CYAN   := \033[0;36m
MAGENTA := \033[0;35m
NC     := \033[0m

all: env ssl
	@echo "$(CYAN)╔════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║   Starting Transcendence Project       ║$(NC)"
	@echo "$(CYAN)╚════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)✓$(NC) Environment file ready"
	@echo "$(GREEN)✓$(NC) SSL certificates ready"
	@echo "$(BLUE)→$(NC) Starting Docker containers..."
	@docker compose up -d
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║   Project started successfully!        ║$(NC)"
	@echo "$(GREEN)╚════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(CYAN)Frontend:$(NC)  https://localhost"
	@echo "$(CYAN)Backend:$(NC)   https://localhost/api"
	@echo ""
	@echo "$(YELLOW)Use 'make logs' to view logs$(NC)"

up:
	@echo "$(BLUE)→$(NC) Starting Docker containers..."
	@docker compose up -d
	@echo "$(GREEN)✓$(NC) All services started"

down:
	@echo "$(YELLOW)→$(NC) Stopping Docker containers..."
	@docker compose down
	@echo "$(GREEN)✓$(NC) All services stopped"

build:
	@echo "$(BLUE)→$(NC) Building Docker containers..."
	@docker compose build
	@echo "$(GREEN)✓$(NC) All containers built successfully"

rebuild:
	@echo "$(YELLOW)→$(NC) Stopping existing containers..."
	@docker compose down
	@echo "$(BLUE)→$(NC) Rebuilding containers (no cache)..."
	@docker compose build --no-cache
	@echo "$(BLUE)→$(NC) Starting containers..."
	@docker compose up -d
	@echo "$(GREEN)✓$(NC) All services rebuilt and started"

clean:
	@echo "$(RED)→$(NC) Cleaning up Docker resources..."
	@docker compose down -v
	@docker system prune -f
	@echo "$(GREEN)✓$(NC) Cleanup completed"

env:
	@if [ ! -f .env ]; then \
		if [ -f .env.example ]; then \
			echo "$(YELLOW)→$(NC) Creating .env file from .env.example..."; \
			cp .env.example .env; \
		else \
			echo "$(YELLOW)→$(NC) Creating .env file with default values..."; \
			echo "# Server Configuration" > .env; \
			echo "NODE_ENV=development" >> .env; \
			echo "PORT=3000" >> .env; \
			echo "FRONTEND_PORT=5173" >> .env; \
			echo "" >> .env; \
			echo "# Database" >> .env; \
			echo "DB_PATH=./database/transcendence.db" >> .env; \
			echo "" >> .env; \
			echo "# Security" >> .env; \
			echo "JWT_SECRET=your-secret-key-change-in-production" >> .env; \
			echo "SESSION_SECRET=your-session-secret-change-in-production" >> .env; \
		fi; \
		echo "$(GREEN)✓$(NC) .env file created"; \
		echo "$(YELLOW)⚠$(NC)  Please edit .env file with your configuration if needed"; \
	else \
		echo "$(GREEN)✓$(NC) .env file already exists"; \
	fi

ssl:
	@if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then \
		echo "$(YELLOW)→$(NC) Generating SSL certificates..."; \
		mkdir -p nginx/ssl; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout nginx/ssl/key.pem \
			-out nginx/ssl/cert.pem \
			-subj "/C=CH/ST=Lausanne/L=Lausanne/O=42/CN=localhost" 2>/dev/null; \
		echo "$(GREEN)✓$(NC) SSL certificates generated"; \
	else \
		echo "$(GREEN)✓$(NC) SSL certificates already exist"; \
	fi

logs:
	@echo "$(CYAN)╔════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║   Viewing Docker Compose Logs          ║$(NC)"
	@echo "$(CYAN)╚════════════════════════════════════════╝$(NC)"
	@echo ""
	@docker compose logs -f

format:
	@echo "$(BLUE)→$(NC) Formatting code..."
	@if [ -d "frontend/node_modules" ]; then \
		echo "$(BLUE)→$(NC) Formatting frontend..."; \
		cd frontend && npm run lint -- --fix 2>/dev/null || echo "$(YELLOW)⚠$(NC)  ESLint not available, skipping frontend"; \
	else \
		echo "$(YELLOW)→$(NC) Formatting frontend in container..."; \
		docker compose exec -T frontend npm run lint -- --fix 2>/dev/null || echo "$(YELLOW)⚠$(NC)  Frontend container not running"; \
	fi
	@if [ -d "backend/node_modules" ]; then \
		echo "$(BLUE)→$(NC) Formatting backend..."; \
		cd backend && npx prettier --write "src/**/*.{ts,js}" 2>/dev/null || echo "$(YELLOW)⚠$(NC)  Prettier not available, skipping backend"; \
	else \
		echo "$(YELLOW)→$(NC) Formatting backend in container..."; \
		docker compose exec -T backend npx prettier --write "src/**/*.{ts,js}" 2>/dev/null || echo "$(YELLOW)⚠$(NC)  Backend container not running"; \
	fi
	@echo "$(GREEN)✓$(NC) Formatting completed"

help:
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           $(MAGENTA)Transcendence Project - Makefile Commands$(CYAN)          ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)  make$(NC)         - Generate SSL certificates and start all services"
	@echo "$(GREEN)  make all$(NC)     - Same as 'make'"
	@echo ""
	@echo "$(BLUE)  make up$(NC)       - Start all services"
	@echo "$(BLUE)  make down$(NC)     - Stop all services"
	@echo "$(BLUE)  make build$(NC)    - Build all containers"
	@echo "$(BLUE)  make rebuild$(NC)  - Rebuild and restart all services"
	@echo ""
	@echo "$(YELLOW)  make clean$(NC)   - Stop services and remove volumes"
	@echo "$(YELLOW)  make ssl$(NC)      - Generate SSL certificates"
	@echo "$(YELLOW)  make logs$(NC)     - Show logs from all services"
	@echo "$(YELLOW)  make format$(NC)   - Format code using ESLint/Prettier"
	@echo ""
	@echo "$(CYAN)  make help$(NC)     - Show this help message"
	@echo ""
	@echo "$(MAGENTA)Project:$(NC) ft_transcendence - Pong Tournament Platform"
	@echo "$(MAGENTA)Author:$(NC)  42 Lausanne"
