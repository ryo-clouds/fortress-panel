import { Logger } from '@fortress-panel/shared';
import { DatabaseConnection } from '../config/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    path: string;
  };
  network: {
    interfaces: NetworkInterface[];
    connections: number;
    bytesIn: number;
    bytesOut: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    fortressPanel: {
      pid: number;
      memory: number;
      cpu: number;
      uptime: number;
    };
  };
}

interface NetworkInterface {
  name: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errorsIn: number;
  errorsOut: number;
}

interface ApplicationMetrics {
  timestamp: Date;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  };
  users: {
    online: number;
    totalSessions: number;
    newUsersToday: number;
    loginAttempts: number;
    failedLogins: number;
  };
  applications: {
    total: number;
    running: number;
    stopped: number;
    error: number;
    byLanguage: Record<string, number>;
  };
  resources: {
    totalMemoryUsage: number;
    totalCpuUsage: number;
    totalDiskUsage: number;
    networkTraffic: number;
  };
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  details: Record<string, any>;
  error?: string;
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private logger = Logger.getInstance();
  private db = DatabaseConnection.getInstance();
  private metrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alerts: Alert[] = [];
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeMonitoring();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private async initializeMonitoring(): Promise<void> {
    this.logger.info('🔍 Initializing monitoring service...');
    
    // Create monitoring tables
    await this.createMonitoringTables();
    
    // Start metrics collection
    await this.startMetricsCollection();
    
    this.logger.info('✅ Monitoring service initialized');
  }

  private async createMonitoringTables(): Promise<void> {
    try {
      const hasTable = await this.db.connection.schema.hasTable('system_metrics_history');
      if (!hasTable) {
        await this.db.connection.schema.createTable('system_metrics_history', (table) => {
          table.uuid('id').primary().defaultTo(this.db.connection.raw('(UUID())'));
          table.timestamp('timestamp').notNullable();
          table.decimal('cpu_usage', 5, 2).notNullable();
          table.decimal('memory_usage', 5, 2).notNullable();
          table.decimal('disk_usage', 5, 2).notNullable();
          table.decimal('network_in', 10, 2).defaultTo(0);
          table.decimal('network_out', 10, 2).defaultTo(0);
          table.integer('process_count').notNullable();
          table.decimal('load_average', 5, 2).notNullable();
          table.json('metadata'); // Additional metrics as JSON
          table.index(['timestamp']);
        });
      }

      const hasAppMetricsTable = await this.db.connection.schema.hasTable('application_metrics_history');
      if (!hasAppMetricsTable) {
        await this.db.connection.schema.createTable('application_metrics_history', (table) => {
          table.uuid('id').primary().defaultTo(this.db.connection.raw('(UUID())'));
          table.timestamp('timestamp').notNullable();
          table.integer('requests_total').notNullable();
          table.integer('requests_successful').notNullable();
          table.integer('requests_failed').notNullable();
          table.decimal('avg_response_time', 8, 2).notNullable();
          table.decimal('requests_per_second', 8, 2).notNullable();
          table.integer('active_users').notNullable();
          table.integer('total_sessions').notNullable();
          table.integer('applications_running').notNullable();
          table.integer('applications_stopped').notNullable();
          table.integer('applications_error').notNullable();
          table.json('metadata');
          table.index(['timestamp']);
        });
      }

      const hasAlertsTable = await this.db.connection.schema.hasTable('monitoring_alerts');
      if (!hasAlertsTable) {
        await this.db.connection.schema.createTable('monitoring_alerts', (table) => {
          table.uuid('id').primary().defaultTo(this.db.connection.raw('(UUID())'));
          table.enum('level', ['info', 'warning', 'error', 'critical']).notNullable();
          table.string('service', 100).notNullable();
          table.string('metric', 100).notNullable();
          table.text('message').notNullable();
          table.decimal('value', 10, 2).notNullable();
          table.decimal('threshold', 10, 2).notNullable();
          table.boolean('resolved').defaultTo(false);
          table.timestamp('resolved_at');
          table.uuid('resolved_by').references('id').inTable('users');
          table.timestamp('created_at').defaultTo(this.db.connection.fn.now());
          table.index(['service']);
          table.index(['level']);
          table.index(['resolved']);
          table.index(['created_at']);
        });
      }

      this.logger.info('✅ Monitoring tables created/verified');
    } catch (error) {
      this.logger.error('❌ Failed to create monitoring tables', { error: error.message });
      throw error;
    }
  }

  public async startMetricsCollection(): Promise<void> {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    
    // Collect system metrics every 30 seconds
    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.collectApplicationMetrics();
        await this.runHealthChecks();
        await this.checkAlerts();
      } catch (error) {
        this.logger.error('Error in metrics collection', { error: error.message });
      }
    }, 30000);

    // Initial collection
    await this.collectSystemMetrics();
    await this.collectApplicationMetrics();
    await this.runHealthChecks();

    this.logger.info('📊 Metrics collection started');
  }

  public stopMetricsCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    this.logger.info('📊 Metrics collection stopped');
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      const cpuInfo = await this.getCpuInfo();
      const memoryInfo = await this.getMemoryInfo();
      const diskInfo = await this.getDiskInfo();
      const networkInfo = await this.getNetworkInfo();
      const processInfo = await this.getProcessInfo();

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: cpuInfo,
        memory: memoryInfo,
        disk: diskInfo,
        network: networkInfo,
        processes: processInfo
      };

      // Store in memory (keep last 100 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 100) {
        this.metrics.shift();
      }

      // Store in database
      await this.db.connection.table('system_metrics_history').insert({
        timestamp: metrics.timestamp,
        cpu_usage: metrics.cpu.usage,
        memory_usage: metrics.memory.usage,
        disk_usage: metrics.disk.usage,
        network_in: metrics.network.bytesIn,
        network_out: metrics.network.bytesOut,
        process_count: metrics.processes.total,
        load_average: metrics.cpu.loadAverage[0],
        metadata: JSON.stringify({
          cpu_cores: metrics.cpu.cores,
          memory_total: metrics.memory.total,
          disk_total: metrics.disk.total,
          network_connections: metrics.network.connections,
          fortress_panel: metrics.processes.fortressPanel
        })
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect system metrics', { error: error.message });
      throw error;
    }
  }

  private async getCpuInfo() {
    const loadAvg = os.loadavg();
    const cpus = os.cpus();
    
    // Get CPU usage by calculating difference over time
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (idle / total) * 100;

    return {
      usage: Math.round(usage * 100) / 100,
      loadAverage: loadAvg,
      cores: cpus.length
    };
  }

  private async getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const cached = 0; // Would need /proc/meminfo on Linux

    return {
      total: Math.round(total / 1024 / 1024), // MB
      used: Math.round(used / 1024 / 1024),
      free: Math.round(free / 1024 / 1024),
      cached: Math.round(cached / 1024 / 1024),
      usage: Math.round((used / total) * 10000) / 100
    };
  }

  private async getDiskInfo() {
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.split('\n');
      const data = lines[1].split(/\s+/);
      
      const total = parseInt(data[1]) * 1024; // Convert GB to MB
      const used = parseInt(data[2]) * 1024;
      const available = parseInt(data[3]) * 1024;

      return {
        total,
        used,
        free: available,
        usage: Math.round((used / total) * 10000) / 100,
        path: '/'
      };
    } catch (error) {
      // Fallback to basic info
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        path: '/'
      };
    }
  }

  private async getNetworkInfo() {
    try {
      const { stdout } = await execAsync("cat /proc/net/dev | grep -E '(eth|en|wl)' | head -5");
      const interfaces: NetworkInterface[] = [];
      let totalBytesIn = 0;
      let totalBytesOut = 0;

      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 9) {
          const iface = {
            name: parts[0].replace(':', ''),
            bytesIn: parseInt(parts[1]),
            bytesOut: parseInt(parts[9]),
            packetsIn: parseInt(parts[2]),
            packetsOut: parseInt(parts[10]),
            errorsIn: parseInt(parts[3]),
            errorsOut: parseInt(parts[11])
          };
          interfaces.push(iface);
          totalBytesIn += iface.bytesIn;
          totalBytesOut += iface.bytesOut;
        }
      }

      const { stdout: netstatOutput } = await execAsync("netstat -an | grep ESTABLISHED | wc -l");
      const connections = parseInt(netstatOutput.trim());

      return {
        interfaces,
        connections,
        bytesIn: totalBytesIn,
        bytesOut: totalBytesOut
      };
    } catch (error) {
      // Fallback for non-Linux systems
      return {
        interfaces: [],
        connections: 0,
        bytesIn: 0,
        bytesOut: 0
      };
    }
  }

  private async getProcessInfo() {
    try {
      const { stdout } = await execAsync('ps aux');
      const lines = stdout.split('\n');
      
      let total = 0;
      let running = 0;
      let sleeping = 0;
      
      for (let i = 1; i < lines.length; i++) { // Skip header
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length > 7) {
          total++;
          const state = parts[7];
          if (state === 'R') running++;
          else if (state === 'S') sleeping++;
        }
      }

      // Get Fortress Panel process info
      let fortressPanel = {
        pid: process.pid,
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
        cpu: 0, // Would need more complex calculation
        uptime: Math.round(process.uptime())
      };

      return {
        total,
        running,
        sleeping,
        fortressPanel
      };
    } catch (error) {
      return {
        total: 0,
        running: 0,
        sleeping: 0,
        fortressPanel: {
          pid: process.pid,
          memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
          cpu: 0,
          uptime: Math.round(process.uptime())
        }
      };
    }
  }

  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    try {
      // Get request metrics from database
      const requestMetrics = await this.getRequestMetrics();
      
      // Get user metrics
      const userMetrics = await this.getUserMetrics();
      
      // Get application metrics
      const appMetrics = await this.getApplicationMetrics();
      
      // Calculate resource usage
      const resourceMetrics = await this.getResourceMetrics();

      const metrics: ApplicationMetrics = {
        timestamp: new Date(),
        requests: requestMetrics,
        users: userMetrics,
        applications: appMetrics,
        resources: resourceMetrics
      };

      // Store in memory
      this.applicationMetrics.push(metrics);
      if (this.applicationMetrics.length > 100) {
        this.applicationMetrics.shift();
      }

      // Store in database
      await this.db.connection.table('application_metrics_history').insert({
        timestamp: metrics.timestamp,
        requests_total: metrics.requests.total,
        requests_successful: metrics.requests.successful,
        requests_failed: metrics.requests.failed,
        avg_response_time: metrics.requests.averageResponseTime,
        requests_per_second: metrics.requests.requestsPerSecond,
        active_users: metrics.users.online,
        total_sessions: metrics.users.totalSessions,
        applications_running: metrics.applications.running,
        applications_stopped: metrics.applications.stopped,
        applications_error: metrics.applications.error,
        metadata: JSON.stringify({
          new_users_today: metrics.users.newUsersToday,
          login_attempts: metrics.users.loginAttempts,
          failed_logins: metrics.users.failedLogins,
          applications_by_language: metrics.applications.byLanguage,
          total_memory_usage: resourceMetrics.totalMemoryUsage,
          total_cpu_usage: resourceMetrics.totalCpuUsage,
          total_disk_usage: resourceMetrics.totalDiskUsage,
          network_traffic: resourceMetrics.networkTraffic
        })
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect application metrics', { error: error.message });
      throw error;
    }
  }

  private async getRequestMetrics() {
    try {
      // Get metrics from last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const [total, successful, failed, avgResponseTime] = await Promise.all([
        this.db.connection.table('audit_logs').where('created_at', '>=', fiveMinutesAgo).count('* as count').first(),
        this.db.connection.table('audit_logs').where('created_at', '>=', fiveMinutesAgo).where('success', true).count('* as count').first(),
        this.db.connection.table('audit_logs').where('created_at', '>=', fiveMinutesAgo).where('success', false).count('* as count').first(),
        this.db.connection.table('audit_logs').where('created_at', '>=', fiveMinutesAgo).avg('response_time as avg').first()
      ]);

      const totalCount = parseInt(total?.count || '0');
      const successfulCount = parseInt(successful?.count || '0');
      const failedCount = parseInt(failed?.count || '0');
      const avgResponse = parseFloat(avgResponseTime?.avg || '0');
      const rps = totalCount / 300; // 5 minutes = 300 seconds

      return {
        total: totalCount,
        successful: successfulCount,
        failed: failedCount,
        averageResponseTime: avgResponse,
        requestsPerSecond: Math.round(rps * 100) / 100
      };
    } catch (error) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0
      };
    }
  }

  private async getUserMetrics() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const [onlineSessions, totalSessions, newUsersToday, loginAttempts, failedLogins] = await Promise.all([
        this.db.connection.table('auth_sessions').where('status', 'active').count('* as count').first(),
        this.db.connection.table('auth_sessions').count('* as count').first(),
        this.db.connection.table('users').where('created_at', '>=', today).count('* as count').first(),
        this.db.connection.table('security_events').where('event_type', 'login').where('created_at', '>=', today).count('* as count').first(),
        this.db.connection.table('security_events').where('event_type', 'login_failed').where('created_at', '>=', today).count('* as count').first()
      ]);

      return {
        online: parseInt(onlineSessions?.count || '0'),
        totalSessions: parseInt(totalSessions?.count || '0'),
        newUsersToday: parseInt(newUsersToday?.count || '0'),
        loginAttempts: parseInt(loginAttempts?.count || '0'),
        failedLogins: parseInt(failedLogins?.count || '0')
      };
    } catch (error) {
      return {
        online: 0,
        totalSessions: 0,
        newUsersToday: 0,
        loginAttempts: 0,
        failedLogins: 0
      };
    }
  }

  private async getApplicationMetrics() {
    try {
      const [total, running, stopped, error, byLanguage] = await Promise.all([
        this.db.connection.table('application_instances').count('* as count').first(),
        this.db.connection.table('application_instances').where('status', 'running').count('* as count').first(),
        this.db.connection.table('application_instances').where('status', 'stopped').count('* as count').first(),
        this.db.connection.table('application_instances').where('status', 'error').count('* as count').first(),
        this.db.connection.table('application_instances').select('language').count('* as count').groupBy('language')
      ]);

      const languageStats: Record<string, number> = {};
      if (byLanguage) {
        byLanguage.forEach((item: any) => {
          languageStats[item.language] = parseInt(item.count);
        });
      }

      return {
        total: parseInt(total?.count || '0'),
        running: parseInt(running?.count || '0'),
        stopped: parseInt(stopped?.count || '0'),
        error: parseInt(error?.count || '0'),
        byLanguage: languageStats
      };
    } catch (error) {
      return {
        total: 0,
        running: 0,
        stopped: 0,
        error: 0,
        byLanguage: {}
      };
    }
  }

  private async getResourceMetrics() {
    try {
      const [memoryUsage, cpuUsage, diskUsage] = await Promise.all([
        this.db.connection.table('application_instances').sum('memory_limit as total').first(),
        this.db.connection.table('application_instances').sum('cpu_limit as total').first(),
        this.db.connection.table('application_instances').sum('disk_limit as total').first()
      ]);

      // Get network traffic from system metrics
      const networkTraffic = this.metrics.length > 0 
        ? this.metrics[this.metrics.length - 1].network.bytesIn + this.metrics[this.metrics.length - 1].network.bytesOut
        : 0;

      return {
        totalMemoryUsage: parseInt(memoryUsage?.total || '0'),
        totalCpuUsage: parseFloat(cpuUsage?.total || '0'),
        totalDiskUsage: parseInt(diskUsage?.total || '0'),
        networkTraffic
      };
    } catch (error) {
      return {
        totalMemoryUsage: 0,
        totalCpuUsage: 0,
        totalDiskUsage: 0,
        networkTraffic: 0
      };
    }
  }

  private async runHealthChecks(): Promise<void> {
    const services = ['database', 'redis', 'application', 'nginx', 'php-fpm'];
    
    for (const service of services) {
      const healthCheck = await this.checkServiceHealth(service);
      this.healthChecks.set(service, healthCheck);
    }
  }

  private async checkServiceHealth(service: string): Promise<HealthCheck> {
    const startTime = Date.now();
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let details: Record<string, any> = {};
    let error: string | undefined;

    try {
      switch (service) {
        case 'database':
          await this.db.connection.raw('SELECT 1');
          details = { connected: true };
          break;

        case 'redis':
          // Redis health check would be implemented here
          details = { connected: true };
          break;

        case 'application':
          details = { 
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            pid: process.pid
          };
          break;

        case 'nginx':
          // Check if nginx is running
          try {
            await execAsync('pgrep nginx');
            details = { running: true };
          } catch {
            status = 'unhealthy';
            error = 'Nginx is not running';
          }
          break;

        case 'php-fpm':
          // Check if php-fpm is running
          try {
            await execAsync('pgrep php-fpm');
            details = { running: true };
          } catch {
            status = 'unhealthy';
            error = 'PHP-FPM is not running';
          }
          break;

        default:
          status = 'degraded';
          error = `Unknown service: ${service}`;
      }
    } catch (err) {
      status = 'unhealthy';
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const responseTime = Date.now() - startTime;

    return {
      service,
      status,
      responseTime,
      lastCheck: new Date(),
      details,
      error
    };
  }

  private async checkAlerts(): Promise<void> {
    const thresholds = {
      cpu_usage: { warning: 70, critical: 90 },
      memory_usage: { warning: 80, critical: 95 },
      disk_usage: { warning: 80, critical: 95 },
      response_time: { warning: 1000, critical: 5000 },
      error_rate: { warning: 5, critical: 10 }
    };

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const latestAppMetrics = this.applicationMetrics[this.applicationMetrics.length - 1];

    if (!latestMetrics || !latestAppMetrics) {
      return;
    }

    // Check CPU usage
    await this.checkThreshold('cpu_usage', latestMetrics.cpu.usage, thresholds.cpu_usage, 'system');
    
    // Check memory usage
    await this.checkThreshold('memory_usage', latestMetrics.memory.usage, thresholds.memory_usage, 'system');
    
    // Check disk usage
    await this.checkThreshold('disk_usage', latestMetrics.disk.usage, thresholds.disk_usage, 'system');
    
    // Check response time
    await this.checkThreshold('response_time', latestAppMetrics.requests.averageResponseTime, thresholds.response_time, 'application');
    
    // Check error rate
    const errorRate = latestAppMetrics.requests.total > 0 
      ? (latestAppMetrics.requests.failed / latestAppMetrics.requests.total) * 100 
      : 0;
    await this.checkThreshold('error_rate', errorRate, thresholds.error_rate, 'application');
  }

  private async checkThreshold(
    metric: string, 
    value: number, 
    thresholds: { warning: number; critical: number },
    service: string
  ): Promise<void> {
    let level: 'info' | 'warning' | 'error' | 'critical' | null = null;
    let threshold: number | null = null;

    if (value >= thresholds.critical) {
      level = 'critical';
      threshold = thresholds.critical;
    } else if (value >= thresholds.warning) {
      level = 'warning';
      threshold = thresholds.warning;
    }

    if (level && threshold) {
      await this.createAlert({
        level,
        service,
        metric,
        message: `${metric} is ${value.toFixed(2)}%, threshold is ${threshold}%`,
        value,
        threshold
      });
    }
  }

  private async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved' | 'resolvedAt'>): Promise<void> {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert => 
      alert.service === alertData.service &&
      alert.metric === alertData.metric &&
      !alert.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.value = alertData.value;
      existingAlert.threshold = alertData.threshold;
      existingAlert.timestamp = new Date();
    } else {
      // Create new alert
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        resolved: false,
        ...alertData
      };

      this.alerts.push(alert);

      // Store in database
      await this.db.connection.table('monitoring_alerts').insert({
        level: alert.level,
        service: alert.service,
        metric: alert.metric,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        resolved: false,
        created_at: alert.timestamp
      });

      this.logger.warn(`🚨 Alert created: ${alert.message}`, {
        level: alert.level,
        service: alert.service,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold
      });
    }
  }

  // Public API methods
  public getSystemMetrics(limit: number = 100): SystemMetrics[] {
    return this.metrics.slice(-limit);
  }

  public getApplicationMetrics(limit: number = 100): ApplicationMetrics[] {
    return this.applicationMetrics.slice(-limit);
  }

  public getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public getAllAlerts(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  public async resolveAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const alert = this.alerts.find(a => a.id === alertId);
      if (!alert) {
        return false;
      }

      alert.resolved = true;
      alert.resolvedAt = new Date();

      // Update in database
      await this.db.connection.table('monitoring_alerts')
        .where({ id: alertId })
        .update({
          resolved: true,
          resolved_at: alert.resolvedAt,
          resolved_by: userId
        });

      this.logger.info(`✅ Alert resolved: ${alert.message}`, { alertId, userId });
      return true;
    } catch (error) {
      this.logger.error('Failed to resolve alert', { alertId, error: error.message });
      return false;
    }
  }

  public async getHistoricalMetrics(
    startTime: Date,
    endTime: Date,
    type: 'system' | 'application' = 'system'
  ): Promise<any[]> {
    try {
      const tableName = type === 'system' ? 'system_metrics_history' : 'application_metrics_history';
      
      const metrics = await this.db.connection.table(tableName)
        .whereBetween('timestamp', [startTime, endTime])
        .orderBy('timestamp', 'asc');

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get historical metrics', { error: error.message, type, startTime, endTime });
      return [];
    }
  }

  public async getMetricsSummary(timeframe: 'hour' | 'day' | 'week' | 'month' = 'hour'): Promise<any> {
    try {
      const endTime = new Date();
      const startTime = new Date();

      switch (timeframe) {
        case 'hour':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case 'day':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case 'week':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case 'month':
          startTime.setMonth(startTime.getMonth() - 1);
          break;
      }

      const [systemMetrics, appMetrics] = await Promise.all([
        this.getHistoricalMetrics(startTime, endTime, 'system'),
        this.getHistoricalMetrics(startTime, endTime, 'application')
      ]);

      return {
        timeframe,
        period: { startTime, endTime },
        system: {
          avgCpuUsage: this.calculateAverage(systemMetrics, 'cpu_usage'),
          avgMemoryUsage: this.calculateAverage(systemMetrics, 'memory_usage'),
          avgDiskUsage: this.calculateAverage(systemMetrics, 'disk_usage'),
          maxCpuUsage: this.calculateMax(systemMetrics, 'cpu_usage'),
          maxMemoryUsage: this.calculateMax(systemMetrics, 'memory_usage'),
          dataPoints: systemMetrics.length
        },
        application: {
          totalRequests: this.calculateSum(appMetrics, 'requests_total'),
          avgResponseTime: this.calculateAverage(appMetrics, 'avg_response_time'),
          errorRate: this.calculateErrorRate(appMetrics),
          activeUsers: this.calculateMax(appMetrics, 'active_users'),
          dataPoints: appMetrics.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get metrics summary', { error: error.message, timeframe });
      return null;
    }
  }

  private calculateAverage(metrics: any[], field: string): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + parseFloat(metric[field] || 0), 0);
    return Math.round((sum / metrics.length) * 100) / 100;
  }

  private calculateMax(metrics: any[], field: string): number {
    if (metrics.length === 0) return 0;
    return Math.max(...metrics.map(metric => parseFloat(metric[field] || 0)));
  }

  private calculateSum(metrics: any[], field: string): number {
    return metrics.reduce((acc, metric) => acc + parseInt(metric[field] || 0), 0);
  }

  private calculateErrorRate(appMetrics: any[]): number {
    if (appMetrics.length === 0) return 0;
    
    const totalRequests = this.calculateSum(appMetrics, 'requests_total');
    const totalFailed = this.calculateSum(appMetrics, 'requests_failed');
    
    return totalRequests > 0 ? Math.round((totalFailed / totalRequests) * 10000) / 100 : 0;
  }

  public async exportMetrics(format: 'json' | 'csv' = 'json', timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<string> {
    const summary = await this.getMetricsSummary(timeframe);
    
    if (format === 'csv') {
      // Convert to CSV format
      const headers = 'Timestamp,CPU Usage,Memory Usage,Disk Usage,Requests,Response Time,Error Rate\n';
      const rows = this.systemMetrics.slice(-100).map((metric, index) => {
        const appMetric = this.applicationMetrics[index];
        return `${metric.timestamp.toISOString()},${metric.cpu.usage},${metric.memory.usage},${metric.disk.usage},${appMetric?.requests.total || 0},${appMetric?.requests.averageResponseTime || 0},${appMetric ? ((appMetric.requests.failed / appMetric.requests.total) * 100).toFixed(2) : 0}`;
      }).join('\n');
      
      return headers + rows;
    }
    
    return JSON.stringify(summary, null, 2);
  }
}