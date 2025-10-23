const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-me';

// In-memory session store (would use Redis in production)
const refreshTokens = new Map();
const users = new Map();

// Default admin user (will be replaced by database)
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
  }
});

// Helper functions
function generateAccessToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function hasPermission(userRole, permission) {
  const permissions = users.get(user.username)?.permissions;
  if (!permissions) return false;
  if (permissions.admin) return true;
  
  const [resource, action] = permission.split(':');
  return permissions[resource]?.includes(action) || false;
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Fortress Panel API'
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
      security_headers: true
    }
  });
});

// Authentication routes
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password, rememberMe = false } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    
    // Store refresh token
    refreshTokens.set(refreshToken, {
      userId: user.id,
      username: user.username,
      expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000))
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mfa_enabled: user.mfa_enabled,
        permissions: user.permissions
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 900 // 15 minutes
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const tokenData = refreshTokens.get(refresh_token);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      refreshTokens.delete(refresh_token);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = users.get(tokenData.username);
    if (!user || user.status !== 'active') {
      refreshTokens.delete(refresh_token);
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();

    // Remove old token and store new one
    refreshTokens.delete(refresh_token);
    refreshTokens.set(newRefreshToken, {
      userId: user.id,
      username: user.username,
      expiresAt: tokenData.expiresAt
    });

    res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 900
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/logout', authenticateToken, (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (refresh_token) {
      refreshTokens.delete(refresh_token);
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      mfa_enabled: user.mfa_enabled,
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MFA Setup
app.post('/api/v1/auth/mfa/setup', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
      name: `Fortress Panel (${user.email})`,
      issuer: 'Fortress Panel',
      length: 32
    });

    res.json({
      secret: secret.base32,
      qr_code_url: secret.otpauth_url,
      manual_entry_key: secret.base32
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/mfa/enable', authenticateToken, (req, res) => {
  try {
    const { secret, token } = req.body;

    if (!secret || !token) {
      return res.status(400).json({ error: 'Secret and token required' });
    }

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const user = users.get(req.user.username);
    if (user) {
      user.mfa_enabled = true;
      user.mfa_secret = secret;
    }

    res.json({ message: 'MFA enabled successfully' });
  } catch (error) {
    console.error('MFA enable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes examples
app.get('/api/v1/users', authenticateToken, (req, res) => {
  if (!hasPermission(req.user, 'users:read')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const userList = Array.from(users.values()).map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    mfa_enabled: user.mfa_enabled,
    created_at: user.created_at
  }));

  res.json({ users: userList });
});

app.get('/api/v1/dashboard/stats', authenticateToken, (req, res) => {
  if (!hasPermission(req.user, 'dashboard:read')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  res.json({
    users: users.size,
    active_sessions: refreshTokens.size,
    system_status: 'healthy',
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    version: '1.0.0'
  });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fortress Panel API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API status: http://localhost:${PORT}/api/v1/status`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth/*`);
  console.log(`📝 Default admin login: admin / admin123`);
});