// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  mfaEnabled: boolean;
  apiKeyIds: string[];
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  RESELLER = 'reseller',
  API_USER = 'api_user'
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  LOCKED = 'locked'
}

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

// Authentication & Security
export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  resolved: boolean;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Domain and Website Types
export interface Domain {
  id: string;
  name: string;
  userId: string;
  status: DomainStatus;
  type: DomainType;
  aliases: string[];
  sslEnabled: boolean;
  sslCertificate?: SSLCertificate;
  dnsRecords: DNSRecord[];
  webConfig: WebConfiguration;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export enum DomainStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  EXPIRED = 'expired'
}

export enum DomainType {
  WEBSITE = 'website',
  API = 'api',
  REDIRECT = 'redirect',
  EMAIL = 'email'
}

export interface SSLCertificate {
  id: string;
  domainId: string;
  type: SSLType;
  issuer: string;
  serialNumber: string;
  fingerprint: string;
  validFrom: Date;
  validUntil: Date;
  autoRenew: boolean;
  status: SSLStatus;
}

export enum SSLType {
  LETS_ENCRYPT = 'lets_encrypt',
  SELF_SIGNED = 'self_signed',
  COMMERCIAL = 'commercial',
  WILDCARD = 'wildcard'
}

export enum SSLStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  PENDING = 'pending'
}

export interface DNSRecord {
  id: string;
  domainId: string;
  type: DNSRecordType;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum DNSRecordType {
  A = 'A',
  AAAA = 'AAAA',
  CNAME = 'CNAME',
  MX = 'MX',
  TXT = 'TXT',
  NS = 'NS',
  SRV = 'SRV',
  PTR = 'PTR',
  CAA = 'CAA'
}

export interface WebConfiguration {
  id: string;
  domainId: string;
  language: ProgrammingLanguage;
  framework?: string;
  version: string;
  phpVersion?: string;
  nodeVersion?: string;
  pythonVersion?: string;
  rubyVersion?: string;
  goVersion?: string;
  javaVersion?: string;
  environment: Environment;
  documentRoot: string;
  customConfig?: Record<string, any>;
  optimizedFor: OptimizationTarget;
}

export enum ProgrammingLanguage {
  PHP = 'php',
  NODEJS = 'nodejs',
  PYTHON = 'python',
  RUBY = 'ruby',
  GO = 'go',
  JAVA = 'java',
  STATIC = 'static',
  DOCKER = 'docker'
}

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export enum OptimizationTarget {
  SPEED = 'speed',
  MEMORY = 'memory',
  BALANCED = 'balanced'
}

// Database Types
export interface Database {
  id: string;
  name: string;
  userId: string;
  type: DatabaseType;
  version: string;
  host: string;
  port: number;
  username: string;
  passwordEncrypted: string;
  maxSize: number;
  currentSize: number;
  status: DatabaseStatus;
  backupsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
  REDIS = 'redis',
  ELASTICSEARCH = 'elasticsearch'
}

export enum DatabaseStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

export interface DatabaseBackup {
  id: string;
  databaseId: string;
  type: BackupType;
  size: number;
  location: string;
  encrypted: boolean;
  compressionEnabled: boolean;
  retentionPeriod: number;
  createdAt: Date;
  expiresAt?: Date;
}

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential'
}

// Email Types
export interface MailDomain {
  id: string;
  domain: string;
  userId: string;
  status: MailDomainStatus;
  mailboxes: Mailbox[];
  forwarders: MailForwarder[];
  mxRecords: MXRecord[];
  spamFilterEnabled: boolean;
  antivirusEnabled: boolean;
  dkimEnabled: boolean;
  dmarcEnabled: boolean;
  spfEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum MailDomainStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export interface Mailbox {
  id: string;
  domainId: string;
  email: string;
  passwordEncrypted: string;
  quota: number;
  usedSpace: number;
  isActive: boolean;
  vacationEnabled: boolean;
  vacationMessage?: string;
  forwarders: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MailForwarder {
  id: string;
  domainId: string;
  source: string;
  destination: string;
  isActive: boolean;
  keepCopy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MXRecord {
  id: string;
  domainId: string;
  priority: number;
  host: string;
  ttl: number;
}

// API Types
export interface APIKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  allowedIPs: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIRequest {
  id: string;
  keyId?: string;
  userId?: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  response: any;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// System Types
export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    readOps: number;
    writeOps: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    connections: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

export enum AlertType {
  CPU_HIGH = 'cpu_high',
  MEMORY_HIGH = 'memory_high',
  DISK_FULL = 'disk_full',
  NETWORK_ISSUE = 'network_issue',
  SERVICE_DOWN = 'service_down',
  SECURITY_BREACH = 'security_breach',
  BACKUP_FAILED = 'backup_failed',
  SSL_EXPIRING = 'ssl_expiring'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter and Search Types
export interface FilterOptions {
  search?: string;
  status?: string[];
  type?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchQuery {
  query: string;
  fields?: string[];
  filters?: Record<string, any>;
  highlight?: boolean;
  facet?: string[];
}