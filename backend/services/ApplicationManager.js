const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class ApplicationManager {
  constructor() {
    this.applications = new Map();
    this.appRoot = '/var/lib/fortress-panel/apps';
    this.dockerComposeTemplate = `
version: '3.8'
services:
  {{APP_NAME}}:
    image: {{DOCKER_IMAGE}}
    container_name: {{CONTAINER_NAME}}
    restart: unless-stopped
    ports:
      - "{{EXTERNAL_PORT}}:{{INTERNAL_PORT}}"
    volumes:
      - "{{APP_PATH}}:/app"
      - "{{LOG_PATH}}:/var/log/app"
    environment:
      - NODE_ENV=production
      - PORT={{INTERNAL_PORT}}
      {{ENV_VARS}}
    networks:
      - fortress-network
    deploy:
      resources:
        limits:
          memory: {{MEMORY_LIMIT}}
          cpus: '{{CPU_LIMIT}}'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:{{INTERNAL_PORT}}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  fortress-network:
    external: true
`;
  }

  async initialize() {
    try {
      await fs.mkdir(this.appRoot, { recursive: true });
      await fs.mkdir(path.join(this.appRoot, 'logs'), { recursive: true });
      await fs.mkdir(path.join(this.appRoot, 'ssl'), { recursive: true });
    } catch (error) {
      console.error('Failed to initialize app directories:', error);
    }
  }

  generateAppId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  generateEnvironmentVars(vars) {
    if (!vars || Object.keys(vars).length === 0) return '';
    return Object.entries(vars)
      .map(([key, value]) => `- ${key}=${value}`)
      .join('\n      ');
  }

  async createApplication(userId, appData) {
    const {
      name,
      type,
      domain,
      version,
      environmentVars = {},
      resourceLimits = {
        memory: '512m',
        cpu: '0.5'
      }
    } = appData;

    const appId = this.generateAppId(name);
    const appPath = path.join(this.appRoot, appId);
    const logPath = path.join(this.appRoot, 'logs', appId);
    const internalPort = 3000 + Math.floor(Math.random() * 1000);
    const externalPort = 8000 + Math.floor(Math.random() * 1000);

    // Get Docker image based on type and version
    const dockerImage = this.getDockerImage(type, version);

    const application = {
      id: crypto.randomUUID(),
      appId,
      userId,
      name,
      type,
      domain,
      version,
      dockerImage,
      status: 'creating',
      path: appPath,
      logPath,
      internalPort,
      externalPort,
      containerName: `fortress-app-${appId}`,
      environmentVars,
      resourceLimits,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create application directory
    await fs.mkdir(appPath, { recursive: true });
    await fs.mkdir(logPath, { recursive: true });

    // Generate docker-compose.yml
    const composeContent = this.dockerComposeTemplate
      .replace(/{{APP_NAME}}/g, appId)
      .replace(/{{DOCKER_IMAGE}}/g, dockerImage)
      .replace(/{{CONTAINER_NAME}}/g, application.containerName)
      .replace(/{{EXTERNAL_PORT}}/g, externalPort)
      .replace(/{{INTERNAL_PORT}}/g, internalPort)
      .replace(/{{APP_PATH}}/g, appPath)
      .replace(/{{LOG_PATH}}/g, logPath)
      .replace(/{{ENV_VARS}}/g, this.generateEnvironmentVars(environmentVars))
      .replace(/{{MEMORY_LIMIT}}/g, resourceLimits.memory)
      .replace(/{{CPU_LIMIT}}/g, resourceLimits.cpu);

    await fs.writeFile(path.join(appPath, 'docker-compose.yml'), composeContent);

    // Create starter template based on type
    await this.createApplicationTemplate(type, appPath);

    this.applications.set(appId, application);
    return application;
  }

  getDockerImage(type, version) {
    const images = {
      nodejs: `node:${version || '18-alpine'}`,
      php: `php:${version || '8.2-apache'}`,
      python: `python:${version || '3.11-slim'}`,
      ruby: `ruby:${version || '3.2-slim'}`,
      go: `golang:${version || '1.21-alpine'}`,
      java: `openjdk:${version || '17-slim'}`,
      static: 'nginx:alpine'
    };
    return images[type] || images.nodejs;
  }

  async createApplicationTemplate(type, appPath) {
    switch (type) {
      case 'nodejs':
        await fs.writeFile(path.join(appPath, 'package.json'), JSON.stringify({
          name: 'fortress-app',
          version: '1.0.0',
          scripts: { start: 'node server.js' },
          dependencies: { express: '^4.18.0' }
        }, null, 2));
        
        await fs.writeFile(path.join(appPath, 'server.js'), `
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Fortress Panel Application!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on port \${PORT}\`);
});
        `);
        break;

      case 'php':
        await fs.writeFile(path.join(appPath, 'index.php'), `
<?php
header('Content-Type: application/json');
echo json_encode([
  'status' => 'healthy',
  'timestamp' => date('c'),
  'message' => 'Hello from Fortress Panel PHP Application!'
]);
?>
        `);
        break;

      case 'python':
        await fs.writeFile(path.join(appPath, 'requirements.txt'), 'flask==2.3.0');
        await fs.writeFile(path.join(appPath, 'app.py'), `
from flask import Flask, jsonify
import datetime

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })

@app.route('/')
def index():
    return jsonify({
        'message': 'Hello from Fortress Panel Python Application!'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3000)))
        `);
        break;

      case 'static':
        await fs.writeFile(path.join(appPath, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
    <title>Fortress Panel Application</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Fortress Panel Application</h1>
        <p>Your static website is running successfully!</p>
        <p>Deployed with Fortress Panel - High Security Control Panel</p>
    </div>
</body>
</html>
        `);
        break;

      default:
        await fs.writeFile(path.join(appPath, 'README.md'), `# ${type} Application\n\nThis is a ${type} application deployed by Fortress Panel.`);
    }
  }

  async deployApplication(appId) {
    const app = this.applications.get(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    try {
      app.status = 'building';
      app.updatedAt = new Date().toISOString();

      // Execute docker-compose up
      const { execSync } = require('child_process');
      execSync(`cd ${app.path} && docker-compose up -d`, { stdio: 'pipe' });

      // Wait for container to be ready
      await this.waitForContainer(app.containerName, 30);

      app.status = 'active';
      app.updatedAt = new Date().toISOString();

      return app;
    } catch (error) {
      app.status = 'error';
      app.error = error.message;
      app.updatedAt = new Date().toISOString();
      throw error;
    }
  }

  async waitForContainer(containerName, timeout) {
    const { execSync } = require('child_process');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout * 1000) {
      try {
        const output = execSync(`docker inspect ${containerName} --format='{{.State.Health.Status}}'`, { 
          encoding: 'utf8', 
          stdio: 'pipe' 
        }).trim();
        
        if (output === 'healthy') {
          return true;
        }
      } catch (error) {
        // Container not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Container failed to become healthy within timeout period');
  }

  async stopApplication(appId) {
    const app = this.applications.get(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    try {
      const { execSync } = require('child_process');
      execSync(`cd ${app.path} && docker-compose down`, { stdio: 'pipe' });
      
      app.status = 'stopped';
      app.updatedAt = new Date().toISOString();
      
      return app;
    } catch (error) {
      throw new Error('Failed to stop application: ' + error.message);
    }
  }

  async deleteApplication(appId) {
    const app = this.applications.get(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    try {
      // Stop and remove container
      const { execSync } = require('child_process');
      execSync(`cd ${app.path} && docker-compose down -v`, { stdio: 'pipe' });
      
      // Remove application directory
      await fs.rmdir(app.path, { recursive: true });
      
      this.applications.delete(appId);
      
      return { message: 'Application deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete application: ' + error.message);
    }
  }

  async getApplicationLogs(appId, lines = 100) {
    const app = this.applications.get(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    try {
      const { execSync } = require('child_process');
      const logs = execSync(`docker logs --tail ${lines} ${app.containerName}`, { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      
      return { logs };
    } catch (error) {
      throw new Error('Failed to get application logs: ' + error.message);
    }
  }

  async getApplicationStats(appId) {
    const app = this.applications.get(appId);
    if (!app) {
      throw new Error('Application not found');
    }

    try {
      const { execSync } = require('child_process');
      const stats = execSync(`docker stats ${app.containerName} --no-stream --format 'table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'`, { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      
      const lines = stats.trim().split('\n');
      if (lines.length < 2) {
        return { cpu: '0%', memory: '0B / 0B', network: '0B / 0B', disk: '0B / 0B' };
      }
      
      const [cpu, memory, network, disk] = lines[1].split('\t');
      
      return { cpu, memory, network, disk };
    } catch (error) {
      return { error: 'Failed to get application stats' };
    }
  }

  getApplicationsByUser(userId) {
    return Array.from(this.applications.values()).filter(app => app.userId === userId);
  }

  getApplication(appId) {
    return this.applications.get(appId);
  }
}

module.exports = ApplicationManager;