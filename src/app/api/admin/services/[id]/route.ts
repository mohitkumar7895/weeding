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
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id: serviceId } = await params;
    const body = await req.json();
    const { moderation_status, rejection_reason, is_active } = body;

    const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'];
    if (moderation_status && !validStatuses.includes(moderation_status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid moderation status. Must be PENDING_REVIEW, APPROVED, or REJECTED' },
        { status: 400 }
      );
    }

    // Verify service exists
    const existing = await query<any[]>(
      `SELECT id, vendor_id, title, moderation_status FROM vendor_services WHERE id = ?`,
      [serviceId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Service not found' },
        { status: 404 }
      );
    }

    const currentService = existing[0];
    const newStatus = moderation_status || currentService.moderation_status;
    const finalRejectionReason = newStatus === 'REJECTED' 
      ? (rejection_reason || null) 
      : (newStatus === 'APPROVED' ? null : currentService.rejection_reason);

    await query(
      `UPDATE vendor_services SET
        moderation_status = ?,
        rejection_reason = ?,
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?`,
      [
        newStatus,
        finalRejectionReason,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        serviceId
      ]
    );

    await logAudit(admin.id, 'MODERATE_SERVICE', 'vendor_services', serviceId, {
      previous_status: currentService.moderation_status,
      moderation_status: newStatus,
      rejection_reason: finalRejectionReason,
      is_active
    });

    return NextResponse.json({
      success: true,
      message: `Service moderation updated to ${newStatus}`,
      data: {
        id: serviceId,
        moderation_status: newStatus,
        rejection_reason: finalRejectionReason
      }
    });
  } catch (error: any) {
    console.error('API /api/admin/services/[id] PUT Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
