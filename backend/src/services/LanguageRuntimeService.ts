import { Logger } from '@fortress-panel/shared';
import { DatabaseConnection } from '../config/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);

interface RuntimeEnvironment {
  id: string;
  name: string;
  language: string;
  version: string;
  installed: boolean;
  enabled: boolean;
  defaultPort: number;
  runCommand: string;
  configTemplate: string;
  dependencies: string[];
  containerImage?: string;
}

interface ApplicationInstance {
  id: string;
  domainId: string;
  language: string;
  version: string;
  port: number;
  status: 'running' | 'stopped' | 'error' | 'building';
  memoryLimit: number;
  cpuLimit: number;
  diskLimit: number;
  environmentVariables: Record<string, string>;
  dependencies: string[];
  buildScript?: string;
  startScript?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DeploymentResult {
  success: boolean;
  message: string;
  containerId?: string;
  port?: number;
  logs?: string[];
}

export class LanguageRuntimeService {
  private static instance: LanguageRuntimeService;
  private logger = Logger.getInstance();
  private db = DatabaseConnection.getInstance();
  private runtimes: Map<string, RuntimeEnvironment> = new Map();
  private runningApps: Map<string, ApplicationInstance> = new Map();

  private constructor() {
    this.initializeRuntimes();
  }

  public static getInstance(): LanguageRuntimeService {
    if (!LanguageRuntimeService.instance) {
      LanguageRuntimeService.instance = new LanguageRuntimeService();
    }
    return LanguageRuntimeService.instance;
  }

