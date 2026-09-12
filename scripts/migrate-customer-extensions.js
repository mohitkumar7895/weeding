const mysql = require('mysql2/promise');

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wedwithme',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  console.log('Running customer extensions migration on MySQL...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_reports (
      id VARCHAR(36) PRIMARY KEY,
      reporter_user_id VARCHAR(36) NOT NULL,
      reported_user_id VARCHAR(36) NOT NULL,
      reported_profile_id VARCHAR(36) NULL,
      category ENUM('ABUSE', 'FRAUD', 'IMPERSONATION') NOT NULL,
      description TEXT NULL,
      status ENUM('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED') DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_reports_reported (reported_user_id, status),
      INDEX idx_reports_reporter (reporter_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS account_deletion_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      reason TEXT NULL,
      feedback TEXT NULL,
      status ENUM('REQUESTED', 'PROCESSING', 'COMPLETED', 'CANCELLED') DEFAULT 'REQUESTED',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      scheduled_deletion_at DATETIME NULL,
      processed_at DATETIME NULL,
      INDEX idx_deletion_user (user_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS blocked_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      blocked_user_id VARCHAR(36) NOT NULL,
      reason VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_block (user_id, blocked_user_id),
      INDEX idx_blocked_user (blocked_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ Migration executed successfully!');
  await db.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
