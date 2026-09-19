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
    console.log('1. Checking and altering `vendor_packages` table columns...');
    const [existingCols] = await conn.query('DESCRIBE vendor_packages');
    const colNames = new Set(existingCols.map(c => c.Field));

    if (!colNames.has('service_id')) {
      console.log('  + Adding column `service_id`...');
      await conn.query('ALTER TABLE vendor_packages ADD COLUMN service_id VARCHAR(36) NULL');
    } else {
      console.log('  - Column `service_id` already exists.');
    }

    if (!colNames.has('package_tier')) {
      console.log('  + Adding column `package_tier`...');
      await conn.query(`ALTER TABLE vendor_packages ADD COLUMN package_tier ENUM('BASIC', 'STANDARD', 'PREMIUM', 'CUSTOM') DEFAULT 'STANDARD'`);
    } else {
      console.log('  - Column `package_tier` already exists.');
    }

    if (!colNames.has('is_active')) {
      console.log('  + Adding column `is_active`...');
      await conn.query('ALTER TABLE vendor_packages ADD COLUMN is_active BOOLEAN DEFAULT TRUE');
    } else {
      console.log('  - Column `is_active` already exists.');
    }

    if (!colNames.has('rejection_reason')) {
      console.log('  + Adding column `rejection_reason`...');
      await conn.query('ALTER TABLE vendor_packages ADD COLUMN rejection_reason TEXT NULL');
    } else {
      console.log('  - Column `rejection_reason` already exists.');
    }

    if (!colNames.has('updated_at')) {
      console.log('  + Adding column `updated_at`...');
      await conn.query('ALTER TABLE vendor_packages ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    } else {
      console.log('  - Column `updated_at` already exists.');
    }

    // Ensure moderation_status column supports ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')
    try {
      await conn.query(`ALTER TABLE vendor_packages MODIFY COLUMN moderation_status ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED') DEFAULT 'PENDING_REVIEW'`);
      console.log('  + Updated `moderation_status` ENUM definition.');
    } catch (err) {
      console.log('  - Note on moderation_status modify:', err.message);
    }

    // Add indexes for performance
    try {
      await conn.query('CREATE INDEX idx_vp_service ON vendor_packages (service_id)');
      console.log('  + Created index idx_vp_service.');
    } catch {}

    try {
      await conn.query('CREATE INDEX idx_vp_tier ON vendor_packages (package_tier)');
      console.log('  + Created index idx_vp_tier.');
    } catch {}

    // Add Foreign Key for service_id if not present
    try {
      await conn.query(`
        ALTER TABLE vendor_packages 
        ADD CONSTRAINT fk_vp_service 
        FOREIGN KEY (service_id) REFERENCES vendor_services(id) ON DELETE CASCADE
      `);
      console.log('  + Added foreign key constraint fk_vp_service.');
    } catch (err) {
      console.log('  - Foreign key fk_vp_service info:', err.message);
    }

    // 2. Create vendor_add_ons table
    console.log('\n2. Creating `vendor_add_ons` table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS vendor_add_ons (
        id VARCHAR(36) PRIMARY KEY,
        vendor_id VARCHAR(36) NOT NULL,
        service_id VARCHAR(36) NULL,
        package_id VARCHAR(36) NULL,
        name VARCHAR(191) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES vendor_services(id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES vendor_packages(id) ON DELETE SET NULL,
        INDEX idx_addon_vendor (vendor_id),
        INDEX idx_addon_service (service_id),
        INDEX idx_addon_package (package_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ `vendor_add_ons` table ready.');

    // 3. Backfill any existing packages
    console.log('\n3. Backfilling existing package records with service_id if available...');
    const [packages] = await conn.query('SELECT id, vendor_id, name, service_id, package_tier FROM vendor_packages');
    for (const pkg of packages) {
      // If service_id is null, attempt to link with first service for this vendor
      if (!pkg.service_id) {
        const [services] = await conn.query('SELECT id FROM vendor_services WHERE vendor_id = ? LIMIT 1', [pkg.vendor_id]);
        if (services.length > 0) {
          await conn.query('UPDATE vendor_packages SET service_id = ? WHERE id = ?', [services[0].id, pkg.id]);
          console.log(`  Linked package ${pkg.id} to service ${services[0].id}`);
        }
      }

      // Deduce tier from name if needed
      if (!pkg.package_tier || pkg.package_tier === 'STANDARD') {
        const lowerName = (pkg.name || '').toLowerCase();
        let tier = 'STANDARD';
        if (lowerName.includes('basic') || lowerName.includes('silver') || lowerName.includes('essential')) {
          tier = 'BASIC';
        } else if (lowerName.includes('premium') || lowerName.includes('royal') || lowerName.includes('luxury') || lowerName.includes('gold')) {
          tier = 'PREMIUM';
        }
        await conn.query('UPDATE vendor_packages SET package_tier = ? WHERE id = ?', [tier, pkg.id]);
      }
    }
    console.log('  ✓ Packages backfilled successfully.');

    console.log('\nMigration completed successfully!');
  } finally {
    await conn.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
