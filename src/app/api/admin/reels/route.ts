import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (!auth.ok) return auth.response!;

  try {
    await ensureOpsTables();
    const status = new URL(req.url).searchParams.get('status');
    let sql = `
      SELECT r.*, v.business_name, v.city
      FROM vendor_reels r
      LEFT JOIN vendors v ON r.vendor_id = v.id
    `;
    const params: any[] = [];
    if (status) {
      sql += ` WHERE r.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY r.created_at DESC LIMIT 200`;
    const data = await safeSelect<any[]>(sql, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}
