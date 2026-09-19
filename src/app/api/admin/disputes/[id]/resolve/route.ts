import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';

export async function POST(req: NextRequest, { params }: any) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE')) {
      return NextResponse.json({ success: false, message: 'Finance or Super Admin authorization required' }, { status: 403 });
    }

    const disputeId = params.id;
    const body = await req.json();
    const { status, resolution_notes, issue_refund_amount } = body;

    const [dispute] = await query<any[]>(`SELECT * FROM disputes WHERE id = ?`, [disputeId]);
    if (!dispute) return NextResponse.json({ success: false, message: 'Dispute not found' }, { status: 404 });

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE disputes SET status = ?, resolution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, resolution_notes, disputeId]
      );

      // If resolving requires a refund adjustment
      if (issue_refund_amount > 0) {
         // Create a refund record securely linked to this dispute (or update an existing)
         // Assuming we create a new one to track the admin adjustment
         const { randomUUID } = require('crypto');
         await conn.execute(
           `INSERT INTO refunds (id, booking_id, amount, reason, status, original_amount)
            VALUES (?, ?, ?, ?, 'COMPLETED', ?)`,
           [randomUUID(), dispute.booking_id, issue_refund_amount, 'Admin Dispute Resolution', dispute.amount_under_dispute || 0]
         );
      }
    });

    await logAudit(user.id, 'RESOLVE_DISPUTE', 'disputes', disputeId, { status, refund: issue_refund_amount });

    return NextResponse.json({ success: true, message: 'Dispute resolved' });

  } catch (error: any) {
    console.error('Dispute resolve error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
