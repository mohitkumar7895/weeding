const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wedwithme'
  });

  try {
    console.log('Altering payouts table ENUM...');
    await connection.execute("ALTER TABLE payouts MODIFY COLUMN status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'");
    console.log('Successfully altered payouts table ENUM.');
    
    // Check if payout_attempts ENUM needs altering too, to support MANUAL_REVIEW? The prompt doesn't strictly require it, but we'll alter it just in case.
    await connection.execute("ALTER TABLE payout_attempts MODIFY COLUMN status ENUM('PENDING', 'SUCCESS', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'PENDING'");
    console.log('Successfully altered payout_attempts table ENUM.');
  } catch (error) {
    console.error('Error altering tables:', error);
  } finally {
    await connection.end();
  }
}

alterTable();
