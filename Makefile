# Fortress Panel Makefile
# Usage: make <command>

.PHONY: help build dev prod start stop restart logs clean install test lint format db-up db-down db-migrate db-seed backup deploy update

# Default target
help: ## Show this help message
	@echo "Fortress Panel - High-Security Control Panel"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development commands
dev: ## Start development environment
	@echo "🚀 Starting Fortress Panel development environment..."
	docker-compose -f docker-compose.dev.yml --profile dev-runtimes --profile dev-tools up -d
	@echo "✅ Development environment started!"
	@echo "📱 Frontend: http://localhost:3001"
	@echo "🔧 API: http://localhost:3001/api"
	@echo "🗄️  phpMyAdmin: http://localhost:8081"
	@echo "📧 MailHog: http://localhost:8025"
	@echo "🔍 Redis Commander: http://localhost:8083"
	@echo "🗃️  Adminer: http://localhost:8082"

dev-logs: ## Show development logs
	docker-compose -f docker-compose.dev.yml logs -f

dev-stop: ## Stop development environment
	docker-compose -f docker-compose.dev.yml down
	@echo "🛑 Development environment stopped"

dev-restart: ## Restart development environment
	docker-compose -f docker-compose.dev.yml restart
	@echo "🔄 Development environment restarted"

# Production commands
build: ## Build production Docker image
	@echo "🔨 Building Fortress Panel production image..."
	docker build -t fortress-panel:latest .
	@echo "✅ Production image built!"

prod: ## Start production environment
	@echo "🚀 Starting Fortress Panel production environment..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Copy .env.docker.example to .env and configure it"; \
		exit 1; \
	fi
	docker-compose --profile monitoring --profile logging --profile backup up -d
	@echo "✅ Production environment started!"
	@echo "🌐 Application: https://localhost"
	@echo "📊 Grafana: http://localhost:3000"
	@echo "📈 Prometheus: http://localhost:9090"
	@echo "🗄️  phpMyAdmin: http://localhost:8080"

prod-logs: ## Show production logs
	docker-compose logs -f

prod-stop: ## Stop production environment
	docker-compose down
	@echo "🛑 Production environment stopped"

prod-restart: ## Restart production environment
	docker-compose restart
	@echo "🔄 Production environment restarted"

# Database commands
db-up: ## Start only database services
	docker-compose -f docker-compose.dev.yml up -d mariadb-dev redis-dev
	@echo "🗄️  Database services started"

db-down: ## Stop only database services
	docker-compose -f docker-compose.dev.yml down mariadb-dev redis-dev
	@echo "🗄️  Database services stopped"

db-migrate: ## Run database migrations
	docker-compose -f docker-compose.dev.yml exec fortress-panel-dev npm run migrate
	@echo "🔄 Database migrations completed"

db-seed: ## Seed database with initial data
	docker-compose -f docker-compose.dev.yml exec fortress-panel-dev npm run seed
	@echo "🌱 Database seeding completed"

db-reset: ## Reset database (migrate + seed)
	@echo "🔄 Resetting database..."
	$(MAKE) db-migrate
	$(MAKE) db-seed
	@echo "✅ Database reset completed"

db-backup: ## Backup database
	@echo "💾 Creating database backup..."
	docker-compose -f docker-compose.dev.yml exec mariadb-dev mysqldump -u root -pdev_root_password_123 fortress_panel_dev > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backup completed"

# Application commands
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	cd backend && npm install
	cd frontend && npm install
	@echo "✅ Dependencies installed"

test: ## Run tests
	@echo "🧪 Running tests..."
	cd backend && npm test
	cd frontend && npm test
	@echo "✅ Tests completed"

lint: ## Run linting
	@echo "🔍 Running linter..."
	cd backend && npm run lint
	cd frontend && npm run lint
	@echo "✅ Linting completed"

format: ## Format code
	@echo "💅 Formatting code..."
	cd backend && npm run format
	cd frontend && npm run format
	@echo "✅ Code formatted"

build-frontend: ## Build frontend for production
	@echo "🔨 Building frontend..."
	cd frontend && npm run build
	@echo "✅ Frontend built"

build-backend: ## Build backend for production
	@echo "🔨 Building backend..."
	cd backend && npm run build
	@echo "✅ Backend built"