  private async initializeRuntimes(): Promise<void> {
    // Define supported language runtimes
    const supportedRuntimes: RuntimeEnvironment[] = [
      // PHP Runtimes
      {
        id: 'php-8.2',
        name: 'PHP 8.2',
        language: 'php',
        version: '8.2',
        installed: false,
        enabled: true,
        defaultPort: 8080,
        runCommand: 'php -S localhost:{port} -t {documentRoot}',
        configTemplate: 'php.ini.template',
        dependencies: ['php', 'php-fpm'],
        containerImage: 'php:8.2-apache'
      },
      {
        id: 'php-8.1',
        name: 'PHP 8.1',
        language: 'php',
        version: '8.1',
        installed: false,
        enabled: true,
        defaultPort: 8081,
        runCommand: 'php -S localhost:{port} -t {documentRoot}',
        configTemplate: 'php.ini.template',
        dependencies: ['php', 'php-fpm'],
        containerImage: 'php:8.1-apache'
      },
      {
        id: 'php-8.0',
        name: 'PHP 8.0',
        language: 'php',
        version: '8.0',
        installed: false,
        enabled: true,
        defaultPort: 8082,
        runCommand: 'php -S localhost:{port} -t {documentRoot}',
        configTemplate: 'php.ini.template',
        dependencies: ['php', 'php-fpm'],
        containerImage: 'php:8.0-apache'
      },

      // Node.js Runtimes
      {
        id: 'nodejs-20',
        name: 'Node.js 20',
        language: 'nodejs',
        version: '20',
        installed: false,
        enabled: true,
        defaultPort: 3000,
        runCommand: 'node {script}',
        configTemplate: 'package.json.template',
        dependencies: ['node', 'npm'],
        containerImage: 'node:20-alpine'
      },
      {
        id: 'nodejs-18',
        name: 'Node.js 18',
        language: 'nodejs',
        version: '18',
        installed: false,
        enabled: true,
        defaultPort: 3001,
        runCommand: 'node {script}',
        configTemplate: 'package.json.template',
        dependencies: ['node', 'npm'],
        containerImage: 'node:18-alpine'
      },
      {
        id: 'nodejs-16',
        name: 'Node.js 16',
        language: 'nodejs',
        version: '16',
        installed: false,
        enabled: true,
        defaultPort: 3002,
        runCommand: 'node {script}',
        configTemplate: 'package.json.template',
        dependencies: ['node', 'npm'],
        containerImage: 'node:16-alpine'
      },

      // Python Runtimes
      {
        id: 'python-3.11',
        name: 'Python 3.11',
        language: 'python',
        version: '3.11',
        installed: false,
        enabled: true,
        defaultPort: 8000,
        runCommand: 'python {script}',
        configTemplate: 'requirements.txt.template',
        dependencies: ['python3', 'pip3'],
        containerImage: 'python:3.11-slim'
      },
      {
        id: 'python-3.10',
        name: 'Python 3.10',
        language: 'python',
        version: '3.10',
        installed: false,
        enabled: true,
        defaultPort: 8001,
        runCommand: 'python {script}',
        configTemplate: 'requirements.txt.template',
        dependencies: ['python3', 'pip3'],
        containerImage: 'python:3.10-slim'
      },
      {
        id: 'python-3.9',
        name: 'Python 3.9',
        language: 'python',
        version: '3.9',
        installed: false,
        enabled: true,
        defaultPort: 8002,
        runCommand: 'python {script}',
        configTemplate: 'requirements.txt.template',
        dependencies: ['python3', 'pip3'],
        containerImage: 'python:3.9-slim'
      },

      // Ruby Runtimes
      {
        id: 'ruby-3.2',
        name: 'Ruby 3.2',
        language: 'ruby',
        version: '3.2',
        installed: false,
        enabled: true,
        defaultPort: 4567,
        runCommand: 'ruby {script}',
        configTemplate: 'Gemfile.template',
        dependencies: ['ruby', 'bundler'],
        containerImage: 'ruby:3.2-alpine'
      },
      {
        id: 'ruby-3.1',
        name: 'Ruby 3.1',
        language: 'ruby',
        version: '3.1',
        installed: false,
        enabled: true,
        defaultPort: 4568,
        runCommand: 'ruby {script}',
        configTemplate: 'Gemfile.template',
        dependencies: ['ruby', 'bundler'],
        containerImage: 'ruby:3.1-alpine'
      },

      // Go Runtimes
      {
        id: 'go-1.21',
        name: 'Go 1.21',
        language: 'go',
        version: '1.21',
        installed: false,
        enabled: true,
        defaultPort: 8080,
        runCommand: 'go run {script}',
        configTemplate: 'go.mod.template',
        dependencies: ['go'],
        containerImage: 'golang:1.21-alpine'
      },
      {
        id: 'go-1.20',
        name: 'Go 1.20',
        language: 'go',
        version: '1.20',
        installed: false,
        enabled: true,
        defaultPort: 8081,
        runCommand: 'go run {script}',
        configTemplate: 'go.mod.template',
        dependencies: ['go'],
        containerImage: 'golang:1.20-alpine'
      },

      // Java Runtimes
      {
        id: 'java-21',
        name: 'Java 21',
        language: 'java',
        version: '21',
        installed: false,
        enabled: true,
        defaultPort: 8080,
        runCommand: 'java -jar {jarFile}',
        configTemplate: 'pom.xml.template',
        dependencies: ['java', 'maven'],
        containerImage: 'openjdk:21-jdk-slim'
      },
      {
        id: 'java-17',
        name: 'Java 17',
        language: 'java',
        version: '17',
        installed: false,
        enabled: true,
        defaultPort: 8081,
        runCommand: 'java -jar {jarFile}',
        configTemplate: 'pom.xml.template',
        dependencies: ['java', 'maven'],
        containerImage: 'openjdk:17-jdk-slim'
      },
      {
        id: 'java-11',
        name: 'Java 11',
        language: 'java',
        version: '11',
        installed: false,
        enabled: true,
        defaultPort: 8082,
        runCommand: 'java -jar {jarFile}',
        configTemplate: 'pom.xml.template',
        dependencies: ['java', 'maven'],
        containerImage: 'openjdk:11-jdk-slim'
      }
    ];

    // Store runtimes
    for (const runtime of supportedRuntimes) {
      this.runtimes.set(runtime.id, runtime);
    }

    this.logger.info(`✅ Initialized ${supportedRuntimes.length} language runtimes`);
  }

  public async installRuntime(runtimeId: string): Promise<boolean> {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      throw new Error(`Runtime ${runtimeId} not found`);
    }

    this.logger.info(`📦 Installing runtime: ${runtime.name}`);

    try {
      // Check if Docker is available and use containerized approach
      const dockerAvailable = await this.checkDockerAvailability();
      
      if (dockerAvailable) {
        // Pull Docker image
        if (runtime.containerImage) {
          await execAsync(`docker pull ${runtime.containerImage}`);
          runtime.installed = true;
          this.logger.info(`✅ Docker image pulled for ${runtime.name}`);
        }
      } else {
        // Install dependencies locally
        for (const dependency of runtime.dependencies) {
          await this.installDependency(dependency, runtime.language);
        }
        runtime.installed = true;
        this.logger.info(`✅ Dependencies installed for ${runtime.name}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to install runtime ${runtime.name}`, { error: error.message });
      return false;
    }
  }

