import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runGovernanceMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Governance Schema Updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_configuration (
        config_key VARCHAR(100) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        config_value JSON NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(36) NULL,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `system_configuration` successfully.');
  } catch (err: any) {
    console.error('Error creating system_configuration table:', err.message);
  }

  // Seed default configuration
  const defaultConfigs = [
    { key: 'GST_RATE', category: 'FINANCIAL', value: { rate: 18, type: 'PERCENTAGE' }, description: 'GST rate used for invoices.' },
    { key: 'PAYOUT_DELAY_DAYS', category: 'FINANCIAL', value: { days: 3 }, description: 'Days after booking completion before payout eligibility.' },
    { key: 'MATRIMONIAL_CHAT_ENABLED', category: 'PRODUCT', value: { enabled: true }, description: 'Enable customer-to-customer matrimonial chat.' },
    { key: 'AUTO_REFUND_ENABLED', category: 'FINANCIAL', value: { enabled: true }, description: 'Automatically process refunds for cancellations matching the policy.' },
    { key: 'DISCOVERY_DEFAULT_RADIUS', category: 'MARKETPLACE', value: { radius_km: 50 }, description: 'Default discovery search radius for customers.' },
    { key: 'MAX_PENDING_BOOKINGS', category: 'MARKETPLACE', value: { limit: 20 }, description: 'Max pending booking requests allowed per vendor.' }
  ];

  console.log('Seeding default system configurations...');
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
  console.log('Governance schema migrations completed successfully!');
}

if (require.main === module) {
  runGovernanceMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
