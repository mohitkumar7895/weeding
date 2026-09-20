import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { uuidv4 } from '@/lib/uuid';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { target_status, note } = body; 
    
    if (!['PROCESSING', 'PAID', 'FAILED', 'MANUAL_REVIEW', 'PENDING'].includes(target_status)) {
      return NextResponse.json({ success: false, message: 'Invalid target status' }, { status: 400 });
    }

    const result = await transaction(async (conn) => {
      const existing = await conn.execute(`SELECT status, amount FROM payouts WHERE id = ? FOR UPDATE`, [id]);
      const rows = existing[0] as any[];
      if (!rows.length) throw new Error('Payout not found');

      const payout = rows[0];

      if (payout.status === 'PAID') {
         throw new Error('Cannot modify a payout that is already PAID');
      }

      await conn.execute(`UPDATE payouts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [target_status, id]);

      // Record attempt / history
      await conn.execute(
        `INSERT INTO payout_attempts (id, payout_id, attempt_number, status, error_message) 
         VALUES (?, ?, (SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM payout_attempts WHERE payout_id = ?), ?, ?)`,
        [uuidv4(), id, id, target_status === 'PAID' ? 'SUCCESS' : target_status, note || null]
      );

      return payout;
    });

    await logAudit(auth.user!.id, 'UPDATE_PAYOUT_STATUS', 'payouts', id, {
      old_status: result.status,
      new_status: target_status,
      note
    });

    return NextResponse.json({ success: true, message: `Payout status updated to ${target_status}` });
  } catch (error: any) {
    console.error('API /api/admin/finance/payouts/[id]/status PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
