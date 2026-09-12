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
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wedwithme',
  });

  const [customers] = await pool.query(
    "SELECT id, name, email, phone, role, status FROM users WHERE role = 'CUSTOMER'"
  );
  console.log('Found Customers:', customers);

  // Set known passwords for all customer accounts
  const hash123 = await bcrypt.hash('Password@123', 10);
  await pool.query(
    "UPDATE users SET password_hash = ?, status = 'ACTIVE' WHERE role = 'CUSTOMER'",
    [hash123]
  );
  console.log("Updated all CUSTOMER users' password to 'Password@123'");

  const [allCust] = await pool.query(
    "SELECT id, name, email, phone, role, status FROM users WHERE role = 'CUSTOMER'"
  );
  console.log('\n--- Ready Customer Accounts ---');
  allCust.forEach((c, idx) => {
    console.log(`${idx + 1}. Name: ${c.name} | Email: ${c.email} | Password: Password@123 | Phone: ${c.phone}`);
  });

  // Verify login via HTTP POST /api/auth/login
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: allCust[0].email, password: 'Password@123' })
    });
    const data = await res.json();
    console.log('\nTest Login Result for', allCust[0].email, '-> HTTP', res.status, data.success ? 'SUCCESS' : 'FAILED');
  } catch (err) {
    console.log('HTTP login test notice:', err.message);
  }

  await pool.end();
}

main();
