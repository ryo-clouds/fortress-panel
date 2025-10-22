#!/bin/bash

# Fortress Panel Deployment Test Script
# Usage: ./test-deployment.sh [dev|prod]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MODE=${1:-dev}
BASE_URL="http://localhost"
API_PORT=3001
WEB_PORT=3001

if [ "$MODE" = "prod" ]; then
    BASE_URL="http://localhost"
    API_PORT=443
fi

echo -e "${BLUE}🧪 Fortress Panel Deployment Test Script${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "Mode: ${YELLOW}$MODE${NC}"
echo -e "API URL: ${BASE_URL}:${API_PORT}"
echo -e "Web URL: ${BASE_URL}:${WEB_PORT}"
echo ""

# Function to print test results
print_test() {
    local test_name=$1
    local result=$2
    if [ $result -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
    else
        echo -e "${RED}❌ $test_name${NC}"
        return 1
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local test_name=$3
    
    echo "Testing $test_name..."
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        print_test "$test_name" 0
        return 0
    else
        print_test "$test_name" 1
        return 1
    fi
}

# Start testing
echo -e "${YELLOW}Starting Fortress Panel Tests...${NC}"
echo ""

# Test 1: Check if containers are running
echo -e "${BLUE}🐳 Container Tests${NC}"
echo "---------------------"

# Function to check container status
check_container() {
    local container_name=$1
    if docker-compose ps | grep -q "$container_name.*Up"; then
        print_test "Container $container_name is running" 0
        return 0
    else
        print_test "Container $container_name is running" 1
        return 1
    fi
}

check_container "fortress-panel"
check_container "mariadb"
check_container "redis"

echo ""

# Test 2: Database Connectivity
echo -e "${BLUE}🗄️ Database Tests${NC}"
echo "-------------------"

# Test MariaDB connection
echo "Testing MariaDB connection..."
if docker-compose exec -T mariadb mysql -u root -p"$DB_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; then
    print_test "MariaDB connection successful" 0
else
    print_test "MariaDB connection successful" 1
fi

# Test Redis connection
echo "Testing Redis connection..."
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    print_test "Redis connection successful" 0
else
    print_test "Redis connection successful" 1
fi

echo ""

# Test 3: Application Health
echo -e "${BLUE}🏥 Application Health Tests${NC}"
echo "----------------------------"

# Test health endpoint
test_endpoint "${BASE_URL}:${API_PORT}/health" "200" "Application Health Endpoint"

# Test API docs
test_endpoint "${BASE_URL}:${API_PORT}/api/docs" "200" "API Documentation"

# Test main application (if accessible)
if [ "$MODE" = "dev" ]; then
    test_endpoint "${BASE_URL}:${WEB_PORT}" "200" "Main Application"
fi

echo ""

# Test 4: Service Dependencies
echo -e "${BLUE}🔧 Service Dependencies${NC}"
echo "------------------------"

# Test database tables exist
echo "Checking database tables..."
if docker-compose exec -T mariadb mysql -u root -p"$DB_ROOT_PASSWORD" fortress_panel -e "SHOW TABLES;" | grep -q "users"; then
    print_test "Database tables exist" 0
else
    print_test "Database tables exist" 1
fi

# Test Redis functionality
echo "Testing Redis functionality..."
if docker-compose exec -T redis redis-cli set test_key "test_value" >/dev/null 2>&1 && \
   docker-compose exec -T redis redis-cli get test_key | grep -q "test_value"; then
    print_test "Redis functionality" 0
else
    print_test "Redis functionality" 1
fi

echo ""

# Test 5: Security Headers
echo -e "${BLUE}🔒 Security Tests${NC}"
echo "-------------------"

# Test security headers
echo "Testing security headers..."
SECURITY_HEADERS=$(curl -s -I "${BASE_URL}:${API_PORT}/health" 2>/dev/null || echo "")

if echo "$SECURITY_HEADERS" | grep -q "X-Frame-Options"; then
    print_test "X-Frame-Options header present" 0
else
    print_test "X-Frame-Options header present" 1
fi

if echo "$SECURITY_HEADERS" | grep -q "X-Content-Type-Options"; then
    print_test "X-Content-Type-Options header present" 0
else
    print_test "X-Content-Type-Options header present" 1
fi

echo ""

# Test 6: File System Permissions
echo -e "${BLUE}📁 File System Tests${NC}"
echo "----------------------"

# Test if required directories exist
echo "Checking application directories..."
if [ -d "/var/lib/fortress-panel" ]; then
    print_test "Application data directory exists" 0
else
    print_test "Application data directory exists" 1
fi

if [ -d "docker/ssl" ] && [ -f "docker/ssl/cert.pem" ]; then
    print_test "SSL certificates exist" 0
else
    print_test "SSL certificates exist" 1
fi

echo ""

# Test 7: Resource Usage
echo -e "${BLUE}💾 Resource Usage Tests${NC}"
echo "-----------------------"

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    print_test "Disk usage is under 90% (${DISK_USAGE}%)" 0
else
    print_test "Disk usage is under 90% (${DISK_USAGE}%)" 1
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    print_test "Memory usage is under 80% (${MEMORY_USAGE}%)" 0
else
    print_test "Memory usage is under 80% (${MEMORY_USAGE}%)" 1
fi

echo ""

# Test 8: Monitoring Services (if enabled)
echo -e "${BLUE}📊 Monitoring Tests${NC}"
echo "----------------------"

# Test Grafana (if enabled)
if docker-compose ps | grep -q "grafana.*Up"; then
    test_endpoint "http://localhost:3000/api/health" "200" "Grafana Health"
fi

# Test Prometheus (if enabled)
if docker-compose ps | grep -q "prometheus.*Up"; then
    test_endpoint "http://localhost:9090/-/healthy" "200" "Prometheus Health"
fi

echo ""

# Test 9: Application Features
echo -e "${BLUE}🚀 Application Feature Tests${NC}"
echo "-----------------------------"

# Test user registration endpoint
echo "Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}:${API_PORT}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"TestPassword123!"}' 2>/dev/null || echo "")

if echo "$REGISTER_RESPONSE" | grep -q "success"; then
    print_test "User registration endpoint" 0
else
    print_test "User registration endpoint" 1
fi

# Test login endpoint (with mock credentials if needed)
echo "Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}:${API_PORT}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"password123"}' 2>/dev/null || echo "")

if echo "$LOGIN_RESPONSE" | grep -q "token\|success\|authenticated"; then
    print_test "Login endpoint" 0
else
    print_test "Login endpoint" 1
fi

echo ""

# Summary
echo -e "${BLUE}📋 Test Summary${NC}"
echo "==============="

# Count total tests
TOTAL_TESTS=0
PASSED_TESTS=0

# Get test count from above
if docker-compose ps | grep -q "fortress-panel.*Up"; then
    ((PASSED_TESTS++))
fi
((TOTAL_TESTS++))

if docker-compose ps | grep -q "mariadb.*Up"; then
    ((PASSED_TESTS++))
fi
((TOTAL_TESTS++))

if docker-compose ps | grep -q "redis.*Up"; then
    ((PASSED_TESTS++))
fi
((TOTAL_TESTS++))

# Add more test counts here...

echo "Total Tests: $TOTAL_TESTS"
echo "Passed Tests: $PASSED_TESTS"
echo "Failed Tests: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All tests passed! Fortress Panel is ready.${NC}"
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo -e "  • Application: ${BASE_URL}:${WEB_PORT}"
    echo -e "  • API Documentation: ${BASE_URL}:${API_PORT}/api/docs"
    echo -e "  • Health Check: ${BASE_URL}:${API_PORT}/health"
    echo ""
    if [ "$MODE" = "dev" ]; then
        echo -e "${BLUE}Development Services:${NC}"
        echo -e "  • phpMyAdmin: http://localhost:8081"
        echo -e "  • MailHog: http://localhost:8025"
        echo -e "  • Grafana: http://localhost:3000 (admin/admin)"
    fi
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the logs above.${NC}"
    echo ""
    echo -e "${BLUE}Troubleshooting:${NC}"
    echo "1. Check logs: make logs"
    echo "2. Restart services: make ${MODE}-restart"
    echo "3. Check configuration: nano .env"
    echo "4. Run database migrations: make db-migrate"
    exit 1
fi