const express = require('express');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      cpu_warning: 70,
      cpu_critical: 90,
      memory_warning: 80,
      memory_critical: 95,
      disk_warning: 85,
      disk_critical: 95,
      response_time_warning: 2000,
      response_time_critical: 5000
    };
    this.initializeMetrics();
  }

  initializeMetrics() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Collect every 30 seconds
  }

  async collectSystemMetrics() {
    try {
      const now = new Date().toISOString();
      
      // CPU metrics
      const cpus = os.cpus();
      const totalCPU = cpus.length;
      const loadAverage = os.loadavg();
      
      // Memory metrics
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = (usedMem / totalMem) * 100;

      // System uptime
      const uptime = os.uptime();

      // Process metrics
      const processMem = process.memoryUsage();

      // Disk metrics
      const diskStats = await this.getDiskStats();

      // Network metrics
      const networkStats = await this.getNetworkStats();

      // Docker stats
      const dockerStats = await this.getDockerStats();

      const metrics = {
        timestamp: now,
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          uptime: uptime,
          loadAverage: loadAverage,
          cpu: {
            cores: totalCPU,
            usage: this.calculateCPUUsage(loadAverage, totalCPU)
          },
          memory: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usage: memoryUsage
          },
          disk: diskStats,
          network: networkStats
        },
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          memory: processMem,
          cpu: process.cpuUsage()
        },
        docker: dockerStats
      };

      this.metrics.set(now, metrics);
      
      // Keep only last 1000 metrics (about 8.3 hours of data)
      if (this.metrics.size > 1000) {
        const oldestKey = this.metrics.keys().next().value;
        this.metrics.delete(oldestKey);
      }

      // Check for alerts
      this.checkThresholds(metrics);
      
      return metrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      return null;
    }
  }

  calculateCPUUsage(loadAvg, cpuCount) {
    // Convert 1-minute load average to percentage
    const loadPercentage = (loadAvg[0] / cpuCount) * 100;
    return Math.min(loadPercentage, 100);
  }

  async getDiskStats() {
    try {
      const stats = await execSync('df -h /', { encoding: 'utf8' });
      const lines = stats.trim().split('\n');
      if (lines.length < 2) return { usage: 0, total: 0, used: 0, free: 0 };
      
      const parts = lines[1].split(/\s+/);
      return {
        total: parts[1],
        used: parts[2],
        free: parts[3],
        usage: parseInt(parts[4].replace('%', ''))
      };
    } catch (error) {
      return { usage: 0, total: '0B', used: '0B', free: '0B' };
    }
  }

  async getNetworkStats() {
    try {
      // For basic network stats, we'll use system information
      const networkInterfaces = os.networkInterfaces();
      const activeInterfaces = Object.entries(networkInterfaces)
        .filter(([name, configs]) => !name.includes('lo') && configs && configs.length > 0)
        .map(([name, configs]) => ({
          name,
          addresses: configs.map(config => ({
            family: config.family,
            address: config.address,
            internal: config.internal
          }))
        }));

      return {
        interfaces: activeInterfaces,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { interfaces: [], timestamp: new Date().toISOString() };
    }
  }

  async getDockerStats() {
    try {
      const output = await execSync('docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.BlockIO}}"', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      
      if (lines.length < 2) return { containers: [] };
      
      const containers = lines.slice(1).map(line => {
        const parts = line.split(/\s+/);
        return {
          name: parts[0],
          cpu: parts[1],
          memory: parts[2],
          network: parts[3],
          disk: parts[4]
        };
      });

      return { containers, count: containers.length };
    } catch (error) {
      return { containers: [], count: 0, error: error.message };
    }
  }

  checkThresholds(metrics) {
    const alerts = [];

    // CPU alerts
    if (metrics.system.cpu.usage > this.thresholds.cpu_critical) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'cpu',
        severity: 'critical',
        message: `CPU usage is critically high: ${metrics.system.cpu.usage.toFixed(1)}%`,
        value: metrics.system.cpu.usage,
        threshold: this.thresholds.cpu_critical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.system.cpu.usage > this.thresholds.cpu_warning) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'cpu',
        severity: 'warning',
        message: `CPU usage is high: ${metrics.system.cpu.usage.toFixed(1)}%`,
        value: metrics.system.cpu.usage,
        threshold: this.thresholds.cpu_warning,
        timestamp: metrics.timestamp
      });
    }

    // Memory alerts
    if (metrics.system.memory.usage > this.thresholds.memory_critical) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'memory',
        severity: 'critical',
        message: `Memory usage is critically high: ${metrics.system.memory.usage.toFixed(1)}%`,
        value: metrics.system.memory.usage,
        threshold: this.thresholds.memory_critical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.system.memory.usage > this.thresholds.memory_warning) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'memory',
        severity: 'warning',
        message: `Memory usage is high: ${metrics.system.memory.usage.toFixed(1)}%`,
        value: metrics.system.memory.usage,
        threshold: this.thresholds.memory_warning,
        timestamp: metrics.timestamp
      });
    }

    // Disk alerts
    if (metrics.system.disk.usage > this.thresholds.disk_critical) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'disk',
        severity: 'critical',
        message: `Disk usage is critically high: ${metrics.system.disk.usage}%`,
        value: metrics.system.disk.usage,
        threshold: this.thresholds.disk_critical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.system.disk.usage > this.thresholds.disk_warning) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'disk',
        severity: 'warning',
        message: `Disk usage is high: ${metrics.system.disk.usage}%`,
        value: metrics.system.disk.usage,
        threshold: this.thresholds.disk_warning,
        timestamp: metrics.timestamp
      });
    }

    // Add new alerts to the list
    this.alerts.push(...alerts);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    return alerts;
  }

  getMetricsHistory(limit = 100) {
    const metricsArray = Array.from(this.metrics.values());
    return metricsArray.slice(-limit);
  }

  getLatestMetrics() {
    const metricsArray = Array.from(this.metrics.values());
    return metricsArray[metricsArray.length - 1] || null;
  }

  getAlerts(limit = 50) {
    return this.alerts.slice(-limit);
  }

  getAlertsBySeverity(severity) {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  clearAlerts() {
    this.alerts = [];
    return { message: 'Alerts cleared' };
  }

  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    return this.thresholds;
  }

  getHealthStatus() {
    const latestMetrics = this.getLatestMetrics();
    if (!latestMetrics) {
      return {
        status: 'unknown',
        message: 'No metrics available',
        checks: []
      };
    }

    const checks = [
      {
        name: 'CPU Usage',
        status: latestMetrics.system.cpu.usage < 80 ? 'healthy' : 'warning',
        value: latestMetrics.system.cpu.usage,
        unit: '%',
        threshold: 80
      },
      {
        name: 'Memory Usage',
        status: latestMetrics.system.memory.usage < 85 ? 'healthy' : 'warning',
        value: latestMetrics.system.memory.usage,
        unit: '%',
        threshold: 85
      },
      {
        name: 'Disk Usage',
        status: latestMetrics.system.disk.usage < 90 ? 'healthy' : 'warning',
        value: latestMetrics.system.disk.usage,
        unit: '%',
        threshold: 90
      },
      {
        name: 'System Load',
        status: latestMetrics.system.loadAverage[0] < latestMetrics.system.cpu.cores * 2 ? 'healthy' : 'warning',
        value: latestMetrics.system.loadAverage[0],
        unit: '',
        threshold: latestMetrics.system.cpu.cores * 2
      }
    ];

    const failedChecks = checks.filter(check => check.status !== 'healthy');
    const overallStatus = failedChecks.length === 0 ? 'healthy' : 
                         failedChecks.some(check => check.status === 'critical') ? 'critical' : 'warning';

    return {
      status: overallStatus,
      message: overallStatus === 'healthy' ? 'All systems operational' : 
               `${failedChecks.length} system${failedChecks.length > 1 ? 's' : ''} need attention`,
      checks,
      timestamp: latestMetrics.timestamp
    };
  }

  generateReport(timeRange = '24h') {
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const metricsInRange = Array.from(this.metrics.values())
      .filter(metric => new Date(metric.timestamp) >= startTime);

    if (metricsInRange.length === 0) {
      return { error: 'No data available for the selected time range' };
    }

    const cpuValues = metricsInRange.map(m => m.system.cpu.usage);
    const memoryValues = metricsInRange.map(m => m.system.memory.usage);
    const diskValues = metricsInRange.map(m => m.system.disk.usage);

    const alertsInRange = this.alerts.filter(alert => new Date(alert.timestamp) >= startTime);

    return {
      timeRange,
      period: {
        start: startTime.toISOString(),
        end: now.toISOString(),
        duration: now.getTime() - startTime.getTime()
      },
      metrics: {
        cpu: {
          avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
          max: Math.max(...cpuValues),
          min: Math.min(...cpuValues),
          current: cpuValues[cpuValues.length - 1]
        },
        memory: {
          avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
          max: Math.max(...memoryValues),
          min: Math.min(...memoryValues),
          current: memoryValues[memoryValues.length - 1]
        },
        disk: {
          avg: diskValues.reduce((a, b) => a + b, 0) / diskValues.length,
          max: Math.max(...diskValues),
          min: Math.min(...diskValues),
          current: diskValues[diskValues.length - 1]
        }
      },
      alerts: {
        total: alertsInRange.length,
        critical: alertsInRange.filter(a => a.severity === 'critical').length,
        warning: alertsInRange.filter(a => a.severity === 'warning').length,
        byType: alertsInRange.reduce((acc, alert) => {
          acc[alert.type] = (acc[alert.type] || 0) + 1;
          return acc;
        }, {})
      },
      uptime: os.uptime(),
      generated_at: now.toISOString()
    };
  }
}

module.exports = MonitoringService;