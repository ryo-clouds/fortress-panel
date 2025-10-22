# Fortress Panel Docker Setup

This guide covers how to deploy and manage Fortress Panel using Docker containers.

## 🐳 Quick Start

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- At least 4GB RAM and 20GB disk space
- Git for cloning the repository

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/fortress-panel/fortress-panel.git
cd fortress-panel
```

2. **Configure environment**
```bash
cp .env.docker.example .env
# Edit .env with your secure passwords and configuration
```

3. **Start the application**
```bash
# Using Make (recommended)
make prod

# Or using Docker Compose directly
docker-compose --profile monitoring --profile logging --profile backup up -d
```

4. **Access the application**
- Main Application: https://localhost
- phpMyAdmin: http://localhost:8080
- Grafana (Monitoring): http://localhost:3000
- Prometheus: http://localhost:9090

## 🛠️ Development Setup

### Development Environment
```bash
# Start development environment with hot reload
make dev

# Or manually
docker-compose -f docker-compose.dev.yml --profile dev-runtimes --profile dev-tools up -d
```

### Development URLs
- Frontend: http://localhost:3001
- API: http://localhost:3001/api
- phpMyAdmin: http://localhost:8081
- MailHog (Email Testing): http://localhost:8025
- Redis Commander: http://localhost:8083
- Adminer (Database Admin): http://localhost:8082

### Quick Start Development
```bash
make quick-start
```

This command will:
1. Install all dependencies
2. Start development environment
3. Run database migrations
4. Seed initial data
5. Open the application in your browser

## 🏗️ Architecture Overview

### Production Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│  Fortress Panel │────│   MariaDB DB    │
│   (Port 80/443) │    │  (Port 3001)    │    │   (Port 3306)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │      Redis      │
                       │   (Port 6379)   │
                       └─────────────────┘
```

### Container Services
- **fortress-panel**: Main application with Nginx, Node.js, PHP-FPM
- **mariadb**: MySQL/MariaDB database
- **redis**: Caching and session storage
- **phpmyadmin**: Database management interface
- **prometheus**: Metrics collection (optional)
- **grafana**: Monitoring dashboard (optional)
- **loki/promtail**: Log aggregation (optional)

## ⚙️ Configuration

### Environment Variables
Copy `.env.docker.example` to `.env` and configure:

```bash
# Security (CHANGE THESE!)
DB_ROOT_PASSWORD=your-super-secure-root-password
DB_PASSWORD=your-super-secure-db-password
REDIS_PASSWORD=your-super-secure-redis-password
JWT_SECRET=your-super-secret-jwt-key-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key
GRAFANA_PASSWORD=your-super-secure-grafana-password

# Database
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=fortress_panel
DB_USERNAME=fortress_user

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### SSL Configuration
1. Generate self-signed certificates (development):
```bash
make generate-ssl
```

2. Or place your certificates in `docker/ssl/`:
- `docker/ssl/cert.pem`
- `docker/ssl/key.pem`

### Custom Configuration
- **Nginx**: `docker/config/nginx.conf`
- **PHP**: `docker/config/php-fpm.conf`
- **Supervisor**: `docker/config/supervisord.conf`
- **MySQL**: `docker/config/mysql/my.cnf`

## 🔧 Management Commands

### Using Makefile (Recommended)
```bash
# Development
make dev              # Start development environment
make dev-stop         # Stop development environment
make dev-logs         # Show development logs
make dev-restart      # Restart development environment

# Production
make prod             # Start production environment
make prod-stop        # Stop production environment
make prod-logs        # Show production logs
make prod-restart     # Restart production environment

# Database
make db-migrate       # Run migrations
make db-seed          # Seed database
make db-reset         # Reset database (migrate + seed)
make db-backup        # Backup database

# Maintenance
make clean            # Clean up Docker resources
make update           # Update dependencies
make security-scan    # Run security scan

