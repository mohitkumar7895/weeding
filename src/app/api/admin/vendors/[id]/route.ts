import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;

    // 1. Vendor core data
    const [vendorRows]: any = await query(`
      SELECT v.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = ?
    `, [id]);

    if (!vendorRows) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    // 2. Onboarding & Documents
    const [onboarding]: any = await query(`SELECT * FROM vendor_onboarding WHERE vendor_id = ?`, [id]);
    const documents = await query<any[]>(`SELECT id, doc_type, document_number, file_url, verification_status, rejection_reason, created_at FROM vendor_documents WHERE vendor_id = ?`, [id]);

    // 3. Content
    const services = await query<any[]>(`SELECT * FROM vendor_services WHERE vendor_id = ?`, [id]);
    const packages = await query<any[]>(`SELECT * FROM vendor_packages WHERE vendor_id = ?`, [id]);
    const portfolios = await query<any[]>(`SELECT * FROM vendor_portfolios WHERE vendor_id = ?`, [id]);

    // 4. Booking Summary
    const [bookingStats]: any = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status IN ('CONFIRMED', 'COMPLETED') THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN status IN ('CONFIRMED', 'COMPLETED') THEN total_amount ELSE 0 END) as total_revenue
      FROM bookings WHERE vendor_id = ?
    `, [id]);

    // 5. Mask sensitive docs for lower roles
    const maskedDocs = documents.map(doc => {
      if (auth.user!.role === 'SUPPORT') {
        return { ...doc, file_url: 'REDACTED', document_number: 'REDACTED' };
      }
      return doc;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...vendorRows,
        onboarding: onboarding || null,
        documents: maskedDocs,
        services,
        packages,
        portfolios,
        performance: bookingStats
      }
    });
  } catch (error: any) {
    console.error('API /api/admin/vendors/[id] GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