# Deployment commands
deploy-dev: ## Deploy to development server
	@echo "🚀 Deploying to development..."
	$(MAKE) build
	docker-compose -f docker-compose.dev.yml up -d --build
	@echo "✅ Deployed to development"

deploy-staging: ## Deploy to staging server
	@echo "🚀 Deploying to staging..."
	$(MAKE) build
	docker-compose -f docker-compose.staging.yml up -d --build
	@echo "✅ Deployed to staging"

deploy-prod: ## Deploy to production server
	@echo "🚀 Deploying to production..."
	$(MAKE) build
	docker-compose up -d --build
	@echo "✅ Deployed to production"

# Maintenance commands
clean: ## Clean up Docker resources
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker-compose down -v --remove-orphans
	docker system prune -f
	docker volume prune -f
	@echo "✅ Docker cleanup completed"

clean-images: ## Remove all Docker images
	@echo "🗑️  Removing Docker images..."
	docker rmi $(shell docker images -q) 2>/dev/null || true
	docker image prune -af
	@echo "✅ Docker images removed"

update: ## Update dependencies
	@echo "⬆️  Updating dependencies..."
	cd backend && npm update
	cd frontend && npm update
	@echo "✅ Dependencies updated"

update-docker: ## Update Docker images
	@echo "⬆️  Updating Docker images..."
	docker-compose pull
	@echo "✅ Docker images updated"

# Security commands
security-scan: ## Run security scan
	@echo "🔒 Running security scan..."
	cd backend && npm audit
	cd frontend && npm audit
	@echo "✅ Security scan completed"

security-fix: ## Fix security issues
	@echo "🔧 Fixing security issues..."
	cd backend && npm audit fix
	cd frontend && npm audit fix
	@echo "✅ Security issues fixed"

generate-ssl: ## Generate self-signed SSL certificates
	@echo "🔐 Generating SSL certificates..."
	mkdir -p docker/ssl
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout docker/ssl/key.pem \
		-out docker/ssl/cert.pem \
		-subj "/C=US/ST=State/L=City/O=Fortress Panel/CN=localhost"
	@echo "✅ SSL certificates generated"

# Utility commands
logs: ## Show application logs
	docker-compose logs -f fortress-panel

logs-db: ## Show database logs
	docker-compose logs -f mariadb

logs-redis: ## Show Redis logs
	docker-compose logs -f redis

shell: ## Open shell in application container
	docker-compose exec fortress-panel sh

shell-db: ## Open shell in database container
	docker-compose exec mariadb sh

shell-redis: ## Open Redis CLI
	docker-compose exec redis redis-cli

status: ## Show status of all services
	docker-compose ps

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "🔗 Application URLs:"
	@echo "  Frontend: http://localhost:3001"
	@echo "  API: http://localhost:3001/api"
	@echo "  phpMyAdmin: http://localhost:8080"
	@echo "  Health Check: http://localhost:3001/health"

# Quick start commands
quick-start: ## Quick start development environment
	@echo "⚡ Quick starting Fortress Panel..."
	$(MAKE) install
	$(MAKE) dev
	@echo "⏳ Waiting for services to start..."
	sleep 10
	$(MAKE) db-migrate
	$(MAKE) db-seed
	@echo "🎉 Fortress Panel is ready!"
	@echo "🌐 Open http://localhost:3001 in your browser"

quick-setup: ## Quick setup for new project
	@echo "⚡ Setting up new Fortress Panel project..."
	@if [ ! -f .env ]; then cp .env.docker.example .env; fi
	$(MAKE) install
	$(MAKE) build-frontend
	$(MAKE) build-backend
	@echo "✅ Project setup completed"
	@echo "💡 Run 'make quick-start' to start development"

# Version commands
version: ## Show version information
	@echo "Fortress Panel"
	@echo "============"
	@echo "Docker: $(shell docker --version)"
	@echo "Docker Compose: $(shell docker-compose --version)"
	@echo "Node.js: $(shell node --version 2>/dev/null || echo 'Not installed')"
	@echo "npm: $(shell npm --version 2>/dev/null || echo 'Not installed')"
	@echo ""
	@echo "Environment: $(NODE_ENV:-development)"