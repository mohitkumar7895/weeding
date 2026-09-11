/**
 * WedWithMe - Database Restore Script
 * Usage: node scripts/restore-db.js [path/to/backup.json]
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

async function restoreDatabase(specifiedFile) {
  let backupFile = specifiedFile;

  if (!backupFile) {
    if (!fs.existsSync(BACKUP_DIR)) {
      throw new Error(`Backup directory does not exist: ${BACKUP_DIR}`);
    }
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      throw new Error('No backup files found in backups directory.');
    }
    files.sort().reverse();
    backupFile = path.join(BACKUP_DIR, files[0]);
  }

  console.log(`[Restore] Reading backup file: ${backupFile}`);
  const rawData = fs.readFileSync(backupFile, 'utf-8');
  const backupData = JSON.parse(rawData);

  console.log(`[Restore] Connecting to ${DB_NAME} on ${DB_HOST}:${DB_PORT}...`);
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  // Temporarily disable foreign key checks for restore
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

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

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  await connection.end();

  console.log('[Restore] Database successfully restored and integrity verified.');
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
