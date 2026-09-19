import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

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

// Variable whitelist map
const VALID_VARIABLES: Record<string, string[]> = {
  'BOOKING_CONFIRMED': ['{{customer_name}}', '{{vendor_name}}', '{{booking_id}}', '{{amount}}', '{{event_date}}'],
  'BOOKING_CANCELLED': ['{{customer_name}}', '{{vendor_name}}', '{{booking_id}}', '{{amount}}'],
  'PAYMENT_SUCCESS': ['{{customer_name}}', '{{amount}}', '{{booking_id}}'],
  'ACCOUNT_CREATED': ['{{customer_name}}'],
  'DEFAULT': ['{{customer_name}}', '{{vendor_name}}', '{{booking_id}}', '{{amount}}']
};

function validateVariables(content: string, event_type: string): string | null {
  const allowed = VALID_VARIABLES[event_type] || VALID_VARIABLES['DEFAULT'];
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  
  for (const match of matches) {
    if (!allowed.includes(match)) {
      return `Variable ${match} is not allowed for event ${event_type}. Allowed: ${allowed.join(', ')}`;
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();
    const [rows]: any = await db.execute(`
      SELECT * FROM notification_templates 
      WHERE is_active = 1 
      ORDER BY event_type, channel
    `);
    await db.end();

    return NextResponse.json({ success: true, templates: rows });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { event_type, channel, content } = body;

    if (!event_type || !channel || !content) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const variableError = validateVariables(content, event_type);
    if (variableError) {
      return NextResponse.json({ success: false, error: variableError }, { status: 400 });
    }

    const db = await getDbConnection();

    // Deactivate any existing active template for this event/channel
    await db.execute(
      'UPDATE notification_templates SET is_active = 0 WHERE event_type = ? AND channel = ? AND is_active = 1',
      [event_type, channel]
    );

    const id = uuidv4();
    await db.execute(
      'INSERT INTO notification_templates (id, event_type, channel, content, is_active, version) VALUES (?, ?, ?, ?, 1, 1)',
      [id, event_type, channel, content]
    );

    await auditLog(db, {
      actorId: 'system_admin',
      actorRole: 'ADMIN',
      action: 'CREATE_TEMPLATE',
      entityId: id,
      entityType: 'notification_templates',
      details: { event_type, channel, version: 1 },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    return NextResponse.json({ success: true, templateId: id });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 500 });
  }
}
