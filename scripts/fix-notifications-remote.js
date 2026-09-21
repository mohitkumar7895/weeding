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

  console.log('Running notifications schema updates...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS system_notification_settings (
      event_type VARCHAR(100) PRIMARY KEY,
      category ENUM('ACCOUNT', 'BOOKING', 'PAYMENT', 'DISPUTE', 'SYSTEM') NOT NULL,
      in_app_enabled BOOLEAN DEFAULT TRUE,
      email_enabled BOOLEAN DEFAULT TRUE,
      sms_enabled BOOLEAN DEFAULT FALSE,
      push_enabled BOOLEAN DEFAULT FALSE,
      whatsapp_enabled BOOLEAN DEFAULT FALSE,
      is_mandatory BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const defaultEvents = [
    { event_type: 'ACCOUNT_CREATED', category: 'ACCOUNT', is_mandatory: false },
    { event_type: 'PASSWORD_RESET', category: 'ACCOUNT', is_mandatory: true },
    { event_type: 'SECURITY_ALERT', category: 'ACCOUNT', is_mandatory: true },
    { event_type: 'BOOKING_REQUESTED', category: 'BOOKING', is_mandatory: false },
    { event_type: 'BOOKING_CONFIRMED', category: 'BOOKING', is_mandatory: true },
    { event_type: 'BOOKING_CANCELLED', category: 'BOOKING', is_mandatory: true },
    { event_type: 'PAYMENT_SUCCESS', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'PAYMENT_FAILED', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'REFUND_PROCESSED', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'PAYOUT_INITIATED', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'DISPUTE_OPENED', category: 'DISPUTE', is_mandatory: true },
    { event_type: 'DISPUTE_RESOLVED', category: 'DISPUTE', is_mandatory: true },
    { event_type: 'MARKETPLACE_UPDATE', category: 'SYSTEM', is_mandatory: false },
    { event_type: 'VENDOR_APPROVED', category: 'SYSTEM', is_mandatory: true }
  ];
  
  for (const ev of defaultEvents) {
    try {
      await db.execute(`
        INSERT INTO system_notification_settings (event_type, category, is_mandatory)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE category = VALUES(category), is_mandatory = VALUES(is_mandatory)
      `, [ev.event_type, ev.category, ev.is_mandatory]);
    } catch(err) {
      console.log('Seed error:', err.message);
    }
  }

  console.log('Notifications tables updated successfully.');
  await db.end();
}

run().catch(console.error);
