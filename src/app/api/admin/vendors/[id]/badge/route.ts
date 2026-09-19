import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { action } = body; // 'GRANT', 'SUSPEND', 'REMOVE'

    const existing = await query<any[]>(`SELECT verification_status FROM vendors WHERE id = ?`, [id]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    let newStatus = 'PENDING';
    if (action === 'GRANT') newStatus = 'VERIFIED';
    else if (action === 'SUSPEND') newStatus = 'SUSPENDED';
    else if (action === 'REMOVE') newStatus = 'REJECTED';
    else return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    await transaction(async (conn) => {
      await conn.execute(`UPDATE vendors SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, id]);
      
      let onboardingStatus = 'UNDER_REVIEW';
      if (newStatus === 'VERIFIED') onboardingStatus = 'APPROVED';
      else if (newStatus === 'SUSPENDED') onboardingStatus = 'SUSPENDED';
      else if (newStatus === 'REJECTED') onboardingStatus = 'REJECTED';

      const approvedAt = newStatus === 'VERIFIED' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

      await conn.execute(
        `UPDATE vendor_onboarding SET status = ?, admin_reviewer_id = ?, approved_at = COALESCE(?, approved_at), updated_at = CURRENT_TIMESTAMP WHERE vendor_id = ?`,
        [onboardingStatus, auth.user!.id, approvedAt, id]
      );
    });

    await logAudit(auth.user!.id, 'MODERATE_BADGE', 'vendors', id, { action, new_status: newStatus });

    return NextResponse.json({ success: true, message: `Verified badge \${action.toLowerCase()}ed successfully` });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id]/badge PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