  private async checkDockerAvailability(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch {
      return false;
    }
  }

  private async installDependency(dependency: string, language: string): Promise<void> {
    const installCommands = {
      php: `apt-get update && apt-get install -y ${dependency}`,
      nodejs: `curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y ${dependency}`,
      python: `apt-get update && apt-get install -y ${dependency}`,
      ruby: `apt-get update && apt-get install -y ${dependency}`,
      go: `curl -LO https://go.dev/dl/go1.21.0.linux-amd64.tar.gz && tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz`,
      java: `apt-get update && apt-get install -y ${dependency}`
    };

    const command = installCommands[language];
    if (command) {
      await execAsync(command);
    }
  }

  public async deployApplication(
    domainId: string,
    language: string,
    version: string,
    sourceCode: string,
    environmentVars: Record<string, string> = {}
  ): Promise<DeploymentResult> {
    const runtimeId = `${language}-${version}`;
    const runtime = this.runtimes.get(runtimeId);
    
    if (!runtime) {
      return {
        success: false,
        message: `Runtime ${runtimeId} not found`
      };
    }

    if (!runtime.installed) {
      const installed = await this.installRuntime(runtimeId);
      if (!installed) {
        return {
          success: false,
          message: `Failed to install runtime ${runtimeId}`
        };
      }
    }

    const appId = this.generateAppId();
    const port = await this.findAvailablePort(runtime.defaultPort);

    const appInstance: ApplicationInstance = {
      id: appId,
      domainId,
      language,
      version,
      port,
      status: 'building',
      memoryLimit: 512,
      cpuLimit: 1,
      diskLimit: 1024,
      environmentVariables: environmentVars,
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.runningApps.set(appId, appInstance);

    try {
      // Create application directory
      const appDir = `/var/lib/fortress-panel/apps/${appId}`;
      await fs.mkdir(appDir, { recursive: true });

      // Write source code to file
      const sourceFile = this.getSourceFileName(appDir, language);
      await fs.writeFile(sourceFile, sourceCode);

      // Prepare environment file
      const envFile = path.join(appDir, '.env');
      const envContent = Object.entries(environmentVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await fs.writeFile(envFile, envContent);

      // Deploy based on runtime
      let containerId: string | undefined;
      const dockerAvailable = await this.checkDockerAvailability();

      if (dockerAvailable && runtime.containerImage) {
        containerId = await this.deployWithDocker(appInstance, runtime, sourceCode, environmentVars);
      } else {
        await this.deployNatively(appInstance, runtime, sourceCode, environmentVars);
      }

      // Update application status
      appInstance.status = 'running';
      appInstance.updatedAt = new Date();

      // Save to database
      await this.saveApplicationInstance(appInstance);

      return {
        success: true,
        message: `Application deployed successfully on port ${port}`,
        containerId,
        port
      };

    } catch (error) {
      appInstance.status = 'error';
      this.logger.error(`❌ Failed to deploy application ${appId}`, { error: error.message });

      return {
        success: false,
        message: `Deployment failed: ${error.message}`
      };
    }
  }

  private generateAppId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async findAvailablePort(defaultPort: number): Promise<number> {
    let port = defaultPort;
    const maxAttempts = 100;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Check if port is available
        await execAsync(`netstat -tuln | grep :${port}`);
        port++; // Port is in use, try next
      } catch {
        // Port is available
        return port;
      }
    }

    throw new Error('No available ports found');
  }

  private getSourceFileName(appDir: string, language: string): string {
    const extensions = {
      php: 'index.php',
      nodejs: 'app.js',
      python: 'app.py',
      ruby: 'app.rb',
      go: 'main.go',
      java: 'App.java'
    };

    return path.join(appDir, extensions[language] || 'app');
  }

  private async deployWithDocker(
    app: ApplicationInstance,
    runtime: RuntimeEnvironment,
    sourceCode: string,
    environmentVars: Record<string, string>
  ): Promise<string> {
    const appDir = `/var/lib/fortress-panel/apps/${app.id}`;
    
    // Create Dockerfile
    const dockerfile = this.generateDockerfile(runtime, app);
    await fs.writeFile(path.join(appDir, 'Dockerfile'), dockerfile);

    // Build and run container
    const envVars = Object.entries(environmentVars)
      .map(([key, value]) => `-e ${key}="${value}"`)
      .join(' ');

    const buildCommand = `cd ${appDir} && docker build -t fortress-app-${app.id} .`;
    const runCommand = `docker run -d --name fortress-app-${app.id} -p ${app.port}:${app.port} --memory=${app.memoryLimit}m --cpus=${app.cpuLimit} ${envVars} fortress-app-${app.id}`;

    await execAsync(buildCommand);
    const { stdout: containerId } = await execAsync(runCommand);

    return containerId.trim();
  }

