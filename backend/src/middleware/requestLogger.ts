import { Request, Response, NextFunction } from 'express';
import { Logger } from '@fortress-panel/shared';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const logger = Logger.getInstance();
  const start = Date.now();
  const { method, originalUrl, ip, headers } = req;
  
  // Mask sensitive headers
  const sanitizedHeaders = { ...headers };
  delete sanitizedHeaders.authorization;
  delete sanitizedHeaders.cookie;
  
  // Log request
  logger.info('Incoming request', {
    method,
    url: originalUrl,
    ip,
    userAgent: headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    logger.info('Request completed', {
      method,
      url: originalUrl,
      ip,
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};