const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyDisputes10B() {
  console.log('Verifying disputes 10B logic (dry run or direct sql check)...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });

    console.log('Connected to db successfully.');
    
    // Check if the disputes table has the new 10B columns
    const [columns] = await db.execute('SHOW COLUMNS FROM disputes');
    const colNames = columns.map(c => c.Field);
    
    console.log('Columns in disputes table:', colNames.join(', '));
    const required10BCols = [
      'internal_notes', 
      'escalation_reason', 
      'escalated_at', 
      'deadline_date', 
      'resolution_notes'
    ];

    const hasAll = required10BCols.every(c => colNames.includes(c));

    if (hasAll) {
      console.log('✅ Success: Disputes table has been altered correctly for 10B.');
    } else {
      console.log('❌ Error: Disputes table missing 10B columns. Did the migration run?');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyDisputes10B();
