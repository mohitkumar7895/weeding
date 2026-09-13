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
    console.log('1. Checking columns in `vendor_services` table...');
    const [existingCols] = await conn.query('DESCRIBE vendor_services');
    const existingColNames = new Set(existingCols.map(c => c.Field));

    const columnAdditions = [
      { col: 'category_id', sql: `ALTER TABLE vendor_services ADD COLUMN category_id VARCHAR(36) NULL` },
      { col: 'service_location', sql: `ALTER TABLE vendor_services ADD COLUMN service_location VARCHAR(191) NULL` },
      { col: 'rejection_reason', sql: `ALTER TABLE vendor_services ADD COLUMN rejection_reason TEXT NULL` },
      { col: 'updated_at', sql: `ALTER TABLE vendor_services ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` },
    ];

    for (const item of columnAdditions) {
      if (!existingColNames.has(item.col)) {
        console.log(`  + Adding column \`${item.col}\`...`);
        await conn.query(item.sql);
      } else {
        console.log(`  - Column \`${item.col}\` already exists.`);
      }
    }

    // Ensure index on category_id
    try {
      await conn.query('CREATE INDEX idx_vs_cat ON vendor_services (category_id)');
      console.log('  + Added index idx_vs_cat.');
    } catch {}

    // Backfill any existing services with their vendor's primary category_id and city
    console.log('2. Backfilling existing vendor services with category and location...');
    await conn.query(`
      UPDATE vendor_services vs
      JOIN vendors v ON vs.vendor_id = v.id
      SET 
        vs.category_id = COALESCE(vs.category_id, v.category_id),
        vs.service_location = COALESCE(vs.service_location, v.city)
    `);
    console.log('  ✓ Existing vendor services backfilled.');

    console.log('\nMigration for `vendor_services` completed successfully!');
  } finally {
    await conn.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
