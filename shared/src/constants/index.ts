export const SECURITY_CONSTANTS = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SYMBOLS: true,
  PASSWORD_HISTORY_COUNT: 12,
  PASSWORD_MAX_AGE_DAYS: 90,
  
  // Session management
  SESSION_TIMEOUT_MINUTES: 60,
  SESSION_MAX_CONCURRENT: 3,
  SESSION_INACTIVITY_TIMEOUT_MINUTES: 15,
  REMEMBER_ME_DURATION_DAYS: 30,
  
  // Rate limiting
  RATE_LIMIT_LOGIN_ATTEMPTS: 5,
  RATE_LIMIT_LOGIN_WINDOW_MINUTES: 15,
  RATE_LIMIT_API_REQUESTS_PER_MINUTE: 1000,
  RATE_LIMIT_PASSWORD_RESET_HOURS: 24,
  
  // MFA
  MFA_ISSUER: 'Fortress Panel',
  MFA_DIGITS: 6,
  MFA_WINDOW: 1,
  MFA_BACKUP_CODES_COUNT: 10,
  
  // API Keys
  API_KEY_LENGTH: 64,
  API_KEY_PREFIX_LENGTH: 8,
  API_KEY_MAX_KEYS_PER_USER: 10,
  
  // Encryption
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_KEY_LENGTH: 32,
  ENCRYPTION_IV_LENGTH: 16,
  ENCRYPTION_TAG_LENGTH: 16,
  
  // File uploads
  MAX_FILE_SIZE_MB: 100,
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/json',
    'application/xml'
  ],
  
  // Backup
  BACKUP_RETENTION_DAYS: 30,
  BACKUP_ENCRYPTION_ENABLED: true,
  BACKUP_COMPRESSION_ENABLED: true,
  
  // SSL
  SSL_RENEWAL_DAYS_BEFORE_EXPIRY: 30,
  SSL_MIN_KEY_SIZE: 2048,
  SSL_PREFERRED_KEY_SIZE: 4096,
  
  // Database
  DB_CONNECTION_POOL_MIN: 5,
  DB_CONNECTION_POOL_MAX: 20,
  DB_QUERY_TIMEOUT_SECONDS: 30,
  DB_BACKUP_RETENTION_DAYS: 30,
  
  // Logging
  LOG_RETENTION_DAYS: 90,
  LOG_LEVEL: 'info',
  AUDIT_LOG_ENABLED: true,
  
  // Monitoring
  METRICS_RETENTION_DAYS: 90,
  HEALTH_CHECK_INTERVAL_SECONDS: 30,
  ALERT_COOLDOWN_MINUTES: 5,
  
  // Docker
  DOCKER_MAX_CONTAINERS_PER_USER: 20,
  DOCKER_MEMORY_LIMIT_MB: 2048,
  DOCKER_CPU_LIMIT_CORES: 2,
  DOCKER_DISK_LIMIT_GB: 50,
  
  // Email
  EMAIL_RATE_LIMIT_PER_HOUR: 100,
  EMAIL_MAX_ATTACHMENT_SIZE_MB: 25,
  EMAIL_QUOTA_DEFAULT_MB: 1024,
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
} as const;

export const SUPPORTED_VERSIONS = {
  PHP: ['8.1', '8.2', '8.3'],
  NODEJS: ['18.x', '20.x', '21.x'],
  PYTHON: ['3.9', '3.10', '3.11', '3.12'],
  RUBY: ['3.0', '3.1', '3.2', '3.3'],
  GO: ['1.20', '1.21', '1.22'],
  JAVA: ['11', '17', '21'],
  NGINX: ['1.20', '1.22', '1.24'],
  APACHE: ['2.4'],
  POSTGRESQL: ['13', '14', '15'],
  MYSQL: ['8.0'],
  REDIS: ['6.2', '7.0'],
  MONGODB: ['6.0', '7.0']
} as const;

export const PERMISSIONS = {
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_SUSPEND: 'user:suspend',
  
  // Domain management
  DOMAIN_CREATE: 'domain:create',
  DOMAIN_READ: 'domain:read',
  DOMAIN_UPDATE: 'domain:update',
  DOMAIN_DELETE: 'domain:delete',
  DOMAIN_SSL_MANAGE: 'domain:ssl:manage',
  
  // Database management
  DATABASE_CREATE: 'database:create',
  DATABASE_READ: 'database:read',
  DATABASE_UPDATE: 'database:update',
  DATABASE_DELETE: 'database:delete',
  DATABASE_BACKUP: 'database:backup',
  
  // Email management
  EMAIL_CREATE: 'email:create',
  EMAIL_READ: 'email:read',
  EMAIL_UPDATE: 'email:update',
  EMAIL_DELETE: 'email:delete',
  
  // System administration
  SYSTEM_READ: 'system:read',
  SYSTEM_UPDATE: 'system:update',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_BACKUP: 'system:backup',
  
  // API management
  API_KEY_CREATE: 'api:key:create',
  API_KEY_READ: 'api:key:read',
  API_KEY_UPDATE: 'api:key:update',
  API_KEY_DELETE: 'api:key:delete',
  
  // Security management
  SECURITY_READ: 'security:read',
  SECURITY_MANAGE: 'security:manage',
  SECURITY_AUDIT: 'security:audit'
} as const;

export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_MFA_INVALID: 'AUTH_MFA_INVALID',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // System errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // File errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
} as const;

export const EVENT_TYPES = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_SUSPENDED: 'user.suspended',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGED: 'user.password.changed',
  
  // Domain events
  DOMAIN_CREATED: 'domain.created',
  DOMAIN_UPDATED: 'domain.updated',
  DOMAIN_DELETED: 'domain.deleted',
  DOMAIN_SUSPENDED: 'domain.suspended',
  DOMAIN_SSL_ISSUED: 'domain.ssl.issued',
  DOMAIN_SSL_RENEWED: 'domain.ssl.renewed',
  
  // Database events
  DATABASE_CREATED: 'database.created',
  DATABASE_UPDATED: 'database.updated',
  DATABASE_DELETED: 'database.deleted',
  DATABASE_BACKUP_CREATED: 'database.backup.created',
  DATABASE_BACKUP_RESTORED: 'database.backup.restored',
  
  // System events
  SYSTEM_BACKUP_STARTED: 'system.backup.started',
  SYSTEM_BACKUP_COMPLETED: 'system.backup.completed',
  SYSTEM_BACKUP_FAILED: 'system.backup.failed',
  SYSTEM_MAINTENANCE_STARTED: 'system.maintenance.started',
  SYSTEM_MAINTENANCE_COMPLETED: 'system.maintenance.completed',
  
  // Security events
  SECURITY_BREACH_DETECTED: 'security.breach.detected',
  SECURITY_THREAT_BLOCKED: 'security.threat.blocked',
  SECURITY_POLICY_VIOLATION: 'security.policy.violation',
  
  // API events
  API_KEY_CREATED: 'api.key.created',
  API_KEY_REVOKED: 'api.key.revoked',
  API_RATE_LIMIT_EXCEEDED: 'api.rate_limit.exceeded'
} as const;