# Multi-stage build for Fortress Panel Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install dependencies (change from npm ci to npm install for now)
RUN npm install --production

# Copy source code
COPY backend/src ./src
COPY shared ../shared
RUN mkdir -p backend/shared && cp -r ../shared/* backend/shared/

# Build the application
RUN npm run build

# Production backend image
FROM node:20-alpine AS backend

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    bash \
    mysql-client \
    redis \
    python3 \
    php \
    php-fpm \
    nginx \
    supervisor \
    && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/tsconfig.json ./

# Create necessary directories
RUN mkdir -p /var/log/fortress-panel \
    /var/lib/fortress-panel/apps \
    /var/lib/fortress-panel/uploads \
    /var/lib/fortress-panel/backups \
    /var/lib/fortress-panel/ssl \
    /etc/supervisor.d

# Copy configuration files
COPY docker/config/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/config/nginx.conf /etc/nginx/nginx.conf
COPY docker/config/php-fpm.conf /etc/php8/php-fpm.conf

# Set permissions
RUN chown -R node:node /app \
    /var/log/fortress-panel \
    /var/lib/fortress-panel \
    && chmod +x docker/scripts/*.sh

# Switch to non-root user
USER node

# Expose ports
EXPOSE 3001 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start command
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]

# Frontend build stage
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install --production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Production frontend image (served by nginx)
FROM nginx:alpine AS frontend

# Install nginx and additional tools
RUN apk add --no-cache \
    curl \
    bash

# Copy built frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/config/frontend-nginx.conf /etc/nginx/conf.d/default.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Complete application image (backend + frontend)
FROM node:20-alpine AS production

WORKDIR /app

# Install all required dependencies
RUN apk add --no-cache \
    curl \
    bash \
    mysql-client \
    redis \
    python3 \
    php \
    php-fpm \
    nginx \
    supervisor \
    git \
    docker \
    docker-compose \
    go \
    ruby \
    ruby-bundler \
    openjdk11-jdk \
    maven \
    && rm -rf /var/cache/apk/*

# Copy backend from backend stage
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/tsconfig.json ./

# Copy frontend from frontend stage
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy all configuration files
COPY docker/config/ /etc/fortress-panel/
COPY docker/scripts/ /opt/fortress-panel/scripts/

# Create application directories
RUN mkdir -p \
    /var/log/fortress-panel \
    /var/lib/fortress-panel/apps \
    /var/lib/fortress-panel/uploads \
    /var/lib/fortress-panel/backups \
    /var/lib/fortress-panel/ssl \
    /etc/supervisor.d \
    /opt/fortress-panel/runtimes

# Setup language runtimes
RUN /opt/fortress-panel/scripts/setup-runtimes.sh

# Copy and setup configuration
COPY docker/config/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/config/nginx.conf /etc/nginx/nginx.conf
COPY docker/config/php-fpm.conf /etc/php8/php-fpm.conf

# Set permissions
RUN chown -R node:node /app \
    /var/log/fortress-panel \
    /var/lib/fortress-panel \
    /opt/fortress-panel \
    && chmod +x /opt/fortress-panel/scripts/*.sh

# Switch to non-root user for application
USER node

# Expose all necessary ports
EXPOSE 3001 80 443 3000 8000 4567 8080 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health && curl -f http://localhost/ || exit 1

# Start all services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]