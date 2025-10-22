#!/bin/bash

# Fortress Panel Language Runtimes Setup Script
set -e

echo "🔧 Setting up language runtimes for Fortress Panel..."

# Create runtime directories
mkdir -p /opt/fortress-panel/runtimes/{php,nodejs,python,ruby,go,java}
mkdir -p /var/log/fortress-panel/runtimes

# Setup PHP runtimes
setup_php() {
    echo "📦 Setting up PHP runtimes..."
    
    for version in 8.0 8.1 8.2; do
        echo "  Installing PHP $version..."
        
        # Install PHP-FPM for each version
        apk add --no-cache \
            php${version/./} \
            php${version/./}-fpm \
            php${version/./}-cli \
            php${version/./}-mysql \
            php${version/./}-pgsql \
            php${version/./}-redis \
            php${version/./}-memcached \
            php${version/./}-gd \
            php${version/./}-curl \
            php${version/./}-json \
            php${version/./}-mbstring \
            php${version/./}-xml \
            php${version/./}-zip \
            php${version/./}-bcmath \
            php${version/./}-intl \
            2>/dev/null || true
        
        # Create pool configuration
        cat > /etc/php${version/./}/php-fpm.d/fortress-panel.conf <<EOF
[fortress-panel-${version}]
user = www-data
group = www-data
listen = /run/php${version/./}-fpm/fortress-panel.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 20
pm.start_servers = 2
pm.min_spare_servers = 2
pm.max_spare_servers = 10
pm.max_requests = 500

; Resource limits
php_admin_value[memory_limit] = 128M
php_admin_value[max_execution_time] = 30
php_admin_value[upload_max_filesize] = 64M
php_admin_value[post_max_size] = 64M

; Security
php_admin_value[open_basedir] = /var/lib/fortress-panel/apps/:/tmp/:/usr/share/nginx/
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen
EOF
        
        # Create startup script
        cat > /opt/fortress-panel/runtimes/php/start-php${version/./}.sh <<EOF
#!/bin/bash
#!/bin/bash
PHP_FPM_CONF="/etc/php${version/./}/php-fpm.conf"
PHP_POOL_CONF="/etc/php${version/./}/php-fpm.d/fortress-panel.conf"
SOCKET_FILE="/run/php${version/./}-fpm/fortress-panel.sock"

# Create socket directory
mkdir -p \$(dirname \$SOCKET_FILE)

# Start PHP-FPM with custom pool
php-fpm${version/./} --fpm-config \$PHP_FPM_CONF --php-ini /etc/php${version/./}/php.ini
EOF
        
        chmod +x /opt/fortress-panel/runtimes/php/start-php${version/./}.sh
    done
}

# Setup Node.js runtimes
setup_nodejs() {
    echo "📦 Setting up Node.js runtimes..."
    
    # Node.js is already installed in the base image
    # Create runtime scripts for different versions
    for version in 16 18 20; do
        cat > /opt/fortress-panel/runtimes/nodejs/start-nodejs${version}.sh <<EOF
#!/bin/bash
APP_DIR=\$1
PORT=\${2:-3000}
NODE_VERSION=${version}

cd \$APP_DIR
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    NODE_ENV=production PORT=\$PORT node app.js
else
    echo "No package.json found in \$APP_DIR"
    exit 1
fi
EOF
        
        chmod +x /opt/fortress-panel/runtimes/nodejs/start-nodejs${version}.sh
    done
}

