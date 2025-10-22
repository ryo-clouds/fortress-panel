import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Logger, SecurityUtils } from '@fortress-panel/shared';
import { config } from './config';
import { DatabaseConnection } from './config/database';
import { RedisConnection } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { securityHeaders } from './middleware/securityHeaders';
import { authMiddleware } from './middleware/auth';
import { validationMiddleware } from './middleware/validation';

// Import routes
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import domainRoutes from './modules/domains/routes';
import databaseRoutes from './modules/databases/routes';
import emailRoutes from './modules/email/routes';
import securityRoutes from './modules/security/routes';
import systemRoutes from './modules/system/routes';
import apiRoutes from './modules/api/routes';
import languageRoutes from './routes/languages';
import monitoringRoutes from './routes/monitoring';

class FortressPanel {
  public app: express.Application;
  private server: any;
  private logger = Logger.getInstance();

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.get('cors.allowedOrigins'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Device-Fingerprint'
      ],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip + ':' + (req.headers['user-agent'] || '');
      },
    });
    this.app.use('/api', limiter);

    // Custom rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      skipSuccessfulRequests: true,
    });
    this.app.use('/api/auth', authLimiter);

    // Request logging
    this.app.use(requestLogger);

    // Security headers middleware
    this.app.use(securityHeaders);

    // API Key validation for API routes
    this.app.use('/api/v1', this.validateApiKey.bind(this));
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version,
        environment: config.get('env'),
      });
    });

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        name: 'Fortress Panel API',
        version: '1.0.0',
        description: 'High-Security Control Panel API',
        documentation: '/api/swagger',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          domains: '/api/domains',
          databases: '/api/databases',
          email: '/api/email',
          security: '/api/security',
          system: '/api/system',
          api: '/api/api',
          languages: '/api/languages',
          monitoring: '/api/monitoring'
        }
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', authMiddleware, userRoutes);
    this.app.use('/api/domains', authMiddleware, domainRoutes);
    this.app.use('/api/databases', authMiddleware, databaseRoutes);
    this.app.use('/api/email', authMiddleware, emailRoutes);
    this.app.use('/api/security', authMiddleware, securityRoutes);
    this.app.use('/api/system', authMiddleware, systemRoutes);
    this.app.use('/api/api', authMiddleware, apiRoutes);
    this.app.use('/api/languages', authMiddleware, languageRoutes);
    this.app.use('/api/monitoring', authMiddleware, monitoringRoutes);

    // Proxy for user applications (multi-language support)
    this.setupApplicationProxy();

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`
        }
      });
    });
  }

  private setupApplicationProxy(): void {
    // PHP applications
    this.app.use('/apps/php/:domain', createProxyMiddleware({
      target: 'http://localhost:9000',
      changeOrigin: true,
      pathRewrite: (path, req) => {
        const domain = req.params?.domain;
        return path.replace(`/apps/php/${domain}`, '');
      },
      onError: (err, req, res) => {
        this.logger.error('PHP proxy error', { error: err.message, url: req.url });
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Application server unavailable'
          }
        });
      },
    }));

    // Node.js applications
    this.app.use('/apps/node/:domain', createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: (path, req) => {
        const domain = req.params?.domain;
        return path.replace(`/apps/node/${domain}`, '');
      },
      onError: (err, req, res) => {
        this.logger.error('Node.js proxy error', { error: err.message, url: req.url });
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Application server unavailable'
          }
        });
      },
    }));

    // Python applications
    this.app.use('/apps/python/:domain', createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      pathRewrite: (path, req) => {
        const domain = req.params?.domain;
        return path.replace(`/apps/python/${domain}`, '');
      },
      onError: (err, req, res) => {
        this.logger.error('Python proxy error', { error: err.message, url: req.url });
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Application server unavailable'
          }
        });
      },
    }));

    // Ruby applications
    this.app.use('/apps/ruby/:domain', createProxyMiddleware({
      target: 'http://localhost:9292',
      changeOrigin: true,
      pathRewrite: (path, req) => {
        const domain = req.params?.domain;
        return path.replace(`/apps/ruby/${domain}`, '');
      },
      onError: (err, req, res) => {
        this.logger.error('Ruby proxy error', { error: err.message, url: req.url });
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Application server unavailable'
          }
        });
      },
    }));

    // Go applications
    this.app.use('/apps/go/:domain', createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: (path, req) => {
        const domain = req.params?.domain;
        return path.replace(`/apps/go/${domain}`, '');
      },
      onError: (err, req, res) => {
        this.logger.error('Go proxy error', { error: err.message, url: req.url });
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Application server unavailable'
          }
        });
      },
    }));

    // Java applications
    this.app.use('/apps/java/:domain', createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: (path, req) => {
        const domain = req.params?.domain;
        return path.replace(`/apps/java/${domain}`, '');
      },
      onError: (err, req, res) => {
        this.logger.error('Java proxy error', { error: err.message, url: req.url });
        res.status(502).json({
          success: false,
          error: {
            code: 'PROXY_ERROR',
            message: 'Application server unavailable'
          }
        });
      },
    }));
  }

  private async validateApiKey(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return next();
    }

    try {
      // Validate API key logic here
      // This would involve checking the database for valid API keys
      const isValid = await this.validateApiKeyInDatabase(apiKey);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or expired API key'
          }
        });
      }

      // Add user context to request
      req.user = await this.getUserByApiKey(apiKey);
      next();
    } catch (error) {
      this.logger.error('API key validation error', { error: error.message, apiKey: apiKey.substring(0, 8) + '...' });
      return res.status(500).json({
        success: false,
        error: {
          code: 'API_KEY_VALIDATION_ERROR',
          message: 'Error validating API key'
        }
      });
    }
  }

  private async validateApiKeyInDatabase(apiKey: string): Promise<boolean> {
    // Implementation would query the database
    // For now, return false as placeholder
    return false;
  }

  private async getUserByApiKey(apiKey: string): Promise<any> {
    // Implementation would query the database for user associated with API key
    // For now, return null as placeholder
    return null;
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connections
      await DatabaseConnection.initialize();
      await RedisConnection.initialize();
      
      // Initialize monitoring service
      const { MonitoringService } = await import('./services/MonitoringService');
      MonitoringService.getInstance();

      // Start server
      const port = config.get('server.port');
      this.server = this.app.listen(port, () => {
        this.logger.info(`🚀 Fortress Panel API Server started on port ${port}`);
        this.logger.info(`📚 API Documentation: http://localhost:${port}/api/docs`);
        this.logger.info(`🏥 Health Check: http://localhost:${port}/health`);
        this.logger.info(`🔒 Environment: ${config.get('env')}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);
      
      // Stop accepting new connections
      if (this.server) {
        this.server.close(async () => {
          this.logger.info('HTTP server closed');
          
          // Close database connections
          await DatabaseConnection.close();
          await RedisConnection.close();
          
          this.logger.info('Graceful shutdown completed');
          process.exit(0);
        });
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the application
const fortressPanel = new FortressPanel();
fortressPanel.start().catch((error) => {
  console.error('Failed to start Fortress Panel:', error);
  process.exit(1);
});

export default fortressPanel;