# Utilities
make logs             # Show application logs
make shell            # Open shell in container
make health           # Check service health
make status           # Show all services status
```

### Using Docker Compose
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f fortress-panel

# Execute commands
docker-compose exec fortress-panel sh
docker-compose exec mariadb mysql -u root -p

# Build custom image
docker-compose build fortress-panel
```

## 📊 Monitoring & Logging

### Enable Monitoring Stack
```bash
docker-compose --profile monitoring up -d
```

This includes:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/GRAFANA_PASSWORD)

### Enable Log Aggregation
```bash
docker-compose --profile logging up -d
```

This includes:
- **Loki**: Log aggregation
- **Promtail**: Log collection

### Health Checks
```bash
# Check application health
curl http://localhost:3001/health

# Check service status
docker-compose ps
make health
```

## 🔄 Updates & Maintenance

### Update Dependencies
```bash
# Update Node.js dependencies
make update

# Update Docker images
make update-docker

# Rebuild and restart
docker-compose up -d --build
```

### Backup & Restore
```bash
# Create backup
docker-compose exec mariadb mysqldump -u root -p fortress_panel > backup.sql

# Restore backup
docker-compose exec -T mariadb mysql -u root -p fortress_panel < backup.sql
```

### Security Updates
```bash
# Run security audit
make security-scan

# Fix security issues
make security-fix
```

## 🏗️ Custom Runtime Images

Fortress Panel supports multiple programming language runtimes. Each runtime can be deployed as a separate container:

### Enable Specific Runtime
```bash
# PHP runtimes
docker-compose --profile php-runtimes up -d

# Node.js runtime
docker-compose --profile nodejs-runtimes up -d

# Python runtime
docker-compose --profile python-runtimes up -d

# Ruby runtime
docker-compose --profile ruby-runtimes up -d

# Go runtime
docker-compose --profile go-runtimes up -d

# Java runtime
docker-compose --profile java-runtimes up -d
```

### Custom Runtime Configuration
Runtime configurations are located in:
- `docker/config/php/php{version}.ini`
- `docker/config/runtimes/`

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Change all default passwords in `.env`
- [ ] Use strong, unique passwords
- [ ] Enable SSL/TLS with valid certificates
- [ ] Configure firewall rules
- [ ] Enable backup and monitoring
- [ ] Regular security updates
- [ ] Review access controls

### Network Security
- All services run in isolated Docker networks
- Only necessary ports are exposed
- Database and Redis are not publicly accessible
- Nginx handles SSL termination and security headers

### Container Security
- Non-root user for application containers
- Read-only filesystem where possible
- Resource limits configured
- Security scanning of images

## 🐛 Troubleshooting

### Common Issues

1. **Container won't start**
```bash
# Check logs
docker-compose logs fortress-panel

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

2. **Database connection issues**
```bash
# Check database status
docker-compose exec mariadb mysql -u root -p -e "SELECT 1"

# Reset database
make db-reset
```

3. **Permission issues**
```bash
# Fix file permissions
docker-compose exec fortress-panel chown -R node:node /var/lib/fortress-panel
```

4. **SSL certificate issues**
```bash
# Generate new certificates
make generate-ssl

# Check certificate paths
ls -la docker/ssl/
```

### Performance Tuning

1. **Memory and CPU limits**
   - Edit `docker-compose.yml` service limits
   - Monitor with `docker stats`

2. **Database performance**
   - Edit `docker/config/mysql/my.cnf`
   - Monitor slow queries

3. **Application performance**
   - Enable monitoring stack
   - Review Grafana dashboards

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Fortress Panel Documentation](./README.md)
- [Security Best Practices](./SECURITY.md)

## 🆘 Support

For Docker-related issues:
1. Check this documentation
2. Review logs with `make logs`
3. Check service status with `make health`
4. Review troubleshooting section

For application issues:
1. Check application documentation
2. Review application logs
3. Check database connection