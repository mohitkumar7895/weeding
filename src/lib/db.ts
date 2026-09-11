import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

// Global pool cache to prevent multiple pools during Next.js hot reloading
declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

let pool: mysql.Pool;

export function getPool(): mysql.Pool {
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      decimalNumbers: true,
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
    // If the database doesn't exist yet, initialize it
    if (error.code === 'ER_BAD_DB_ERROR') {
      const adminConn = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        port: DB_PORT,
      });
      await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await adminConn.end();
      // Retry query
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
