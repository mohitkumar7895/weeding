const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyDisputes() {
  console.log('Verifying disputes logic (dry run or direct sql check)...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });

    console.log('Connected to db successfully.');
    
    // Check if the disputes table has the new columns
    const [columns] = await db.execute('SHOW COLUMNS FROM disputes');
    const colNames = columns.map(c => c.Field);
    
    console.log('Columns in disputes table:', colNames.join(', '));
    if (colNames.includes('type') && colNames.includes('responsibility')) {
      console.log('✅ Success: Disputes table has been altered correctly.');
    } else {
      console.log('❌ Error: Disputes table does not contain expected columns. Did the migration run?');
    }

    // Check if the dispute_evidence table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "dispute_evidence"');
    if (tables.length > 0) {
      console.log('✅ Success: dispute_evidence table exists.');
    } else {
      console.log('❌ Error: dispute_evidence table does not exist.');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyDisputes();
