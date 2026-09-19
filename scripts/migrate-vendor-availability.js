const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runMigration() {
  console.log(`Connecting to MySQL database ${DB_NAME} at ${DB_HOST}:${DB_PORT}...`);
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  try {
    console.log('1. Checking and altering `vendor_availability` table...');
    const [existingCols] = await conn.query('DESCRIBE vendor_availability');
    const colNames = new Set(existingCols.map(c => c.Field));

    if (!colNames.has('service_id')) {
      console.log('  + Adding column `service_id`...');
      await conn.query("ALTER TABLE vendor_availability ADD COLUMN service_id VARCHAR(64) NOT NULL DEFAULT 'ALL' AFTER vendor_id");
    }

    if (!colNames.has('status')) {
      console.log('  + Adding column `status`...');
      await conn.query("ALTER TABLE vendor_availability ADD COLUMN status ENUM('AVAILABLE', 'BLOCKED', 'BOOKING_LOCKED', 'CONFIRMED') NOT NULL DEFAULT 'BLOCKED' AFTER service_id");
    }

    if (!colNames.has('reason')) {
      console.log('  + Adding column `reason`...');
      await conn.query("ALTER TABLE vendor_availability ADD COLUMN reason VARCHAR(255) NULL AFTER status");
    }

    if (!colNames.has('created_at')) {
      console.log('  + Adding column `created_at`...');
      await conn.query("ALTER TABLE vendor_availability ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER notes");
    }

    // Check indexes
    const [indexes] = await conn.query('SHOW INDEX FROM vendor_availability');
    const indexNames = new Set(indexes.map(i => i.Key_name));

    if (!indexNames.has('idx_vendor_id')) {
      console.log('  + Adding index `idx_vendor_id` on (vendor_id)...');
      await conn.query('ALTER TABLE vendor_availability ADD INDEX idx_vendor_id (vendor_id)');
    }

    if (indexNames.has('uq_vendor_date')) {
      console.log('  + Dropping old index `uq_vendor_date`...');
      await conn.query('ALTER TABLE vendor_availability DROP INDEX uq_vendor_date');
    }

    if (!indexNames.has('uq_vendor_date_service')) {
      console.log('  + Adding unique index `uq_vendor_date_service` (vendor_id, date, service_id)...');
      await conn.query('ALTER TABLE vendor_availability ADD UNIQUE KEY uq_vendor_date_service (vendor_id, date, service_id)');
    }

    if (!indexNames.has('idx_va_vendor_date')) {
      console.log('  + Adding index `idx_va_vendor_date` (vendor_id, date)...');
      await conn.query('ALTER TABLE vendor_availability ADD INDEX idx_va_vendor_date (vendor_id, date)');
    }

    if (!indexNames.has('idx_va_status')) {
      console.log('  + Adding index `idx_va_status` (status)...');
      await conn.query('ALTER TABLE vendor_availability ADD INDEX idx_va_status (status)');
    }

    console.log('2. Creating `vendor_booking_locks` table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS vendor_booking_locks (
        id VARCHAR(64) PRIMARY KEY,
        vendor_id VARCHAR(64) NOT NULL,
        service_id VARCHAR(64) NOT NULL DEFAULT 'ALL',
        booking_id VARCHAR(64) NULL,
        lock_token VARCHAR(64) NOT NULL UNIQUE,
        event_date DATE NOT NULL,
        status ENUM('LOCKED', 'CONFIRMED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'LOCKED',
        locked_by_user_id VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vbl_vendor_date (vendor_id, event_date, status),
        INDEX idx_vbl_expires (expires_at),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('3. Backfilling any legacy `vendor_availability` records...');
    await conn.query(`
      UPDATE vendor_availability 
      SET status = CASE WHEN is_booked = 1 THEN 'BLOCKED' ELSE 'AVAILABLE' END 
      WHERE status IS NULL OR status = ''
    `);

    console.log('✓ Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigration();
