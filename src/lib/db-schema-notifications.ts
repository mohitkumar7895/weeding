import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

const defaultEvents = [
  // Category: ACCOUNT
  { event_type: 'ACCOUNT_CREATED', category: 'ACCOUNT', is_mandatory: false },
  { event_type: 'PASSWORD_RESET', category: 'ACCOUNT', is_mandatory: true },
  { event_type: 'SECURITY_ALERT', category: 'ACCOUNT', is_mandatory: true },
  // Category: BOOKING
  { event_type: 'BOOKING_REQUESTED', category: 'BOOKING', is_mandatory: false },
  { event_type: 'BOOKING_CONFIRMED', category: 'BOOKING', is_mandatory: true },
  { event_type: 'BOOKING_CANCELLED', category: 'BOOKING', is_mandatory: true },
  // Category: PAYMENT
  { event_type: 'PAYMENT_SUCCESS', category: 'PAYMENT', is_mandatory: true },
  { event_type: 'PAYMENT_FAILED', category: 'PAYMENT', is_mandatory: true },
  { event_type: 'REFUND_PROCESSED', category: 'PAYMENT', is_mandatory: true },
  { event_type: 'PAYOUT_INITIATED', category: 'PAYMENT', is_mandatory: true },
  // Category: DISPUTE
  { event_type: 'DISPUTE_OPENED', category: 'DISPUTE', is_mandatory: true },
  { event_type: 'DISPUTE_RESOLVED', category: 'DISPUTE', is_mandatory: true },
  // Category: SYSTEM
  { event_type: 'MARKETPLACE_UPDATE', category: 'SYSTEM', is_mandatory: false },
  { event_type: 'VENDOR_APPROVED', category: 'SYSTEM', is_mandatory: true }
];

async function runNotificationMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Notification Schema Updates...');

  try {
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `system_notification_settings` successfully.');
  } catch (err: any) {
    console.error('Error creating system_notification_settings table:', err.message);
  }

  console.log('Seeding default notification configurations...');
  for (const ev of defaultEvents) {
    try {
      await db.execute(`
        INSERT INTO system_notification_settings (event_type, category, is_mandatory)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE category = VALUES(category), is_mandatory = VALUES(is_mandatory)
      `, [ev.event_type, ev.category, ev.is_mandatory]);
    } catch (err: any) {
      console.error(`Error seeding event ${ev.event_type}:`, err.message);
    }
  }

  await db.end();
  console.log('Notification configurations seeded successfully!');
}

if (require.main === module) {
  runNotificationMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
