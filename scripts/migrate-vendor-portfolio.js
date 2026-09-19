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
    console.log('1. Checking and altering `vendor_portfolios` table columns...');
    const [existingCols] = await conn.query('DESCRIBE vendor_portfolios');
    const colNames = new Set(existingCols.map(c => c.Field));

    if (!colNames.has('media_type')) {
      console.log('  + Adding column `media_type`...');
      await conn.query(`ALTER TABLE vendor_portfolios ADD COLUMN media_type ENUM('IMAGE', 'VIDEO') NOT NULL DEFAULT 'IMAGE'`);
    } else {
      console.log('  - Column `media_type` already exists.');
    }

    if (!colNames.has('media_url')) {
      console.log('  + Adding column `media_url`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN media_url VARCHAR(500) NULL');
      // Backfill media_url from image_url
      await conn.query('UPDATE vendor_portfolios SET media_url = image_url WHERE media_url IS NULL AND image_url IS NOT NULL');
    } else {
      console.log('  - Column `media_url` already exists.');
    }

    if (!colNames.has('thumbnail_url')) {
      console.log('  + Adding column `thumbnail_url`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN thumbnail_url VARCHAR(500) NULL');
    } else {
      console.log('  - Column `thumbnail_url` already exists.');
    }

    if (!colNames.has('title')) {
      console.log('  + Adding column `title`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN title VARCHAR(191) NULL');
    } else {
      console.log('  - Column `title` already exists.');
    }

    if (!colNames.has('description')) {
      console.log('  + Adding column `description`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN description TEXT NULL');
    } else {
      console.log('  - Column `description` already exists.');
    }

    if (!colNames.has('file_size')) {
      console.log('  + Adding column `file_size`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN file_size INT UNSIGNED DEFAULT 0');
    } else {
      console.log('  - Column `file_size` already exists.');
    }

    if (!colNames.has('mime_type')) {
      console.log('  + Adding column `mime_type`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN mime_type VARCHAR(100) NULL');
    } else {
      console.log('  - Column `mime_type` already exists.');
    }

    if (!colNames.has('storage_provider')) {
      console.log('  + Adding column `storage_provider`...');
      await conn.query(`ALTER TABLE vendor_portfolios ADD COLUMN storage_provider VARCHAR(50) DEFAULT 'LOCAL'`);
    } else {
      console.log('  - Column `storage_provider` already exists.');
    }

    if (!colNames.has('moderation_status')) {
      console.log('  + Adding column `moderation_status`...');
      await conn.query(`ALTER TABLE vendor_portfolios ADD COLUMN moderation_status ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'INACTIVE') NOT NULL DEFAULT 'PENDING_REVIEW'`);
    } else {
      console.log('  - Column `moderation_status` already exists.');
    }

    if (!colNames.has('rejection_reason')) {
      console.log('  + Adding column `rejection_reason`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN rejection_reason TEXT NULL');
    } else {
      console.log('  - Column `rejection_reason` already exists.');
    }

    if (!colNames.has('is_active')) {
      console.log('  + Adding column `is_active`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
    } else {
      console.log('  - Column `is_active` already exists.');
    }

    if (!colNames.has('display_order')) {
      console.log('  + Adding column `display_order`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN display_order INT DEFAULT 0');
    } else {
      console.log('  - Column `display_order` already exists.');
    }

    if (!colNames.has('service_id')) {
      console.log('  + Adding column `service_id`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN service_id VARCHAR(64) NULL');
    } else {
      console.log('  - Column `service_id` already exists.');
    }

    if (!colNames.has('updated_at')) {
      console.log('  + Adding column `updated_at`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    } else {
      console.log('  - Column `updated_at` already exists.');
    }

    console.log('\n2. Checking and creating performance indexes on `vendor_portfolios`...');
    const [existingIndexes] = await conn.query('SHOW INDEX FROM vendor_portfolios');
    const indexNames = new Set(existingIndexes.map(i => i.Key_name));

    if (!indexNames.has('idx_vp_moderation')) {
      console.log('  + Adding index `idx_vp_moderation`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD INDEX idx_vp_moderation (moderation_status)');
    }

    if (!indexNames.has('idx_vp_media_type')) {
      console.log('  + Adding index `idx_vp_media_type`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD INDEX idx_vp_media_type (media_type)');
    }

    if (!indexNames.has('idx_vp_is_active')) {
      console.log('  + Adding index `idx_vp_is_active`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD INDEX idx_vp_is_active (is_active)');
    }

    if (!indexNames.has('idx_vp_service_id')) {
      console.log('  + Adding index `idx_vp_service_id`...');
      await conn.query('ALTER TABLE vendor_portfolios ADD INDEX idx_vp_service_id (service_id)');
    }

    console.log('\nMigration completed successfully for `vendor_portfolios`!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigration();
