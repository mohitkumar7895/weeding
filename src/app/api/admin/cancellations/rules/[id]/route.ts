import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { is_active } = body;

    if (is_active === undefined) {
       return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    await query(`UPDATE cancellation_rules SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, id]);

    await logAudit(auth.user!.id, 'UPDATE_CANCELLATION_RULE', 'cancellation_rules', id, { is_active });

    return NextResponse.json({ success: true, message: 'Rule status updated' });
  } catch (error: any) {
    console.error('API /api/admin/cancellations/rules/[id] PUT Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
