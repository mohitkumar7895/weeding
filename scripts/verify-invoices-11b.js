const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyInvoices11B() {
  console.log('Verifying invoices 11B foundation logic...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });

    console.log('Connected to db successfully.');
    
    // Check if the receipts table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "receipts"');
    if (tables.length > 0) {
      console.log('✅ Success: receipts table exists.');
    } else {
      console.log('❌ Error: receipts table does not exist.');
    }

    // Check if cancellations has invoice_id
    const [cColumns] = await db.execute('SHOW COLUMNS FROM cancellations');
    const cColNames = cColumns.map(c => c.Field);
    if (cColNames.includes('invoice_id')) {
      console.log('✅ Success: cancellations table linked to invoice_id.');
    } else {
      console.log('❌ Error: cancellations missing invoice_id.');
    }

    // Check if refunds has invoice_id
    const [rColumns] = await db.execute('SHOW COLUMNS FROM refunds');
    const rColNames = rColumns.map(c => c.Field);
    if (rColNames.includes('invoice_id')) {
      console.log('✅ Success: refunds table linked to invoice_id.');
    } else {
      console.log('❌ Error: refunds missing invoice_id.');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyInvoices11B();
