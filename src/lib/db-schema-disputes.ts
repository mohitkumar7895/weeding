import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runDisputesMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Disputes & Evidence schema updates...');

  try {
    await db.query(`
      ALTER TABLE disputes
      ADD COLUMN type ENUM('DISPUTE', 'CHARGEBACK') DEFAULT 'DISPUTE',
      ADD COLUMN amount DECIMAL(12, 2) NULL,
      ADD COLUMN description TEXT NULL,
      ADD COLUMN payment_reference VARCHAR(100) NULL,
      ADD COLUMN responsibility ENUM('CUSTOMER', 'VENDOR', 'PLATFORM', 'UNDETERMINED') DEFAULT 'UNDETERMINED',
      MODIFY COLUMN status ENUM('OPEN', 'UNDER_REVIEW', 'EVIDENCE_REQUIRED', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED') DEFAULT 'OPEN';
    `);
    console.log('Altered table `disputes` successfully.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Disputes table already has these columns.');
    } else {
      console.error('Error altering disputes table:', err.message);
    }
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS dispute_evidence (
        id VARCHAR(36) PRIMARY KEY,
        dispute_id VARCHAR(36) NOT NULL,
        uploaded_by_user_id VARCHAR(36) NOT NULL,
        file_url VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        file_size INT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `dispute_evidence` successfully.');
  } catch (err: any) {
    console.error('Error creating dispute_evidence table:', err.message);
  }

  await db.end();
  console.log('Dispute migrations applied successfully!');
}

if (require.main === module) {
  runDisputesMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
