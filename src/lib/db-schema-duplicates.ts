import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runDuplicateSchemaMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Duplicate Profile Schema Updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS duplicate_profile_cases (
        id VARCHAR(36) PRIMARY KEY,
        primary_profile_id VARCHAR(36) NOT NULL,
        suspected_duplicate_id VARCHAR(36) NOT NULL,
        detection_signals TEXT NOT NULL,
        status ENUM('OPEN', 'UNDER_REVIEW', 'CONFIRMED_DUPLICATE', 'NOT_DUPLICATE', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
        reviewed_by VARCHAR(36) NULL,
        review_notes TEXT NULL,
        risk_flag_id VARCHAR(36) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_duplicate_pair (primary_profile_id, suspected_duplicate_id),
        FOREIGN KEY (primary_profile_id) REFERENCES customer_profiles(user_id) ON DELETE CASCADE,
        FOREIGN KEY (suspected_duplicate_id) REFERENCES customer_profiles(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (risk_flag_id) REFERENCES risk_flags(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `duplicate_profile_cases` successfully.');
  } catch (err: any) {
    console.error('Error creating duplicate_profile_cases table:', err.message);
  }

  await db.end();
  console.log('Duplicate schema migrations completed successfully!');
}

if (require.main === module) {
  runDuplicateSchemaMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
