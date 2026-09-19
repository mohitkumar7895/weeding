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
    console.log('1. Checking and altering `bookings` table columns...');
    const [existingCols] = await conn.query('DESCRIBE bookings');
    const colNames = new Set(existingCols.map(c => c.Field));

    if (!colNames.has('event_location')) {
      console.log('  + Adding column `event_location`...');
      await conn.query("ALTER TABLE bookings ADD COLUMN event_location VARCHAR(255) NULL AFTER event_date");
    }

    if (!colNames.has('special_instructions')) {
      console.log('  + Adding column `special_instructions`...');
      await conn.query("ALTER TABLE bookings ADD COLUMN special_instructions TEXT NULL AFTER notes");
    }

    if (!colNames.has('add_ons_json')) {
      console.log('  + Adding column `add_ons_json`...');
      await conn.query("ALTER TABLE bookings ADD COLUMN add_ons_json JSON NULL AFTER special_instructions");
    }

    // Check indexes
    const [indexes] = await conn.query('SHOW INDEX FROM bookings');
    const indexNames = new Set(indexes.map(i => i.Key_name));

    if (!indexNames.has('idx_bookings_vendor_status')) {
      console.log('  + Adding index `idx_bookings_vendor_status` (vendor_id, status)...');
      await conn.query('ALTER TABLE bookings ADD INDEX idx_bookings_vendor_status (vendor_id, status)');
    }

    if (!indexNames.has('idx_bookings_vendor_date')) {
      console.log('  + Adding index `idx_bookings_vendor_date` (vendor_id, event_date)...');
      await conn.query('ALTER TABLE bookings ADD INDEX idx_bookings_vendor_date (vendor_id, event_date)');
    }

    console.log('✓ Bookings migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigration();
