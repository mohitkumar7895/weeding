import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id: packageId } = await params;
    const body = await req.json();
    const { moderation_status, rejection_reason, is_published, is_active } = body;

    const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];
    if (moderation_status && !validStatuses.includes(moderation_status)) {
      return NextResponse.json({ success: false, message: 'Invalid moderation status' }, { status: 400 });
    }

    const existing = await query<any[]>(
      `SELECT id, name, moderation_status, rejection_reason FROM vendor_packages WHERE id = ?`,
      [packageId]
    );
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Package not found' }, { status: 404 });
    }

    const current = existing[0];
    const newStatus = moderation_status || current.moderation_status;
    const finalRejectionReason = newStatus === 'REJECTED'
      ? (rejection_reason || null)
      : (newStatus === 'APPROVED' ? null : current.rejection_reason);

    await query(
      `UPDATE vendor_packages SET
        moderation_status = ?,
        rejection_reason = ?,
        is_published = COALESCE(?, is_published),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        newStatus,
        finalRejectionReason,
        is_published !== undefined ? (is_published ? 1 : 0) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        packageId
      ]
    );

    await logAudit(admin.id, 'MODERATE_PACKAGE', 'vendor_packages', packageId, {
      previous_status: current.moderation_status,
      moderation_status: newStatus,
      rejection_reason: finalRejectionReason,
      is_published,
      is_active,
    });

    return NextResponse.json({
      success: true,
      message: `Package moderation updated to ${newStatus}`,
      data: {
        id: packageId,
        moderation_status: newStatus,
        rejection_reason: finalRejectionReason,
      }
    });
  } catch (error: any) {
    console.error('API /api/admin/packages/[id] PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
