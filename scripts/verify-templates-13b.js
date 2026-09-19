const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyTemplatesConfig() {
  console.log('Verifying Notification Templates & Logs schema...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });
    
    // Check notification_templates table
    const [tables] = await db.execute('SHOW TABLES LIKE "notification_templates"');
    if (tables.length > 0) {
      console.log('✅ Success: notification_templates table exists.');
    } else {
      console.log('❌ Error: notification_templates table does not exist.');
    }

    // Check notification_delivery_logs table
    const [logsTables] = await db.execute('SHOW TABLES LIKE "notification_delivery_logs"');
    if (logsTables.length > 0) {
      console.log('✅ Success: notification_delivery_logs table exists.');
    } else {
      console.log('❌ Error: notification_delivery_logs table does not exist.');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyTemplatesConfig();
