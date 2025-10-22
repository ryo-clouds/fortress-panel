# Fortress Panel

<div align="center">

![Fortress Panel Logo](/assets/logo.png)

**High-Security Control Panel with Zero Trust Architecture**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%3E%3D20.10.0-blue.svg)](https://www.docker.com/)
[![Security](https://img.shields.io/badge/security-A+-brightgreen.svg)](#security-features)

[Features](#features) • [Quick Start](#quick-start) • [Installation](#installation) • [Documentation](#documentation) • [Support](#support)

</div>

Fortress Panel is a modern, high-security control panel designed with Zero Trust Architecture principles. It supports multiple programming languages (PHP, Node.js, Python, Ruby, Go, Java) and provides comprehensive monitoring, logging, and security features.

## 🌟 Features

### 🔐 Security Features
- **Zero Trust Architecture** with device fingerprinting
- **Multi-Factor Authentication (MFA/TOTP)**
- **Role-Based Access Control (RBAC)** with granular permissions
- **JWT + Refresh Tokens** with secure session management
- **Rate Limiting & Brute Force Protection**
- **Comprehensive Audit Logging**
- **Encrypted Data Storage** for sensitive information
- **SSL/TLS Configuration** with automatic certificate generation

### 🚀 Multi-Language Support
- **PHP 8.0, 8.1, 8.2** with Apache/Nginx
- **Node.js 16, 18, 20** with Express/Fastify
- **Python 3.9, 3.10, 3.11** with Flask/Django/FastAPI
- **Ruby 3.1, 3.2** with Rails/Sinatra
- **Go 1.20, 1.21** with standard HTTP server
- **Java 11, 17, 21** with Spring Boot/Quarkus

### 📊 Monitoring & Logging
- **Real-time System Metrics** (CPU, Memory, Disk, Network)
- **Application Performance Monitoring**
- **Health Checks** with automatic alerting
- **Prometheus + Grafana** integration
- **Log Aggregation** with Loki/Promtail
- **Custom Dashboard** with performance scoring
- **Alert Management** with resolution workflow

### 🐳 Containerization
- **Docker Compose** with production-ready configuration
- **Multi-stage Docker builds** for optimization
- **Development containers** with hot reload
- **Application runtime containers** for isolation
- **Automatic scaling** and load balancing support

### 🛠️ Developer Experience
- **TypeScript** for type safety
- **Hot reload** development environment
- **Database migrations** and seeding
- **API documentation** with OpenAPI/Swagger
- **Component-based architecture**
- **Comprehensive testing framework**

## 🚀 Quick Start

### Prerequisites
- **Docker 20.10+** and **Docker Compose 2.0+**
- **4GB+ RAM** and **20GB+ disk space**
- **Node.js 18+** (for local development)
- **Git** for cloning the repository

### 5-Minute Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/fortress-panel/fortress-panel.git
   cd fortress-panel
   ```

2. **Configure environment**
   ```bash
   cp .env.docker.example .env
   # Edit .env with your secure passwords
   ```

3. **Start the application**
   ```bash
   make quick-start
   ```

4. **Access your panel**
   - 🌐 **Main Application**: http://localhost:3001
   - 🗄️ **Database Admin**: http://localhost:8081 (phpMyAdmin)
   - 📊 **Monitoring**: http://localhost:3000 (Grafana)
   - 📧 **Email Testing**: http://localhost:8025 (MailHog)

**That's it!** Your Fortress Panel is now running with all services configured.

## 📋 Installation

### Production Deployment

#### Server Requirements

**Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

**Recommended Requirements:**
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: 100Mbps+

#### Required Software

1. **Docker & Docker Compose**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # CentOS/RHEL
   sudo yum install -y yum-utils
   sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
   sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

2. **Git**
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install -y git
   
   # CentOS/RHEL
   sudo yum install -y git
   ```

3. **Port Configuration**
   Ensure the following ports are available:
   - **80, 443** - HTTP/HTTPS (required)
   - **3001** - Application API (required)
   - **3306** - MariaDB (internal)
   - **6379** - Redis (internal)
   - **8080** - phpMyAdmin (optional)
   - **3000** - Grafana (optional)

#### Step-by-Step Installation

1. **System Preparation**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
   sudo yum update -y                     # CentOS/RHEL
   
   # Create application directory
   sudo mkdir -p /opt/fortress-panel
   sudo chown $USER:$USER /opt/fortress-panel
   cd /opt/fortress-panel
   ```

2. **Clone Repository**
   ```bash
   git clone https://github.com/fortress-panel/fortress-panel.git .
   ```

3. **Configure Environment**
   ```bash
   # Copy and edit environment configuration
   cp .env.docker.example .env
   nano .env  # Edit with your preferred editor
   ```

   **Critical Security Settings:**
   ```bash
   # Generate secure passwords
   DB_ROOT_PASSWORD=$(openssl rand -base64 32)
   DB_PASSWORD=$(openssl rand -base64 32)
   REDIS_PASSWORD=$(openssl rand -base64 32)
   JWT_SECRET=$(openssl rand -base64 64)
   ENCRYPTION_KEY=$(openssl rand -base64 32)
   GRAFANA_PASSWORD=$(openssl rand -base64 16)
   
   # Update .env file
   sed -i "s/your-super-secure-mysql-root-password-change-me/$DB_ROOT_PASSWORD/" .env
   sed -i "s/your-super-secure-database-password-change-me/$DB_PASSWORD/" .env
   sed -i "s/your-super-secure-redis-password-change-me/$REDIS_PASSWORD/" .env
   sed -i "s/your-super-secret-jwt-key-at-least-32-characters-long-change-in-production/$JWT_SECRET/" .env
   sed -i "s/your-32-character-encryption-key-123456/$ENCRYPTION_KEY/" .env
   sed -i "s/your-super-secure-grafana-password-change-me/$GRAFANA_PASSWORD/" .env
   ```

4. **SSL Certificate Setup**
   
   **Option A: Let's Encrypt (Recommended)**
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian
   sudo yum install certbot python3-certbot-nginx   # CentOS/RHEL
   
   # Generate certificate (replace yourdomain.com)
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   
   # Copy certificates to application directory
   sudo mkdir -p docker/ssl
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/key.pem
   sudo chown $USER:$USER docker/ssl/*
   ```

   **Option B: Self-Signed (Development)**
   ```bash
   make generate-ssl
   ```

5. **Start Services**
   ```bash
   # Production deployment
   make prod
   
   # Or with Docker Compose directly
   docker-compose --profile monitoring --profile logging --profile backup up -d
   ```

6. **Initial Setup**
   ```bash
   # Run database migrations
   make db-migrate
   
   # Seed initial data
   make db-seed
   
   # Check service health
   make health
   ```

7. **Configure Firewall**
   ```bash
   # Ubuntu (UFW)
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   
   # CentOS (firewalld)
   sudo firewall-cmd --permanent --add-service=ssh
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

8. **Setup Systemd Service (Optional)**
   ```bash
   # Create systemd service file
   sudo tee /etc/systemd/system/fortress-panel.service > /dev/null <<EOF
   [Unit]
   Description=Fortress Panel
   Requires=docker.service
   After=docker.service
   
   [Service]
   Type=oneshot
   RemainAfterExit=yes
   WorkingDirectory=/opt/fortress-panel
   ExecStart=/usr/local/bin/docker-compose --profile monitoring --profile logging --profile backup up -d
   ExecStop=/usr/local/bin/docker-compose down
   TimeoutStartSec=0
   
   [Install]
   WantedBy=multi-user.target
   EOF
   
   # Enable and start service
   sudo systemctl enable fortress-panel
   sudo systemctl start fortress-panel
   ```

### Environment Configuration

Create a `.env` file with the following configuration:

```bash
# ========================================
# SECURITY KEYS (CHANGE THESE!)
# ========================================
DB_ROOT_PASSWORD=your-super-secure-mysql-root-password
DB_PASSWORD=your-super-secure-database-password
REDIS_PASSWORD=your-super-secure-redis-password
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
ENCRYPTION_KEY=your-32-character-encryption-key-123456
GRAFANA_PASSWORD=your-super-secure-grafana-password

# ========================================
# DATABASE CONFIGURATION
# ========================================
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=fortress_panel
DB_USERNAME=fortress_user
DB_CHARSET=utf8mb4
DB_TIMEZONE=+00:00

# ========================================
# REDIS CONFIGURATION
# ========================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# ========================================
# EMAIL CONFIGURATION (Optional)
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-app-password
SMTP_FROM=noreply@yourdomain.com

# ========================================
# APPLICATION SETTINGS
# ========================================
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info

# ========================================
# SECURITY SETTINGS
# ========================================
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
PASSWORD_MIN_LENGTH=12
ENABLE_MFA=true
ENABLE_AUDIT=true

# ========================================
# BACKUP CONFIGURATION
# ========================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_ENABLED=true

# ========================================
# MONITORING SETTINGS
# ========================================
ENABLE_MONITORING=true
ENABLE_LOGGING=true
HEALTH_CHECK_INTERVAL=30000
```

## 📚 Documentation

### User Guide
- [Getting Started](docs/user-guide/getting-started.md)
- [User Management](docs/user-guide/user-management.md)
- [Domain Management](docs/user-guide/domains.md)
- [Application Deployment](docs/user-guide/applications.md)
- [Security Settings](docs/user-guide/security.md)

### Administrator Guide
- [Installation Guide](docs/admin/installation.md)
- [Configuration](docs/admin/configuration.md)
- [Security Hardening](docs/admin/security-hardening.md)
- [Backup & Recovery](docs/admin/backup-recovery.md)
- [Performance Tuning](docs/admin/performance-tuning.md)

### Developer Guide
- [Development Setup](docs/developer/development-setup.md)
- [API Documentation](docs/developer/api.md)
- [Plugin Development](docs/developer/plugins.md)
- [Contributing Guidelines](docs/developer/contributing.md)
- [Architecture Overview](docs/developer/architecture.md)

## 🛠️ Management Commands

### Using Makefile (Recommended)

```bash
# Development Commands
make dev              # Start development environment
make dev-stop         # Stop development environment
make dev-logs         # Show development logs
make dev-restart      # Restart development environment

# Production Commands
make prod             # Start production environment
make prod-stop        # Stop production environment
make prod-logs        # Show production logs
make prod-restart     # Restart production environment

# Database Commands
make db-migrate       # Run database migrations
make db-seed          # Seed database with initial data
make db-reset         # Reset database (migrate + seed)
make db-backup        # Create database backup

# Maintenance Commands
make health           # Check service health
make logs             # Show application logs
make clean            # Clean up Docker resources
make update           # Update dependencies
make security-scan    # Run security audit

# Utilities
make shell            # Open shell in application container
make status           # Show all services status
make version          # Show version information
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

# Update services
docker-compose pull
docker-compose up -d --build
```

## 🔧 Configuration

### Database Configuration

**MariaDB Settings** (`docker/config/mysql/my.cnf`):
```ini
[mysqld]
max_connections = 200
max_allowed_packet = 64M
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

### Nginx Configuration

**Security Settings** (`docker/config/nginx.conf`):
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Security headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### Application Configuration

**Environment Variables**:
- `NODE_ENV`: Set to `production` for production
- `DEBUG`: Disable in production (`false`)
- `LOG_LEVEL`: Set to `info` or `warn` in production
- `ENABLE_MFA`: Enable multi-factor authentication
- `ENABLE_AUDIT`: Enable audit logging

## 🔒 Security

### Security Checklist

#### Pre-Deployment
- [ ] Change all default passwords
- [ ] Use strong, unique passwords
- [ ] Enable SSL/TLS with valid certificates
- [ ] Configure firewall rules
- [ ] Set up backup and recovery
- [ ] Review and update security settings

#### Post-Deployment
- [ ] Enable monitoring and alerting
- [ ] Set up log rotation
- [ ] Configure automatic security updates
- [ ] Test backup and recovery procedures
- [ ] Review access controls and permissions
- [ ] Set up intrusion detection

### Hardening Guide

1. **System Security**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Configure automatic security updates
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

2. **Network Security**
   ```bash
   # Configure firewall
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Application Security**
   - Change all default passwords
   - Enable MFA for all admin accounts
   - Configure rate limiting
   - Set up audit logging
   - Regular security updates

## 📊 Monitoring

### Metrics Available

**System Metrics:**
- CPU usage and load average
- Memory usage and swap
- Disk usage and I/O
- Network traffic and connections
- Process monitoring

**Application Metrics:**
- Request rate and response time
- Error rates and status codes
- Active user sessions
- Application deployment status
- Resource usage per application

**Custom Metrics:**
- Business KPIs
- User engagement metrics
- Performance benchmarks
- Custom alerts and thresholds

### Accessing Monitoring Tools

- **Grafana Dashboard**: http://your-domain:3000
- **Prometheus**: http://your-domain:9090
- **Application Monitoring**: http://your-domain:3001/api/monitoring

## 🔄 Backup & Recovery

### Automated Backups

```bash
# Configure backup schedule
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_ENABLED=true
```

### Manual Backup

```bash
# Database backup
docker-compose exec mariadb mysqldump -u root -p fortress_panel > backup.sql

# Application data backup
docker run --rm -v fortress_panel_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz -C /data .

# Configuration backup
tar czf config-backup.tar.gz .env docker/ssl/
```

### Recovery

```bash
# Database restore
docker-compose exec -T mariadb mysql -u root -p fortress_panel < backup.sql

# Application data restore
docker run --rm -v fortress_panel_data:/data -v $(pwd):/backup alpine tar xzf /backup/data-backup.tar.gz -C /data

# Configuration restore
tar xzf config-backup.tar.gz
```

## 🐛 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs fortress-panel

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec mariadb mysql -u root -p -e "SELECT 1"

# Reset database
make db-reset
```

#### SSL Certificate Issues
```bash
# Regenerate certificates
make generate-ssl

# Check certificate paths
ls -la docker/ssl/
```

#### Performance Issues
```bash
# Check system resources
docker stats
make health

# Review logs for errors
make logs
```

### Getting Help

1. **Check logs** for error messages
2. **Review troubleshooting section** in this README
3. **Check service health** with `make health`
4. **Consult documentation** in `/docs` directory
5. **Open an issue** on GitHub

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/developer/contributing.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/fortress-panel/fortress-panel.git
cd fortress-panel

# Install dependencies
make install

# Start development environment
make dev

# Run tests
make test

# Run linting
make lint
```

## 🆘 Support

- **Documentation**: [Full documentation](https://fortress-panel.com/docs)
- **GitHub Issues**: [Report bugs](https://github.com/fortress-panel/fortress-panel/issues)
- **Discord Community**: [Join our Discord](https://discord.gg/fortress-panel)
- **Professional Support**: [Contact us](mailto:support@fortress-panel.com)

## 🎯 Roadmap

- [ ] **v1.1**: Enhanced security features, improved UI/UX
- [ ] **v1.2**: Kubernetes support, advanced monitoring
- [ ] **v1.3**: Multi-tenancy, advanced RBAC
- [ ] **v2.0**: Microservices architecture, distributed deployment

---

<div align="center">

**Built with ❤️ by the Fortress Panel Team**

[![GitHub stars](https://img.shields.io/github/stars/fortress-panel/fortress-panel.svg?style=social&label=Star)](https://github.com/ryo-clouds/fortress-panel)
[![GitHub forks](https://img.shields.io/github/forks/fortress-panel/fortress-panel.svg?style=social&label=Fork)](https://github.com/ryo-clouds/fortress-panel/fork)
[![GitHub issues](https://img.shields.io/github/issues/fortress-panel/fortress-panel.svg)](https://github.com/ryo-clouds/fortress-panel/issues)

</div>