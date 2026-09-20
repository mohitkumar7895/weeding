const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
} catch {}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Ensure users table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      email_verified BOOLEAN NOT NULL,
      phone_verified BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log('Seeding the 4 administrative accounts...');
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const adminUsers = [
    {
      id: 'usr_super_admin_01',
      email: 'admin@wedwithme.com',
      name: 'Super Admin Governance',
      phone: '+919999900001',
      role: 'SUPER_ADMIN',
    },
    {
      id: 'usr_admin_ops_01',
      email: 'admin.ops@wedwithme.com',
      name: 'Operations Manager',
      phone: '+919999900002',
      role: 'ADMIN',
    },
    {
      id: 'usr_support_01',
      email: 'support@wedwithme.com',
      name: 'Customer Support Lead',
      phone: '+919999900003',
      role: 'SUPPORT',
    },
    {
      id: 'usr_finance_01',
      email: 'finance@wedwithme.com',
      name: 'Finance & Accounts Controller',
      phone: '+919999900004',
      role: 'FINANCE',
    },
  ];

  for (const u of adminUsers) {
    await pool.query(
      `INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', true, true)
       ON DUPLICATE KEY UPDATE 
         role = VALUES(role),
         password_hash = VALUES(password_hash),
         name = VALUES(name),
         status = 'ACTIVE'`,
      [u.id, u.email, u.phone, passwordHash, u.name, u.role]
    );
    console.log(`  ✓ Seeded: ${u.name} (${u.role}) -> ${u.email}`);
  }

  await pool.end();
  console.log('Administrative accounts seeded successfully!');
}

main().catch(err => {
  console.error('Failed seeding admin accounts:', err);
  process.exit(1);
});
