const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await db.query(`ALTER TABLE refunds ADD COLUMN IF NOT EXISTS cancellation_id VARCHAR(36) NULL`);
    await db.query(`ALTER TABLE refunds ADD COLUMN IF NOT EXISTS rule_applied_id VARCHAR(36) NULL`);
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
