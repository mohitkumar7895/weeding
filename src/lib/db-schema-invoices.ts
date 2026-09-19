import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runInvoicesMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Invoices & GST schema updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(36) PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        booking_id VARCHAR(36) NOT NULL,
        payment_id VARCHAR(36) NULL,
        customer_id VARCHAR(36) NOT NULL,
        vendor_id VARCHAR(36) NOT NULL,
        customer_billing_info JSON NULL,
        vendor_billing_info JSON NULL,
        taxable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
        tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        status ENUM('DRAFT', 'ISSUED', 'CANCELLED') DEFAULT 'DRAFT',
        issued_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `invoices` successfully.');
  } catch (err: any) {
    console.error('Error creating invoices table:', err.message);
  }

  // Adding GSTIN to vendors and structured billing address
  try {
    await db.query(`
      ALTER TABLE vendors 
      ADD COLUMN gstin VARCHAR(15) NULL,
      ADD COLUMN billing_address TEXT NULL;
    `);
    console.log('Altered table `vendors` to add gstin and billing_address.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Vendors table already has billing columns.');
    } else {
      console.error('Error altering vendors table:', err.message);
    }
  }

  // Adding billing address to customer profiles
  try {
    await db.query(`
      ALTER TABLE customer_profiles
      ADD COLUMN billing_address TEXT NULL;
    `);
    console.log('Altered table `customer_profiles` to add billing_address.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Customer profiles table already has billing columns.');
    } else {
      console.error('Error altering customer_profiles table:', err.message);
    }
  }

  await db.end();
  console.log('Invoice migrations applied successfully!');
}

if (require.main === module) {
  runInvoicesMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
