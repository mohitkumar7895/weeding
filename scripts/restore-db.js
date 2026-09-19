/**
 * WedWithMe - Database Restore Script
 * Usage: node scripts/restore-db.js [path/to/backup.json]
 */

const mysql = require('mysql2/promise');
const backupStorage = require('./backupStorage');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function restoreDatabase(specifiedFile) {
  let backupFile = specifiedFile;

  if (!backupFile) {
    backupFile = await backupStorage.getLatestBackup();
    if (!backupFile) {
      throw new Error('No backup files found.');
    }
  }

  console.log(`[Restore] Reading backup from: ${backupFile}`);
  const rawData = await backupStorage.readBackup(backupFile);
  const backupData = JSON.parse(rawData);

  console.log(`[Restore] Connecting to ${DB_NAME} on ${DB_HOST}:${DB_PORT}...`);
  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      connectTimeout: 10000,
    });
  } catch (error) {
    console.error(`[Restore Error] Failed to connect to MySQL database: ${error.message}`);
    process.exit(1);
  }

  try {
    // Temporarily disable foreign key checks for restore
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Restore all tables and data
    for (const [tableName, tableInfo] of Object.entries(backupData.tables)) {
      console.log(`[Restore] Restoring table ${tableName} (${tableInfo.row_count} rows)...`);
      await connection.query(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (id VARCHAR(36) PRIMARY KEY)`);

      // Insert rows in batches
      if (tableInfo.rows && tableInfo.rows.length > 0) {
        for (const row of tableInfo.rows) {
          const columns = Object.keys(row).map((k) => `\`${k}\``).join(', ');
          const placeholders = Object.keys(row).map(() => '?').join(', ');
          const values = Object.values(row).map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v));

          await connection.query(
            `REPLACE INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`,
            values
          );
        }
      }
    }

    // 2. Validate Restore Integrity
    console.log(`[Restore] Verifying database integrity...`);
    const requiredTables = ['users', 'vendors', 'bookings', 'payment_transactions'];
    const [tables] = await connection.query('SHOW TABLES');
    const existingTableNames = tables.map(t => t[`Tables_in_${DB_NAME}`]);

    for (const required of requiredTables) {
      if (!existingTableNames.includes(required)) {
         throw new Error(`Integrity Check Failed: Missing critical table '${required}' after restore.`);
      }
    }
    
    // Quick row check for users table as sanity check
    const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0 && backupData.tables['users']?.row_count > 0) {
       throw new Error('Integrity Check Failed: Users table is unexpectedly empty after restore.');
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[Restore] Database successfully restored and integrity verified.');
  } catch (error) {
    console.error(`[Restore Error] Failed during restore process:`, error);
    process.exit(1);
  } finally {
    if (connection) {
       // Ensure FK checks are re-enabled even if an error occurred
       try { await connection.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (e) {}
       await connection.end();
    }
  }
}

if (require.main === module) {
  const fileArg = process.argv[2];
  restoreDatabase(fileArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Restore Error]:', err);
      process.exit(1);
    });
}

module.exports = { restoreDatabase };
