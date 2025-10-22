import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Insert language runtimes
  await knex.table('language_runtimes').insert([
    // PHP Runtimes
    {
      id: knex.raw('(UUID())'),
      name: 'php-8.2',
      display_name: 'PHP 8.2',
      language: 'php',
      version: '8.2',
      installed: false,
      enabled: true,
      default_port: 8080,
      run_command: 'php -S localhost:{port} -t {documentRoot}',
      config_template: 'php.ini.template',
      dependencies: JSON.stringify(['php', 'php-fpm', 'php-cli']),
      container_image: 'php:8.2-apache',
      metadata: JSON.stringify({
        extensions: ['mysql', 'pgsql', 'redis', 'memcached', 'gd', 'curl', 'json'],
        ini_settings: {
          'memory_limit': '128M',
          'max_execution_time': '30',
          'upload_max_filesize': '64M',
          'post_max_size': '64M'
        }
      }),
      install_instructions: 'Install PHP 8.2 with required extensions: apt-get install php8.2 php8.2-fpm php8.2-mysql php8.2-pgsql php8.2-redis',
      configuration_notes: 'Configure php.ini for optimal performance and security',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'php-8.1',
      display_name: 'PHP 8.1',
      language: 'php',
      version: '8.1',
      installed: false,
      enabled: true,
      default_port: 8081,
      run_command: 'php -S localhost:{port} -t {documentRoot}',
      config_template: 'php.ini.template',
      dependencies: JSON.stringify(['php', 'php-fpm', 'php-cli']),
      container_image: 'php:8.1-apache',
      metadata: JSON.stringify({
        extensions: ['mysql', 'pgsql', 'redis', 'memcached', 'gd', 'curl', 'json'],
        ini_settings: {
          'memory_limit': '128M',
          'max_execution_time': '30',
          'upload_max_filesize': '64M',
          'post_max_size': '64M'
        }
      }),
      install_instructions: 'Install PHP 8.1 with required extensions: apt-get install php8.1 php8.1-fpm php8.1-mysql php8.1-pgsql',
      configuration_notes: 'Configure php.ini for optimal performance and security',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'php-8.0',
      display_name: 'PHP 8.0',
      language: 'php',
      version: '8.0',
      installed: false,
      enabled: true,
      default_port: 8082,
      run_command: 'php -S localhost:{port} -t {documentRoot}',
      config_template: 'php.ini.template',
      dependencies: JSON.stringify(['php', 'php-fpm', 'php-cli']),
      container_image: 'php:8.0-apache',
      metadata: JSON.stringify({
        extensions: ['mysql', 'pgsql', 'redis', 'memcached', 'gd', 'curl', 'json'],
        ini_settings: {
          'memory_limit': '128M',
          'max_execution_time': '30',
          'upload_max_filesize': '64M',
          'post_max_size': '64M'
        }
      }),
      install_instructions: 'Install PHP 8.0 with required extensions: apt-get install php8.0 php8.0-fpm php8.0-mysql php8.0-pgsql',
      configuration_notes: 'Configure php.ini for optimal performance and security',
    },

    // Node.js Runtimes
    {
      id: knex.raw('(UUID())'),
      name: 'nodejs-20',
      display_name: 'Node.js 20',
      language: 'nodejs',
      version: '20',
      installed: false,
      enabled: true,
      default_port: 3000,
      run_command: 'node {script}',
      config_template: 'package.json.template',
      dependencies: JSON.stringify(['node', 'npm']),
      container_image: 'node:20-alpine',
      metadata: JSON.stringify({
        npm_version: '10.x',
        lts: true,
        supported_features: ['ESM', 'Top-level await', 'Fetch API', 'Test runner'],
        default_packages: ['express', 'cors', 'helmet', 'compression']
      }),
      install_instructions: 'Install Node.js 20 LTS: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs',
      configuration_notes: 'Node.js 20 LTS is recommended for production',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'nodejs-18',
      display_name: 'Node.js 18',
      language: 'nodejs',
      version: '18',
      installed: false,
      enabled: true,
      default_port: 3001,
      run_command: 'node {script}',
      config_template: 'package.json.template',
      dependencies: JSON.stringify(['node', 'npm']),
      container_image: 'node:18-alpine',
      metadata: JSON.stringify({
        npm_version: '9.x',
        lts: true,
        supported_features: ['ESM', 'Top-level await', 'Fetch API'],
        default_packages: ['express', 'cors', 'helmet', 'compression']
      }),
      install_instructions: 'Install Node.js 18 LTS: curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs',
      configuration_notes: 'Node.js 18 LTS is stable and widely used',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'nodejs-16',
      display_name: 'Node.js 16',
      language: 'nodejs',
      version: '16',
      installed: false,
      enabled: false, // Deprecated
      default_port: 3002,
      run_command: 'node {script}',
      config_template: 'package.json.template',
      dependencies: JSON.stringify(['node', 'npm']),
      container_image: 'node:16-alpine',
      metadata: JSON.stringify({
        npm_version: '8.x',
        lts: false,
        deprecated: true,
        eol_date: '2023-09-11',
        default_packages: ['express', 'cors', 'helmet', 'compression']
      }),
      install_instructions: 'Node.js 16 is deprecated, upgrade to 18 or 20',
      configuration_notes: 'Node.js 16 reached end-of-life, consider upgrading',
    },

    // Python Runtimes
    {
      id: knex.raw('(UUID())'),
      name: 'python-3.11',
      display_name: 'Python 3.11',
      language: 'python',
      version: '3.11',
      installed: false,
      enabled: true,
      default_port: 8000,
      run_command: 'python {script}',
      config_template: 'requirements.txt.template',
      dependencies: JSON.stringify(['python3', 'python3-pip', 'python3-venv']),
      container_image: 'python:3.11-slim',
      metadata: JSON.stringify({
        pip_version: '23.x',
        supported_features: ['Pattern matching', 'Exception groups', 'Self types'],
        default_packages: ['flask', 'django', 'fastapi', 'requests', 'sqlalchemy'],
        venv_support: true
      }),
      install_instructions: 'Install Python 3.11: apt-get install python3.11 python3.11-pip python3.11-venv',
      configuration_notes: 'Python 3.11 includes performance improvements and new features',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'python-3.10',
      display_name: 'Python 3.10',
      language: 'python',
      version: '3.10',
      installed: false,
      enabled: true,
      default_port: 8001,
      run_command: 'python {script}',
      config_template: 'requirements.txt.template',
      dependencies: JSON.stringify(['python3', 'python3-pip', 'python3-venv']),
      container_image: 'python:3.10-slim',
      metadata: JSON.stringify({
        pip_version: '22.x',
        supported_features: ['Structural pattern matching', 'Parenthesized context managers'],
        default_packages: ['flask', 'django', 'fastapi', 'requests', 'sqlalchemy'],
        venv_support: true
      }),
      install_instructions: 'Install Python 3.10: apt-get install python3.10 python3.10-pip python3.10-venv',
      configuration_notes: 'Python 3.10 is stable and widely used',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'python-3.9',
      display_name: 'Python 3.9',
      language: 'python',
      version: '3.9',
      installed: false,
      enabled: true,
      default_port: 8002,
      run_command: 'python {script}',
      config_template: 'requirements.txt.template',
      dependencies: JSON.stringify(['python3', 'python3-pip', 'python3-venv']),
      container_image: 'python:3.9-slim',
      metadata: JSON.stringify({
        pip_version: '20.x',
        supported_features: ['Dictionary merge operators', 'String methods'],
        default_packages: ['flask', 'django', 'fastapi', 'requests', 'sqlalchemy'],
        venv_support: true
      }),
      install_instructions: 'Install Python 3.9: apt-get install python3.9 python3.9-pip python3.9-venv',
      configuration_notes: 'Python 3.9 is stable but consider upgrading to newer versions',
    },

    // Ruby Runtimes
    {
      id: knex.raw('(UUID())'),
      name: 'ruby-3.2',
      display_name: 'Ruby 3.2',
      language: 'ruby',
      version: '3.2',
      installed: false,
      enabled: true,
      default_port: 4567,
      run_command: 'ruby {script}',
      config_template: 'Gemfile.template',
      dependencies: JSON.stringify(['ruby', 'ruby-dev', 'bundler']),
      container_image: 'ruby:3.2-alpine',
      metadata: JSON.stringify({
        gem_version: '3.4.x',
        supported_features: ['YJIT compiler', 'Regexp timeout'],
        default_gems: ['sinatra', 'rails', 'puma', 'rack'],
        bundler_version: '2.4.x'
      }),
      install_instructions: 'Install Ruby 3.2: apt-get install ruby3.2 ruby3.2-dev bundler',
      configuration_notes: 'Ruby 3.2 includes YJIT for improved performance',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'ruby-3.1',
      display_name: 'Ruby 3.1',
      language: 'ruby',
      version: '3.1',
      installed: false,
      enabled: true,
      default_port: 4568,
      run_command: 'ruby {script}',
      config_template: 'Gemfile.template',
      dependencies: JSON.stringify(['ruby', 'ruby-dev', 'bundler']),
      container_image: 'ruby:3.1-alpine',
      metadata: JSON.stringify({
        gem_version: '3.3.x',
        supported_features: ['Error highlighting', 'Fiber scheduler'],
        default_gems: ['sinatra', 'rails', 'puma', 'rack'],
        bundler_version: '2.3.x'
      }),
      install_instructions: 'Install Ruby 3.1: apt-get install ruby3.1 ruby3.1-dev bundler',
      configuration_notes: 'Ruby 3.1 is stable and widely used',
    },

    // Go Runtimes
    {
      id: knex.raw('(UUID())'),
      name: 'go-1.21',
      display_name: 'Go 1.21',
      language: 'go',
      version: '1.21',
      installed: false,
      enabled: true,
      default_port: 8080,
      run_command: 'go run {script}',
      config_template: 'go.mod.template',
      dependencies: JSON.stringify(['golang-go']),
      container_image: 'golang:1.21-alpine',
      metadata: JSON.stringify({
        go_version: '1.21.x',
        supported_features: ['Built-in loop variable preview', 'Slices package', 'Maps package'],
        go_modules: true,
        default_packages: ['github.com/gin-gonic/gin', 'github.com/gorilla/mux', 'net/http']
      }),
      install_instructions: 'Install Go 1.21: wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz && tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz',
      configuration_notes: 'Go 1.21 includes new packages and language improvements',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'go-1.20',
      display_name: 'Go 1.20',
      language: 'go',
      version: '1.20',
      installed: false,
      enabled: true,
      default_port: 8081,
      run_command: 'go run {script}',
      config_template: 'go.mod.template',
      dependencies: JSON.stringify(['golang-go']),
      container_image: 'golang:1.20-alpine',
      metadata: JSON.stringify({
        go_version: '1.20.x',
        supported_features: ['Language changes', 'Performance improvements'],
        go_modules: true,
        default_packages: ['github.com/gin-gonic/gin', 'github.com/gorilla/mux', 'net/http']
      }),
      install_instructions: 'Install Go 1.20: wget https://go.dev/dl/go1.20.0.linux-amd64.tar.gz && tar -C /usr/local -xzf go1.20.0.linux-amd64.tar.gz',
      configuration_notes: 'Go 1.20 is stable and widely used',
    },

    // Java Runtimes
    {
      id: knex.raw('(UUID())'),
      name: 'java-21',
      display_name: 'Java 21',
      language: 'java',
      version: '21',
      installed: false,
      enabled: true,
      default_port: 8080,
      run_command: 'java -jar {jarFile}',
      config_template: 'pom.xml.template',
      dependencies: JSON.stringify(['openjdk-21-jdk', 'maven']),
      container_image: 'openjdk:21-jdk-slim',
      metadata: JSON.stringify({
        java_version: '21',
        lts: false,
        supported_features: ['Virtual Threads', 'Pattern Matching for switch', 'Record Patterns', 'String Templates'],
        build_tools: ['maven', 'gradle'],
        default_frameworks: ['spring-boot', 'quarkus', 'micronaut']
      }),
      install_instructions: 'Install Java 21: apt-get install openjdk-21-jdk maven',
      configuration_notes: 'Java 21 is the latest LTS release with modern features',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'java-17',
      display_name: 'Java 17',
      language: 'java',
      version: '17',
      installed: false,
      enabled: true,
      default_port: 8081,
      run_command: 'java -jar {jarFile}',
      config_template: 'pom.xml.template',
      dependencies: JSON.stringify(['openjdk-17-jdk', 'maven']),
      container_image: 'openjdk:17-jdk-slim',
      metadata: JSON.stringify({
        java_version: '17',
        lts: true,
        supported_features: ['Sealed Classes', 'Pattern Matching for instanceof', 'Text Blocks', 'Records'],
        build_tools: ['maven', 'gradle'],
        default_frameworks: ['spring-boot', 'quarkus', 'micronaut']
      }),
      install_instructions: 'Install Java 17: apt-get install openjdk-17-jdk maven',
      configuration_notes: 'Java 17 LTS is widely used in production',
    },
    {
      id: knex.raw('(UUID())'),
      name: 'java-11',
      display_name: 'Java 11',
      language: 'java',
      version: '11',
      installed: false,
      enabled: true,
      default_port: 8082,
      run_command: 'java -jar {jarFile}',
      config_template: 'pom.xml.template',
      dependencies: JSON.stringify(['openjdk-11-jdk', 'maven']),
      container_image: 'openjdk:11-jdk-slim',
      metadata: JSON.stringify({
        java_version: '11',
        lts: true,
        supported_features: ['HTTP Client', 'Var keyword for lambda parameters', 'Collection factory methods'],
        build_tools: ['maven', 'gradle'],
        default_frameworks: ['spring-boot', 'quarkus', 'micronaut']
      }),
      install_instructions: 'Install Java 11: apt-get install openjdk-11-jdk maven',
      configuration_notes: 'Java 11 LTS is stable but consider upgrading to newer versions',
    }
  ]);

  // Insert application templates
  await knex.table('application_templates').insert([
    // PHP Templates
    {
      id: knex.raw('(UUID())'),
      name: 'PHP Hello World',
      description: 'Simple PHP application with basic functionality',
      language: 'php',
      version: '8.2',
      category: 'web',
      files: JSON.stringify({
        'index.php': '<?php\necho "Hello from PHP " . phpversion() . "!";\n?>',
        'config.php': '<?php\n// Configuration\ndefine("APP_NAME", "Fortress Panel App");\n?>'
      }),
      dependencies: JSON.stringify(['php-cli', 'php-fpm']),
      environment_variables: JSON.stringify({
        'APP_ENV': 'development',
        'APP_DEBUG': 'true'
      }),
      build_instructions: 'No build required for PHP applications',
      run_instructions: 'Use php-fpm with nginx/apache or built-in PHP server',
      public: true,
      active: true,
      rating: 4.5,
      rating_count: 12
    },
    {
      id: knex.raw('(UUID())'),
      name: 'Laravel Starter',
      description: 'Complete Laravel application starter template',
      language: 'php',
      version: '8.2',
      category: 'web',
      files: JSON.stringify({
        'composer.json': '{\n  "require": {\n    "laravel/framework": "^10.0"\n  }\n}'
      }),
      dependencies: JSON.stringify(['php', 'composer', 'php-cli', 'php-fpm']),
      environment_variables: JSON.stringify({
        'APP_ENV': 'local',
        'APP_DEBUG': 'true',
        'DB_CONNECTION': 'mysql'
      }),
      build_instructions: 'Run composer install to install dependencies',
      run_instructions: 'Configure web server to point to public directory',
      public: true,
      active: true,
      rating: 4.8,
      rating_count: 28
    },

    // Node.js Templates
    {
      id: knex.raw('(UUID())'),
      name: 'Express.js API',
      description: 'RESTful API built with Express.js framework',
      language: 'nodejs',
      version: '20',
      category: 'api',
      files: JSON.stringify({
        'package.json': '{\n  "name": "express-api",\n  "version": "1.0.0",\n  "main": "app.js",\n  "dependencies": {\n    "express": "^4.18.2",\n    "cors": "^2.8.5"\n  }\n}',
        'app.js': 'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => res.json({ message: "Hello World" }));\napp.listen(3000);'
      }),
      dependencies: JSON.stringify(['express', 'cors', 'helmet']),
      environment_variables: JSON.stringify({
        'NODE_ENV': 'development',
        'PORT': '3000'
      }),
      build_instructions: 'Run npm install to install dependencies',
      run_instructions: 'Start with npm start or node app.js',
      public: true,
      active: true,
      rating: 4.7,
      rating_count: 45
    },
    {
      id: knex.raw('(UUID())'),
      name: 'React App',
      description: 'Modern React application with create-react-app',
      language: 'nodejs',
      version: '20',
      category: 'web',
      files: JSON.stringify({
        'package.json': '{\n  "name": "react-app",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "react-scripts": "5.0.1"\n  }\n}'
      }),
      dependencies: JSON.stringify(['react', 'react-dom', 'react-scripts']),
      environment_variables: JSON.stringify({
        'NODE_ENV': 'development',
        'PORT': '3000',
        'BROWSER': 'none'
      }),
      build_instructions: 'Run npm install to install dependencies',
      run_instructions: 'Development: npm start, Production: npm run build && serve -s build',
      public: true,
      active: true,
      rating: 4.9,
      rating_count: 67
    },

    // Python Templates
    {
      id: knex.raw('(UUID())'),
      name: 'Flask Web App',
      description: 'Simple web application using Flask framework',
      language: 'python',
      version: '3.11',
      category: 'web',
      files: JSON.stringify({
        'app.py': 'from flask import Flask\napp = Flask(__name__)\n\n@app.route("/")\ndef home():\n    return "Hello from Flask!"\n\nif __name__ == "__main__":\n    app.run(debug=True)',
        'requirements.txt': 'Flask==2.3.2\nWerkzeug==2.3.6'
      }),
      dependencies: JSON.stringify(['flask', 'gunicorn']),
      environment_variables: JSON.stringify({
        'FLASK_ENV': 'development',
        'FLASK_DEBUG': '1'
      }),
      build_instructions: 'Create virtual environment and install dependencies: pip install -r requirements.txt',
      run_instructions: 'Development: python app.py, Production: gunicorn app:app',
      public: true,
      active: true,
      rating: 4.6,
      rating_count: 34
    },
    {
      id: knex.raw('(UUID())'),
      name: 'FastAPI Service',
      description: 'High-performance API built with FastAPI',
      language: 'python',
      version: '3.11',
      category: 'api',
      files: JSON.stringify({
        'main.py': 'from fastapi import FastAPI\napp = FastAPI()\n\n@app.get("/")\nasync def root():\n    return {"message": "Hello World"}',
        'requirements.txt': 'fastapi==0.104.1\nuvicorn==0.24.0'
      }),
      dependencies: JSON.stringify(['fastapi', 'uvicorn']),
      environment_variables: JSON.stringify({
        'ENVIRONMENT': 'development'
      }),
      build_instructions: 'Install dependencies: pip install -r requirements.txt',
      run_instructions: 'Start with: uvicorn main:app --reload',
      public: true,
      active: true,
      rating: 4.8,
      rating_count: 22
    },

    // Go Templates
    {
      id: knex.raw('(UUID())'),
      name: 'Go Web Server',
      description: 'Simple HTTP server using Go net/http package',
      language: 'go',
      version: '1.21',
      category: 'web',
      files: JSON.stringify({
        'main.go': 'package main\n\nimport (\n    "fmt"\n    "net/http"\n)\n\nfunc handler(w http.ResponseWriter, r *http.Request) {\n    fmt.Fprintf(w, "Hello from Go!")\n}\n\nfunc main() {\n    http.HandleFunc("/", handler)\n    http.ListenAndServe(":8080", nil)\n}',
        'go.mod': 'module web-server\ngo 1.21'
      }),
      dependencies: JSON.stringify([]),
      environment_variables: JSON.stringify({
        'PORT': '8080'
      }),
      build_instructions: 'Run go mod tidy to download dependencies',
      run_instructions: 'Start with: go run main.go or build: go build && ./web-server',
      public: true,
      active: true,
      rating: 4.5,
      rating_count: 18
    },

    // Java Templates
    {
      id: knex.raw('(UUID())'),
      name: 'Spring Boot App',
      description: 'Complete Spring Boot application template',
      language: 'java',
      version: '21',
      category: 'web',
      files: JSON.stringify({
        'pom.xml': '<?xml version="1.0" encoding="UTF-8"?><project><modelVersion>4.0.0</modelVersion><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.1.0</version></parent><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>',
        'src/main/java/Application.java': '@SpringBootApplication\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n}'
      }),
      dependencies: JSON.stringify(['spring-boot-starter-web']),
      environment_variables: JSON.stringify({
        'SPRING_PROFILES_ACTIVE': 'dev'
      }),
      build_instructions: 'Build with: mvn clean package',
      run_instructions: 'Start with: java -jar target/application.jar',
      public: true,
      active: true,
      rating: 4.9,
      rating_count: 52
    }
  ]);

  console.log('✅ Inserted language runtimes and application templates');
}

export async function down(knex: Knex): Promise<void> {
  await knex.table('application_templates').del();
  await knex.table('language_runtimes').del();
  console.log('✅ Removed language runtimes and application templates');
}