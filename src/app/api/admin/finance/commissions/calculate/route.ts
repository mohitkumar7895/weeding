import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const body = await req.json();
    const { booking_id } = body;

    if (!booking_id) return NextResponse.json({ success: false, message: 'booking_id is required' }, { status: 400 });

    const result = await transaction(async (conn) => {
      // 1. Ensure booking exists and is CONFIRMED/COMPLETED
      const bookingRows = await conn.execute(`SELECT id, total_amount, status FROM bookings WHERE id = ? FOR UPDATE`, [booking_id]);
      const b = (bookingRows[0] as any[])[0];
      if (!b) throw new Error('Booking not found');
      if (!['CONFIRMED', 'COMPLETED'].includes(b.status)) {
         throw new Error(`Cannot calculate commission for booking in status: ${b.status}`);
      }

      // 2. Ensure commission hasn't already been calculated
      const existing = await conn.execute(`SELECT id FROM commission_records WHERE booking_id = ?`, [booking_id]);
      if ((existing[0] as any[]).length > 0) {
         throw new Error('Commission already calculated for this booking');
      }

      // 3. Get active commission rule
      const ruleRows = await conn.execute(
        `SELECT commission_type, commission_value, min_fee, max_fee FROM commission_rules 
         WHERE is_active = 1 AND effective_from <= CURRENT_DATE() 
         ORDER BY effective_from DESC, created_at DESC LIMIT 1`
      );
      const rule = (ruleRows[0] as any[])[0];
      if (!rule) throw new Error('No active commission rule found');

      const grossAmount = parseFloat(b.total_amount);
      let calcCommission = 0;
      let percentageUsed = 0;

      if (rule.commission_type === 'PERCENTAGE') {
        percentageUsed = parseFloat(rule.commission_value);
        calcCommission = (grossAmount * percentageUsed) / 100;
      } else {
        calcCommission = parseFloat(rule.commission_value);
      }

      // Apply min/max fee constraints
      const minFee = rule.min_fee ? parseFloat(rule.min_fee) : 0;
      if (calcCommission < minFee) calcCommission = minFee;
      
      if (rule.max_fee) {
        const maxFee = parseFloat(rule.max_fee);
        if (calcCommission > maxFee) calcCommission = maxFee;
      }

      // Protect against calculating more than the gross amount
      if (calcCommission > grossAmount) {
         calcCommission = grossAmount;
      }

      const id = uuidv4();
      await conn.execute(
        `INSERT INTO commission_records (id, booking_id, percentage, commission_amount, is_settled) VALUES (?, ?, ?, ?, 0)`,
        [id, booking_id, percentageUsed, calcCommission.toFixed(2)]
      );

      return { calcCommission, percentageUsed };
    });

    await logAudit(auth.user!.id, 'MANUAL_COMMISSION_CALC', 'commission_records', booking_id, { 
      amount: result.calcCommission, rate: result.percentageUsed 
    });

    return NextResponse.json({ success: true, message: 'Commission calculated successfully' });
  } catch (error: any) {
    console.error('API /api/admin/finance/commissions/calculate POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
