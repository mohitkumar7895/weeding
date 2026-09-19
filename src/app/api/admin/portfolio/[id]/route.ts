import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin authorization required' }, { status: 403 });
    }

    const { id } = await params;

    const rows = await query<any[]>(
      `SELECT 
        vp.*,
        v.business_name,
        v.city AS vendor_city,
        vs.title AS service_title
       FROM vendor_portfolios vp
       LEFT JOIN vendors v ON vp.vendor_id = v.id
       LEFT JOIN vendor_services vs ON vp.service_id = vs.id
       WHERE vp.id = ?`,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Portfolio item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...rows[0],
        is_cover: Boolean(rows[0].is_cover),
        is_active: Boolean(rows[0].is_active),
      },
    });
  } catch (error: any) {
    console.error('API /api/admin/portfolio/[id] GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin authorization required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { moderation_status, rejection_reason, is_active } = body;

    const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'INACTIVE'];
    if (moderation_status && !validStatuses.includes(moderation_status)) {
      return NextResponse.json({
        success: false,
        message: `Invalid moderation status. Allowed: ${validStatuses.join(', ')}`,
      }, { status: 400 });
    }

    const existing = await query<any[]>(
      `SELECT * FROM vendor_portfolios WHERE id = ?`,
      [id]
    );

    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Portfolio item not found' }, { status: 404 });
    }

    const current = existing[0];
    const newStatus = moderation_status || current.moderation_status;
    const finalRejectionReason = newStatus === 'REJECTED'
      ? (rejection_reason || 'Does not comply with wedding media standards')
      : (newStatus === 'APPROVED' ? null : current.rejection_reason);

    await query(
      `UPDATE vendor_portfolios SET
        moderation_status = ?,
        rejection_reason = ?,
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        newStatus,
        finalRejectionReason,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    await logAudit(admin.id, 'MODERATE_PORTFOLIO_MEDIA', 'vendor_portfolios', id, {
      previous_status: current.moderation_status,
      new_status: newStatus,
      rejection_reason: finalRejectionReason,
      is_active,
    });

    const updated = await query<any[]>(`SELECT * FROM vendor_portfolios WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: `Portfolio media ${newStatus.toLowerCase()} successfully`,
      data: {
        ...updated[0],
        is_cover: Boolean(updated[0].is_cover),
        is_active: Boolean(updated[0].is_active),
      },
    });
  } catch (error: any) {
    console.error('API /api/admin/portfolio/[id] PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
