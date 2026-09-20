import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const vendors = await query<any[]>(`
      SELECT 
        v.id, v.business_name, v.city, v.verification_status, v.rating,
        u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
        (SELECT COUNT(*) FROM bookings b WHERE b.vendor_id = v.id) as total_bookings
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    `);

    await logAudit(auth.user!.id, 'EXPORT_VENDOR_DATA', 'vendors', 'ALL', { count: vendors.length });

    // Generate CSV
    if (!vendors.length) {
      return new NextResponse('id,business_name,city,verification_status,rating,owner_name,owner_email,owner_phone,total_bookings\n', {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="vendors_export.csv"' }
      });
    }

    const headers = Object.keys(vendors[0]).join(',');
    const rows = vendors.map(v => 
      Object.values(v).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="vendors_export.csv"'
      }
    });
  } catch (error: any) {
    console.error('API /api/admin/vendors/export GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
