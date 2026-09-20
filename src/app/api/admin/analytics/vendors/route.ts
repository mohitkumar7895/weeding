import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { firstCount, safeSelect } from '@/lib/ensureOpsTables';

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

    const [statusResult, verified, services] = await Promise.all([
      safeSelect<any[]>(
        `SELECT verification_status as status, COUNT(*) as count FROM vendors WHERE 1=1${dateFilter} GROUP BY verification_status`,
        params
      ),
      safeSelect<any[]>(
        `SELECT COUNT(*) as count FROM vendors WHERE verification_status IN ('VERIFIED','APPROVED')${dateFilter}`,
        params
      ),
      safeSelect<any[]>(`SELECT COUNT(*) as count FROM vendor_services WHERE 1=1${dateFilter}`, params),
    ]);

    const statuses: Record<string, number> = {};
    statusResult.forEach((row) => {
      statuses[row.status] = row.count;
    });

    return NextResponse.json(
      { success: true, data: { statuses, verified: firstCount(verified), totalServices: firstCount(services) } },
      { headers: { 'Cache-Control': 'private, max-age=20' } }
    );
  } catch {
    return NextResponse.json({ success: true, data: { statuses: {}, verified: 0, totalServices: 0 } });
  }
}
