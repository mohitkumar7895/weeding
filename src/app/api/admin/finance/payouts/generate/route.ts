import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const result = await transaction(async (conn) => {
      // Find all commission records that are NOT yet settled but the booking is CONFIRMED/COMPLETED
      const eligibleCommissions = await conn.execute(`
        SELECT cr.id, cr.booking_id, cr.commission_amount, b.total_amount, b.vendor_id
        FROM commission_records cr
        JOIN bookings b ON cr.booking_id = b.id
        WHERE cr.is_settled = 0 AND b.status IN ('CONFIRMED', 'COMPLETED')
        FOR UPDATE
      `);
      
      const commissions = eligibleCommissions[0] as any[];
      if (commissions.length === 0) {
        return { count: 0, amount: 0 };
      }

      let totalGenerated = 0;
      let countGenerated = 0;

      for (const cr of commissions) {
        const grossAmount = parseFloat(cr.total_amount);
        const commissionAmount = parseFloat(cr.commission_amount);
        const vendorNetAmount = grossAmount - commissionAmount;

        if (vendorNetAmount > 0) {
          const payoutId = uuidv4();
          await conn.execute(
            `INSERT INTO payouts (id, vendor_id, booking_id, amount, status) VALUES (?, ?, ?, ?, 'PENDING')`,
            [payoutId, cr.vendor_id, cr.booking_id, vendorNetAmount]
          );

          await conn.execute(
            `UPDATE commission_records SET is_settled = 1, settled_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [cr.id]
          );

          totalGenerated += vendorNetAmount;
          countGenerated++;
        }
      }

      return { count: countGenerated, amount: totalGenerated };
    });

    if (result.count > 0) {
      await logAudit(auth.user!.id, 'GENERATE_PAYOUTS', 'payouts', 'BATCH', { 
        count: result.count, total_amount: result.amount 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: \`Successfully generated \${result.count} payouts.\`,
      data: result
    });
  } catch (error: any) {
    console.error('API /api/admin/finance/payouts/generate POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
