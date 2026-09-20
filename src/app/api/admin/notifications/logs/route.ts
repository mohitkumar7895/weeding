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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const search = searchParams.get('search'); // entityId or recipientId
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const db = await getDbConnection();

    let query = `
      SELECT l.*, t.version as template_version
      FROM notification_delivery_logs l
      LEFT JOIN notification_templates t ON l.template_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (eventType) { query += ' AND l.event_type = ?'; params.push(eventType); }
    if (channel) { query += ' AND l.channel = ?'; params.push(channel); }
    if (status) { query += ' AND l.status = ?'; params.push(status); }
    if (search) {
      query += ` AND (l.entity_id LIKE ? OR l.recipient_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM notification_delivery_logs l WHERE 1=1 ${query.substring(query.indexOf('WHERE 1=1') + 9)}`;
    const [countRows]: any = await db.execute(countQuery, params);
    const total = countRows?.[0]?.total || 0;

    query += ` ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const [rows]: any = await db.execute(query, params);
    await db.end();

    return NextResponse.json({ 
      success: true, 
      logs: rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}
