import { Router } from 'express';
import { LanguageRuntimeService } from '../services/LanguageRuntimeService';
import { Logger } from '@fortress-panel/shared';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();
const languageService = LanguageRuntimeService.getInstance();
const logger = Logger.getInstance();

// Get available language runtimes
router.get('/runtimes', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const runtimes = languageService.getAvailableRuntimes();
    res.json({
      success: true,
      data: runtimes
    });
  } catch (error) {
    logger.error('Failed to get language runtimes', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve language runtimes'
    });
  }
});

// Install a language runtime
router.post('/runtimes/:runtimeId/install', authenticateToken, requirePermission('system.update'), async (req, res) => {
  try {
    const { runtimeId } = req.params;
    const success = await languageService.installRuntime(runtimeId);
    
    if (success) {
      res.json({
        success: true,
        message: `Runtime ${runtimeId} installed successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to install runtime ${runtimeId}`
      });
    }
  } catch (error) {
    logger.error('Failed to install runtime', { error: error.message, runtimeId: req.params.runtimeId });
    res.status(500).json({
      success: false,
      message: 'Failed to install runtime'
    });
  }
});

// Deploy a new application
router.post('/deploy', authenticateToken, requirePermission('domain.create'), async (req, res) => {
  try {
    const {
      domainId,
      language,
      version,
      sourceCode,
      environmentVars = {},
      resources = {}
    } = req.body;

    // Validate required fields
    if (!domainId || !language || !version || !sourceCode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: domainId, language, version, sourceCode'
      });
    }

    // Deploy application
    const result = await languageService.deployApplication(
      domainId,
      language,
      version,
      sourceCode,
      environmentVars
    );

    if (result.success) {
      // Apply resource limits if provided
      if (resources.memory || resources.cpu || resources.disk) {
        const appId = result.containerId?.replace('fortress-app-', '') || '';
        if (appId) {
          await languageService.updateApplicationResources(
            appId,
            resources.memory || 512,
            resources.cpu || 1,
            resources.disk || 1024
          );
        }
      }

      res.status(201).json({
        success: true,
        data: {
          ...result,
          domainId,
          language,
          version
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('Failed to deploy application', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to deploy application'
    });
  }
});

// Get running applications
router.get('/applications', authenticateToken, requirePermission('domain.read'), async (req, res) => {
  try {
    const applications = languageService.getRunningApplications();
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    logger.error('Failed to get running applications', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve running applications'
    });
  }
});

// Get application status
router.get('/applications/:appId/status', authenticateToken, requirePermission('domain.read'), async (req, res) => {
  try {
    const { appId } = req.params;
    const status = languageService.getApplicationStatus(appId);
    
    if (status) {
      res.json({
        success: true,
        data: status
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
  } catch (error) {
    logger.error('Failed to get application status', { error: error.message, appId: req.params.appId });
    res.status(500).json({
      success: false,
      message: 'Failed to get application status'
    });
  }
});

// Stop an application
router.post('/applications/:appId/stop', authenticateToken, requirePermission('domain.update'), async (req, res) => {
  try {
    const { appId } = req.params;
    const success = await languageService.stopApplication(appId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Application stopped successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to stop application'
      });
    }
  } catch (error) {
    logger.error('Failed to stop application', { error: error.message, appId: req.params.appId });
    res.status(500).json({
      success: false,
      message: 'Failed to stop application'
    });
  }
});

// Restart an application
router.post('/applications/:appId/restart', authenticateToken, requirePermission('domain.update'), async (req, res) => {
  try {
    const { appId } = req.params;
    const success = await languageService.restartApplication(appId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Application restarted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to restart application'
      });
    }
  } catch (error) {
    logger.error('Failed to restart application', { error: error.message, appId: req.params.appId });
    res.status(500).json({
      success: false,
      message: 'Failed to restart application'
    });
  }
});

// Get application logs
router.get('/applications/:appId/logs', authenticateToken, requirePermission('domain.read'), async (req, res) => {
  try {
    const { appId } = req.params;
    const lines = parseInt(req.query.lines as string) || 100;
    
    const logs = await languageService.getApplicationLogs(appId, lines);
    
    res.json({
      success: true,
      data: {
        logs,
        appId,
        lines
      }
    });
  } catch (error) {
    logger.error('Failed to get application logs', { error: error.message, appId: req.params.appId });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application logs'
    });
  }
});

