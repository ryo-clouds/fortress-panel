exports.seed = function(knex) {
  // Create default admin user
  return knex('users').insert({
    username: 'admin',
    email: 'admin@fortress-panel.local',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', // password: admin123
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
      system: ['read']
    })
  })
  .then(() => {
    console.log('✅ Default admin user created');
  });
};