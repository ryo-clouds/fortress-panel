#!/bin/bash

# Fortress Panel Database Setup Script
set -e

echo "🗄️  Fortress Panel Database Setup"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-fortress_user}"
DB_PASSWORD="${DB_PASSWORD:-your-super-secure-database-password-change-me}"
DB_NAME="${DB_NAME:-fortress_panel}"

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Function to check if database exists
check_database() {
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME;" >/dev/null 2>&1
    return $?
}

# Function to create database
create_database() {
    echo -e "${YELLOW}📝 Creating database: $DB_NAME${NC}"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"root" -p"${DB_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database created successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to create database${NC}"
        return 1
    fi
}

# Function to create database user
create_user() {
    echo -e "${YELLOW}👤 Creating database user: $DB_USER${NC}"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"root" -p"${DB_ROOT_PASSWORD}" -e "CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"root" -p"${DB_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"root" -p"${DB_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database user created successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to create database user${NC}"
        return 1
    fi
}

# Function to test database connection
test_connection() {
    echo -e "${YELLOW}🔗 Testing database connection...${NC}"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 'Connection successful' as test;" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        return 1
    fi
}

# Function to run database setup
setup_database() {
    echo -e "${YELLOW}🚀 Running Fortress Panel database setup...${NC}"
    
    # Wait for database to be ready
    echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
    for i in {1..30}; do
        if mysql -h"$DB_HOST" -P"$DB_PORT" -u"root" -p"${DB_ROOT_PASSWORD}" -e "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Database not ready after 30 seconds${NC}"
            exit 1
        fi
        echo -e "${BLUE}   Waiting... ($i/30)${NC}"
        sleep 1
    done
    
    # Create database if it doesn't exist
    if ! check_database; then
        create_database || exit 1
    else
        echo -e "${GREEN}✅ Database already exists${NC}"
    fi
    
    # Create user if needed
    create_user || exit 1
    
    # Test connection
    test_connection || exit 1
    
    echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Default Users Created:${NC}"
    echo -e "   ${GREEN}Admin: admin / admin123${NC}"
    echo -e "   ${GREEN}Demo:  demo  / user123${NC}"
    echo ""
    echo -e "${BLUE}🔗 Access Points:${NC}"
    echo -e "   ${GREEN}API Server: http://localhost:3001${NC}"
    echo -e "   ${GREEN}phpMyAdmin: http://localhost:8080${NC}"
    echo ""
}

# Check if required environment variables are set
if [ -z "$DB_ROOT_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  DB_ROOT_PASSWORD not found, using default password${NC}"
    DB_ROOT_PASSWORD="fortress-admin-123"
    echo -e "${BLUE}🔐 Using default root password: fortress-admin-123${NC}"
fi

# Run setup
setup_database

echo -e "${GREEN}✨ Setup complete! Fortress Panel is ready to use.${NC}"