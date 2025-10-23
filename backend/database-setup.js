const express = require('express');
const knex = require('knex');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Database configuration
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'mariadb',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'fortress_user',
    password: process.env.DB_PASSWORD || 'your-super-secure-database-password-change-me',
    database: process.env.DB_NAME || 'fortress_panel',
    charset: 'utf8mb4'
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10
  }
});

// Database setup service
class DatabaseSetup {
  static async initialize() {
    try {
      console.log('🔗 Connecting to database...');
      await db.raw('SELECT 1');
      console.log('✅ Database connected successfully');
      
      // Check if tables exist
      const hasUsers = await db.schema.hasTable('users');
      
      if (!hasUsers) {
        console.log('📋 Running database migrations...');
        await this.runMigrations();
        console.log('✅ Database migrations completed');
        
        console.log('🌱 Seeding initial data...');
        await this.seedData();
        console.log('✅ Database seeding completed');
      } else {
        console.log('✅ Database already initialized');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Database setup failed:', error.message);
      throw error;
    }
  }

  static async runMigrations() {
    try {
      // Users table
      await db.schema.createTable('users', function(table) {
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
      });
      
      // Sessions table
      await db.schema.createTable('sessions', function(table) {
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
      });
      
      // Applications table
      await db.schema.createTable('applications', function(table) {
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
      });
      
      // Databases table
      await db.schema.createTable('databases', function(table) {
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
      });
      
      // Audit logs table
      await db.schema.createTable('audit_logs', function(table) {
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
        table.timestamp('created_at').defaultTo(db.fn.now());
        
        // Indexes
        table.index(['user_id']);
        table.index(['action']);
        table.index(['resource_type']);
        table.index(['created_at']);
      });
      
      // Security events table
      await db.schema.createTable('security_events', function(table) {
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
        table.timestamp('created_at').defaultTo(db.fn.now());
        
        // Indexes
        table.index(['user_id']);
        table.index(['event_type']);
        table.index(['severity']);
        table.index(['resolved']);
        table.index(['created_at']);
      });
      
      console.log('✅ All database tables created successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  static async seedData() {
    try {
      // Create default admin user
      const adminPassword = await bcrypt.hash('admin123', 12);
      
      await db('users').insert({
        username: 'admin',
        email: 'admin@fortress-panel.local',
        password_hash: adminPassword,
        role: 'admin',
        status: 'active',
        mfa_enabled: false,
        permissions: JSON.stringify({
          admin: true,
          users: ['create', 'read', 'update', 'delete'],
          applications: ['create', 'read', 'update', 'delete'],
          databases: ['create', 'read', 'update', 'delete'],
          domains: ['create', 'read', 'update', 'delete'],
          monitoring: ['read'],
          system: ['read', 'update']
        }),
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Create sample regular user
      const userPassword = await bcrypt.hash('user123', 12);
      
      await db('users').insert({
        username: 'demo',
        email: 'demo@fortress-panel.local',
        password_hash: userPassword,
        role: 'user',
        status: 'active',
        mfa_enabled: false,
        permissions: JSON.stringify({
          admin: false,
          applications: ['create', 'read', 'update'],
          databases: ['read'],
          monitoring: ['read']
        }),
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('✅ Default users created:');
      console.log('   Admin: admin / admin123');
      console.log('   Demo:  demo  / user123');
      
      // Create sample security events
      await db('security_events').insert([
        {
          user_id: 1,
          event_type: 'login_success',
          description: 'System initialized with admin user',
          ip_address: '127.0.0.1',
          user_agent: 'Fortress Panel Setup',
          severity: 'info',
          resolved: true,
          created_at: new Date()
        }
      ]);
      
      console.log('✅ Sample data seeded successfully');
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  static async testConnection() {
    try {
      const result = await db.raw('SELECT 1 as test');
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  static async getUsers() {
    try {
      const users = await db('users')
        .select('id', 'username', 'email', 'role', 'status', 'mfa_enabled', 'created_at', 'last_login');
      return users;
    } catch (error) {
      console.error('Error fetching users:', error.message);
      return [];
    }
  }

  static async createAuditLog(userId, action, resourceType, resourceId, oldValues, newValues, ipAddress, userAgent) {
    try {
      await db('audit_logs').insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to create audit log:', error.message);
    }
  }

  static async close() {
    await db.destroy();
  }
}

module.exports = { DatabaseSetup, db };