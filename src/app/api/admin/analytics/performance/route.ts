import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const params: any[] = [];
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [topCities, topCategories, topVendors] = await Promise.all([
      safeSelect<any[]>(
        `SELECT city, COUNT(*) as vendor_count FROM vendors WHERE city IS NOT NULL${dateFilter} GROUP BY city ORDER BY vendor_count DESC LIMIT 10`,
        params
      ),
      safeSelect<any[]>(`
        SELECT c.name as category, COUNT(*) as service_count
        FROM vendor_services vs
        JOIN vendors v ON vs.vendor_id = v.id
        LEFT JOIN categories c ON v.category_id = c.id
        GROUP BY c.name
        ORDER BY service_count DESC
        LIMIT 10
      `),
      safeSelect<any[]>(`
        SELECT v.business_name, COUNT(b.id) as booking_count
        FROM vendors v
        LEFT JOIN bookings b ON b.vendor_id = v.id AND b.status IN ('CONFIRMED','COMPLETED')
        GROUP BY v.id, v.business_name
        ORDER BY booking_count DESC
        LIMIT 10
      `),
    ]);

    return NextResponse.json(
      { success: true, data: { topCities, topCategories, topVendors } },
      { headers: { 'Cache-Control': 'private, max-age=20' } }
    );
  } catch {
    return NextResponse.json({ success: true, data: { topCities: [], topCategories: [], topVendors: [] } });
  }
}
