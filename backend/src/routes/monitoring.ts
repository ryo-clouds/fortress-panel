import { Router } from 'express';
import { MonitoringService } from '../services/MonitoringService';
import { Logger } from '@fortress-panel/shared';
import { authenticateToken, requirePermission } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const monitoringService = MonitoringService.getInstance();
const logger = Logger.getInstance();

// Apply rate limiting for monitoring endpoints
const monitoringLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many monitoring requests, please try again later.'
    }
  }
});

router.use(monitoringLimiter);

// Get current system metrics
router.get('/metrics/system', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const metrics = monitoringService.getSystemMetrics(limit);
    
    res.json({
      success: true,
      data: {
        metrics,
        count: metrics.length,
        collectedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get system metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system metrics'
    });
  }
});

// Get current application metrics
router.get('/metrics/application', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const metrics = monitoringService.getApplicationMetrics(limit);
    
    res.json({
      success: true,
      data: {
        metrics,
        count: metrics.length,
        collectedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get application metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application metrics'
    });
  }
});

// Get health status of all services
router.get('/health', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const healthChecks = monitoringService.getHealthChecks();
    const overallStatus = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 
                          healthChecks.some(check => check.status === 'unhealthy') ? 'unhealthy' : 'degraded';
    
    res.json({
      success: true,
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: healthChecks,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  } catch (error) {
    logger.error('Failed to get health status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve health status'
    });
  }
});

// Get active alerts
router.get('/alerts', authenticateToken, requirePermission('security.read'), async (req, res) => {
  try {
    const includeResolved = req.query.includeResolved === 'true';
    const limit = parseInt(req.query.limit as string) || 50;
    
    const alerts = includeResolved 
      ? monitoringService.getAllAlerts(limit)
      : monitoringService.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        activeCount: alerts.filter(a => !a.resolved).length,
        criticalCount: alerts.filter(a => a.level === 'critical' && !a.resolved).length,
        warningCount: alerts.filter(a => a.level === 'warning' && !a.resolved).length
      }
    });
  } catch (error) {
    logger.error('Failed to get alerts', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts'
    });
  }
});

// Resolve an alert
router.post('/alerts/:alertId/resolve', authenticateToken, requirePermission('security.manage'), async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const success = await monitoringService.resolveAlert(alertId, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
  } catch (error) {
    logger.error('Failed to resolve alert', { error: error.message, alertId: req.params.alertId });
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert'
    });
  }
});

// Get metrics summary for a specific timeframe
router.get('/summary', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const timeframe = req.query.timeframe as 'hour' | 'day' | 'week' | 'month' || 'hour';
    const summary = await monitoringService.getMetricsSummary(timeframe);
    
    if (!summary) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate metrics summary'
      });
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Failed to get metrics summary', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics summary'
    });
  }
});

// Get historical metrics
router.get('/history', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const type = req.query.type as 'system' | 'application' || 'system';
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24 hours
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : new Date();
    
    // Validate dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }
    
    // Limit to maximum 30 days
    const maxDays = 30 * 24 * 60 * 60 * 1000;
    if (endTime.getTime() - startTime.getTime() > maxDays) {
      return res.status(400).json({
        success: false,
        message: 'Time range cannot exceed 30 days'
      });
    }
    
    const metrics = await monitoringService.getHistoricalMetrics(startTime, endTime, type);
    
    res.json({
      success: true,
      data: {
        metrics,
        type,
        period: { startTime, endTime },
        count: metrics.length
      }
    });
  } catch (error) {
    logger.error('Failed to get historical metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve historical metrics'
    });
  }
});

