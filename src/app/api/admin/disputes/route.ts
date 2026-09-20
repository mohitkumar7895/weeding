import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    await ensureOpsTables();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const escalated = searchParams.get('escalated');
    const overdue = searchParams.get('overdue');

    let sql = `
      SELECT d.*,
        COALESCE(c.name, u.name) as customer_name,
        v.business_name as vendor_name,
        b.booking_number
      FROM disputes d
      LEFT JOIN bookings b ON d.booking_id = b.id
      LEFT JOIN customer_profiles c ON b.customer_id = c.id
      LEFT JOIN users u ON d.raised_by_user_id = u.id
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    if (type) {
      sql += ' AND d.type = ?';
      params.push(type);
    }
    if (escalated === 'true') {
      sql += ` AND d.status = 'ESCALATED'`;
    }
    if (overdue === 'true') {
      sql += ` AND d.deadline_date IS NOT NULL AND d.deadline_date < NOW() AND d.status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED')`;
    }
    if (search) {
      sql += ' AND (d.id LIKE ? OR COALESCE(c.name, u.name) LIKE ? OR v.business_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY d.created_at DESC LIMIT 200';
    const rows = await safeSelect<any[]>(sql, params);
    return NextResponse.json({ success: true, disputes: rows });
  } catch (error: any) {
    console.error('Error fetching disputes:', error);
    return NextResponse.json({ success: true, disputes: [] });
  }
}
