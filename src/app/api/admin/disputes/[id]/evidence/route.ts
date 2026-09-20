import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
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

function generateId() {
  return crypto.randomUUID();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const disputeId = id;
    const db = await getDbConnection();

    const [evidence]: any = await db.execute(
      `SELECT e.*, u.name as uploader_name, u.role as uploader_role
       FROM dispute_evidence e
       LEFT JOIN users u ON e.uploaded_by_user_id = u.id
       WHERE e.dispute_id = ?
       ORDER BY e.created_at DESC`,
      [disputeId]
    );

    await db.end();
    return NextResponse.json({ success: true, evidence });
  } catch (error: any) {
    console.error('Error fetching dispute evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dispute evidence' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const disputeId = id;
    // Mock user for now since the mock rbac doesn't return full user info
    const uploaderId = 'system_admin'; 

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    // In a real implementation, you'd upload this file to S3 or a secure bucket and get a URL
    const fileUrl = `/storage/secure-evidence/${generateId()}-${file.name}`;
    const evidenceId = generateId();

    const db = await getDbConnection();

    // Ensure dispute exists
    const [existingDispute]: any = await db.execute('SELECT id FROM disputes WHERE id = ?', [disputeId]);
    if (!existingDispute.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Dispute not found' }, { status: 404 });
    }

    await db.execute(
      `INSERT INTO dispute_evidence (id, dispute_id, uploaded_by_user_id, file_url, file_type, file_size, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [evidenceId, disputeId, uploaderId, fileUrl, file.type, file.size, description || null]
    );

    // Audit log
    await auditLog(db, {
      actorId: uploaderId,
      actorRole: 'ADMIN', // Or support/finance based on token
      action: 'UPLOAD_EVIDENCE',
      entityId: evidenceId,
      entityType: 'dispute_evidence',
      details: { disputeId, fileName: file.name, fileSize: file.size },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    return NextResponse.json({ success: true, message: 'Evidence uploaded successfully', evidenceId, fileUrl });
  } catch (error: any) {
    console.error('Error uploading dispute evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload evidence' },
      { status: 500 }
    );
  }
}
