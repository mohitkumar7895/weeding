import mysql from 'mysql2/promise';

function envDbConfig() {
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

let pool: mysql.Pool;

export function getPool(): mysql.Pool {
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool({
      ...envDbConfig(),
      waitForConnections: true,
      connectionLimit: process.env.VERCEL ? 5 : 20,
      queueLimit: 0,
      connectTimeout: 15000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      decimalNumbers: true,
      ssl:
        process.env.DB_SSL === 'true' || process.env.DB_SSL === '1'
          ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
          : undefined,
    });
  }
  return global._mysqlPool;
}

pool = getPool();

/**
 * Execute a parameterized MySQL query safely
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const connectionPool = getPool();
  try {
    const [results] = await connectionPool.query(sql, params);
    return results as T;
  } catch (error: any) {
    if (error.code === 'ER_BAD_DB_ERROR') {
      const cfg = envDbConfig();
      const adminConn = await mysql.createConnection({
        host: cfg.host,
        user: cfg.user,
        password: cfg.password,
        port: cfg.port,
      });
      await adminConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await adminConn.end();
      const [results] = await connectionPool.query(sql, params);
      return results as T;
    }
    console.error('MySQL Query Error:', error.message, 'SQL:', sql);
    throw error;
  }
}

/**
 * Execute multiple queries inside a single ACID transaction
 */
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connectionPool = getPool();
  const conn = await connectionPool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export default {
  query,
  transaction,
  getPool,
};
