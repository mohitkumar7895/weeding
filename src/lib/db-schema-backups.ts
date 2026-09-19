import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runBackupSchemaMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Backup Monitoring Schema Updates...');

  try {
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `backup_logs` successfully.');
  } catch (err: any) {
    console.error('Error creating backup_logs table:', err.message);
  }

  try {
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `restore_test_records` successfully.');
  } catch (err: any) {
    console.error('Error creating restore_test_records table:', err.message);
  }

  // Seed default backup configuration in system_configuration
  const defaultConfigs = [
    { key: 'BACKUP_ENABLED', category: 'INFRASTRUCTURE', value: { enabled: false }, description: 'Enable/Disable automated database backups.' },
    { key: 'BACKUP_FREQUENCY_CRON', category: 'INFRASTRUCTURE', value: { cron: '0 2 * * *' }, description: 'Cron schedule for automated backups (Default: 2 AM daily).' },
    { key: 'BACKUP_RETENTION_DAYS', category: 'INFRASTRUCTURE', value: { days: 30 }, description: 'Number of days to retain automated backups before deletion.' }
  ];

  console.log('Seeding default infrastructure configurations...');
  for (const conf of defaultConfigs) {
    try {
      await db.execute(`
        INSERT INTO system_configuration (config_key, category, config_value, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [conf.key, conf.category, JSON.stringify(conf.value), conf.description]);
    } catch (err: any) {
      console.error(`Error seeding config ${conf.key}:`, err.message);
    }
  }

  await db.end();
  console.log('Backup schema migrations completed successfully!');
}

if (require.main === module) {
  runBackupSchemaMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