# Setup Python runtimes
setup_python() {
    echo "📦 Setting up Python runtimes..."
    
    # Install additional Python packages
    pip3 install --no-cache-dir \
        virtualenv \
        pipenv \
        gunicorn \
        uwsgi \
        flask \
        django \
        fastapi \
        requests \
        sqlalchemy \
        celery \
        redis \
        psycopg2-binary \
        pymysql
    
    for version in 3.9 3.10 3.11; do
        cat > /opt/fortress-panel/runtimes/python/start-python${version}.sh <<EOF
#!/bin/bash
APP_DIR=\$1
PORT=\${2:-8000}
PYTHON_VERSION=${version}

cd \$APP_DIR
if [ -f "requirements.txt" ]; then
    # Create virtual environment
    python${version} -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
elif [ -f "Pipfile" ]; then
    pipenv install
    pipenv shell
fi

# Start application
if [ -f "app.py" ]; then
    gunicorn -w 2 -b 0.0.0.0:\$PORT app:app
elif [ -f "manage.py" ] && [ -d "settings" ]; then
    gunicorn -w 2 -b 0.0.0.0:\$PORT django_project.wsgi:application
else
    echo "No recognized Python application structure"
    exit 1
fi
EOF
        
        chmod +x /opt/fortress-panel/runtimes/python/start-python${version}.sh
    done
}

# Setup Ruby runtimes
setup_ruby() {
    echo "📦 Setting up Ruby runtimes..."
    
    # Install Ruby and bundler
    apk add --no-cache ruby ruby-dev ruby-bundler build-base
    
    # Install common gems
    gem install --no-document \
        rails \
        sinatra \
        puma \
        rack \
        json \
        redis \
        pg \
        mysql2 \
        sqlite3
    
    for version in 3.1 3.2; do
        cat > /opt/fortress-panel/runtimes/ruby/start-ruby${version}.sh <<EOF
#!/bin/bash
APP_DIR=\$1
PORT=\${2:-4567}

cd \$APP_DIR
if [ -f "Gemfile" ]; then
    bundle install
    if [ -f "config.ru" ]; then
        rackup -p \$PORT
    elif [ -f "config/application.rb" ]; then
        rails s -b 0.0.0.0 -p \$PORT
    else
        puma -p \$PORT
    fi
elif [ -f "app.rb" ]; then
    ruby app.rb -o 0.0.0.0 -p \$PORT
else
    echo "No recognized Ruby application structure"
    exit 1
fi
EOF
        
        chmod +x /opt/fortress-panel/runtimes/ruby/start-ruby${version}.sh
    done
}

# Setup Go runtimes
setup_go() {
    echo "📦 Setting up Go runtimes..."
    
    # Install Go (if not already installed)
    if ! command -v go &> /dev/null; then
        GO_VERSION="1.21.0"
        wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
        tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
        rm go${GO_VERSION}.linux-amd64.tar.gz
        echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
        export PATH=$PATH:/usr/local/go/bin
    fi
    
    for version in 1.20 1.21; do
        cat > /opt/fortress-panel/runtimes/go/start-go${version}.sh <<EOF
#!/bin/bash
APP_DIR=\$1
PORT=\${2:-8080}

cd \$APP_DIR
if [ -f "go.mod" ]; then
    go mod tidy
    go build -o app .
    ./app -port=\$PORT
elif [ -f "main.go" ]; then
    go build -o app main.go
    ./app -port=\$PORT
else
    echo "No Go source files found"
    exit 1
fi
EOF
        
        chmod +x /opt/fortress-panel/runtimes/go/start-go${version}.sh
    done
}

