#!/bin/bash

# Simple test script for Fortress Panel
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧪 Fortress Panel Simple Test Script${NC}"
echo "================================="
echo ""

# Test if required files exist
echo -e "${YELLOW}📁 Checking files...${NC}"
files_exist=0

required_files=(
    "package.json"
    "backend/package.json"
    "frontend/package.json"
    "shared/package.json"
    "backend/src/index.ts"
    "frontend/src/App.tsx"
    "shared/src/index.ts"
    "Dockerfile.simple"
    "docker-compose.simple.yml"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
        ((files_exist++))
    else
        echo -e "${RED}❌ $file${NC}"
    fi
done
echo ""

# Test dependencies
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
deps_ok=0

if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
    ((deps_ok++))
else
    echo -e "${RED}❌ Backend dependencies not found${NC}"
fi

if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
    ((deps_ok++))
else
    echo -e "${RED}❌ Frontend dependencies not found${NC}"
fi

if [ -d "shared/node_modules" ]; then
    echo -e "${GREEN}✅ Shared dependencies installed${NC}"
    ((deps_ok++))
else
    echo -e "${RED}❌ Shared dependencies not found${NC}"
fi
echo ""

# Test configuration
echo -e "${YELLOW}⚙️  Checking configuration...${NC}"
config_ok=0

if [ -f ".env.docker.example" ]; then
    echo -e "${GREEN}✅ Environment template exists${NC}"
    ((config_ok++))
else
    echo -e "${RED}❌ Environment template not found${NC}"
fi

if [ -f "Dockerfile.simple" ]; then
    echo -e "${GREEN}✅ Simple Dockerfile exists${NC}"
    ((config_ok++))
else
    echo -e "${RED}❌ Simple Dockerfile not found${NC}"
fi

if [ -f "docker-compose.simple.yml" ]; then
    echo -e "${GREEN}✅ Simple Docker Compose file exists${NC}"
    ((config_ok++))
else
    echo -e "${RED}❌ Simple Docker Compose file not found${NC}"
fi
echo ""

# Summary
total_tests=$((files_exist + deps_ok + config_ok))
passed_tests=$((files_exist + deps_ok + config_ok))

echo -e "${YELLOW}📊 Test Summary${NC}"
echo "================="
echo "Total tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $((total_tests - passed_tests))"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}🎉 All tests passed! Ready to start Fortress Panel.${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Copy environment file: cp .env.docker.example .env"
    echo "2. Edit .env with your passwords"
    echo "3. Run: make quick-start"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi