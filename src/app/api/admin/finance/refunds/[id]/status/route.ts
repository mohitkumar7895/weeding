import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { status, reference_id } = body;

    const validStatuses = ['REQUESTED', 'PENDING', 'PROCESSING', 'APPROVED', 'PROCESSED', 'REJECTED', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'];
    
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid or missing status' }, { status: 400 });
    }

    const updates: string[] = ['status = ?'];
    const values: any[] = [status];

    if (['COMPLETED', 'PROCESSED'].includes(status)) {
      updates.push('processed_at = CURRENT_TIMESTAMP');
    }

    if (reference_id) {
      updates.push('reference_id = ?');
      values.push(reference_id);
    }

    values.push(id);

    await query(`UPDATE refunds SET ${updates.join(', ')} WHERE id = ?`, values);
    await logAudit(auth.user!.id, 'UPDATE_REFUND_STATUS', 'refunds', id, { status, reference_id });

    return NextResponse.json({ success: true, message: 'Refund status updated' });
  } catch (error: any) {
    console.error('API /api/admin/finance/refunds/[id]/status PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
