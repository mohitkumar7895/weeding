export interface CommissionTier {
  min_amount?: number;
  max_amount?: number | null;
  commission_value: number;
}

export function pickTierValue(
  totalAmount: number,
  defaultValue: number,
  tiers?: CommissionTier[] | null
): number {
  if (!Array.isArray(tiers) || tiers.length === 0) return defaultValue;
  for (const tier of tiers) {
    const min = Number(tier.min_amount) || 0;
    const maxRaw = tier.max_amount;
    const max =
      maxRaw == null || (typeof maxRaw === 'number' && !Number.isFinite(maxRaw))
        ? Infinity
        : Number(maxRaw);
    if (totalAmount >= min && totalAmount <= max) {
      return Number(tier.commission_value);
    }
  }
  return defaultValue;
}

export function computeCommissionAmount(params: {
  totalAmount: number;
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionValue: number;
  minFee?: number;
  maxFee?: number;
}): { commissionAmount: number; vendorPayoutAmount: number } {
  let commission =
    params.commissionType === 'PERCENTAGE'
      ? (params.totalAmount * params.commissionValue) / 100
      : params.commissionValue;
  if (params.minFee && commission < params.minFee) commission = params.minFee;
  if (params.maxFee && commission > params.maxFee) commission = params.maxFee;
  return {
    commissionAmount: Math.round(commission * 100) / 100,
    vendorPayoutAmount: Math.round((params.totalAmount - commission) * 100) / 100,
  };
}
