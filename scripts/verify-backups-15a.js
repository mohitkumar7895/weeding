const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyBackupConfig() {
  console.log('Verifying Backup schema...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });
    
    // Check tables
    const [tables] = await db.execute('SHOW TABLES LIKE "backup_logs"');
    if (tables.length > 0) {
      console.log('✅ Success: backup_logs table exists.');
    } else {
      console.log('❌ Error: backup_logs table does not exist.');
    }

    const [rtables] = await db.execute('SHOW TABLES LIKE "restore_test_records"');
    if (rtables.length > 0) {
      console.log('✅ Success: restore_test_records table exists.');
    } else {
      console.log('❌ Error: restore_test_records table does not exist.');
    }

    // Check default backup config
    const [rows] = await db.execute('SELECT COUNT(*) as c FROM system_configuration WHERE category = "INFRASTRUCTURE"');
    console.log(`✅ Success: Found ${rows[0].c} default INFRASTRUCTURE configurations.`);

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyBackupConfig();