// Update application resources
router.put('/applications/:appId/resources', authenticateToken, requirePermission('domain.update'), async (req, res) => {
  try {
    const { appId } = req.params;
    const { memoryLimit, cpuLimit, diskLimit } = req.body;
    
    if (!memoryLimit || !cpuLimit || !diskLimit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: memoryLimit, cpuLimit, diskLimit'
      });
    }
    
    const success = await languageService.updateApplicationResources(
      appId,
      memoryLimit,
      cpuLimit,
      diskLimit
    );
    
    if (success) {
      res.json({
        success: true,
        message: 'Application resources updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update application resources'
      });
    }
  } catch (error) {
    logger.error('Failed to update application resources', { error: error.message, appId: req.params.appId });
    res.status(500).json({
      success: false,
      message: 'Failed to update application resources'
    });
  }
});

// Get language-specific templates
router.get('/templates/:language', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const { language } = req.params;
    
    const templates = {
      php: {
        'index.php': `<?php
echo "Hello from PHP " . phpversion() . "!\\n";
echo "Server time: " . date('Y-m-d H:i:s') . "\\n";

// Database connection example
// $pdo = new PDO('mysql:host=localhost;dbname=fortress_panel', 'username', 'password');

// API endpoint example
// if ($_SERVER['REQUEST_METHOD'] === 'GET') {
//     header('Content-Type: application/json');
//     echo json_encode(['message' => 'Hello from PHP API']);
// }
?>`,
        'config.php': `<?php
// Configuration
define('APP_NAME', 'Fortress Panel App');
define('APP_ENV', 'development');
define('APP_DEBUG', true);

// Database configuration
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'database');
define('DB_USER', getenv('DB_USER') ?: 'username');
define('DB_PASS', getenv('DB_PASS') ?: 'password');
?>`
      },
      nodejs: {
        'package.json': `{
  "name": "fortress-panel-app",
  "version": "1.0.0",
  "description": "Application deployed on Fortress Panel",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}`,
        'app.js': `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Node.js!',
    timestamp: new Date().toISOString(),
    version: process.version
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`
      },
      python: {
        'requirements.txt': `flask==2.3.2
gunicorn==20.1.0`,
        'app.py': `from flask import Flask, jsonify, request
import os
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': 'Hello from Python!',
        'timestamp': datetime.now().isoformat(),
        'python_version': os.sys.version
    })

@app.route('/health')
def health():
    return jsonify({'status': 'OK', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)`
      },
      ruby: {
        'Gemfile': `source 'https://rubygems.org'
gem 'sinatra', '~> 3.0'
gem 'json'`,
        'app.rb': `require 'sinatra'
require 'json'
require 'time'

set :port, ENV['PORT'] || 4567
set :bind, '0.0.0.0'

get '/' do
  content_type :json
  {
    message: 'Hello from Ruby!',
    timestamp: Time.now.iso8601,
    ruby_version: RUBY_VERSION
  }.to_json
end

get '/health' do
  content_type :json
  { status: 'OK', timestamp: Time.now.iso8601 }.to_json
end`
      },
      go: {
        'go.mod': `module fortress-panel-app

go 1.21`,
        'main.go': `package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "time"
)

type Response struct {
    Message   string \`json:"message"\`
    Timestamp string \`json:"timestamp"\`
    Version   string \`json:"version"\`
}

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        
        response := Response{
            Message:   "Hello from Go!",
            Timestamp: time.Now().Format(time.RFC3339),
            Version:   runtime.Version(),
        }
        
        json.NewEncoder(w).Encode(response)
    })

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        
        response := map[string]string{
            "status":    "OK",
            "timestamp": time.Now().Format(time.RFC3339),
        }
        
        json.NewEncoder(w).Encode(response)
    })

    log.Printf("Server starting on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}`
      },
      java: {
        'pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.fortresspanel</groupId>
    <artifactId>app</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>2.7.0</version>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <version>2.7.0</version>
            </plugin>
        </plugins>
    </build>
</project>`,
        'src/main/java/com/fortresspanel/App.java': `package com.fortresspanel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@SpringBootApplication
@RestController
public class App {
    
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
    
    @GetMapping("/")
    public Map<String, Object> home() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Hello from Java!");
        response.put("timestamp", LocalDateTime.now());
        response.put("version", System.getProperty("java.version"));
        return response;
    }
    
    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "OK");
        response.put("timestamp", LocalDateTime.now());
        return response;
    }
}`
      }
    };
    
    const languageTemplates = templates[language];
    if (!languageTemplates) {
      return res.status(404).json({
        success: false,
        message: `Templates not available for language: ${language}`
      });
    }
    
    res.json({
      success: true,
      data: {
        language,
        templates: languageTemplates
      }
    });
  } catch (error) {
    logger.error('Failed to get language templates', { error: error.message, language: req.params.language });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve language templates'
    });
  }
});

export default router;