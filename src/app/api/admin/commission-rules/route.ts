import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'FINANCE')) {
      return NextResponse.json(
        { success: false, message: 'Finance or Super Admin authorization required to manage commission rules' },
        { status: 403 }
      );
    }

    const rules = await query<any[]>(`
      SELECT cr.*, c.name as category_name, v.business_name as vendor_name
      FROM commission_rules cr
      LEFT JOIN categories c ON cr.category_id = c.id
      LEFT JOIN vendors v ON cr.vendor_id = v.id
      ORDER BY cr.effective_from DESC, cr.version DESC
    `);

    return NextResponse.json({ success: true, data: rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'FINANCE')) {
      return NextResponse.json(
        { success: false, message: 'Finance or Super Admin authorization required to manage commission rules' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      rule_name,
      category_id,
      vendor_id,
      commission_type = 'PERCENTAGE',
      commission_value = 10.0,
      min_fee = 500.0,
      max_fee,
      effective_from = new Date().toISOString().slice(0, 10),
    } = body;

    if (!rule_name || commission_value === undefined) {
      return NextResponse.json({ success: false, message: 'rule_name and commission_value are required' }, { status: 400 });
    }

    const id = randomUUID();
    await query(
      `INSERT INTO commission_rules (
        id, rule_name, category_id, vendor_id, commission_type, commission_value, min_fee, max_fee, effective_from, is_active, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 1)`,
      [
        id,
        rule_name,
        category_id || null,
        vendor_id || null,
        commission_type,
        parseFloat(commission_value),
        parseFloat(min_fee),
        max_fee ? parseFloat(max_fee) : null,
        effective_from,
      ]
    );

    await logAudit(admin.id, 'CREATE_COMMISSION_RULE', 'commission_rules', id, { rule_name, commission_value });

    return NextResponse.json({
      success: true,
      message: 'Commission rule created successfully',
      data: { id },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'FINANCE')) {
      return NextResponse.json({ success: false, message: 'Admin / Finance authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, is_active, commission_value, min_fee, max_fee } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Rule ID is required' }, { status: 400 });
    }

    await query(
      `UPDATE commission_rules SET
        is_active = COALESCE(?, is_active),
        commission_value = COALESCE(?, commission_value),
        min_fee = COALESCE(?, min_fee),
        max_fee = COALESCE(?, max_fee)
      WHERE id = ?`,
      [
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        commission_value !== undefined ? parseFloat(commission_value) : null,
        min_fee !== undefined ? parseFloat(min_fee) : null,
        max_fee !== undefined ? parseFloat(max_fee) : null,
        id,
      ]
    );

    await logAudit(admin.id, 'UPDATE_COMMISSION_RULE', 'commission_rules', id, { is_active, commission_value });

    return NextResponse.json({
      success: true,
      message: 'Commission rule updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
