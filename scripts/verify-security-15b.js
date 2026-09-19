const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifySecurityConfig() {
  console.log('Verifying Security schema...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });
    
    // Check tables
    const [tables] = await db.execute('SHOW TABLES LIKE "api_security_logs"');
    if (tables.length > 0) {
      console.log('✅ Success: api_security_logs table exists.');
    } else {
      console.log('❌ Error: api_security_logs table does not exist.');
    }

    // Check default security config
    const [rows] = await db.execute('SELECT COUNT(*) as c FROM system_configuration WHERE category = "SECURITY"');
    console.log(`✅ Success: Found ${rows[0].c} default SECURITY configurations.`);

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifySecurityConfig();
