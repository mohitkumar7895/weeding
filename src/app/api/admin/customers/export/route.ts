import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(_req: NextRequest) {
  const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (!auth.ok) return auth.response!;

  try {
    const rows = await query<any[]>(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.email_verified, u.created_at,
              cp.gender, cp.city, cp.state, cp.religion, cp.verification_status
       FROM users u
       LEFT JOIN customer_profiles cp ON u.id = cp.user_id
       WHERE u.role = 'CUSTOMER'
       ORDER BY u.created_at DESC`
    );

    const headers = Object.keys(rows[0] || { id: '', name: '', email: '' });
    const csvRows = rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h] == null ? '' : String(r[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csv = `${headers.join(',')}\n${csvRows.join('\n')}`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="customers_export.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
