const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function verifyInvoices() {
  console.log('Verifying invoices foundation logic...');
  try {
    const db = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
    });

    console.log('Connected to db successfully.');
    
    // Check if the invoices table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "invoices"');
    if (tables.length > 0) {
      console.log('✅ Success: invoices table exists.');
    } else {
      console.log('❌ Error: invoices table does not exist.');
    }

    // Check if the vendor table has gstin
    const [columns] = await db.execute('SHOW COLUMNS FROM vendors');
    const colNames = columns.map(c => c.Field);
    
    if (colNames.includes('gstin') && colNames.includes('billing_address')) {
      console.log('✅ Success: vendors table has been altered correctly (gstin, billing_address).');
    } else {
      console.log('❌ Error: vendors table does not contain expected columns.');
    }

    // Check customer_profiles for billing_address
    const [cColumns] = await db.execute('SHOW COLUMNS FROM customer_profiles');
    const cColNames = cColumns.map(c => c.Field);
    if (cColNames.includes('billing_address')) {
      console.log('✅ Success: customer_profiles table has been altered correctly (billing_address).');
    } else {
      console.log('❌ Error: customer_profiles table does not contain expected columns.');
    }

    await db.end();
  } catch (e) {
    console.error('Error during verification:', e.message);
  }
}

verifyInvoices();
