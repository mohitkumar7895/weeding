const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function scanForRisks() {
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Scanning for deterministic risk signals...');

  let flagsCreated = 0;

  try {
    // 1. Payment Anomalies: Users with multiple failed payments
    const [failedPayments] = await db.execute(`
      SELECT user_id, COUNT(*) as fail_count
      FROM payments
      WHERE status = 'FAILED'
      GROUP BY user_id
      HAVING fail_count >= 3
    `);

    for (const record of failedPayments) {
      try {
        await db.execute(`
          INSERT INTO risk_flags (id, entity_type, entity_id, risk_category, reason, severity)
          VALUES (?, 'CUSTOMER', ?, 'PAYMENT_ANOMALY', ?, 'HIGH')
        `, [
          uuidv4(), 
          record.user_id, 
          `User has ${record.fail_count} failed payment attempts.`
        ]);
        flagsCreated++;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') console.error('Error inserting payment flag:', e.message);
      }
    }

    // 2. Booking Anomalies: Vendors with multiple cancelled bookings
    const [cancelledBookings] = await db.execute(`
      SELECT vendor_id, COUNT(*) as cancel_count
      FROM bookings
      WHERE status = 'CANCELLED'
      GROUP BY vendor_id
      HAVING cancel_count >= 5
    `);

    for (const record of cancelledBookings) {
      try {
        await db.execute(`
          INSERT INTO risk_flags (id, entity_type, entity_id, risk_category, reason, severity)
          VALUES (?, 'VENDOR', ?, 'HIGH_CANCELLATION_RATE', ?, 'MEDIUM')
        `, [
          uuidv4(), 
          record.vendor_id, 
          `Vendor has ${record.cancel_count} cancelled bookings.`
        ]);
        flagsCreated++;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') console.error('Error inserting booking flag:', e.message);
      }
    }

    console.log(`Scan complete. Inserted ${flagsCreated} new risk flags.`);
  } catch (error) {
    console.error('Error during risk scan:', error.message);
  } finally {
    await db.end();
  }
}

scanForRisks();
