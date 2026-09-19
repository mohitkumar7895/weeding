import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runNotificationTemplateMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Notification Template & Delivery Log Schema Updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id VARCHAR(36) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        channel ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP') NOT NULL,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        version INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_event_channel_active (event_type, channel, is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `notification_templates` successfully.');
  } catch (err: any) {
    console.error('Error creating notification_templates table:', err.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_delivery_logs (
        id VARCHAR(36) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        recipient_type ENUM('CUSTOMER', 'VENDOR', 'ADMIN') NOT NULL,
        recipient_id VARCHAR(36) NOT NULL,
        channel ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP') NOT NULL,
        template_id VARCHAR(36) NULL,
        status ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RETRY') NOT NULL DEFAULT 'QUEUED',
        failure_reason TEXT NULL,
        entity_id VARCHAR(36) NULL,
        entity_type VARCHAR(50) NULL,
        idempotency_key VARCHAR(100) UNIQUE NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME NULL,
        delivered_at DATETIME NULL,
        FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL,
        INDEX idx_recipient (recipient_type, recipient_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `notification_delivery_logs` successfully.');
  } catch (err: any) {
    console.error('Error creating notification_delivery_logs table:', err.message);
  }

  await db.end();
  console.log('Migration completed successfully!');
}

if (require.main === module) {
  runNotificationTemplateMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
