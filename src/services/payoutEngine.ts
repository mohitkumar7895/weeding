import { query } from '@/lib/db';

/**
 * Payout Engine handling business rules for eligibility.
 */
export async function getEligiblePayouts() {
  // Payout Delay Rule: e.g., 3 days after completion.
  // In this implementation, we allow immediate payout for testing, or we can use a configurable parameter.
  // We'll consider any PENDING payout that is linked to a COMPLETED booking to be eligible.
  const eligiblePayouts = await query<any[]>(
    `SELECT p.*, v.bank_account_number, v.bank_ifsc 
     FROM payouts p
     JOIN bookings b ON p.booking_id = b.id
     JOIN vendors v ON p.vendor_id = v.id
     WHERE p.status = 'PENDING' AND b.status = 'COMPLETED'`
  );
  return eligiblePayouts;
}

/**
 * Mock payout provider to simulate external gateway transfers.
 */
export async function processPayoutWithProvider(payout: any) {
  // Simulate network delay and random failure
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (Math.random() < 0.1) {
    return {
      success: false,
      reference_id: null,
      error: 'Bank server timeout or rejected transaction'
    };
  }

  const ref = `BNK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    success: true,
    reference_id: ref,
    error: null
  };
}
