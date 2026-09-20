import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, firstCount, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    await ensureOpsTables();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const params: any[] = [];
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const statusResult = await safeSelect<any[]>(
      `SELECT verification_status as status, COUNT(*) as count FROM vendors WHERE 1=1${dateFilter} GROUP BY verification_status`,
      params
    );
    const verified = await safeSelect<any[]>(
      `SELECT COUNT(*) as count FROM vendors WHERE verification_status IN ('VERIFIED','APPROVED')${dateFilter}`,
      params
    );
    const services = await safeSelect<any[]>(
      `SELECT COUNT(*) as count FROM vendor_services WHERE 1=1${dateFilter}`,
      params
    );

    const statuses: Record<string, number> = {};
    statusResult.forEach((row) => {
      statuses[row.status] = row.count;
    });

    return NextResponse.json({
      success: true,
      data: {
        statuses,
        verified: firstCount(verified),
        totalServices: firstCount(services),
      },
    });
  } catch (error: any) {
    console.error('Error fetching vendor analytics:', error);
    return NextResponse.json({ success: true, data: { statuses: {}, verified: 0, totalServices: 0 } });
  }
}
