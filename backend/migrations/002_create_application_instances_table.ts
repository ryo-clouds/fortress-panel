import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Application instances table
  await knex.schema.createTable('application_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('domain_id').references('id').inTable('domains').onDelete('CASCADE');
    table.string('language', 20).notNullable(); // php, nodejs, python, ruby, go, java
    table.string('version', 20).notNullable(); // 8.2, 18, 3.11, etc.
    table.integer('port').notNullable();
    table.enum('status', ['running', 'stopped', 'error', 'building']).defaultTo('building').notNullable();
    table.integer('memory_limit').defaultTo(512); // MB
    table.decimal('cpu_limit', 3, 1).defaultTo(1.0); // cores
    table.integer('disk_limit').defaultTo(1024); // MB
    table.json('environment_variables'); // Key-value pairs
    table.json('dependencies'); // Array of dependencies
    table.text('build_script'); // Custom build script
    table.text('start_script'); // Custom start script
    table.string('container_id', 100); // Docker container ID if applicable
    table.string('deployment_type', 20).defaultTo('native'); // native, docker
    table.json('deployment_metadata'); // Additional deployment data
    table.string('repository_url', 500); // Git repository URL
    table.string('repository_branch', 100).defaultTo('main');
    table.boolean('auto_deploy').defaultTo(false);
    table.json('health_check'); // Health check configuration
    table.json('environment_secrets'); // Encrypted environment variables
    table.string('last_error_message', 1000);
    table.timestamp('last_deployed_at');
    table.timestamp('last_started_at');
    table.timestamp('last_stopped_at');
    table.uuid('created_by').references('id').inTable('users');
    table.uuid('updated_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['domain_id']);
    table.index(['language']);
    table.index(['status']);
    table.index(['port']);
    table.index(['created_at']);
  });

  // Application build logs table
  await knex.schema.createTable('application_build_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('application_id').references('id').inTable('application_instances').onDelete('CASCADE');
    table.string('build_type', 20).notNullable(); // deploy, restart, update
    table.enum('status', ['pending', 'running', 'success', 'failed']).defaultTo('pending').notNullable();
    table.text('output'); // Build output
    table.text('error_message'); // Error message if failed
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('duration_seconds'); // Build duration in seconds
    table.json('build_metadata'); // Additional build data
    table.uuid('triggered_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['application_id']);
    table.index(['status']);
    table.index(['build_type']);
    table.index(['created_at']);
  });

  // Application metrics table
  await knex.schema.createTable('application_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('application_id').references('id').inTable('application_instances').onDelete('CASCADE');
    table.timestamp('timestamp').notNullable();
    table.decimal('cpu_usage', 5, 2).notNullable(); // CPU usage percentage
    table.integer('memory_usage_mb').notNullable(); // Memory usage in MB
    table.integer('disk_usage_mb').notNullable(); // Disk usage in MB
    table.integer('network_requests_per_minute').defaultTo(0);
    table.decimal('network_in_mb', 10, 2).defaultTo(0);
    table.decimal('network_out_mb', 10, 2).defaultTo(0);
    table.integer('active_connections').defaultTo(0);
    table.decimal('response_time_ms', 8, 2).defaultTo(0); // Average response time
    table.integer('error_count').defaultTo(0);
    table.decimal('uptime_percentage', 5, 2).defaultTo(100);
    table.json('custom_metrics'); // Additional custom metrics
    table.index(['application_id']);
    table.index(['timestamp']);
  });

  // Application templates table
  await knex.schema.createTable('application_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name', 100).notNullable();
    table.string('description', 500);
    table.string('language', 20).notNullable();
    table.string('version', 20).notNullable();
    table.enum('category', ['web', 'api', 'microservice', 'static', 'database']).defaultTo('web').notNullable();
    table.json('files').notNullable(); // Template files as JSON
    table.json('dependencies'); // Required dependencies
    table.json('environment_variables'); // Default environment variables
    table.text('build_instructions');
    table.text('run_instructions');
    table.boolean('public').defaultTo(true); // Available to all users
    table.boolean('active').defaultTo(true);
    table.integer('download_count').defaultTo(0);
    table.decimal('rating', 3, 2).defaultTo(0);
    table.integer('rating_count').defaultTo(0);
    table.uuid('created_by').references('id').inTable('users');
    table.uuid('updated_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['language']);
    table.index(['category']);
    table.index(['public']);
    table.index(['active']);
    table.index(['rating']);
  });

  // Language runtimes table
  await knex.schema.createTable('language_runtimes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name', 100).unique().notNullable(); // php-8.2, nodejs-18, etc.
    table.string('display_name', 100).notNullable(); // PHP 8.2, Node.js 18
    table.string('language', 20).notNullable(); // php, nodejs, python, etc.
    table.string('version', 20).notNullable();
    table.boolean('installed').defaultTo(false);
    table.boolean('enabled').defaultTo(true);
    table.integer('default_port').notNullable();
    table.text('run_command').notNullable(); // Command to run applications
    table.string('config_template', 100); // Configuration template file
    table.json('dependencies'); // Required system dependencies
    table.string('container_image', 200); // Docker image for containerized deployment
    table.json('metadata'); // Additional runtime metadata
    table.text('install_instructions');
    table.text('configuration_notes');
    table.timestamp('installed_at');
    table.timestamp('last_updated_at');
    table.uuid('installed_by').references('id').inTable('users');
    table.uuid('updated_by').references('id').inTable('users');
    table.timestamps(true, true);
    table.index(['language']);
    table.index(['installed']);
    table.index(['enabled']);
  });

  console.log('✅ Created application and runtime tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('application_metrics');
  await knex.schema.dropTableIfExists('application_build_logs');
  await knex.schema.dropTableIfExists('application_instances');
  await knex.schema.dropTableIfExists('application_templates');
  await knex.schema.dropTableIfExists('language_runtimes');
  
  console.log('✅ Dropped application and runtime tables');
}