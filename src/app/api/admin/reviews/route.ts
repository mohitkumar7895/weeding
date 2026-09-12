import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'SUPPORT')) {
      return NextResponse.json({ success: false, message: 'Support or Admin authorization required' }, { status: 403 });
    }

    const reports = await query<any[]>(`
      SELECT 
        rr.*,
        r.rating,
        r.comment,
        r.vendor_id,
        r.moderation_status as review_moderation_status,
        v.business_name as vendor_name,
        u_rep.name as reporter_name
      FROM review_reports rr
      JOIN reviews r ON rr.review_id = r.id
      JOIN vendors v ON r.vendor_id = v.id
      JOIN users u_rep ON rr.reported_by = u_rep.id
      ORDER BY rr.created_at DESC
    `);

    return NextResponse.json({ success: true, data: reports });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'SUPPORT')) {
      return NextResponse.json({ success: false, message: 'Support or Admin authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { report_id, action, resolution } = body; // action: 'DISMISS' | 'REMOVE_REVIEW' | 'FLAG_REVIEW'

    const reports = await query<any[]>(`SELECT * FROM review_reports WHERE id = ?`, [report_id]);
    if (!reports.length) return NextResponse.json({ success: false, message: 'Report not found' }, { status: 404 });
    const report = reports[0];

    await transaction(async (conn) => {
      if (action === 'REMOVE_REVIEW') {
        // Get vendor_id before updating/removing
        const [revs]: any = await conn.execute(`SELECT vendor_id FROM reviews WHERE id = ?`, [report.review_id]);
        const vendorId = revs[0]?.vendor_id;

        await conn.execute(`UPDATE reviews SET moderation_status = 'REMOVED' WHERE id = ?`, [report.review_id]);

        if (vendorId) {
          // Recalculate vendor rating without the removed review
          const [agg]: any = await conn.execute(
            `SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating FROM reviews WHERE vendor_id = ? AND moderation_status = 'APPROVED'`,
            [vendorId]
          );
          const totalReviews = agg[0]?.total_reviews || 0;
          const avgRating = totalReviews > 0 ? parseFloat(agg[0]?.avg_rating).toFixed(2) : '5.00';
          await conn.execute(
            `UPDATE vendors SET rating = ?, review_count = ? WHERE id = ?`,
            [avgRating, totalReviews, vendorId]
          );
        }

        await conn.execute(
          `UPDATE review_reports SET status = 'ACTIONED', admin_resolution = ? WHERE id = ?`,
          [resolution || 'Review removed due to policy violation', report_id]
        );
      } else if (action === 'DISMISS') {
        await conn.execute(
          `UPDATE review_reports SET status = 'DISMISSED', admin_resolution = ? WHERE id = ?`,
          [resolution || 'Report dismissed after investigation', report_id]
        );
      }
    });

    await logAudit(user.id, 'MODERATE_REVIEW', 'reviews', report.review_id, { action, resolution });

    return NextResponse.json({
      success: true,
      message: `Review report actioned: ${action}`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
