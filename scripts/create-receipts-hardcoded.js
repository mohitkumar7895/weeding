const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'wedwithme',
    port: 3306,
  });

  await db.query(`
    CREATE TABLE IF NOT EXISTS receipts (
      id VARCHAR(36) PRIMARY KEY,
      receipt_reference VARCHAR(50) UNIQUE NOT NULL,
      payment_id VARCHAR(36) NOT NULL UNIQUE,
      booking_id VARCHAR(36) NOT NULL,
      invoice_id VARCHAR(36) NULL,
      amount DECIMAL(12, 2) NOT NULL,
      payment_date DATETIME NOT NULL,
      status VARCHAR(20) DEFAULT 'ISSUED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Receipts table ensured via hardcoded script.');
  await db.end();
}

run().catch(console.error);
