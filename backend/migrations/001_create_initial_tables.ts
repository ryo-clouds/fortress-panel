import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('username', 50).unique().notNullable();
    table.string('email', 254).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('role', 20).defaultTo('user').notNullable(); // admin, user, reseller
    table.enum('status', ['active', 'suspended', 'pending', 'locked']).defaultTo('active').notNullable();
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 32); // For TOTP
    table.json('mfa_backup_codes'); // Array of backup codes
    table.timestamp('last_login_at');
    table.timestamp('last_password_changed_at');
    table.timestamp('account_locked_until');
    table.integer('failed_login_attempts').defaultTo(0);
    table.string('avatar_url', 500);
    table.string('phone', 20);
    table.string('timezone', 50).defaultTo('UTC');
    table.string('language', 10).defaultTo('en');
    table.json('preferences'); // User preferences as JSON
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token', 255);
    table.timestamp('email_verification_expires_at');
    table.timestamp('password_reset_token_expires_at');
    table.string('password_reset_token', 255);
    table.timestamp('last_activity_at');
    table.string('remember_me_token', 255);
    table.timestamp('remember_me_expires_at');
    table.json('permissions'); // Array of permissions
    table.string('created_by').references('id').inTable('users');
    table.string('updated_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['username']);
    table.index(['email']);
    table.index(['role']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // User permissions table
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name', 100).unique().notNullable();
    table.string('description', 255);
    table.string('resource', 50).notNullable(); // users, domains, databases, etc.
    table.json('actions').notNullable(); // Array of actions like ['create', 'read', 'update', 'delete']
    table.json('conditions'); // Additional conditions as JSON
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['resource']);
    table.index(['active']);
  });

  // User permissions mapping table
  await knex.schema.createTable('user_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
    table.timestamp('granted_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at'); // Optional expiration
    table.uuid('granted_by').references('id').inTable('users');
    table.primary(['user_id', 'permission_id']);
    table.index(['user_id']);
    table.index(['permission_id']);
  });

  // Auth sessions table
  await knex.schema.createTable('auth_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('session_token', 255).unique().notNullable();
    table.string('refresh_token', 255).unique().notNullable();
    table.string('device_fingerprint', 255).notNullable();
    table.string('ip_address', 45).notNullable();
    table.string('user_agent', 500);
    table.enum('status', ['active', 'expired', 'revoked']).defaultTo('active').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.json('metadata'); // Additional session data
    table.timestamps(true, true);
    table.index(['session_token']);
    table.index(['refresh_token']);
    table.index(['user_id']);
    table.index(['status']);
    table.index(['expires_at']);
  });

  // API keys table
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('key_hash', 255).notNullable();
    table.string('key_prefix', 10).notNullable(); // Show this to user
    table.string('description', 255);
    table.json('permissions').notNullable(); // Array of allowed operations
    table.json('allowed_ips'); // Array of allowed IP addresses
    table.integer('rate_limit').defaultTo(1000); // Requests per hour
    table.enum('status', ['active', 'disabled', 'expired']).defaultTo('active').notNullable();
    table.timestamp('last_used_at');
    table.timestamp('expires_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['key_hash']);
    table.index(['status']);
    table.index(['expires_at']);
  });

  // Security events table
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('event_type', 50).notNullable();
    table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('medium').notNullable();
    table.string('description', 500).notNullable();
    table.json('metadata'); // Additional event data
    table.string('ip_address', 45).notNullable();
    table.string('user_agent', 500);
    table.boolean('resolved').defaultTo(false);
    table.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['event_type']);
    table.index(['severity']);
    table.index(['resolved']);
    table.index(['created_at']);
  });

  // System settings table
  await knex.schema.createTable('system_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('key', 100).unique().notNullable();
    table.text('value');
    table.string('description', 255);
    table.string('type', 50).defaultTo('string').notNullable(); // string, number, boolean, json
    table.boolean('public').defaultTo(false); // Whether this setting is visible to users
    table.boolean('editable').defaultTo(true); // Whether this can be edited via UI
    table.string('category', 50).defaultTo('general');
    table.string('validation_rule'); // JSON validation rule
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    table.index(['key']);
    table.index(['category']);
    table.index(['public']);
  });

  // Domains table
  await knex.schema.createTable('domains', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('domain', 253).unique().notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['active', 'suspended', 'pending', 'expired']).defaultTo('pending').notNullable();
    table.enum('type', ['website', 'api', 'redirect', 'email']).defaultTo('website').notNullable();
    table.text('aliases'); // JSON array of alias domains
    table.boolean('ssl_enabled').defaultTo(false);
    table.uuid('ssl_certificate_id').references('id').inTable('ssl_certificates').onDelete('SET NULL');
    table.text('dns_records'); // JSON array of DNS records
    table.json('web_config').notNullable(); // Web configuration as JSON
    table.string('document_root', 255);
    table.string('custom_404_page', 255);
    table.string('custom_error_page', 255);
    table.boolean('statistics_enabled').defaultTo(true);
    table.integer('disk_quota_mb').defaultTo(1024); // Default 1GB
    table.integer('disk_used_mb').defaultTo(0);
    table.integer('bandwidth_quota_gb').defaultTo(100); // Default 100GB
    table.integer('bandwidth_used_gb').defaultTo(0);
    table.json('access_log'); // Access logs
    table.string('created_by').references('id').inTable('users');
    table.string('updated_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['domain']);
    table.index(['user_id']);
    table.index(['status']);
    table.index(['type']);
    table.index(['created_at']);
  });

  // SSL certificates table
  await knex.schema.createTable('ssl_certificates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('domain_id').references('id').inTable('domains').onDelete('CASCADE');
    table.enum('type', ['lets_encrypt', 'self_signed', 'commercial', 'wildcard']).defaultTo('lets_encrypt').notNullable();
    table.string('issuer', 255);
    table.string('serial_number', 255);
    table.string('fingerprint', 255);
    table.timestamp('valid_from').notNullable();
    table.timestamp('valid_until').notNullable();
    table.boolean('auto_renew').defaultTo(true);
    table.enum('status', ['active', 'expired', 'revoked', 'pending']).defaultTo('pending').notNullable();
    table.text('certificate_content'); // Full certificate content
    table.text('private_key_content'); // Private key content
    table.text('chain_content'); // Certificate chain content
    table.json('verification'); // Verification data
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['domain_id']);
    table.index(['status']);
    table.index(['valid_until']);
  });

  // Databases table
  await knex.schema.createTable('databases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name', 64).notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch']).defaultTo('mysql').notNullable();
    table.string('version', 20).notNullable();
    table.string('host', 255).notNullable();
    table.integer('port').notNullable();
    table.string('username', 64).notNullable();
    table.string('password_encrypted', 255).notNullable();
    table.string('charset', 32).defaultTo('utf8mb4');
    table.string('collation', 64).defaultTo('utf8mb4_unicode_ci');
    table.integer('max_size_mb').defaultTo(1024); // Default 1GB
    table.integer('current_size_mb').defaultTo(0);
    table.enum('status', ['active', 'suspended', 'maintenance', 'error']).defaultTo('active').notNullable();
    table.boolean('backups_enabled').defaultTo(true);
    table.json('backup_schedule'); // Backup schedule as JSON
    table.json('access_list'); // IP whitelist as JSON
    table.text('connection_details'); // Additional connection details
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['name']);
    table.index(['user_id']);
    table.index(['type']);
    table.index(['status']);
  });

  // Database backups table
  await knex.schema.createTable('database_backups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('database_id').references('id').inTable('databases').onDelete('CASCADE');
    table.enum('type', ['full', 'incremental', 'differential']).defaultTo('full').notNullable();
    table.integer('size_mb').notNullable();
    table.string('location', 500).notNullable();
    table.boolean('encrypted').defaultTo(true);
    table.boolean('compression_enabled').defaultTo(true);
    table.integer('retention_days').defaultTo(30);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    table.index(['database_id']);
    table.index(['created_at']);
    table.index(['expires_at']);
  });

  // Email domains table
  await knex.schema.createTable('email_domains', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('domain', 253).unique().notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['active', 'suspended', 'pending']).defaultTo('pending').notNullable();
    table.boolean('spam_filter_enabled').defaultTo(true);
    table.boolean('antivirus_enabled').defaultTo(true);
    table.boolean('dkim_enabled').defaultTo(false);
    table.boolean('dmarc_enabled').defaultTo(false);
    table.boolean('spf_enabled').defaultTo(false);
    table.json('dkim_settings'); // DKIM configuration
    table.json('dmarc_settings'); // DMARC configuration
    table.json('spf_settings'); // SPF configuration
    table.integer('max_mailboxes').defaultTo(100);
    table.integer('max_quota_mb').defaultTo(10240); // Default 10GB per domain
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['domain']);
    table.index(['user_id']);
    table.index(['status']);
  });

  // Email mailboxes table
  await knex.schema.createTable('email_mailboxes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('email_domain_id').references('id').inTable('email_domains').onDelete('CASCADE');
    table.string('email', 254).notNullable();
    table.string('password_encrypted', 255).notNullable();
    table.integer('quota_mb').notNullable();
    table.integer('used_space_mb').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.boolean('vacation_enabled').defaultTo(false);
    table.text('vacation_message');
    table.json('forwarders'); // Array of forwarder emails
    table.json('autoresponders'); // Auto-responder rules
    table.json('filters'); // Email filters as JSON
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['email']);
    table.index(['email_domain_id']);
    table.unique(['email_domain_id', 'email']);
  });

  // Email forwarders table
  await knex.schema.createTable('email_forwarders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('email_domain_id').references('id').inTable('email_domains').onDelete('CASCADE');
    table.string('source', 254).notNullable();
    table.string('destination', 254).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('keep_copy').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['email_domain_id']);
    table.index(['source']);
  });

  // Audit logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.string('resource_type', 50).notNullable();
    table.string('resource_id', 255);
    table.json('old_values'); // Previous values as JSON
    table.json('new_values'); // New values as JSON
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.boolean('success').defaultTo(true);
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['action']);
    table.index(['resource_type']);
    table.index(['created_at']);
  });

  // Notifications table
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 50).notNullable(); // info, warning, error, success
    table.string('category', 50).notNullable(); // system, security, billing, etc.
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.json('metadata'); // Additional notification data
    table.boolean('read').defaultTo(false);
    table.boolean('email_sent').defaultTo(false);
    table.string('email_address', 254);
    table.timestamp('read_at');
    table.timestamp('expires_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index(['read']);
    table.index(['type']);
    table.index(['category']);
    table.index(['created_at']);
  });

  // System metrics table
  await knex.schema.createTable('system_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.timestamp('timestamp').notNullable();
    table.decimal('cpu_usage', 5, 2).notNullable();
    table.decimal('memory_usage', 5, 2).notNullable();
    table.decimal('disk_usage', 5, 2).notNullable();
    table.integer('disk_free_mb').notNullable();
    table.integer('disk_total_mb').notNullable();
    table.integer('network_connections').notNullable();
    table.decimal('network_in_mb', 10, 2).notNullable();
    table.decimal('network_out_mb', 10, 2).notNullable();
    table.integer('process_count').notNullable();
    table.decimal('load_average', 5, 2).notNullable();
    table.json('custom_metrics'); // Additional metrics as JSON
    table.index(['timestamp']);
  });

  console.log('✅ Created all database tables');
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order of creation
  await knex.schema.dropTableIfExists('system_metrics');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('email_forwarders');
  await knex.schema.dropTableIfExists('email_mailboxes');
  await knex.schema.dropTableIfExists('email_domains');
  await knex.schema.dropTableIfExists('database_backups');
  await knex.schema.dropTableIfExists('databases');
  await knex.schema.dropTableIfExists('ssl_certificates');
  await knex.schema.dropTableIfExists('domains');
  await knex.schema.dropTableIfExists('system_settings');
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('api_keys');
  await knex.dropTableIfExists('auth_sessions');
  await knex.schema.dropTableIfExists('user_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('users');
  
  console.log('✅ Dropped all database tables');
}