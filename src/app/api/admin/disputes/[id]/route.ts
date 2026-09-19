import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
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

const VALID_STATUSES = ['OPEN', 'UNDER_REVIEW', 'EVIDENCE_REQUIRED', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED'];
const VALID_RESPONSIBILITIES = ['CUSTOMER', 'VENDOR', 'PLATFORM', 'UNDETERMINED'];

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const disputeId = params.id;
    const db = await getDbConnection();

    const [disputes]: any = await db.execute(
      `SELECT d.*, 
        c.name as customer_name,
        v.business_name as vendor_name,
        b.booking_number, b.total_amount as booking_amount, b.status as booking_status,
        p.transaction_ref as payment_ref, p.amount as payment_amount, p.status as payment_status
       FROM disputes d
       LEFT JOIN bookings b ON d.booking_id = b.id
       LEFT JOIN customer_profiles c ON b.customer_id = c.id
       LEFT JOIN vendors v ON b.vendor_id = v.id
       LEFT JOIN payment_transactions p ON p.booking_id = b.id
       WHERE d.id = ?`,
      [disputeId]
    );

    await db.end();

    if (!disputes.length) {
      return NextResponse.json({ success: false, error: 'Dispute not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, dispute: disputes[0] });
  } catch (error: any) {
    console.error('Error fetching dispute details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dispute details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userRoleInfo: any = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!userRoleInfo.ok) return userRoleInfo.response;

    const actorId = 'system_admin'; 

    const disputeId = params.id;
    const body = await request.json();
    const { 
      status, 
      responsibility, 
      resolution, 
      internal_notes,
      escalation_reason,
      resolution_reason,
      resolution_notes,
      related_financial_ref,
      deadline_date
    } = body;

    const db = await getDbConnection();

    const [existing]: any = await db.execute('SELECT * FROM disputes WHERE id = ?', [disputeId]);
    if (!existing.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Dispute not found' }, { status: 404 });
    }
    const currentDispute = existing[0];

    const updates: string[] = [];
    const values: any[] = [];

    // Valid state transitions
    const validTransitions: Record<string, string[]> = {
      'OPEN': ['UNDER_REVIEW'],
      'UNDER_REVIEW': ['EVIDENCE_REQUIRED', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED'],
      'EVIDENCE_REQUIRED': ['UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED'],
      'ESCALATED': ['RESOLVED', 'REJECTED', 'CLOSED'],
      'RESOLVED': ['CLOSED'],
      'REJECTED': ['CLOSED'],
      'CLOSED': []
    };

    if (status && status !== currentDispute.status) {
      if (!VALID_STATUSES.includes(status)) {
        await db.end();
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }

      const allowedNext = validTransitions[currentDispute.status] || [];
      if (!allowedNext.includes(status)) {
        await db.end();
        return NextResponse.json({ success: false, error: `Invalid status transition from ${currentDispute.status} to ${status}` }, { status: 400 });
      }

      updates.push('status = ?');
      values.push(status);

      // Status side-effects
      if (status === 'ESCALATED') {
        updates.push('escalated_at = NOW(), escalated_by_user_id = ?');
        values.push(actorId);
      } else if (status === 'RESOLVED' || status === 'REJECTED') {
        updates.push('resolved_at = NOW(), resolved_by_user_id = ?');
        values.push(actorId);
      }
    }

    if (responsibility) {
      if (!VALID_RESPONSIBILITIES.includes(responsibility)) {
        await db.end();
        return NextResponse.json({ success: false, error: 'Invalid responsibility' }, { status: 400 });
      }
      updates.push('responsibility = ?');
      values.push(responsibility);
    }

    if (resolution !== undefined) {
      updates.push('resolution = ?');
      values.push(resolution);
    }

    if (internal_notes !== undefined) {
      updates.push('internal_notes = ?');
      values.push(internal_notes);
    }
    
    if (escalation_reason !== undefined) {
      updates.push('escalation_reason = ?');
      values.push(escalation_reason);
    }
    
    if (resolution_reason !== undefined) {
      updates.push('resolution_reason = ?');
      values.push(resolution_reason);
    }
    
    if (resolution_notes !== undefined) {
      updates.push('resolution_notes = ?');
      values.push(resolution_notes);
    }
    
    if (related_financial_ref !== undefined) {
      updates.push('related_financial_ref = ?');
      values.push(related_financial_ref);
    }
    
    if (deadline_date !== undefined) {
      updates.push('deadline_date = ?');
      values.push(deadline_date);
    }

    if (updates.length > 0) {
      values.push(disputeId);
      
      // Concurrency control for resolution
      if (status === 'RESOLVED' || status === 'REJECTED') {
        const [result]: any = await db.execute(
          `UPDATE disputes SET ${updates.join(', ')} WHERE id = ? AND status != 'RESOLVED' AND status != 'REJECTED'`,
          values
        );
        if (result.affectedRows === 0) {
           await db.end();
           return NextResponse.json({ success: false, error: 'Case already resolved or rejected' }, { status: 409 });
        }
      } else {
        await db.execute(`UPDATE disputes SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      // Log audit
      await logAudit({
        userId: actorId,
        role: 'ADMIN',
        action: 'UPDATE_DISPUTE',
        entityId: disputeId,
        entityType: 'disputes',
        oldValues: { previousStatus: currentDispute.status },
        newValues: { newStatus: status || currentDispute.status, newResponsibility: responsibility },
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
      });
    }

    await db.end();

    return NextResponse.json({ success: true, message: 'Dispute updated successfully' });
  } catch (error: any) {
    console.error('Error updating dispute:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update dispute' },
      { status: 500 }
    );
  }
}
