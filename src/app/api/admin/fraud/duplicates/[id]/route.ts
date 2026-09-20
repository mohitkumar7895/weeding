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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();

    // Fetch the case
    const [cases]: any = await db.execute(`
      SELECT c.*, u.name as reviewer_name 
      FROM duplicate_profile_cases c
      LEFT JOIN users u ON c.reviewed_by = u.id
      WHERE c.id = ?
    `, [id]);

    if (cases.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Duplicate case not found' }, { status: 404 });
    }

    const dupCase = cases[0];
    
    // Fetch Profile A and Profile B
    const [profiles]: any = await db.execute(`
      SELECT p.*, u.email, u.status as account_status, u.created_at as user_created_at
      FROM customer_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id IN (?, ?)
    `, [dupCase.primary_profile_id, dupCase.suspected_duplicate_id]);

    await db.end();

    let profileA = null;
    let profileB = null;

    for (const p of profiles) {
      // Mask PII
      const emailParts = p.email.split('@');
      p.masked_email = emailParts[0].substring(0, 3) + '***@' + emailParts[1];
      delete p.email;

      if (p.user_id === dupCase.primary_profile_id) {
        profileA = p;
      } else {
        profileB = p;
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        caseDetails: dupCase,
        profileA,
        profileB
      } 
    });
  } catch (error: any) {
    console.error('Error fetching duplicate case:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch duplicate case' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { status, review_notes } = body;

    const db = await getDbConnection();

    const [rows]: any = await db.execute('SELECT status, risk_flag_id FROM duplicate_profile_cases WHERE id = ?', [id]);
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }

    const previousStatus = rows[0].status;
    const riskFlagId = rows[0].risk_flag_id;

    await db.beginTransaction();
    await db.execute(`
      UPDATE duplicate_profile_cases 
      SET status = ?, review_notes = ?, reviewed_by = ? 
      WHERE id = ?
    `, [status, review_notes || null, authResult.user?.id, id]);

    // Sync status to the linked risk flag if applicable
    if (riskFlagId) {
      let riskStatus = 'UNDER_REVIEW';
      if (status === 'CONFIRMED_DUPLICATE' || status === 'NOT_DUPLICATE') riskStatus = 'RESOLVED';
      if (status === 'DISMISSED') riskStatus = 'DISMISSED';

      await db.execute(`
        UPDATE risk_flags 
        SET status = ?, review_notes = ?, reviewed_by = ? 
        WHERE id = ?
      `, [riskStatus, `Synched from duplicate case review: ${status}`, authResult.user?.id, riskFlagId]);
    }

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'ADMIN',
      action: 'UPDATE_DUPLICATE_CASE',
      entityId: id,
      entityType: 'duplicate_profile_cases',
      details: { previousStatus, newStatus: status, notes: review_notes },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, message: 'Duplicate case updated' });
  } catch (error: any) {
    console.error('Error updating duplicate case:', error);
    return NextResponse.json({ success: false, error: 'Failed to update case' }, { status: 500 });
  }
}
