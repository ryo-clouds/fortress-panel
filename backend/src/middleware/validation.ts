import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AppError } from '@fortress-panel/shared';

// Generic validation middleware
export const validateRequest = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => {
        return `${error.param}: ${error.msg}`;
      });

      return next(AppError.badRequest(`Validation failed: ${errorMessages.join(', ')}`));
    }

    next();
  };
};

// Common validation schemas
export const commonValidations = {
  id: [
    param('id')
      .notEmpty()
      .withMessage('ID is required')
      .isUUID(4)
      .withMessage('Invalid ID format'),
  ],

  email: [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format')
      .isLength({ min: 1, max: 254 })
      .withMessage('Email must be between 1 and 254 characters'),
  ],

  password: [
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  ],

  username: [
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  ],

  domain: [
    body('domain')
      .notEmpty()
      .withMessage('Domain is required')
      .isLength({ min: 1, max: 253 })
      .withMessage('Domain must be between 1 and 253 characters')
      .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/)
      .withMessage('Invalid domain format'),
  ],

  optionalDomain: [
    body('domain')
      .optional()
      .isLength({ min: 1, max: 253 })
      .withMessage('Domain must be between 1 and 253 characters')
      .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/)
      .withMessage('Invalid domain format'),
  ],

  phoneNumber: [
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Invalid phone number format'),
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sort')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],

  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format'),
  ],

  ipAddress: [
    body('ip')
      .isIP()
      .withMessage('Invalid IP address format'),
  ],

  port: [
    body('port')
      .isInt({ min: 1, max: 65535 })
      .withMessage('Port must be between 1 and 65535'),
  ],

  fileName: [
    body('fileName')
      .notEmpty()
      .withMessage('File name is required')
      .matches(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/)
      .withMessage('Invalid file name format'),
  ],

  programmingLanguage: [
    body('language')
      .isIn(['php', 'nodejs', 'python', 'ruby', 'go', 'java', 'static'])
      .withMessage('Invalid programming language'),
  ],

  environment: [
    body('environment')
      .isIn(['development', 'staging', 'production'])
      .withMessage('Invalid environment'),
  ],

  permission: [
    body('permission')
      .notEmpty()
      .withMessage('Permission is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Permission must be between 1 and 100 characters'),
  ],

  searchQuery: [
    query('q')
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage('Search query must be between 1 and 500 characters')
      .escape(),
  ],
};

// Specific validation schemas
export const userValidations = {
  create: [
    ...commonValidations.username,
    ...commonValidations.email,
    ...commonValidations.password,
    body('firstName')
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('role')
      .isIn(['admin', 'user', 'reseller'])
      .withMessage('Invalid user role'),
  ],

  update: [
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
  ],

  login: [
    body('username')
      .notEmpty()
      .withMessage('Username is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  passwordChange: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 12 })
      .withMessage('New password must be at least 12 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain uppercase, lowercase, number, and special character'),
    body('confirmPassword')
      .custom((value: string, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      }),
  ],
};

export const domainValidations = {
  create: [
    ...commonValidations.domain,
    body('documentRoot')
      .notEmpty()
      .withMessage('Document root is required')
      .isLength({ min: 1, max: 255 })
      .withMessage('Document root must be between 1 and 255 characters'),
    ...commonValidations.programmingLanguage,
    ...commonValidations.environment,
    body('aliases')
      .optional()
      .isArray()
      .custom((aliases: string[]) => {
        if (aliases && aliases.length > 50) {
          throw new Error('Maximum 50 aliases allowed');
        }
        return true;
      }),
  ],

  update: [
    body('documentRoot')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('Document root must be between 1 and 255 characters'),
    body('aliases')
      .optional()
      .isArray(),
  ],
};

export const databaseValidations = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('Database name is required')
      .isLength({ min: 1, max: 64 })
      .withMessage('Database name must be between 1 and 64 characters')
      .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
      .withMessage('Database name must start with a letter and contain only letters, numbers, and underscores'),
    body('type')
      .isIn(['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'])
      .withMessage('Invalid database type'),
    body('host')
      .notEmpty()
      .withMessage('Database host is required'),
    body('port')
      .isInt({ min: 1, max: 65535 })
      .withMessage('Port must be between 1 and 65535'),
    body('username')
      .notEmpty()
      .withMessage('Database username is required'),
    body('password')
      .notEmpty()
      .withMessage('Database password is required'),
    body('maxSize')
      .isInt({ min: 1 })
      .withMessage('Max size must be a positive integer'),
  ],
};

export const emailValidations = {
  create: [
    body('domain')
      .notEmpty()
      .withMessage('Email domain is required'),
    body('quota')
      .isInt({ min: 1 })
      .withMessage('Quota must be a positive integer'),
  ],
};

export const apiKeyValidations = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('API key name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name must be between 1 and 100 characters'),
    body('permissions')
      .isArray()
      .custom((permissions: string[]) => {
        if (permissions && permissions.length === 0) {
          throw new Error('At least one permission is required');
        }
        return true;
      }),
    body('rateLimit')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Rate limit must be between 1 and 10000'),
    body('allowedIPs')
      .optional()
      .isArray()
      .custom((ips: string[]) => {
        if (ips) {
          for (const ip of ips) {
            if (!require('ip').isV4Format(ip) && !require('ip').isV6Format(ip)) {
              throw new Error(`Invalid IP address: ${ip}`);
            }
          }
        }
        return true;
      }),
  ],
};

// Custom validators
export const validatePasswordStrength = (password: string): boolean => {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return password.length >= minLength &&
         hasUpperCase &&
         hasLowerCase &&
         hasNumbers &&
         hasSpecialChar;
};

export const validateDomainOwnership = async (domain: string, userId: string): Promise<boolean> => {
  // This would typically check against a database
  // For now, just return true as placeholder
  return true;
};

export const validateResourceQuota = async (
  userId: string, 
  resourceType: string, 
  resourceCount: number
): Promise<boolean> => {
  // This would check against user's quota in database
  // For now, just return true as placeholder
  return true;
};

// Sanitization helper
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return require('escape-html')(input);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};