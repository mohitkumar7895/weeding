/**
 * WedWithMe - Automated Database Backup Script
 * Usage: node scripts/backup-db.js
 */

const mysql = require('mysql2/promise');
const backupStorage = require('./backupStorage');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

async function backupDatabase() {
  console.log(`[Backup] Connecting to MySQL on ${DB_HOST}:${DB_PORT} for database ${DB_NAME}...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      connectTimeout: 10000 // Safe timeout for reliability
    });
  } catch (error) {
    console.error(`[Backup Error] Failed to connect to MySQL database: ${error.message}`);
    process.exit(1);
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `wedwithme_snapshot_${timestamp}.json`;

    const [tables] = await connection.query('SHOW TABLES');
    const tableKey = `Tables_in_${DB_NAME}`;
    const backupData = {
      metadata: {
        database: DB_NAME,
        host: DB_HOST,
        created_at: new Date().toISOString(),
        version: 'WedWithMe v1.0 - Configurable Backup',
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

    // Use Abstraction
    await backupStorage.saveBackup(filename, JSON.stringify(backupData, null, 2));
    console.log(`[Backup] Successfully exported ${Object.keys(backupData.tables).length} tables.`);

    // Enforce retention policy
    await backupStorage.enforceRetention(RETENTION_DAYS);

  } catch (error) {
    console.error(`[Backup Error] Database dump failed:`, error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
  
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
