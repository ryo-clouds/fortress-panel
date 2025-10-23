const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const redis = require('redis');
const { createClient } = redis;

// Import services
const ApplicationManager = require('./services/ApplicationManager');
const MonitoringService = require('./services/MonitoringService');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const applicationManager = new ApplicationManager();
const monitoringService = new MonitoringService();

// Redis client setup
let redisClient = null;

async function initializeRedis() {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'redis',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.warn('⚠️ Redis connection failed, using memory store:', error.message);
    return false;
  }
}

// In-memory fallback
const memoryStore = new Map();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Rate limiting with Redis store
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    store: redisClient ? {
      incr: async (key) => {
        const current = await redisClient.incr(key);
        if (current === 1) {
          await redisClient.expire(key, Math.ceil(windowMs / 1000));
        }
        return current;
      },
      decrement: async (key) => {
        return await redisClient.decr(key);
      },
      resetKey: async (key) => {
        return await redisClient.del(key);
      }
    } : undefined,
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

const limiter = createRateLimit(15 * 60 * 1000, 100, 'Too many requests, please try again later.');
const authLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later.');
const adminLimiter = createRateLimit(15 * 60 * 1000, 20, 'Too many admin requests, please try again later.');

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers middleware
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  next();
});

// JWT Secrets
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-me';

// Enhanced user store with device tracking
const users = new Map();
users.set('admin', {
  id: 1,
  username: 'admin',
  email: 'admin@fortress-panel.local',
  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', // password: admin123
  role: 'admin',
  status: 'active',
  mfa_enabled: false,
  permissions: {
    admin: true,
    users: ['create', 'read', 'update', 'delete'],
    applications: ['create', 'read', 'update', 'delete'],
    databases: ['create', 'read', 'update', 'delete'],
    domains: ['create', 'read', 'update', 'delete'],
    monitoring: ['read'],
    system: ['read']
  },
  created_at: new Date().toISOString(),
  last_login: null,
  login_attempts: 0,
  locked_until: null
});

// Session management functions
class SessionManager {
  static async createSession(userId, deviceInfo, ipAddress, userAgent) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    
    const sessionData = {
      id: sessionId,
      userId,
      refreshToken,
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      lastActivity: new Date().toISOString()
    };

    if (redisClient) {
      await redisClient.hSet(`session:${sessionId}`, sessionData);
      await redisClient.expireAt(`session:${sessionId}`, Math.floor(expiresAt.getTime() / 1000));
    } else {
      memoryStore.set(`session:${sessionId}`, sessionData);
    }

    return { sessionId, refreshToken, expiresAt };
  }

  static async getSession(sessionId) {
    if (redisClient) {
      const sessionData = await redisClient.hGetAll(`session:${sessionId}`);
      return Object.keys(sessionData).length > 0 ? sessionData : null;
    } else {
      return memoryStore.get(`session:${sessionId}`) || null;
    }
  }

  static async updateSessionActivity(sessionId) {
    const now = new Date().toISOString();
    if (redisClient) {
      await redisClient.hSet(`session:${sessionId}`, 'lastActivity', now);
    } else {
      const session = memoryStore.get(`session:${sessionId}`);
      if (session) {
        session.lastActivity = now;
        memoryStore.set(`session:${sessionId}`, session);
      }
    }
  }

  static async deleteSession(sessionId) {
    if (redisClient) {
      await redisClient.del(`session:${sessionId}`);
    } else {
      memoryStore.delete(`session:${sessionId}`);
    }
  }

  static async getUserSessions(userId) {
    const sessions = [];
    
    if (redisClient) {
      const keys = await redisClient.keys('session:*');
      for (const key of keys) {
        const session = await redisClient.hGetAll(key);
        if (session.userId === userId && session.isActive === 'true') {
          sessions.push(session);
        }
      }
    } else {
      for (const [key, session] of memoryStore.entries()) {
        if (session.userId === userId && session.isActive) {
          sessions.push(session);
        }
      }
    }
    
    return sessions;
  }
}

// Audit logging
class AuditLogger {
  static async log(userId, action, resourceType, resourceId, oldValues, newValues, ipAddress, userAgent) {
    const logEntry = {
      id: crypto.randomUUID(),
      userId,
      action,
      resourceType,
      resourceId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    };

    if (redisClient) {
      await redisClient.lPush('audit_logs', JSON.stringify(logEntry));
      await redisClient.lTrim('audit_logs', 0, 9999); // Keep last 10k logs
    } else {
      if (!memoryStore.has('audit_logs')) {
        memoryStore.set('audit_logs', []);
      }
      const logs = memoryStore.get('audit_logs');
      logs.unshift(logEntry);
      if (logs.length > 10000) logs.pop();
    }

    console.log(`📝 [AUDIT] ${action} by user ${userId} on ${resourceType}:${resourceId}`);
  }
}

