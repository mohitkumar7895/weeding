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

    const [registrations, profiles, shortlists] = await Promise.all([
      safeSelect<any[]>(
        `SELECT COUNT(*) as count FROM users WHERE role IN ('CUSTOMER','USER')${dateFilter}`,
        params
      ),
      safeSelect<any[]>(
        `SELECT COUNT(*) as count FROM customer_profiles WHERE 1=1${dateFilter}`,
        params
      ),
      safeSelect<any[]>(
        `SELECT COUNT(*) as count FROM shortlists WHERE 1=1${dateFilter}`,
        params
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        registrations: firstCount(registrations),
        profilesCompleted: firstCount(profiles),
        shortlistActions: firstCount(shortlists),
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { registrations: 0, profilesCompleted: 0, shortlistActions: 0 },
    });
  }
}