  private async deployNatively(
    app: ApplicationInstance,
    runtime: RuntimeEnvironment,
    sourceCode: string,
    environmentVars: Record<string, string>
  ): Promise<void> {
    const appDir = `/var/lib/fortress-panel/apps/${app.id}`;
    
    // Language-specific deployment logic
    switch (runtime.language) {
      case 'php':
        await this.deployPHP(app, runtime, appDir);
        break;
      case 'nodejs':
        await this.deployNodeJS(app, runtime, appDir);
        break;
      case 'python':
        await this.deployPython(app, runtime, appDir);
        break;
      case 'ruby':
        await this.deployRuby(app, runtime, appDir);
        break;
      case 'go':
        await this.deployGo(app, runtime, appDir);
        break;
      case 'java':
        await this.deployJava(app, runtime, appDir);
        break;
    }
  }

  private generateDockerfile(runtime: RuntimeEnvironment, app: ApplicationInstance): string {
    const dockerfileTemplates = {
      php: `
FROM ${runtime.containerImage}
COPY . /var/www/html/
EXPOSE ${app.port}
CMD ["apache2-foreground"]
      `,
      nodejs: `
FROM ${runtime.containerImage}
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${app.port}
CMD ["npm", "start"]
      `,
      python: `
FROM ${runtime.containerImage}
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE ${app.port}
CMD ["python", "app.py"]
      `,
      ruby: `
FROM ${runtime.containerImage}
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
EXPOSE ${app.port}
CMD ["ruby", "app.rb"]
      `,
      go: `
FROM ${runtime.containerImage}
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o app .
EXPOSE ${app.port}
CMD ["./app"]
      `,
      java: `
FROM ${runtime.containerImage}
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve
COPY src ./src
RUN mvn clean package
EXPOSE ${app.port}
CMD ["java", "-jar", "target/app.jar"]
      `
    };

    return dockerfileTemplates[runtime.language] || '';
  }

  private async deployPHP(app: ApplicationInstance, runtime: RuntimeEnvironment, appDir: string): Promise<void> {
    // PHP-specific deployment logic
    await execAsync(`php -S localhost:${app.port} -t ${appDir} > /dev/null 2>&1 &`);
  }

  private async deployNodeJS(app: ApplicationInstance, runtime: RuntimeEnvironment, appDir: string): Promise<void> {
    // Install dependencies and start
    await execAsync(`cd ${appDir} && npm install`);
    await execAsync(`cd ${appDir} && PORT=${app.port} npm start > /dev/null 2>&1 &`);
  }

  private async deployPython(app: ApplicationInstance, runtime: RuntimeEnvironment, appDir: string): Promise<void> {
    // Install dependencies and start
    const requirementsPath = path.join(appDir, 'requirements.txt');
    try {
      await fs.access(requirementsPath);
      await execAsync(`pip3 install -r ${requirementsPath}`);
    } catch {
      // No requirements.txt file
    }
    await execAsync(`cd ${appDir} && python3 app.py ${app.port} > /dev/null 2>&1 &`);
  }

  private async deployRuby(app: ApplicationInstance, runtime: RuntimeEnvironment, appDir: string): Promise<void> {
    // Install dependencies and start
    const gemfilePath = path.join(appDir, 'Gemfile');
    try {
      await fs.access(gemfilePath);
      await execAsync(`cd ${appDir} && bundle install`);
    } catch {
      // No Gemfile
    }
    await execAsync(`cd ${appDir} && ruby app.rb -p ${app.port} > /dev/null 2>&1 &`);
  }

  private async deployGo(app: ApplicationInstance, runtime: RuntimeEnvironment, appDir: string): Promise<void> {
    // Build and start
    await execAsync(`cd ${appDir} && go build -o app main.go`);
    await execAsync(`cd ${appDir} && PORT=${app.port} ./app > /dev/null 2>&1 &`);
  }

  private async deployJava(app: ApplicationInstance, runtime: RuntimeEnvironment, appDir: string): Promise<void> {
    // Build and start
    await execAsync(`cd ${appDir} && mvn clean package`);
    await execAsync(`cd ${appDir} && java -jar target/app.jar --server.port=${app.port} > /dev/null 2>&1 &`);
  }

