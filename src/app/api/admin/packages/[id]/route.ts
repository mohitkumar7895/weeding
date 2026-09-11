import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id: packageId } = await params;
    const body = await req.json();
    const { moderation_status, is_published } = body;

    const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'];
    if (moderation_status && !validStatuses.includes(moderation_status)) {
      return NextResponse.json({ success: false, message: 'Invalid moderation status' }, { status: 400 });
    }

    await query(
      `UPDATE vendor_packages SET
        moderation_status = COALESCE(?, moderation_status),
        is_published = COALESCE(?, is_published)
      WHERE id = ?`,
      [moderation_status || null, is_published !== undefined ? (is_published ? 1 : 0) : null, packageId]
    );

    await logAudit(admin.id, 'MODERATE_PACKAGE', 'vendor_packages', packageId, {
      moderation_status,
      is_published,
    });

    return NextResponse.json({
      success: true,
      message: `Package moderation updated to ${moderation_status}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