// Helper functions
function generateAccessToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role,
      sessionId: crypto.randomBytes(16).toString('hex')
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function getDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const forwardedFor = req.headers['x-forwarded-for'] || '';
  
  return crypto.createHash('sha256')
    .update(`${userAgent}-${acceptLanguage}-${acceptEncoding}-${forwardedFor}`)
    .digest('hex');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add session validation
    SessionManager.getSession(decoded.sessionId).then(session => {
      if (!session || session.isActive !== 'true' || new Date(session.expiresAt) < new Date()) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }
      
      SessionManager.updateSessionActivity(decoded.sessionId);
      req.user = decoded;
      req.sessionId = decoded.sessionId;
      next();
    }).catch(() => {
      res.status(403).json({ error: 'Invalid session' });
    });
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function hasPermission(userRole, permission, customPermissions = null) {
  const user = users.get(userRole);
  if (!user) return false;
  
  const permissions = customPermissions || user.permissions;
  if (permissions.admin) return true;
  
  const [resource, action] = permission.split(':');
  return permissions[resource]?.includes(action) || false;
}

// Middleware to log API calls
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📡 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Routes

// Health check with system status
app.get('/health', async (req, res) => {
  const latestMetrics = monitoringService.getLatestMetrics();
  const healthStatus = monitoringService.getHealthStatus();
  
  const redisStatus = redisClient ? {
    connected: redisClient.isOpen,
    type: 'Redis'
  } : {
    connected: false,
    type: 'Memory Store'
  };

  res.json({ 
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Fortress Panel API',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: redisStatus,
    metrics: latestMetrics,
    health_checks: healthStatus.checks,
    active_sessions: redisClient ? 
      await redisClient.keys('session:*').then(keys => keys.length) : 
      Array.from(memoryStore.keys()).filter(k => k.startsWith('session:')).length
  });
});

// Basic status
app.get('/api/v1/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'Fortress Panel API is running',
    version: '1.0.0',
    features: {
      authentication: true,
      authorization: true,
      rate_limiting: true,
      security_headers: true,
      session_management: true,
      application_deployment: true,
      monitoring: true,
      audit_logging: true
    }
  });
});