  private async saveApplicationInstance(app: ApplicationInstance): Promise<void> {
    try {
      await this.db.getTable('application_instances').insert({
        id: app.id,
        domain_id: app.domainId,
        language: app.language,
        version: app.version,
        port: app.port,
        status: app.status,
        memory_limit: app.memoryLimit,
        cpu_limit: app.cpuLimit,
        disk_limit: app.diskLimit,
        environment_variables: JSON.stringify(app.environmentVariables),
        dependencies: JSON.stringify(app.dependencies),
        build_script: app.buildScript,
        start_script: app.startScript,
        created_at: app.createdAt,
        updated_at: app.updatedAt
      });
    } catch (error) {
      this.logger.error('Failed to save application instance to database', { error: error.message });
    }
  }

  public async stopApplication(appId: string): Promise<boolean> {
    const app = this.runningApps.get(appId);
    if (!app) {
      return false;
    }

    try {
      // Stop Docker container if exists
      try {
        await execAsync(`docker stop fortress-app-${appId}`);
        await execAsync(`docker rm fortress-app-${appId}`);
      } catch {
        // Container doesn't exist or already stopped
      }

      // Kill native process
      await execAsync(`pkill -f "port ${app.port}"`);

      app.status = 'stopped';
      app.updatedAt = new Date();

      await this.db.getTable('application_instances')
        .where({ id: appId })
        .update({ 
          status: 'stopped', 
          updated_at: new Date() 
        });

      this.logger.info(`✅ Stopped application ${appId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to stop application ${appId}`, { error: error.message });
      return false;
    }
  }

  public async restartApplication(appId: string): Promise<boolean> {
    const app = this.runningApps.get(appId);
    if (!app) {
      return false;
    }

    // Stop and restart the application
    const stopped = await this.stopApplication(appId);
    if (stopped) {
      // Redeploy with same configuration
      const appDir = `/var/lib/fortress-panel/apps/${appId}`;
      const sourceFile = this.getSourceFileName(appDir, app.language);
      const sourceCode = await fs.readFile(sourceFile, 'utf-8');
      
      const result = await this.deployApplication(
        app.domainId,
        app.language,
        app.version,
        sourceCode,
        app.environmentVariables
      );

      return result.success;
    }

    return false;
  }

  public getAvailableRuntimes(): RuntimeEnvironment[] {
    return Array.from(this.runtimes.values());
  }

  public getRunningApplications(): ApplicationInstance[] {
    return Array.from(this.runningApps.values());
  }

  public getApplicationStatus(appId: string): ApplicationInstance | null {
    return this.runningApps.get(appId) || null;
  }

  public async getApplicationLogs(appId: string, lines: number = 100): Promise<string[]> {
    try {
      // Try Docker logs first
      try {
        const { stdout } = await execAsync(`docker logs --tail ${lines} fortress-app-${appId}`);
        return stdout.split('\n').filter(line => line.trim());
      } catch {
        // Fallback to log files
        const logFile = `/var/log/fortress-panel/apps/${appId}.log`;
        try {
          const { stdout } = await execAsync(`tail -n ${lines} ${logFile}`);
          return stdout.split('\n').filter(line => line.trim());
        } catch {
          return ['No logs available'];
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get logs for application ${appId}`, { error: error.message });
      return [`Error retrieving logs: ${error.message}`];
    }
  }

  public async updateApplicationResources(
    appId: string,
    memoryLimit: number,
    cpuLimit: number,
    diskLimit: number
  ): Promise<boolean> {
    const app = this.runningApps.get(appId);
    if (!app) {
      return false;
    }

    try {
      app.memoryLimit = memoryLimit;
      app.cpuLimit = cpuLimit;
      app.diskLimit = diskLimit;
      app.updatedAt = new Date();

      // Update Docker container if running
      try {
        await execAsync(`docker update --memory=${memoryLimit}m --cpus=${cpuLimit} fortress-app-${appId}`);
      } catch {
        // Container might not exist
      }

      // Update database
      await this.db.getTable('application_instances')
        .where({ id: appId })
        .update({
          memory_limit: memoryLimit,
          cpu_limit: cpuLimit,
          disk_limit: diskLimit,
          updated_at: new Date()
        });

      this.logger.info(`✅ Updated resources for application ${appId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to update resources for application ${appId}`, { error: error.message });
      return false;
    }
  }
}