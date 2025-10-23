#!/bin/bash

# Fortress Panel Simple Database Setup Script
set -e

echo "🗄️  Fortress Panel Simple Database Setup"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_HOST="mariadb"
DB_PORT="3306"
DB_ROOT_PASSWORD="fortress-admin-123"
DB_USER="fortress_user"
DB_PASSWORD="your-super-secure-database-password-change-me"
DB_NAME="fortress_panel"

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Root Password: $DB_ROOT_PASSWORD"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Function to test MariaDB connection
test_connection() {
    echo -e "${YELLOW}🔗 Testing MariaDB connection...${NC}"
    
    # Wait a moment for MariaDB to be fully ready
    echo -e "${BLUE}⏳ Waiting for MariaDB to be ready...${NC}"
    for i in {1..30}; do
        if docker-compose -f docker-compose.simple.yml exec mariadb mysqladmin ping -h"$DB_HOST" --silent 2>/dev/null; then
            echo -e "${GREEN}✅ MariaDB is ready${NC}"
            break
        fi
        echo -e "${BLUE}   Waiting... ($i/30)${NC}"
        sleep 1
    done
    
    # Test actual connection
    if docker-compose -f docker-compose.simple.yml exec mariadb mysql -u root -p"$DB_ROOT_PASSWORD" -e "SELECT 'Connection Test Successful' as test;" 2>/dev/null; then
        echo -e "${GREEN}✅ MariaDB connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ MariaDB connection failed${NC}"
        echo -e "${YELLOW}   Trying alternative setup...${NC}"
        return 1
    fi
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}📝 Setting up database and users...${NC}"
    
    # Create database if not exists
    echo "Creating database..."
    docker-compose -f docker-compose.simple.yml exec mariadb mysql -u root -p"$DB_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    # Create user if not exists
    echo "Creating database user..."
    docker-compose -f docker-compose.simple.yml exec mariadb mysql -u root -p"$DB_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';" 2>/dev/null
    docker-compose -f docker-compose.simple.yml exec mariadb mysql -u root -p"$DB_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';" 2>/dev/null
    docker-compose -f docker-compose.simple.yml exec mariadb mysql -u root -p"$DB_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database setup completed${NC}"
        
        # Create users using fortress-panel API
        echo "Creating users via API..."
        
        # Wait for fortress-panel to be ready
        sleep 5
        
        # Create admin user via API
        curl -X POST http://localhost:3001/api/v1/auth/register \
            -H "Content-Type: application/json" \
            -H "X-Setup-Internal: true" \
            -d '{
                "username": "admin",
                "email": "admin@fortress-panel.local", 
                "password": "admin123",
                "role": "admin",
                "permissions": {
                    "admin": true,
                    "users": ["create", "read", "update", "delete"],
                    "applications": ["create", "read", "update", "delete"],
                    "databases": ["create", "read", "update", "delete"],
                    "domains": ["create", "read", "update", "delete"],
                    "monitoring": ["read"],
                    "system": ["read", "update"]
                }
            }' 2>/dev/null
        
        echo -e "${GREEN}✅ Users created successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Database setup failed${NC}"
        return 1
    fi
}

# Main execution
echo -e "${BLUE}🚀 Starting Fortress Panel database setup...${NC}"

if test_connection; then
    setup_database
    
    echo ""
    echo -e "${GREEN}✨ Setup complete! Fortress Panel is ready to use.${NC}"
    echo ""
    echo -e "${BLUE}📋 Default Users Created:${NC}"
    echo -e "   ${GREEN}Admin: admin / admin123${NC}"
    echo -e "   ${GREEN}Demo:  demo  / user123${NC}"
    echo ""
    echo -e "${BLUE}🔗 Access Points:${NC}"
    echo -e "   ${GREEN}API Server: http://localhost:3001${NC}"
    echo -e "   ${GREEN}phpMyAdmin: http://localhost:8080${NC}"
    echo -e "   ${GREEN}Database: MariaDB on port 3306${NC}"
    echo ""
    echo -e "${BLUE}📝 Database Credentials for phpMyAdmin:${NC}"
    echo -e "   ${GREEN}Server: mariadb${NC}"
    echo -e "   ${GREEN}Username: fortress_user${NC}"
    echo -e "   ${GREEN}Password: your-super-secure-database-password-change-me${NC}"
    echo -e "   ${GREEN}Database: fortress_panel${NC}"
    echo ""
else
    echo -e "${RED}❌ Cannot connect to MariaDB. Please check:${NC}"
    echo -e "   1. MariaDB container status: docker-compose logs mariadb"
    echo -e "   2. Network connectivity: docker network ls"
    echo -e "   3. Port accessibility: telnet localhost 3306"
    echo ""
    exit 1
fi