import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch vendor details
    const vendors = await query<any[]>(
      `SELECT 
        v.*,
        c.name as category_name,
        c.slug as category_slug,
        u.email as contact_email,
        u.phone as contact_phone
      FROM vendors v
      JOIN categories c ON v.category_id = c.id
      JOIN users u ON v.user_id = u.id
      WHERE v.id = ? OR v.business_name = ?`,
      [id, id]
    );

    if (!vendors || vendors.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const vendor = vendors[0];

    // Fetch services
    const services = await query<any[]>(
      `SELECT * FROM vendor_services WHERE vendor_id = ? AND is_active = TRUE ORDER BY starting_price ASC`,
      [vendor.id]
    );

    // Fetch packages
    const packages = await query<any[]>(
      `SELECT * FROM vendor_packages WHERE vendor_id = ? ORDER BY price ASC`,
      [vendor.id]
    );

    // Fetch portfolios
    const portfolios = await query<any[]>(
      `SELECT * FROM vendor_portfolios WHERE vendor_id = ? ORDER BY is_cover DESC, created_at DESC`,
      [vendor.id]
    );

    // Fetch reviews with customer name
    const reviews = await query<any[]>(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.is_verified_booking,
        r.created_at,
        u.name as customer_name,
        (SELECT url FROM profile_photos pp WHERE pp.profile_id = cp.id AND pp.is_primary = TRUE LIMIT 1) as customer_avatar
      FROM reviews r
      JOIN customer_profiles cp ON r.customer_id = cp.id
      JOIN users u ON cp.user_id = u.id
      WHERE r.vendor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [vendor.id]
    );

    // Sanitize sensitive vendor details for public users
    const { getSessionUser } = await import('@/lib/auth');
    const sessionUser = await getSessionUser();
    const isAuthorized = sessionUser && (
      sessionUser.role === 'SUPER_ADMIN' ||
      sessionUser.role === 'ADMIN' ||
      sessionUser.id === vendor.user_id
    );

    const safeVendor = { ...vendor };
    if (!isAuthorized) {
      delete safeVendor.pan_number;
      delete safeVendor.gst_number;
      delete safeVendor.bank_account_number;
      delete safeVendor.bank_ifsc;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...safeVendor,
        services,
        packages,
        portfolios,
        reviews
      }
    });
  } catch (error: any) {
    console.error('API /api/vendors/[id] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch vendor details', error: error.message },
      { status: 500 }
    );
  }
}
