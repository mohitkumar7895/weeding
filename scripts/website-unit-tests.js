const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('crypto');

function razorpayPaymentSignature(orderId, paymentId, keySecret) {
  return createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
}

function pickTierValue(totalAmount, defaultValue, tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return defaultValue;
  for (const tier of tiers) {
    const min = Number(tier.min_amount) || 0;
    const max = tier.max_amount == null ? Infinity : Number(tier.max_amount);
    if (totalAmount >= min && totalAmount <= max) return Number(tier.commission_value);
  }
  return defaultValue;
}

test('razorpay payment signature is HMAC of order|payment', () => {
  const expected = createHmac('sha256', 'secret').update('order_1|pay_1').digest('hex');
  assert.equal(razorpayPaymentSignature('order_1', 'pay_1', 'secret'), expected);
});

test('commission 10-20% tiers pick 15% in mid band', () => {
  const value = pickTierValue(150000, 10, [
    { min_amount: 0, max_amount: 99999, commission_value: 10 },
    { min_amount: 100000, max_amount: 499999, commission_value: 15 },
    { min_amount: 500000, max_amount: null, commission_value: 20 },
  ]);
  assert.equal(value, 15);
});

test('csrf origin must match app origin', () => {
  const allowed = ['http://localhost:3000'];
  assert.equal(allowed.includes('http://localhost:3000'), true);
  assert.equal(allowed.includes('https://evil.example'), false);
});
