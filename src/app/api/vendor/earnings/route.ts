import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id, business_name FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    // Financial calculations strictly executed server-side from MySQL
    const [financials]: any = await query(`
      SELECT 
        COUNT(b.id) as total_bookings_count,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'COMPLETED') THEN b.total_amount ELSE 0 END) as gross_revenue,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'COMPLETED') THEN b.commission_amount ELSE 0 END) as platform_commission_deducted,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'COMPLETED') THEN b.vendor_payout_amount ELSE 0 END) as net_vendor_earnings,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN b.vendor_payout_amount ELSE 0 END) as settled_earnings,
        SUM(CASE WHEN b.status = 'CONFIRMED' THEN b.vendor_payout_amount ELSE 0 END) as escrow_held_earnings
      FROM bookings b
      WHERE b.vendor_id = ?
    `, [vendorId]);

    // Payout transactions
    const payoutRecords = await query<any[]>(
      `SELECT p.*, b.booking_number 
       FROM payouts p 
       JOIN bookings b ON p.booking_id = b.id 
       WHERE p.vendor_id = ? 
       ORDER BY p.created_at DESC`,
      [vendorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        vendor_id: vendorId,
        business_name: vendors[0].business_name,
        gross_revenue: parseFloat(financials?.gross_revenue || 0),
        commission_deducted: parseFloat(financials?.platform_commission_deducted || 0),
        net_earnings: parseFloat(financials?.net_vendor_earnings || 0),
        settled_earnings: parseFloat(financials?.settled_earnings || 0),
        escrow_held_earnings: parseFloat(financials?.escrow_held_earnings || 0),
        total_bookings: financials?.total_bookings_count || 0,
        payouts: payoutRecords,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
