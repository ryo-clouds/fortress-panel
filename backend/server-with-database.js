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

// Import services and database
const ApplicationManager = require('./services/ApplicationManager');
const MonitoringService = require('./services/MonitoringService');
const { DatabaseSetup, db } = require('./database-setup');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database and services
let redisClient = null;
let isDatabaseReady = false;

async function initializeServices() {
  try {
    console.log('🚀 Initializing Fortress Panel services...');
    
    // Initialize database
    await DatabaseSetup.initialize();
    isDatabaseReady = true;
    console.log('✅ Database initialized successfully');
    
    // Initialize Redis
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
    } catch (error) {
      console.warn('⚠️ Redis connection failed, using memory store:', error.message);
      redisClient = null;
    }
    
    // Initialize services
    await applicationManager.initialize();
    monitoringService.initializeMetrics();
    
    console.log('🎉 All services initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize services:', error.message);
    return false;
  }
}

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

    // Store in database
    try {
      await db('sessions').insert({
        id: sessionId,
        user_id: userId,
        refresh_token: refreshToken,
        device_info: JSON.stringify(deviceInfo),
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        is_active: true
      });
    } catch (error) {
      console.error('Failed to store session in database:', error);
      throw error;
    }

    return { sessionId, refreshToken, expiresAt };
  }

  static async getSession(sessionId) {
    try {
      const session = await db('sessions')
        .where({ id: sessionId, is_active: true })
        .andWhere('expires_at', '>', new Date())
        .first();
      
      return session || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  static async updateSessionActivity(sessionId) {
    try {
      await db('sessions')
        .where({ id: sessionId })
        .update({ 
          last_activity: new Date() 
        });
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  static async deleteSession(sessionId) {
    try {
      await db('sessions')
        .where({ id: sessionId })
        .update({ is_active: false });
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  static async getUserSessions(userId) {
    try {
      const sessions = await db('sessions')
        .where({ user_id: userId, is_active: true })
        .andWhere('expires_at', '>', new Date())
        .select();
      
      return sessions || [];
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }
}

// Audit logging
class AuditLogger {
  static async log(userId, action, resourceType, resourceId, oldValues, newValues, ipAddress, userAgent) {
    try {
      await db('audit_logs').insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date()
      });
      
      console.log(`📝 [AUDIT] ${action} by user ${userId} on ${resourceType}:${resourceId}`);
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
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
      if (!session) {
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

function hasPermission(userRole, permission) {
  // For now, admin has all permissions
  if (userRole === 'admin') return true;
  
  // In a real implementation, you would check the user's permissions from database
  const permissions = {
    'admin': ['create', 'read', 'update', 'delete'],
    'user': ['read'],
    'applications': ['create', 'read', 'update', 'delete'],
    'monitoring': ['read']
  };
  
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
  
  // Check database connection
  let dbStatus = 'connected';
  try {
    await db.raw('SELECT 1');
  } catch (error) {
    dbStatus = 'disconnected';
  }
  
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
    database_ready: isDatabaseReady,
    database: {
      status: dbStatus,
      type: 'MariaDB'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: redisStatus,
    metrics: latestMetrics,
    health_checks: healthStatus.checks,
    active_sessions: redisClient ? 
      await redisClient.keys('session:*').then(keys => keys.length) : 
      0
  });
});

// Basic status
app.get('/api/v1/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'Fortress Panel API is running',
    version: '1.0.0',
    database_ready: isDatabaseReady,
    features: {
      authentication: true,
      authorization: true,
      rate_limiting: true,
      security_headers: true,
      session_management: true,
      application_deployment: true,
      monitoring: true,
      audit_logging: true,
      database_integration: true
    }
  });
});

// Authentication routes
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password, rememberMe = false, deviceFingerprint } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user from database
    const user = await db('users')
      .where({ username: username, status: 'active' })
      .first();

    if (!user) {
      await AuditLogger.log(null, 'login_failed', 'auth', null, null, { reason: 'user_not_found' }, req.ip, req.headers['user-agent']);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked due to multiple failed attempts' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      // Update login attempts
      await db('users')
        .where({ id: user.id })
        .update({ 
          login_attempts: db.raw('login_attempts + 1'),
          locked_until: db.raw('CASE WHEN login_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE NULL END')
        });
      
      await AuditLogger.log(user.id, 'login_failed', 'auth', null, null, { reason: 'invalid_password' }, req.ip, req.headers['user-agent']);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await db('users')
      .where({ id: user.id })
      .update({ 
        login_attempts: 0,
        locked_until: null,
        last_login: new Date()
      });

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
        last_login: new Date()
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
    const user = await db('users')
      .where({ id: req.user.id })
      .first();
    
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
      last_login: user.last_login,
      active_sessions: sessions.length
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users management routes
app.get('/api/v1/users', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'admin:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const users = await db('users')
      .select('id', 'username', 'email', 'role', 'status', 'mfa_enabled', 'created_at', 'last_login', 'login_attempts', 'locked_until');

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
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
    
    // Store in database
    await db('applications').insert({
      user_id: req.user.id,
      name: application.name,
      type: application.type,
      version: application.version,
      domain: application.domain || null,
      status: application.status,
      path: application.path,
      document_root: application.documentRoot || application.path,
      environment_vars: JSON.stringify(application.environmentVars || {}),
      port: application.externalPort,
      container_id: application.containerName || null,
      resource_limits: JSON.stringify(application.resourceLimits || {}),
      created_at: new Date(),
      updated_at: new Date()
    });
    
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

    const applications = await db('applications')
      .where({ user_id: req.user.id })
      .select();

    res.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

app.get('/api/v1/system/stats', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user.username, 'system:read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [totalUsers, activeUsers, totalApps, activeApps] = await Promise.all([
      db('users').count('* as total'),
      db('users').where({ status: 'active' }).count('* as total'),
      db('applications').count('* as total'),
      db('applications').where({ status: 'active' }).count('* as total')
    ]);

    const stats = {
      users: {
        total: totalUsers[0].total,
        active: activeUsers[0].total
      },
      applications: {
        total: totalApps[0].total,
        active: activeApps[0].total
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        node_version: process.version
      },
      database: {
        ready: isDatabaseReady,
        status: 'connected'
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
  try {
    const servicesInitialized = await initializeServices();
    
    if (!servicesInitialized) {
      console.error('❌ Failed to initialize services. Exiting...');
      process.exit(1);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Fortress Panel API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API status: http://localhost:${PORT}/api/v1/status`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth/*`);
      console.log(`👥 Users: http://localhost:${PORT}/api/v1/users`);
      console.log(`📱 Applications: http://localhost:${PORT}/api/v1/applications`);
      console.log(`📈 Monitoring: http://localhost:${PORT}/api/v1/monitoring/*`);
      console.log(`⚙️  System: http://localhost:${PORT}/api/v1/system/stats`);
      console.log(`📝 Default admin login: admin / admin123`);
      console.log(`🗄️  Database: ${isDatabaseReady ? 'MariaDB Connected' : 'Initializing...'}`);
      console.log(`💾 Session storage: ${redisClient ? 'Redis' : 'Memory Store'}`);
      console.log(`🔍 Monitoring: Active`);
      console.log(`🚀 Application Deployment: Ready`);
      console.log(`🛡️  Security: Full enterprise-grade protection enabled`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();