# Setup Java runtimes
setup_java() {
    echo "📦 Setting up Java runtimes..."
    
    # Install Java development kit and Maven
    apk add --no-cache \
        openjdk11-jdk \
        maven \
        gradle
    
    # Set JAVA_HOME
    echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk' >> /etc/profile
    export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
    
    for version in 11 17 21; do
        cat > /opt/fortress-panel/runtimes/java/start-java${version}.sh <<EOF
#!/bin/bash
APP_DIR=\$1
PORT=\${2:-8080}

cd \$APP_DIR
JAVA_HOME=/usr/lib/jvm/java-${version}-openjdk

if [ -f "pom.xml" ]; then
    mvn clean package -DskipTests
    java -jar target/*.jar --server.port=\$PORT
elif [ -f "build.gradle" ]; then
    ./gradlew build
    java -jar build/libs/*.jar --server.port=\$PORT
elif [ -f "*.java" ]; then
    mkdir -p build
    javac -d build *.java
    java -cp build Main \$PORT
else
    echo "No recognized Java application structure"
    exit 1
fi
EOF
        
        chmod +x /opt/fortress-panel/runtimes/java/start-java${version}.sh
    done
}

# Create supervisor configurations for runtime services
create_runtime_supervisor_configs() {
    echo "📋 Creating supervisor configurations..."
    
    # PHP-FPM configurations
    for version in 8.0 8.1 8.2; do
        if command -v php-fpm${version/./} &> /dev/null; then
            cat > /etc/supervisor.d/php-fpm-${version/./}.conf <<EOF
[program:php-fpm-${version/./}]
command=/usr/sbin/php-fpm${version/./} --nodaemonize --fpm-config /etc/php${version/./}/php-fpm.conf
autostart=false
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/fortress-panel/php-fpm-${version/./}.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
EOF
        fi
    done
}

# Create environment configuration
create_environment_config() {
    echo "⚙️ Creating environment configuration..."
    
    cat > /etc/fortress-panel/runtimes.conf <<EOF
# Fortress Panel Language Runtimes Configuration

# PHP Settings
PHP_ENABLED=true
PHP_VERSIONS="8.0,8.1,8.2"
PHP_MEMORY_LIMIT=128M
PHP_MAX_EXECUTION_TIME=30

# Node.js Settings  
NODEJS_ENABLED=true
NODEJS_VERSIONS="16,18,20"
NODEJS_MEMORY_LIMIT=512M

# Python Settings
PYTHON_ENABLED=true
PYTHON_VERSIONS="3.9,3.10,3.11"
PYTHON_MEMORY_LIMIT=256M

# Ruby Settings
RUBY_ENABLED=true
RUBY_VERSIONS="3.1,3.2"
RUBY_MEMORY_LIMIT=256M

# Go Settings
GO_ENABLED=true
GO_VERSIONS="1.20,1.21"
GO_MEMORY_LIMIT=128M

# Java Settings
JAVA_ENABLED=true
JAVA_VERSIONS="11,17,21"
JAVA_MEMORY_LIMIT=1024M

# General Settings
APPS_BASE_DIR=/var/lib/fortress-panel/apps
RUNTIME_LOGS_DIR=/var/log/fortress-panel/runtimes
DOCKER_ENABLED=true
EOF
}

# Initialize directories and permissions
setup_directories() {
    echo "📁 Setting up directories and permissions..."
    
    # Create all necessary directories
    mkdir -p \
        /var/lib/fortress-panel/apps \
        /var/log/fortress-panel/runtimes \
        /run/php*-fpm \
        /opt/fortress-panel/runtimes/{php,nodejs,python,ruby,go,java}
    
    # Set proper permissions
    chown -R node:node /opt/fortress-panel
    chown -R node:node /var/lib/fortress-panel
    chmod -R 755 /opt/fortress-panel/runtimes
    chmod +x /opt/fortress-panel/runtimes/*/*.sh
}

# Main execution
main() {
    echo "🚀 Starting Fortress Panel runtime setup..."
    
    setup_directories
    setup_php
    setup_nodejs
    setup_python
    setup_ruby
    setup_go
    setup_java
    create_runtime_supervisor_configs
    create_environment_config
    
    echo "✅ Fortress Panel runtimes setup completed!"
    echo "📊 Available runtimes:"
    echo "  - PHP: 8.0, 8.1, 8.2"
    echo "  - Node.js: 16, 18, 20"
    echo "  - Python: 3.9, 3.10, 3.11"
    echo "  - Ruby: 3.1, 3.2"
    echo "  - Go: 1.20, 1.21"
    echo "  - Java: 11, 17, 21"
}

# Run main function
main "$@"