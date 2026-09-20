import { query } from '@/lib/db';

/**
 * Payout Engine handling business rules for eligibility.
 */
export async function getEligiblePayouts() {
  const { getSystemConfig } = await import('@/lib/systemConfig');
  const cfg = await getSystemConfig<{ days?: number }>('PAYOUT_DELAY_DAYS', { days: 3 });
  const days = Number(cfg.days ?? 3);
  const eligiblePayouts = await query<any[]>(
    `SELECT p.*, v.bank_account_number, v.bank_ifsc, v.business_name as vendor_name
     FROM payouts p
     JOIN bookings b ON p.booking_id = b.id
     JOIN vendors v ON p.vendor_id = v.id
     WHERE p.status = 'PENDING' AND b.status = 'COMPLETED'
       AND b.updated_at <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [Number.isFinite(days) ? days : 3]
  );
  return eligiblePayouts;
}

function razorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

/**
 * RazorpayX payout. Requires RAZORPAY_KEY_ID/SECRET and RAZORPAYX_ACCOUNT_NUMBER.
 */
export async function processPayoutWithProvider(payout: any) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!keyId || !keySecret) {
    return { success: false, reference_id: null, error: 'Razorpay keys are not configured' };
  }
  if (!accountNumber) {
    return {
      success: false,
      reference_id: null,
      error: 'RAZORPAYX_ACCOUNT_NUMBER is required for vendor bank payouts',
    };
  }
  if (!payout.bank_account_number || !payout.bank_ifsc) {
    return { success: false, reference_id: null, error: 'Vendor bank account or IFSC is missing' };
  }

  const amountPaise = Math.round(Number(payout.net_amount || payout.amount || 0) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return { success: false, reference_id: null, error: 'Invalid payout amount' };
  }

  const response = await fetch('https://api.razorpay.com/v1/payouts', {
    method: 'POST',
    headers: {
      Authorization: razorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_number: accountNumber,
      amount: amountPaise,
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: String(payout.id).slice(0, 40),
      fund_account: {
        account_type: 'bank_account',
        bank_account: {
          name: payout.vendor_name || payout.business_name || 'Vendor',
          ifsc: payout.bank_ifsc,
          account_number: String(payout.bank_account_number),
        },
        contact: {
          name: payout.vendor_name || 'Vendor',
          type: 'vendor',
          reference_id: String(payout.vendor_id || '').slice(0, 40),
        },
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      reference_id: null,
      error: data.error?.description || data.message || 'RazorpayX payout failed',
    };
  }

  return {
    success: true,
    reference_id: data.id || data.payout_id,
    error: null,
  };
}
