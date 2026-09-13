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
    console.log('1. Checking and creating `vendor_categories` table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS vendor_categories (
        id VARCHAR(36) PRIMARY KEY,
        vendor_id VARCHAR(36) NOT NULL,
        category_id VARCHAR(36) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_vendor_category (vendor_id, category_id),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ `vendor_categories` table ready.');

    console.log('2. Adding Business Profile columns to `vendors` table...');
    const columnAdditions = [
      { col: 'state', sql: `ALTER TABLE vendors ADD COLUMN state VARCHAR(50) DEFAULT 'Rajasthan'` },
      { col: 'country', sql: `ALTER TABLE vendors ADD COLUMN country VARCHAR(50) DEFAULT 'India'` },
      { col: 'pincode', sql: `ALTER TABLE vendors ADD COLUMN pincode VARCHAR(20) DEFAULT NULL` },
      { col: 'service_area_cities', sql: `ALTER TABLE vendors ADD COLUMN service_area_cities TEXT DEFAULT NULL` },
      { col: 'service_radius_km', sql: `ALTER TABLE vendors ADD COLUMN service_radius_km INT DEFAULT 50` },
      { col: 'travels_to_venue', sql: `ALTER TABLE vendors ADD COLUMN travels_to_venue BOOLEAN DEFAULT TRUE` },
      { col: 'experience_years', sql: `ALTER TABLE vendors ADD COLUMN experience_years INT DEFAULT 1` },
      { col: 'year_established', sql: `ALTER TABLE vendors ADD COLUMN year_established INT DEFAULT NULL` },
      { col: 'business_phone', sql: `ALTER TABLE vendors ADD COLUMN business_phone VARCHAR(50) DEFAULT NULL` },
      { col: 'business_email', sql: `ALTER TABLE vendors ADD COLUMN business_email VARCHAR(100) DEFAULT NULL` },
      { col: 'website_url', sql: `ALTER TABLE vendors ADD COLUMN website_url VARCHAR(255) DEFAULT NULL` },
      { col: 'instagram_handle', sql: `ALTER TABLE vendors ADD COLUMN instagram_handle VARCHAR(100) DEFAULT NULL` },
      { col: 'profile_status', sql: `ALTER TABLE vendors ADD COLUMN profile_status ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED') DEFAULT 'APPROVED'` },
    ];

    const [existingCols] = await conn.query('DESCRIBE vendors');
    const existingColNames = new Set(existingCols.map(c => c.Field));

    for (const item of columnAdditions) {
      if (!existingColNames.has(item.col)) {
        console.log(`  + Adding column \`${item.col}\`...`);
        await conn.query(item.sql);
      } else {
        console.log(`  - Column \`${item.col}\` already exists.`);
      }
    }

    console.log('3. Synchronizing existing primary categories into `vendor_categories` table...');
    const [vendors] = await conn.query('SELECT id, category_id, city FROM vendors');
    for (const v of vendors) {
      if (v.category_id) {
        const mappingId = `vc_${v.id.substring(0, 16)}_${v.category_id.substring(0, 16)}`;
        await conn.query(
          `INSERT IGNORE INTO vendor_categories (id, vendor_id, category_id, is_primary) VALUES (?, ?, ?, TRUE)`,
          [mappingId, v.id, v.category_id]
        );
      }
      // Populate default service area with vendor's own city if null
      await conn.query(
        `UPDATE vendors SET 
          service_area_cities = COALESCE(service_area_cities, ?),
          state = COALESCE(state, 'Delhi NCR')
         WHERE id = ?`,
        [JSON.stringify([v.city || 'Delhi NCR']), v.id]
      );
    }
    console.log(`  ✓ Synchronized categories for ${vendors.length} vendors.`);

    console.log('\nMigration completed successfully!');
  } finally {
    await conn.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
