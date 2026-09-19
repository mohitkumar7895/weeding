const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyDuplicateConfig() {
  console.log('Verifying Duplicate Case schema...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });
    
    // Check tables
    const [tables] = await db.execute('SHOW TABLES LIKE "duplicate_profile_cases"');
    if (tables.length > 0) {
      console.log('✅ Success: duplicate_profile_cases table exists.');
    } else {
      console.log('❌ Error: duplicate_profile_cases table does not exist.');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyDuplicateConfig();
