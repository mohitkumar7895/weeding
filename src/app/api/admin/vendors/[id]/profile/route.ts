import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id: vendorId } = await params;

    const [vendorRows, categories, onbRows] = await Promise.all([
      query<any[]>(
        `SELECT v.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
         FROM vendors v
         JOIN users u ON v.user_id = u.id
         WHERE v.id = ?`,
        [vendorId]
      ),
      query<any[]>(
        `SELECT c.id, c.name, c.slug, vc.is_primary
         FROM vendor_categories vc
         JOIN categories c ON vc.category_id = c.id
         WHERE vc.vendor_id = ?`,
        [vendorId]
      ),
      query<any[]>(`SELECT * FROM vendor_onboarding WHERE vendor_id = ?`, [vendorId]),
    ]);

    if (!vendorRows.length) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: vendorRows[0],
        categories,
        onboarding: onbRows[0] || null,
      },
    });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id]/profile GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id: vendorId } = await params;
    const body = await req.json();

    const {
      profile_status,
      verification_status,
      rejection_reason,
      is_featured,
      is_sponsored,
    } = body;

    const existing = await query<any[]>(`SELECT id, user_id FROM vendors WHERE id = ?`, [vendorId]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    await transaction(async (conn) => {
      // 1. Update vendor profile status and flags
      if (profile_status || verification_status || is_featured !== undefined || is_sponsored !== undefined) {
        await conn.execute(
          `UPDATE vendors SET 
            profile_status = COALESCE(?, profile_status),
            verification_status = COALESCE(?, verification_status),
            is_featured = COALESCE(?, is_featured),
            is_sponsored = COALESCE(?, is_sponsored),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            profile_status || null,
            verification_status || null,
            is_featured !== undefined ? (is_featured ? 1 : 0) : null,
            is_sponsored !== undefined ? (is_sponsored ? 1 : 0) : null,
            vendorId,
          ]
        );
      }

      // 2. Synchronize onboarding workflow state if verification_status updated
      if (verification_status) {
        let onboardingStatus = 'UNDER_REVIEW';
        if (verification_status === 'VERIFIED') onboardingStatus = 'APPROVED';
        else if (verification_status === 'REJECTED') onboardingStatus = 'REJECTED';
        else if (verification_status === 'SUSPENDED') onboardingStatus = 'SUSPENDED';

        const approvedAt = verification_status === 'VERIFIED' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

        await conn.execute(
          `UPDATE vendor_onboarding SET 
            status = ?,
            rejection_reason = ?,
            admin_reviewer_id = ?,
            approved_at = COALESCE(?, approved_at),
            updated_at = CURRENT_TIMESTAMP
          WHERE vendor_id = ?`,
          [onboardingStatus, rejection_reason || null, admin.id, approvedAt, vendorId]
        );
      }
    });

    await logAudit(admin.id, 'MODERATE_VENDOR_PROFILE', 'vendors', vendorId, {
      profile_status,
      verification_status,
      rejection_reason,
      is_featured,
      is_sponsored,
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor business profile moderation updated successfully',
    });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id]/profile PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
