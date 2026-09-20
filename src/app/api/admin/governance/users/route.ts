import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';
import { uuidv4 } from '@/lib/uuid';
import bcrypt from 'bcryptjs';

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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();
    const [rows]: any = await db.execute(`
      SELECT id, name, email, phone, role, status, created_at, updated_at 
      FROM users 
      WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE')
      ORDER BY created_at DESC
    `);
    await db.end();

    return NextResponse.json({ success: true, users: rows });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { name, email, phone, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ success: false, error: 'Name, email, and role are required' }, { status: 400 });
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid admin role' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if user exists
    const [existing]: any = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 400 });
    }

    // Generate secure mock password (in a real app, send reset link)
    const mockPassword = uuidv4() + '!' + Math.random().toString(36).substring(2);
    const passwordHash = await bcrypt.hash(mockPassword, 10);
    
    const id = uuidv4();

    await db.beginTransaction();

    await db.execute(
      `INSERT INTO users (id, name, email, phone, role, status, email_verified, password_hash)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', 1, ?)`,
      [id, name, email, phone || null, role, passwordHash]
    );

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'SUPER_ADMIN',
      action: 'CREATE_ADMIN_USER',
      entityId: id,
      entityType: 'users',
      details: { role, email, name },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, userId: id });
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({ success: false, error: 'Failed to create admin user' }, { status: 500 });
  }
}
