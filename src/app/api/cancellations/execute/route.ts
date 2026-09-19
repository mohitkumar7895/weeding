import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth.user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { booking_id, reason, initiator_override } = body;

    if (!booking_id || !reason) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const result = await transaction(async (conn) => {
      // 1. Fetch Booking and verify ownership
      const bookingRows = await conn.execute(`
        SELECT b.id, b.status, b.event_date, b.customer_id, b.vendor_id, 
               v.user_id as vendor_user_id, cp.user_id as customer_user_id
        FROM bookings b
        JOIN vendors v ON b.vendor_id = v.id
        JOIN customer_profiles cp ON b.customer_id = cp.id
        WHERE b.id = ? FOR UPDATE
      `, [booking_id]);
      
      const b = (bookingRows[0] as any[])[0];
      if (!b) throw new Error('Booking not found');

      if (['CANCELLED', 'COMPLETED', 'REJECTED'].includes(b.status)) {
        throw new Error(`Booking cannot be cancelled from current status: ${b.status}`);
      }

      // 2. Determine Initiator Role
      let initiatorRole = 'ADMIN';
      if (['SUPER_ADMIN', 'ADMIN'].includes(auth.user.role)) {
         initiatorRole = initiator_override || 'ADMIN'; // Admins can simulate cancel for customer/vendor
      } else if (b.customer_user_id === auth.user.id) {
         initiatorRole = 'CUSTOMER';
      } else if (b.vendor_user_id === auth.user.id) {
         initiatorRole = 'VENDOR';
      } else {
         throw new Error('Unauthorized to cancel this booking');
      }

      // 3. Find matching active cancellation rule
      const eventDate = new Date(b.event_date);
      const today = new Date();
      const diffTime = Math.abs(eventDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      const ruleRows = await conn.execute(`
        SELECT id FROM cancellation_rules 
        WHERE is_active = 1 
          AND initiator_role = ?
          AND days_before_event_min <= ? 
          AND (days_before_event_max IS NULL OR days_before_event_max >= ?)
        ORDER BY days_before_event_min DESC LIMIT 1
      `, [initiatorRole, diffDays, diffDays]);

      const rule = (ruleRows[0] as any[])[0];
      if (!rule && initiatorRole !== 'ADMIN') {
         throw new Error('No valid cancellation policy allows cancellation at this time.');
      }
      const ruleId = rule ? rule.id : null;

      // 4. Execute Cancellation
      await conn.execute(`UPDATE bookings SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [booking_id]);
      
      const cancellationId = uuidv4();
      await conn.execute(`
        INSERT INTO cancellations (id, booking_id, cancelled_by_role, user_id, reason, rule_applied_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [cancellationId, booking_id, initiatorRole, auth.user.id, reason, ruleId]);

      // 5. Add History Log
      await conn.execute(`
        INSERT INTO booking_status_history (id, booking_id, previous_status, new_status, changed_by, notes)
        VALUES (?, ?, ?, 'CANCELLED', ?, ?)
      `, [uuidv4(), booking_id, b.status, auth.user.id, `Cancelled by ${initiatorRole}: ${reason}`]);

      return { initiatorRole, ruleId };
    });

    return NextResponse.json({ success: true, message: 'Booking successfully cancelled' });
  } catch (error: any) {
    console.error('API /api/cancellations/execute POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
