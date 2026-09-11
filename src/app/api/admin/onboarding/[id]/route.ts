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

    const [vendorRows, onboardingRows, docRows] = await Promise.all([
      query<any[]>(`SELECT * FROM vendors WHERE id = ?`, [vendorId]),
      query<any[]>(`SELECT * FROM vendor_onboarding WHERE vendor_id = ?`, [vendorId]),
      query<any[]>(`SELECT * FROM vendor_documents WHERE vendor_id = ? ORDER BY created_at DESC`, [vendorId]),
    ]);

    if (!vendorRows.length) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: vendorRows[0],
        onboarding: onboardingRows.length ? onboardingRows[0] : null,
        documents: docRows,
      },
    });
  } catch (error: any) {
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
      onboarding_status,
      rejection_reason,
      document_id,
      document_status,
      document_rejection_reason,
    } = body;

    await transaction(async (conn) => {
      // 1. If updating specific document status
      if (document_id && document_status) {
        await conn.execute(
          `UPDATE vendor_documents SET 
            verification_status = ?,
            rejection_reason = ?,
            verified_by = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND vendor_id = ?`,
          [document_status, document_rejection_reason || null, admin.id, document_id, vendorId]
        );
      }

      // 2. If updating overall onboarding status
      if (onboarding_status) {
        const approvedAt = onboarding_status === 'APPROVED' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

        await conn.execute(
          `UPDATE vendor_onboarding SET 
            status = ?,
            rejection_reason = ?,
            admin_reviewer_id = ?,
            approved_at = COALESCE(?, approved_at),
            updated_at = CURRENT_TIMESTAMP
          WHERE vendor_id = ?`,
          [onboarding_status, rejection_reason || null, admin.id, approvedAt, vendorId]
        );

        // Update vendor verification status accordingly
        let vendorVerification = 'PENDING';
        if (onboarding_status === 'APPROVED') vendorVerification = 'VERIFIED';
        else if (onboarding_status === 'REJECTED') vendorVerification = 'REJECTED';
        else if (onboarding_status === 'SUSPENDED') vendorVerification = 'SUSPENDED';

        await conn.execute(
          `UPDATE vendors SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [vendorVerification, vendorId]
        );
      }
    });

    await logAudit(admin.id, 'REVIEW_VENDOR_ONBOARDING', 'vendor_onboarding', vendorId, {
      onboarding_status,
      rejection_reason,
      document_id,
      document_status,
    });

    return NextResponse.json({
      success: true,
      message: `Vendor onboarding updated successfully to ${onboarding_status || 'updated'}`,
    });
  } catch (error: any) {
    console.error('Admin Onboarding Review Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
