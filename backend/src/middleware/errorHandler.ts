import { Request, Response, NextFunction } from 'express';
import { Logger, AppError } from '@fortress-panel/shared';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = Logger.getInstance();

  // Log error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Handle different types of errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        path: req.originalUrl,
      },
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = error.message.split(',').map((err: string) => err.trim());
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: validationErrors,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        path: req.originalUrl,
      },
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        path: req.originalUrl,
      },
    });
    return;
  }

  // Handle JWT expired error
  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        path: req.originalUrl,
      },
    });
    return;
  }

  // Handle database errors
  if (error.name === 'QueryFailedError' || error.message.includes('database')) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        path: req.originalUrl,
      },
    });
    return;
  }

  // Handle rate limiting errors
  if (error.message.includes('Too many requests')) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        path: req.originalUrl,
      },
    });
    return;
  }

  // Handle multer (file upload) errors
  if (error.name === 'MulterError') {
    let message = 'File upload error';
    if (error.message.includes('File too large')) {
      message = 'File size exceeds limit';
    } else if (error.message.includes('Unexpected field')) {
      message = 'Unexpected field in file upload';
    }
    
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        path: req.originalUrl,
      },
    });
    return;
  }

  // Default error handler
  const statusCode = 500;
  const message = config.env === 'production' 
    ? 'Internal server error' 
    : error.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      ...(config.env !== 'production' && { stack: error.stack }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      path: req.originalUrl,
    },
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      path: req.originalUrl,
    },
  });
};

import { config } from '../config';