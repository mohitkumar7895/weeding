const mysql = require('mysql2/promise');

async function run() {
  require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  });

  console.log('Running refunds schema updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS cancellation_rules (
        id VARCHAR(36) PRIMARY KEY,
        initiator_role VARCHAR(20) NOT NULL,
        days_before_event_min INT NOT NULL,
        days_before_event_max INT NULL,
        refund_percentage DECIMAL(5,2) NOT NULL,
        penalty_percentage DECIMAL(5,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) { console.log(err.message); }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS cancellations (
        id VARCHAR(36) PRIMARY KEY,
        booking_id VARCHAR(36) NOT NULL,
        cancelled_by_role VARCHAR(20) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        reason TEXT,
        rule_applied_id VARCHAR(36) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) { console.log(err.message); }

  const alters = [
    `ALTER TABLE refunds ADD COLUMN original_amount DECIMAL(12, 2) DEFAULT 0.00`,
    `ALTER TABLE refunds ADD COLUMN deduction_amount DECIMAL(12, 2) DEFAULT 0.00`,
    `ALTER TABLE refunds ADD COLUMN cancellation_id VARCHAR(36) NULL`,
    `ALTER TABLE refunds ADD COLUMN rule_applied_id VARCHAR(36) NULL`,
    `ALTER TABLE refunds MODIFY COLUMN status VARCHAR(50) DEFAULT 'PENDING'`
  ];

  for (const sql of alters) {
    try {
      await db.query(sql);
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        console.log(err.message);
      }
    }
  }

  console.log('Refunds tables updated successfully.');
  await db.end();
}

run().catch(console.error);
