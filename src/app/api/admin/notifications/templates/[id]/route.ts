import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';
import { uuidv4 } from '@/lib/uuid';

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { content } = body;

    if (!content) return NextResponse.json({ success: false, error: 'Content required' }, { status: 400 });

    const db = await getDbConnection();
    const [rows]: any = await db.execute('SELECT * FROM notification_templates WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const template = rows[0];

    const variableError = validateVariables(content, template.event_type);
    if (variableError) {
      await db.end();
      return NextResponse.json({ success: false, error: variableError }, { status: 400 });
    }

    const newId = uuidv4();
    const newVersion = template.version + 1;

    await db.beginTransaction();

    await db.execute('UPDATE notification_templates SET is_active = 0 WHERE id = ?', [id]);

    await db.execute(
      'INSERT INTO notification_templates (id, event_type, channel, content, is_active, version) VALUES (?, ?, ?, ?, 1, ?)',
      [newId, template.event_type, template.channel, content, newVersion]
    );

    await auditLog(db, {
      actorId: 'system_admin',
      actorRole: 'ADMIN',
      action: 'UPDATE_TEMPLATE',
      entityId: newId,
      entityType: 'notification_templates',
      details: { previous_id: id, event_type: template.event_type, channel: template.channel, version: newVersion },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, newTemplateId: newId, version: newVersion });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 });
  }
}
