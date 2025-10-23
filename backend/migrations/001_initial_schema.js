exports.up = function(knex) {
  return knex.schema
    // Users table
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.string('username', 50).unique().notNullable();
      table.string('email', 100).unique().notNullable();
      table.string('password_hash', 255).notNullable();
      table.enu('role', ['admin', 'user', 'reseller']).defaultTo('user');
      table.enu('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.boolean('mfa_enabled').defaultTo(false);
      table.string('mfa_secret', 32);
      table.string('phone', 20);
      table.json('permissions');
      table.timestamp('last_login');
      table.string('last_ip', 45);
      table.json('device_fingerprint');
      table.timestamps(true, true);
      
      // Indexes
      table.index(['username']);
      table.index(['email']);
      table.index(['role']);
      table.index(['status']);
    })
    
    // Sessions table
    .createTable('sessions', function(table) {
      table.string('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('refresh_token', 500).notNullable();
      table.json('device_info');
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.timestamp('expires_at').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      // Indexes
      table.index(['user_id']);
      table.index(['refresh_token']);
      table.index(['expires_at']);
      table.index(['is_active']);
    })
    
    // Applications table
    .createTable('applications', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('name', 100).notNullable();
      table.string('domain', 255);
      table.enu('type', ['php', 'nodejs', 'python', 'ruby', 'go', 'java', 'static']).notNullable();
      table.string('version', 20);
      table.enu('status', ['active', 'inactive', 'building', 'error']).defaultTo('inactive');
      table.string('path', 500);
      table.string('document_root', 500);
      table.json('environment_vars');
      table.integer('port');
      table.string('container_id', 100);
      table.json('resource_limits');
      table.boolean('ssl_enabled').defaultTo(false);
      table.text('ssl_certificate');
      table.text('ssl_private_key');
      table.json('custom_config');
      table.timestamps(true, true);
      
      // Indexes
      table.index(['user_id']);
      table.index(['domain']);
      table.index(['type']);
      table.index(['status']);
    })
    
    // Databases table
    .createTable('databases', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('name', 64).notNullable();
      table.string('username', 32).notNullable();
      table.string('password_hash', 255).notNullable();
      table.enu('type', ['mysql', 'postgresql', 'redis']).defaultTo('mysql');
      table.string('host', 100).defaultTo('localhost');
      table.integer('port').defaultTo(3306);
      table.json('permissions');
      table.integer('size_limit');
      table.integer('current_size');
      table.enu('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.timestamps(true, true);
      
      // Indexes
      table.index(['user_id']);
      table.index(['name']);
      table.index(['type']);
      table.index(['status']);
    })
    
    // Audit logs table
    .createTable('audit_logs', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.string('action', 100).notNullable();
      table.string('resource_type', 50);
      table.integer('resource_id');
      table.json('old_values');
      table.json('new_values');
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.json('metadata');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['user_id']);
      table.index(['action']);
      table.index(['resource_type']);
      table.index(['created_at']);
    })
    
    // Security events table
    .createTable('security_events', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.enu('event_type', ['login_success', 'login_failed', 'mfa_failed', 'permission_denied', 'suspicious_activity', 'password_reset', 'account_locked']).notNullable();
      table.string('description', 500);
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.json('metadata');
      table.string('severity', 20).defaultTo('medium');
      table.boolean('resolved').defaultTo(false);
      table.timestamp('resolved_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['user_id']);
      table.index(['event_type']);
      table.index(['severity']);
      table.index(['resolved']);
      table.index(['created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('security_events')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('databases')
    .dropTableIfExists('applications')
    .dropTableIfExists('sessions')
    .dropTableIfExists('users');
};