/**
 * WedWithMe - Automated Database Backup Script
 * Usage: node scripts/backup-db.js
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
const RETENTION_DAYS = 30;

async function backupDatabase() {
  console.log(`[Backup] Connecting to MySQL on ${DB_HOST}:${DB_PORT} for database ${DB_NAME}...`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `wedwithme_snapshot_${timestamp}.json`);

  const [tables] = await connection.query('SHOW TABLES');
  const tableKey = `Tables_in_${DB_NAME}`;
  const backupData = {
    metadata: {
      database: DB_NAME,
      host: DB_HOST,
      created_at: new Date().toISOString(),
      version: 'WedWithMe Part 2 v1.0',
    },
    tables: {},
  };

  for (const row of tables) {
    const tableName = row[tableKey];
    console.log(`[Backup] Dumping table: ${tableName}`);

    const [schemaRows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
    const [dataRows] = await connection.query(`SELECT * FROM \`${tableName}\``);

    backupData.tables[tableName] = {
      create_statement: schemaRows[0]['Create Table'],
      row_count: dataRows.length,
      rows: dataRows,
    };
  }

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`[Backup] Successfully exported ${Object.keys(backupData.tables).length} tables to ${backupFile}`);

  // Enforce retention policy
  const now = Date.now();
  const files = fs.readdirSync(BACKUP_DIR);
  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageDays > RETENTION_DAYS) {
      fs.unlinkSync(filePath);
      console.log(`[Backup] Purged stale backup exceeding ${RETENTION_DAYS} days: ${file}`);
    }
  }

  await connection.end();
  console.log('[Backup] Backup complete.');
}

if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Backup Error]:', err);
      process.exit(1);
    });
}

module.exports = { backupDatabase };
