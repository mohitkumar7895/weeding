import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    await ensureOpsTables();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let sql = `
      SELECT
        b.id, b.booking_number, b.status, b.event_date, b.guest_count, b.created_at, b.updated_at, b.notes,
        u.name as customer_name, u.email as customer_email,
        v.business_name as vendor_name
      FROM bookings b
      LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
      LEFT JOIN users u ON cp.user_id = u.id OR b.customer_id = u.id
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (b.booking_number LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR v.business_name LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    sql += ' ORDER BY b.updated_at DESC LIMIT 2';

    const rows = await safeSelect<any[]>(sql, params);
    return NextResponse.json({ success: true, bookings: rows });
  } catch {
    return NextResponse.json({ success: true, bookings: [] });
  }
}
