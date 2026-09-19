const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyGovernanceConfig() {
  console.log('Verifying Governance schema...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });
    
    // Check system_configuration table
    const [tables] = await db.execute('SHOW TABLES LIKE "system_configuration"');
    if (tables.length > 0) {
      console.log('✅ Success: system_configuration table exists.');
      const [rows] = await db.execute('SELECT COUNT(*) as c FROM system_configuration');
      console.log(`✅ Success: Found ${rows[0].c} default configurations.`);
    } else {
      console.log('❌ Error: system_configuration table does not exist.');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyGovernanceConfig();
