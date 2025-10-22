import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseConnection } from '../config/database';
import { RedisConnection } from '../config/redis';
import { config } from '../config';
import { Logger, AppError } from '@fortress-panel/shared';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      sessionId?: string;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string;

    if (!authHeader) {
      throw AppError.unauthorized('Authorization header required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized('Token required');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Check if session exists in Redis
    const redis = RedisConnection.getInstance();
    const sessionData = await redis.getSession(decoded.sessionId);
    
    if (!sessionData || !sessionData.isActive) {
      throw AppError.unauthorized('Session expired or invalid');
    }

    // Verify device fingerprint for security
    if (sessionData.deviceFingerprint && deviceFingerprint !== sessionData.deviceFingerprint) {
      // Log suspicious activity
      const logger = Logger.getInstance();
      logger.warn('Device fingerprint mismatch', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        expectedFingerprint: sessionData.deviceFingerprint,
        providedFingerprint: deviceFingerprint,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      throw AppError.unauthorized('Device verification failed');
    }

    // Check if user is still active
    const db = DatabaseConnection.getInstance().getConnection();
    const user = await db('users')
      .where({ id: decoded.userId, status: 'active' })
      .first();

    if (!user) {
      throw AppError.unauthorized('User account not found or inactive');
    }

    // Update last activity
    await redis.setSession(decoded.sessionId, {
      ...sessionData,
      lastActivity: new Date().toISOString(),
    }, config.security.sessionTimeout);

    // Add user and session info to request
    req.user = user;
    req.sessionId = decoded.sessionId;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Check if session exists in Redis
    const redis = RedisConnection.getInstance();
    const sessionData = await redis.getSession(decoded.sessionId);
    
    if (!sessionData || !sessionData.isActive) {
      return next();
    }

    // Check if user is still active
    const db = DatabaseConnection.getInstance().getConnection();
    const user = await db('users')
      .where({ id: decoded.userId, status: 'active' })
      .first();

    if (user) {
      req.user = user;
      req.sessionId = decoded.sessionId;
    }

    next();
  } catch (error) {
    // Optional auth should not block requests
    next();
  }
};

// Role-based access control
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }

    next();
  };
};

// Permission-based access control
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    try {
      const db = DatabaseConnection.getInstance().getConnection();
      
      // Get user permissions
      const permissions = await db('user_permissions')
        .join('permissions', 'user_permissions.permission_id', 'permissions.id')
        .where('user_permissions.user_id', req.user.id)
        .pluck('permissions.name');

      // Check if user has the required permission
      if (!permissions.includes(permission)) {
        const logger = Logger.getInstance();
        logger.warn('Permission denied', {
          userId: req.user.id,
          requiredPermission: permission,
          userPermissions: permissions,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return next(AppError.forbidden('Permission denied'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Resource ownership verification
export const requireOwnership = (resourceType: string, resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    try {
      const resourceId = req.params[resourceIdParam];
      const db = DatabaseConnection.getInstance().getConnection();

      let resource;
      switch (resourceType) {
        case 'domain':
          resource = await db('domains').where({ id: resourceId, user_id: req.user.id }).first();
          break;
        case 'database':
          resource = await db('databases').where({ id: resourceId, user_id: req.user.id }).first();
          break;
        case 'email_domain':
          resource = await db('mail_domains').where({ id: resourceId, user_id: req.user.id }).first();
          break;
        default:
          return next(AppError.badRequest('Invalid resource type'));
      }

      if (!resource) {
        return next(AppError.forbidden('Resource not found or access denied'));
      }

      // Add resource to request for later use
      (req as any).resource = resource;

      next();
    } catch (error) {
      next(error);
    }
  };
};

// MFA verification middleware
export const requireMFA = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required'));
  }

  // Skip MFA requirement for admin users in certain contexts
  if (req.user.role === 'admin' && req.path.startsWith('/api/system')) {
    return next();
  }

  if (!req.user.mfa_enabled) {
    return next(AppError.forbidden('Multi-factor authentication required'));
  }

  // Check if MFA was verified in this session
  const mfaVerified = req.headers['x-mfa-verified'] === 'true';
  if (!mfaVerified) {
    return next(AppError.forbidden('MFA verification required'));
  }

  next();
};

// Session validation middleware
export const validateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.sessionId) {
    return next(AppError.unauthorized('Session ID required'));
  }

  try {
    const redis = RedisConnection.getInstance();
    const sessionData = await redis.getSession(req.sessionId);

    if (!sessionData) {
      return next(AppError.unauthorized('Session not found'));
    }

    if (!sessionData.isActive) {
      return next(AppError.unauthorized('Session is inactive'));
    }

    // Check session timeout
    const lastActivity = new Date(sessionData.lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes > config.security.sessionTimeout) {
      await redis.deleteSession(req.sessionId);
      return next(AppError.unauthorized('Session expired due to inactivity'));
    }

    // Update last activity
    sessionData.lastActivity = now.toISOString();
    await redis.setSession(req.sessionId, sessionData, config.security.sessionTimeout);

    next();
  } catch (error) {
    next(error);
  }
};

// Admin-only middleware
export const adminOnly = requireRole(['admin']);

// User or admin middleware
export const userOrAdmin = requireRole(['admin', 'user']);

// API rate limiting for authenticated users
export const authenticatedRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next();
  }

  try {
    const redis = RedisConnection.getInstance();
    const key = `api_rate_limit:${req.user.id}`;
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = req.user.role === 'admin' ? 1000 : 100;

    const current = await redis.incrementRateLimit(key, windowMs);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

    if (current > maxRequests) {
      throw AppError.tooManyRequests('Rate limit exceeded');
    }

    next();
  } catch (error) {
    next(error);
  }
};