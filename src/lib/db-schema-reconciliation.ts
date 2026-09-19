import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runReconciliationMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Reconciliation Schema Updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reconciliations (
        id VARCHAR(36) PRIMARY KEY,
        booking_id VARCHAR(36) NOT NULL UNIQUE,
        status ENUM('MATCHED', 'MISMATCH', 'PENDING_REVIEW', 'RESOLVED') DEFAULT 'MATCHED',
        mismatch_details JSON NULL,
        internal_notes TEXT NULL,
        last_run_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `reconciliations` successfully.');
  } catch (err: any) {
    console.error('Error creating reconciliations table:', err.message);
  }

  await db.end();
  console.log('Reconciliation migrations applied successfully!');
}

if (require.main === module) {
  runReconciliationMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
