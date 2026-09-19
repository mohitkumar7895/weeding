import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runRiskSchemaMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Risk Schema Updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS risk_flags (
        id VARCHAR(36) PRIMARY KEY,
        entity_type ENUM('CUSTOMER', 'VENDOR', 'PROFILE', 'BOOKING', 'PAYMENT') NOT NULL,
        entity_id VARCHAR(36) NOT NULL,
        risk_category VARCHAR(100) NOT NULL,
        reason TEXT NOT NULL,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
        status ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
        reviewed_by VARCHAR(36) NULL,
        review_notes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_risk_entity_category (entity_type, entity_id, risk_category),
        INDEX idx_risk_status (status),
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `risk_flags` successfully.');
  } catch (err: any) {
    console.error('Error creating risk_flags table:', err.message);
  }

  await db.end();
  console.log('Risk schema migrations completed successfully!');
}

if (require.main === module) {
  runRiskSchemaMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
