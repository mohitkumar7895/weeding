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

  console.log('Applying Backup & Reliability Schema Updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS backup_configuration (
        id INT PRIMARY KEY DEFAULT 1,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
        retention_days INT NOT NULL DEFAULT 30,
        destination_reference VARCHAR(255) NULL,
        last_backup_timestamp DATETIME NULL,
        last_backup_status ENUM('SUCCESS', 'FAILED') NULL,
        last_failure_reason TEXT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure singleton record exists
    await db.query(`
      INSERT IGNORE INTO backup_configuration (id, is_enabled) VALUES (1, FALSE)
    `);

    console.log('Created table `backup_configuration`.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS backup_records (
        id VARCHAR(36) PRIMARY KEY,
        status ENUM('PLANNED', 'IN_PROGRESS', 'SUCCESS', 'FAILED') NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NULL,
        destination_reference VARCHAR(255) NULL,
        error_information TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `backup_records`.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS restore_tests (
        id VARCHAR(36) PRIMARY KEY,
        backup_reference VARCHAR(255) NOT NULL,
        test_date DATETIME NOT NULL,
        status ENUM('PLANNED', 'IN_PROGRESS', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PLANNED',
        environment_reference VARCHAR(255) NOT NULL,
        notes TEXT NULL,
        tested_by VARCHAR(36) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tested_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `restore_tests`.');

  } catch (err: any) {
    console.error('Error creating backup tables:', err.message);
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
