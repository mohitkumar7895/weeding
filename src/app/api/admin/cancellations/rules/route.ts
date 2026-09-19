import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const rules = await query<any[]>(`SELECT * FROM cancellation_rules ORDER BY created_at DESC`);
    return NextResponse.json({ success: true, data: rules });
  } catch (error: any) {
    console.error('API /api/admin/cancellations/rules GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await req.json();
    const { initiator_role, days_before_event_min, days_before_event_max, refund_percentage, penalty_percentage, is_active } = body;

    if (!initiator_role || days_before_event_min === undefined || refund_percentage === undefined) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (!['CUSTOMER', 'VENDOR', 'ADMIN'].includes(initiator_role)) {
       return NextResponse.json({ success: false, message: 'Invalid initiator_role' }, { status: 400 });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO cancellation_rules (id, initiator_role, days_before_event_min, days_before_event_max, refund_percentage, penalty_percentage, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, initiator_role, days_before_event_min, days_before_event_max || null, refund_percentage, penalty_percentage || 0, is_active !== false ? 1 : 0]
    );

    await logAudit(auth.user!.id, 'CREATE_CANCELLATION_RULE', 'cancellation_rules', id, { initiator_role, refund_percentage });

    return NextResponse.json({ success: true, message: 'Cancellation rule created' });
  } catch (error: any) {
    console.error('API /api/admin/cancellations/rules POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
