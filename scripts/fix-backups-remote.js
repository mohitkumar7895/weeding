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

  console.log('Running backups schema updates...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS backup_logs (
      id VARCHAR(36) PRIMARY KEY,
      status ENUM('SUCCESS', 'FAILED', 'IN_PROGRESS') NOT NULL,
      destination_reference VARCHAR(255) NULL,
      file_size_bytes BIGINT NULL,
      failure_reason TEXT NULL,
      started_at DATETIME NOT NULL,
      completed_at DATETIME NULL,
      INDEX idx_backup_status (status),
      INDEX idx_backup_started_at (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS restore_test_records (
      id VARCHAR(36) PRIMARY KEY,
      test_environment VARCHAR(100) NOT NULL,
      backup_reference VARCHAR(255) NOT NULL,
      status ENUM('PLANNED', 'IN_PROGRESS', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PLANNED',
      tested_by VARCHAR(36) NULL,
      notes_and_results TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tested_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const defaultConfigs = [
    { key: 'BACKUP_ENABLED', category: 'INFRASTRUCTURE', value: { enabled: false }, description: 'Enable/Disable automated database backups.' },
    { key: 'BACKUP_FREQUENCY_CRON', category: 'INFRASTRUCTURE', value: { cron: '0 2 * * *' }, description: 'Cron schedule for automated backups (Default: 2 AM daily).' },
    { key: 'BACKUP_RETENTION_DAYS', category: 'INFRASTRUCTURE', value: { days: 30 }, description: 'Number of days to retain automated backups before deletion.' }
  ];

  for (const conf of defaultConfigs) {
    try {
      await db.execute(`
        INSERT INTO system_configuration (config_key, category, config_value, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [conf.key, conf.category, JSON.stringify(conf.value), conf.description]);
    } catch(err) {
      console.log('Seed error:', err.message);
    }
  }

  console.log('Backups tables updated successfully.');
  await db.end();
}

run().catch(console.error);
