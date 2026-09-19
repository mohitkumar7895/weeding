import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function getDbConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');

    let filterQuery = '';
    let params: any[] = [];

    if (status) {
      filterQuery += ' AND status = ?';
      params.push(status);
    }
    if (entityType) {
      filterQuery += ' AND entity_type = ?';
      params.push(entityType);
    }

    const db = await getDbConnection();

    // Summary counts
    const [counts]: any = await db.execute(`
      SELECT status, COUNT(*) as c FROM risk_flags GROUP BY status
    `);

    // List records
    const [flags]: any = await db.execute(`
      SELECT f.*, u.name as reviewer_name 
      FROM risk_flags f
      LEFT JOIN users u ON f.reviewed_by = u.id
      WHERE 1=1 ${filterQuery}
      ORDER BY f.created_at DESC
      LIMIT 100
    `, params);

    await db.end();

    const summary = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      DISMISSED: 0
    };

    for (const row of counts) {
      if (summary[row.status as keyof typeof summary] !== undefined) {
        summary[row.status as keyof typeof summary] = row.c;
      }
    }

    return NextResponse.json({ success: true, summary, flags });
  } catch (error: any) {
    console.error('Error fetching risk flags:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch risk flags' }, { status: 500 });
  }
}