// Export metrics
router.get('/export', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const format = req.query.format as 'json' | 'csv' || 'json';
    const timeframe = req.query.timeframe as 'hour' | 'day' | 'week' | 'month' || 'day';
    
    const exportData = await monitoringService.exportMetrics(format, timeframe);
    
    const filename = `fortress-panel-metrics-${timeframe}-${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    logger.error('Failed to export metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to export metrics'
    });
  }
});

// Get dashboard data (combined metrics)
router.get('/dashboard', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const [
      latestSystemMetrics,
      latestAppMetrics,
      healthChecks,
      activeAlerts,
      daySummary
    ] = await Promise.all([
      Promise.resolve(monitoringService.getSystemMetrics(1)[0]),
      Promise.resolve(monitoringService.getApplicationMetrics(1)[0]),
      Promise.resolve(monitoringService.getHealthChecks()),
      Promise.resolve(monitoringService.getActiveAlerts()),
      monitoringService.getMetricsSummary('day')
    ]);
    
    res.json({
      success: true,
      data: {
        system: latestSystemMetrics,
        application: latestAppMetrics,
        health: {
          status: healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 
                healthChecks.some(check => check.status === 'unhealthy') ? 'unhealthy' : 'degraded',
          services: healthChecks
        },
        alerts: {
          active: activeAlerts,
          criticalCount: activeAlerts.filter(a => a.level === 'critical').length,
          warningCount: activeAlerts.filter(a => a.level === 'warning').length,
          totalCount: activeAlerts.length
        },
        summary: daySummary,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get dashboard data', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data'
    });
  }
});

// Get performance metrics
router.get('/performance', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const timeframe = req.query.timeframe as 'hour' | 'day' | 'week' | 'month' || 'hour';
    const summary = await monitoringService.getMetricsSummary(timeframe);
    
    if (!summary) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate performance metrics'
      });
    }
    
    // Calculate performance score (0-100)
    const calculateScore = (avg: number, max: number) => {
      return Math.max(0, Math.round(100 - (avg / max) * 100));
    };
    
    const performanceScore = Math.round(
      (calculateScore(summary.system.avgCpuUsage, 100) +
       calculateScore(summary.system.avgMemoryUsage, 100) +
       calculateScore(summary.application.avgResponseTime, 5000) +
       (100 - summary.application.errorRate)) / 4
    );
    
    const performance = {
      score: performanceScore,
      grade: performanceScore >= 90 ? 'A' :
             performanceScore >= 80 ? 'B' :
             performanceScore >= 70 ? 'C' :
             performanceScore >= 60 ? 'D' : 'F',
      cpu: {
        current: summary.system.avgCpuUsage,
        status: summary.system.avgCpuUsage < 70 ? 'good' :
                summary.system.avgCpuUsage < 90 ? 'warning' : 'critical'
      },
      memory: {
        current: summary.system.avgMemoryUsage,
        status: summary.system.avgMemoryUsage < 80 ? 'good' :
                summary.system.avgMemoryUsage < 95 ? 'warning' : 'critical'
      },
      responseTime: {
        current: summary.application.avgResponseTime,
        status: summary.application.avgResponseTime < 1000 ? 'good' :
                summary.application.avgResponseTime < 5000 ? 'warning' : 'critical'
      },
      errorRate: {
        current: summary.application.errorRate,
        status: summary.application.errorRate < 5 ? 'good' :
                summary.application.errorRate < 10 ? 'warning' : 'critical'
      }
    };
    
    res.json({
      success: true,
      data: {
        performance,
        summary,
        timeframe,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance metrics'
    });
  }
});

// Get resource usage breakdown
router.get('/resources', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    const systemMetrics = monitoringService.getSystemMetrics(1)[0];
    const appMetrics = monitoringService.getApplicationMetrics(1)[0];
    
    if (!systemMetrics) {
      return res.status(404).json({
        success: false,
        message: 'No system metrics available'
      });
    }
    
    const resources = {
      system: {
        cpu: {
          total: 100,
          used: systemMetrics.cpu.usage,
          available: 100 - systemMetrics.cpu.usage,
          cores: systemMetrics.cpu.cores,
          loadAverage: systemMetrics.cpu.loadAverage
        },
        memory: {
          total: systemMetrics.memory.total,
          used: systemMetrics.memory.used,
          free: systemMetrics.memory.free,
          cached: systemMetrics.memory.cached,
          usage: systemMetrics.memory.usage
        },
        disk: {
          total: systemMetrics.disk.total,
          used: systemMetrics.disk.used,
          free: systemMetrics.disk.free,
          usage: systemMetrics.disk.usage
        },
        network: {
          interfaces: systemMetrics.network.interfaces,
          connections: systemMetrics.network.connections,
          traffic: {
            in: systemMetrics.network.bytesIn,
            out: systemMetrics.network.bytesOut,
            total: systemMetrics.network.bytesIn + systemMetrics.network.bytesOut
          }
        }
      },
      applications: appMetrics ? {
        count: appMetrics.applications.total,
        running: appMetrics.applications.running,
        stopped: appMetrics.applications.stopped,
        error: appMetrics.applications.error,
        byLanguage: appMetrics.applications.byLanguage,
        resources: {
          memoryUsage: appMetrics.resources.totalMemoryUsage,
          cpuUsage: appMetrics.resources.totalCpuUsage,
          diskUsage: appMetrics.resources.totalDiskUsage
        }
      } : null,
      processes: {
        total: systemMetrics.processes.total,
        running: systemMetrics.processes.running,
        sleeping: systemMetrics.processes.sleeping,
        fortressPanel: systemMetrics.processes.fortressPanel
      }
    };
    
    res.json({
      success: true,
      data: resources,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get resource usage', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource usage'
    });
  }
});

// Get real-time metrics (WebSocket endpoint preparation)
router.get('/realtime', authenticateToken, requirePermission('system.read'), async (req, res) => {
  try {
    // This endpoint can be used for WebSocket connection setup
    // For now, return current metrics with connection info
    const metrics = monitoringService.getSystemMetrics(1)[0];
    const appMetrics = monitoringService.getApplicationMetrics(1)[0];
    
    res.json({
      success: true,
      data: {
        system: metrics,
        application: appMetrics,
        timestamp: new Date().toISOString(),
        websocketUrl: `${req.protocol}://${req.get('host')}/ws/monitoring`
      }
    });
  } catch (error) {
    logger.error('Failed to get real-time metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve real-time metrics'
    });
  }
});

export default router;