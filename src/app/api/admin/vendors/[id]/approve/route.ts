import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getSessionUser();
    if (!adminUser || (adminUser.role !== 'SUPER_ADMIN' && adminUser.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, is_featured, is_sponsored } = body;

    const existing = await query<any[]>(`SELECT * FROM vendors WHERE id = ?`, [id]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    if (status) {
      await query(`UPDATE vendors SET verification_status = ? WHERE id = ?`, [status, id]);

      let onboardingStatus = 'UNDER_REVIEW';
      if (status === 'VERIFIED') onboardingStatus = 'APPROVED';
      else if (status === 'REJECTED') onboardingStatus = 'REJECTED';
      else if (status === 'SUSPENDED') onboardingStatus = 'SUSPENDED';

      const approvedAt = status === 'VERIFIED' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
      await query(
        `UPDATE vendor_onboarding SET 
          status = ?, 
          rejection_reason = ?,
          admin_reviewer_id = ?,
          approved_at = COALESCE(?, approved_at),
          updated_at = CURRENT_TIMESTAMP
        WHERE vendor_id = ?`,
        [onboardingStatus, body.rejection_reason || null, adminUser.id, approvedAt, id]
      );
    }
    if (is_featured !== undefined) {
      await query(`UPDATE vendors SET is_featured = ? WHERE id = ?`, [is_featured ? 1 : 0, id]);
    }
    if (is_sponsored !== undefined) {
      await query(`UPDATE vendors SET is_sponsored = ? WHERE id = ?`, [is_sponsored ? 1 : 0, id]);
    }

    await logAudit(adminUser.id, 'APPROVE_VENDOR', 'vendors', id, { status, is_featured, is_sponsored });

    return NextResponse.json({
      success: true,
      message: 'Vendor verification updated successfully'
    });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id]/approve Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
