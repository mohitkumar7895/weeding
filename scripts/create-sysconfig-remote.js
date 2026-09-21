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

  const defaultConfigs = [
    { key: 'GST_RATE', category: 'FINANCIAL', value: { rate: 18, type: 'PERCENTAGE' }, description: 'GST rate used for invoices.' },
    { key: 'PAYOUT_DELAY_DAYS', category: 'FINANCIAL', value: { days: 3 }, description: 'Days after booking completion before payout eligibility.' },
    { key: 'MATRIMONIAL_CHAT_ENABLED', category: 'PRODUCT', value: { enabled: true }, description: 'Enable customer-to-customer matrimonial chat.' },
    { key: 'AUTO_REFUND_ENABLED', category: 'FINANCIAL', value: { enabled: true }, description: 'Automatically process refunds for cancellations matching the policy.' },
    { key: 'DISCOVERY_DEFAULT_RADIUS', category: 'MARKETPLACE', value: { radius_km: 50 }, description: 'Default discovery search radius for customers.' },
    { key: 'MAX_PENDING_BOOKINGS', category: 'MARKETPLACE', value: { limit: 20 }, description: 'Max pending booking requests allowed per vendor.' }
  ];

  for (const conf of defaultConfigs) {
    try {
      await db.execute(`
        INSERT INTO system_configuration (config_key, category, config_value, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [conf.key, conf.category, JSON.stringify(conf.value), conf.description]);
    } catch(err) {
      console.log('Ignore insert error:', err.message);
    }
  }

  console.log('System_configuration table ensured via remote script.');
  await db.end();
}

run().catch(console.error);
