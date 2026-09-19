const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyReconciliation() {
  console.log('Verifying reconciliation schema...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });
    
    // Check if the reconciliations table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "reconciliations"');
    if (tables.length > 0) {
      console.log('✅ Success: reconciliations table exists.');
      
      const [columns] = await db.execute('SHOW COLUMNS FROM reconciliations');
      const expectedColumns = ['id', 'booking_id', 'status', 'mismatch_details', 'internal_notes', 'last_run_at'];
      const actualColumns = columns.map(c => c.Field);
      
      let allFound = true;
      for (const exp of expectedColumns) {
        if (!actualColumns.includes(exp)) {
          console.log(`❌ Error: column ${exp} missing in reconciliations table.`);
          allFound = false;
        }
      }
      if (allFound) console.log('✅ Success: All required columns are present.');

    } else {
      console.log('❌ Error: reconciliations table does not exist.');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyReconciliation();