// Authentication routes (from previous implementation)
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password, rememberMe = false, deviceFingerprint } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.get(username);
    if (!user) {
      await AuditLogger.log(null, 'login_failed', 'auth', null, null, { reason: 'user_not_found' }, req.ip, req.headers['user-agent']);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked due to multiple failed attempts' });
    }

    if (user.status !== 'active') {
      await AuditLogger.log(user.id, 'login_failed', 'auth', null, null, { reason: 'account_inactive' }, req.ip, req.headers['user-agent']);
      return res.status(401).json({ error: 'Account is not active' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      user.login_attempts = (user.login_attempts || 0) + 1;
      
      if (user.login_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      
      await AuditLogger.log(user.id, 'login_failed', 'auth', null, null, { reason: 'invalid_password', attempts: user.login_attempts }, req.ip, req.headers['user-agent']);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.login_attempts = 0;
    user.locked_until = null;
    user.last_login = new Date().toISOString();

    const deviceInfo = {
      fingerprint: deviceFingerprint || getDeviceFingerprint(req),
      platform: req.headers['sec-ch-ua-platform'] || 'unknown',
      mobile: req.headers['sec-ch-ua-mobile'] === '?1'
    };

    const { sessionId, refreshToken, expiresAt } = await SessionManager.createSession(
      user.id,
      deviceInfo,
      req.ip,
      req.headers['user-agent']
    );

    const accessToken = generateAccessToken(user);

    await AuditLogger.log(user.id, 'login_success', 'auth', sessionId, null, { 
      rememberMe, 
      deviceInfo 
    }, req.ip, req.headers['user-agent']);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mfa_enabled: user.mfa_enabled,
        permissions: user.permissions,
        last_login: user.last_login
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        session_id: sessionId,
        token_type: 'Bearer',
        expires_in: 900,
        expires_at: expiresAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/logout', authenticateToken, async (req, res) => {
  try {
    await SessionManager.deleteSession(req.sessionId);
    await AuditLogger.log(req.user.id, 'logout', 'auth', req.sessionId, null, null, req.ip, req.headers['user-agent']);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = users.get(req.user.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sessions = await SessionManager.getUserSessions(user.id);

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      mfa_enabled: user.mfa_enabled,
      permissions: user.permissions,
      last_login: user.last_login,
      active_sessions: sessions.length
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Application management routes
app.post('/api/v1/applications', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'applications:create')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const appData = req.body;
    const application = await applicationManager.createApplication(req.user.id, appData);
    
    await AuditLogger.log(req.user.id, 'application_created', 'application', application.id, null, application, req.ip, req.headers['user-agent']);

    res.status(201).json({
      message: 'Application created successfully',
      application
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/applications', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'applications:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const applications = applicationManager.getApplicationsByUser(req.user.id);
    
    res.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/applications/:appId/deploy', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'applications:update')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { appId } = req.params;
    const application = await applicationManager.deployApplication(appId);
    
    await AuditLogger.log(req.user.id, 'application_deployed', 'application', appId, null, { status: application.status }, req.ip, req.headers['user-agent']);

    res.json({
      message: 'Application deployed successfully',
      application
    });
  } catch (error) {
    console.error('Deploy application error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/applications/:appId/stop', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'applications:update')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { appId } = req.params;
    const application = await applicationManager.stopApplication(appId);
    
    await AuditLogger.log(req.user.id, 'application_stopped', 'application', appId, null, { status: application.status }, req.ip, req.headers['user-agent']);

    res.json({
      message: 'Application stopped successfully',
      application
    });
  } catch (error) {
    console.error('Stop application error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/v1/applications/:appId', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'applications:delete')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { appId } = req.params;
    const result = await applicationManager.deleteApplication(appId);
    
    await AuditLogger.log(req.user.id, 'application_deleted', 'application', appId, null, null, req.ip, req.headers['user-agent']);

    res.json(result);
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/applications/:appId/logs', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'applications:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { appId } = req.params;
    const lines = parseInt(req.query.lines) || 100;
    const logs = await applicationManager.getApplicationLogs(appId, lines);
    
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/applications/:appId/stats', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'applications:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { appId } = req.params;
    const stats = await applicationManager.getApplicationStats(appId);
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Monitoring routes
app.get('/api/v1/monitoring/metrics', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'monitoring:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const limit = parseInt(req.query.limit) || 100;
    const metrics = monitoringService.getMetricsHistory(limit);
    
    res.json({ metrics });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/monitoring/health', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'monitoring:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const healthStatus = monitoringService.getHealthStatus();
    
    res.json(healthStatus);
  } catch (error) {
    console.error('Get health status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/monitoring/alerts', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'monitoring:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const severity = req.query.severity;
    
    let alerts;
    if (severity) {
      alerts = monitoringService.getAlertsBySeverity(severity);
    } else {
      alerts = monitoringService.getAlerts(limit);
    }
    
    res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/v1/monitoring/alerts', authenticateToken, adminLimiter, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'system:update')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = monitoringService.clearAlerts();
    
    await AuditLogger.log(req.user.id, 'alerts_cleared', 'monitoring', null, null, null, req.ip, req.headers['user-agent']);
    
    res.json(result);
  } catch (error) {
    console.error('Clear alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/monitoring/report', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'monitoring:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const timeRange = req.query.range || '24h';
    const report = monitoringService.generateReport(timeRange);
    
    res.json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// System stats route
app.get('/api/v1/system/stats', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'system:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const activeSessions = redisClient ? 
      await redisClient.keys('session:*').then(keys => keys.length) : 
      Array.from(memoryStore.keys()).filter(k => k.startsWith('session:')).length;

    const latestMetrics = monitoringService.getLatestMetrics();
    const applications = applicationManager.getApplicationsByUser(req.user.id);

    const stats = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        node_version: process.version,
        metrics: latestMetrics
      },
      users: {
        total: users.size,
        active: Array.from(users.values()).filter(u => u.status === 'active').length,
        locked: Array.from(users.values()).filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length
      },
      sessions: {
        active: activeSessions,
        total_created: activeSessions
      },
      applications: {
        total: applications.length,
        active: applications.filter(a => a.status === 'active').length,
        building: applications.filter(a => a.status === 'building').length,
        stopped: applications.filter(a => a.status === 'stopped').length,
        error: applications.filter(a => a.status === 'error').length
      },
      security: {
        failed_attempts: Array.from(users.values()).reduce((sum, u) => sum + (u.login_attempts || 0), 0),
        mfa_enabled: Array.from(users.values()).filter(u => u.mfa_enabled).length
      },
      database: redisClient ? {
        type: 'Redis',
        connected: redisClient.isOpen,
        info: 'Redis cluster active'
      } : {
        type: 'Memory Store',
        connected: true,
        info: 'Fallback memory storage'
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize and start server
async function startServer() {
  await initializeRedis();
  await applicationManager.initialize();
  
  // Start monitoring collection
  await monitoringService.collectSystemMetrics();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fortress Panel API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API status: http://localhost:${PORT}/api/v1/status`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth/*`);
    console.log(`📱 Applications: http://localhost:${PORT}/api/v1/applications`);
    console.log(`📈 Monitoring: http://localhost:${PORT}/api/v1/monitoring/*`);
    console.log(`⚙️  System stats: http://localhost:${PORT}/api/v1/system/stats`);
    console.log(`📝 Default admin login: admin / admin123`);
    console.log(`💾 Session storage: ${redisClient ? 'Redis' : 'Memory Store'}`);
    console.log(`🔍 Monitoring: Active`);
    console.log(`🚀 Application Deployment: Ready`);
  });
}

startServer().catch(console.error);