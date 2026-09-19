import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runDisputesMigrations10b() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Disputes 10B schema updates...');

  try {
    await db.query(`
      ALTER TABLE disputes
      ADD COLUMN internal_notes TEXT NULL,
      ADD COLUMN escalation_reason TEXT NULL,
      ADD COLUMN escalated_at DATETIME NULL,
      ADD COLUMN escalated_by_user_id VARCHAR(36) NULL,
      ADD COLUMN deadline_date DATETIME NULL,
      ADD COLUMN resolved_at DATETIME NULL,
      ADD COLUMN resolved_by_user_id VARCHAR(36) NULL,
      ADD COLUMN resolution_notes TEXT NULL,
      ADD COLUMN resolution_reason TEXT NULL,
      ADD COLUMN related_financial_ref VARCHAR(100) NULL;
    `);
    console.log('Altered table `disputes` successfully with 10B fields.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Disputes table already has these 10B columns.');
    } else {
      console.error('Error altering disputes table:', err.message);
    }
  }

  await db.end();
  console.log('Dispute 10B migrations applied successfully!');
}

if (require.main === module) {
  runDisputesMigrations10b()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
