import { query } from '@/lib/db';

/**
 * Cancellation Engine handles rules, penalty math and refund calculation natively.
 */
export async function calculateCancellation(bookingId: string, initiatorRole: 'CUSTOMER' | 'VENDOR' | 'ADMIN') {
  // Get booking details
  const [booking] = await query<any[]>(
    `SELECT b.*, COALESCE(p.amount, 0) as paid_amount 
     FROM bookings b
     LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'SUCCESS'
     WHERE b.id = ?`,
    [bookingId]
  );

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Get days to event
  const eventDate = new Date(booking.event_date);
  const now = new Date();
  const diffTime = eventDate.getTime() - now.getTime();
  const daysBeforeEvent = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Query matching cancellation rule
  // We look for a rule where days_before_event_min <= daysBeforeEvent and (days_before_event_max >= daysBeforeEvent OR IS NULL)
  const [rule] = await query<any[]>(
    `SELECT * FROM cancellation_rules 
     WHERE initiator_role = ? AND is_active = true
     AND days_before_event_min <= ?
     AND (days_before_event_max >= ? OR days_before_event_max IS NULL)
     ORDER BY days_before_event_min DESC LIMIT 1`,
    [initiatorRole === 'ADMIN' ? 'CUSTOMER' : initiatorRole, daysBeforeEvent, daysBeforeEvent]
  );

  const grossAmount = parseFloat(booking.total_amount);
  const paidAmount = parseFloat(booking.paid_amount);

  let refundPercentage = 0;
  let penaltyPercentage = 0;
  let ruleId = null;

  if (rule) {
    refundPercentage = parseFloat(rule.refund_percentage);
    penaltyPercentage = parseFloat(rule.penalty_percentage);
    ruleId = rule.id;
  } else {
    // If no rule matches, default to strict policies
    if (initiatorRole === 'VENDOR') {
      refundPercentage = 100;
      penaltyPercentage = 10;
    } else {
      refundPercentage = 0; // No refund if outside all allowable customer policies
      penaltyPercentage = 0;
    }
  }

  // Calculate actual amounts based on what was paid vs gross
  // The refund cannot exceed what was actually paid
  let calculatedRefund = (grossAmount * refundPercentage) / 100;
  if (calculatedRefund > paidAmount) calculatedRefund = paidAmount;

  let calculatedPenalty = (grossAmount * penaltyPercentage) / 100;

  return {
    booking,
    daysBeforeEvent,
    ruleId,
    refundPercentage,
    penaltyPercentage,
    paidAmount,
    calculatedRefund: parseFloat(calculatedRefund.toFixed(2)),
    calculatedPenalty: parseFloat(calculatedPenalty.toFixed(2)),
  };
}
