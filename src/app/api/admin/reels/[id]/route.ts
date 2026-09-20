import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (!auth.ok) return auth.response!;

  try {
    const admin = await getSessionUser();
    const { id } = await params;
    const body = await req.json();
    const status = body.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    const reason = body.reason || null;

    const existing = await query<any[]>(`SELECT id FROM vendor_reels WHERE id = ?`, [id]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Reel not found' }, { status: 404 });
    }

    await query(
      `UPDATE vendor_reels SET status = ?, is_approved = ?, rejection_reason = ? WHERE id = ?`,
      [status, status === 'APPROVED' ? 1 : 0, reason, id]
    ).catch(async () => {
      await query(`UPDATE vendor_reels SET is_approved = ? WHERE id = ?`, [status === 'APPROVED' ? 1 : 0, id]);
    });

    await logAudit(admin!.id, 'MODERATE_REEL', 'vendor_reels', id, { status, reason });
    return NextResponse.json({ success: true, message: `Reel ${status.toLowerCase()}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
