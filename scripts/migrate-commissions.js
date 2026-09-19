require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runMigration() {
  console.log(`Connecting to ${DB_NAME}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  try {
    // 1. Update commission_rules
    await db.query(`ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS tiers_json JSON NULL`);
    console.log('Added tiers_json to commission_rules');

    // 2. Update commission_records
    await db.query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(12, 2) DEFAULT 0.00`);
    await db.query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS vendor_net_amount DECIMAL(12, 2) DEFAULT 0.00`);
    await db.query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS rule_id VARCHAR(36) NULL`);
    await db.query(`ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS rule_version INT DEFAULT 1`);
    console.log('Added auditing columns to commission_records');

    // 3. Update payouts enum
    await db.query(`ALTER TABLE payouts MODIFY COLUMN status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'`);
    console.log('Updated payouts status ENUM');

    // 4. Update payout_attempts enum
    await db.query(`ALTER TABLE payout_attempts MODIFY COLUMN status ENUM('PENDING', 'SUCCESS', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'`);
    console.log('Updated payout_attempts status ENUM');

  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await db.end();
  }
}

runMigration();
