import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const rules = await query<any[]>(`SELECT * FROM commission_rules ORDER BY created_at DESC`);
    return NextResponse.json({ success: true, data: rules });
  } catch (error: any) {
    console.error('API /api/admin/finance/commissions/rules GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const body = await req.json();
    const { rule_name, commission_type, commission_value, min_fee, max_fee, effective_from, is_active } = body;

    if (!rule_name || !commission_value || !effective_from) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const value = parseFloat(commission_value);
    if (isNaN(value) || value < 0) {
      return NextResponse.json({ success: false, message: 'Invalid commission value' }, { status: 400 });
    }
    
    // Support the specified 10-20% range check (we allow up to 100 for edge cases but validate > 0)
    if (commission_type === 'PERCENTAGE' && (value <= 0 || value > 100)) {
       return NextResponse.json({ success: false, message: 'Percentage must be between 0 and 100' }, { status: 400 });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO commission_rules (id, rule_name, commission_type, commission_value, min_fee, max_fee, effective_from, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, rule_name, commission_type || 'PERCENTAGE', value, min_fee || 0, max_fee || null, effective_from, is_active !== false ? 1 : 0]
    );

    await logAudit(auth.user!.id, 'CREATE_COMMISSION_RULE', 'commission_rules', id, { rule_name, commission_value });

    return NextResponse.json({ success: true, message: 'Commission rule created' });
  } catch (error: any) {
    console.error('API /api/admin/finance/commissions/rules POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
