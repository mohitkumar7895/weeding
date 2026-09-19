import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    // Check DB Connection
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatency = 0;

    try {
      const db = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: DB_PORT,
      });
      await db.execute('SELECT 1');
      await db.end();
      dbLatency = Date.now() - startTime;
    } catch (e: any) {
      dbStatus = 'unreachable';
    }

    return NextResponse.json({
      success: true,
      data: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency
        },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error: any) {
    console.error('Error in health check:', error);
    return NextResponse.json({ success: false, error: 'Health check failed.' }, { status: 500 });
  }
}
