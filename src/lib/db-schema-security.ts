import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runSecuritySchemaMigrations() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT}...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Applying Security Schema Updates...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS api_security_logs (
        id VARCHAR(36) PRIMARY KEY,
        event_type ENUM('RATE_LIMIT_EXCEEDED', 'AUTH_FAILURE', 'UNAUTHORIZED_ACCESS', 'MALFORMED_REQUEST') NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_id VARCHAR(36) NULL,
        details TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_type (event_type),
        INDEX idx_ip_address (ip_address),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Created table `api_security_logs` successfully.');
  } catch (err: any) {
    console.error('Error creating api_security_logs table:', err.message);
  }

  // Seed default security configurations in system_configuration
  const defaultConfigs = [
    { key: 'RATE_LIMIT_GLOBAL', category: 'SECURITY', value: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, description: 'Global API rate limit (window time in ms, max requests).' },
    { key: 'CORS_ALLOWED_ORIGINS', category: 'SECURITY', value: { origins: ['http://localhost:3000'] }, description: 'Array of allowed CORS origins.' },
    { key: 'REQUIRE_STRICT_AUTH', category: 'SECURITY', value: { enabled: true }, description: 'Require strict JWT validation for all protected endpoints.' }
  ];

  console.log('Seeding default security configurations...');
  for (const conf of defaultConfigs) {
    try {
      await db.execute(`
        INSERT INTO system_configuration (config_key, category, config_value, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [conf.key, conf.category, JSON.stringify(conf.value), conf.description]);
    } catch (err: any) {
      console.error(`Error seeding config ${conf.key}:`, err.message);
    }
  }

  await db.end();
  console.log('Security schema migrations completed successfully!');
}

if (require.main === module) {
  runSecuritySchemaMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
