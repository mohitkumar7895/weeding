import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;
    await ensureOpsTables();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const params: any[] = [];
    let filterQuery = '';
    if (status) {
      filterQuery += ' AND c.status = ?';
      params.push(status);
    }

    const counts = await safeSelect<any[]>(`SELECT status, COUNT(*) as c FROM duplicate_profile_cases GROUP BY status`);
    const cases = await safeSelect<any[]>(
      `SELECT c.*, u.name as reviewer_name
       FROM duplicate_profile_cases c
       LEFT JOIN users u ON c.reviewed_by = u.id
       WHERE 1=1 ${filterQuery}
       ORDER BY c.created_at DESC
       LIMIT 100`,
      params
    );

    const summary = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      CONFIRMED_DUPLICATE: 0,
      NOT_DUPLICATE: 0,
      DISMISSED: 0,
    };
    counts.forEach((row) => {
      if (row.status in summary) (summary as any)[row.status] = row.c;
    });

    return NextResponse.json({ success: true, summary, cases });
  } catch {
    return NextResponse.json({
      success: true,
      summary: { OPEN: 0, UNDER_REVIEW: 0, CONFIRMED_DUPLICATE: 0, NOT_DUPLICATE: 0, DISMISSED: 0 },
      cases: [],
    });
  }
}
