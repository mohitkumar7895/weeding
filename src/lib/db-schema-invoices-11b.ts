import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runInvoices11bMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Invoices 11B Lifecycle & Receipt Schema Updates...');

  // 1. Create receipts table
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id VARCHAR(36) PRIMARY KEY,
        receipt_reference VARCHAR(50) UNIQUE NOT NULL,
        payment_id VARCHAR(36) NOT NULL UNIQUE,
        booking_id VARCHAR(36) NOT NULL,
        invoice_id VARCHAR(36) NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_date DATETIME NOT NULL,
        status ENUM('ISSUED', 'VOIDED') DEFAULT 'ISSUED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payment_transactions(id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `receipts` successfully.');
  } catch (err: any) {
    console.error('Error creating receipts table:', err.message);
  }

  // 2. Add invoice_id to cancellations
  try {
    await db.query(`
      ALTER TABLE cancellations
      ADD COLUMN invoice_id VARCHAR(36) NULL,
      ADD FOREIGN KEY (invoice_id) REFERENCES invoices(id);
    `);
    console.log('Added invoice_id to cancellations.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('cancellations table already has invoice_id column.');
    } else {
      console.error('Error altering cancellations table:', err.message);
    }
  }

  // 3. Add invoice_id to refunds
  try {
    await db.query(`
      ALTER TABLE refunds
      ADD COLUMN invoice_id VARCHAR(36) NULL,
      ADD FOREIGN KEY (invoice_id) REFERENCES invoices(id);
    `);
    console.log('Added invoice_id to refunds.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('refunds table already has invoice_id column.');
    } else {
      console.error('Error altering refunds table:', err.message);
    }
  }

  await db.end();
  console.log('11B Migrations applied successfully!');
}

if (require.main === module) {
  runInvoices11bMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
