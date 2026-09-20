import { query } from '@/lib/db';
import { computeCommissionAmount, pickTierValue } from '@/lib/commissionTiers';

export interface CommissionCalculationResult {
  ruleId: string;
  ruleName: string;
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionValue: number;
  totalAmount: number;
  commissionAmount: number;
  vendorPayoutAmount: number;
}

export async function calculateCommission(
  vendorId: string,
  categoryId: string | null,
  totalAmount: number
): Promise<CommissionCalculationResult> {
  // 1. Try vendor-specific rule
  const vendorRules = await query<any[]>(
    `SELECT * FROM commission_rules WHERE vendor_id = ? AND is_active = TRUE AND effective_from <= CURDATE() ORDER BY version DESC LIMIT 1`,
    [vendorId]
  );
  if (vendorRules.length > 0) {
    return applyRule(vendorRules[0], totalAmount);
  }

  // 2. Try category-specific rule
  if (categoryId) {
    const catRules = await query<any[]>(
      `SELECT * FROM commission_rules WHERE category_id = ? AND vendor_id IS NULL AND is_active = TRUE AND effective_from <= CURDATE() ORDER BY version DESC LIMIT 1`,
      [categoryId]
    );
    if (catRules.length > 0) {
      return applyRule(catRules[0], totalAmount);
    }
  }

  // 3. Fallback to platform global rule
  const defaultRules = await query<any[]>(
    `SELECT * FROM commission_rules WHERE category_id IS NULL AND vendor_id IS NULL AND is_active = TRUE AND effective_from <= CURDATE() ORDER BY version DESC LIMIT 1`
  );
  if (defaultRules.length > 0) {
    return applyRule(defaultRules[0], totalAmount);
  }

  const { getSystemConfig } = await import('@/lib/systemConfig');
  const cfg = await getSystemConfig<{ rate?: number }>('PLATFORM_COMMISSION_RATE', { rate: 10 });
  const rate = Number(cfg.rate);
  if (!Number.isFinite(rate)) {
    throw new Error('No active commission rule and PLATFORM_COMMISSION_RATE is invalid');
  }
  console.error('Commission rules table empty; using PLATFORM_COMMISSION_RATE config', rate);
  const commission = (totalAmount * rate) / 100;
  return {
    ruleId: 'platform_config',
    ruleName: 'Platform configured commission',
    commissionType: 'PERCENTAGE',
    commissionValue: rate,
    totalAmount,
    commissionAmount: commission,
    vendorPayoutAmount: totalAmount - commission,
  };
}

function applyRule(rule: any, totalAmount: number): CommissionCalculationResult {
  let appliedValue = parseFloat(rule.commission_value);
  if (rule.tiers_json) {
    try {
      const tiers = typeof rule.tiers_json === 'string' ? JSON.parse(rule.tiers_json) : rule.tiers_json;
      appliedValue = pickTierValue(totalAmount, appliedValue, tiers);
    } catch (e) {
      console.error('Error parsing commission rule tiers JSON', e);
    }
  }

  const amounts = computeCommissionAmount({
    totalAmount,
    commissionType: rule.commission_type,
    commissionValue: appliedValue,
    minFee: rule.min_fee ? parseFloat(rule.min_fee) : undefined,
    maxFee: rule.max_fee ? parseFloat(rule.max_fee) : undefined,
  });

  return {
    ruleId: rule.id,
    ruleName: rule.rule_name,
    commissionType: rule.commission_type,
    commissionValue: appliedValue,
    totalAmount,
    commissionAmount: amounts.commissionAmount,
    vendorPayoutAmount: amounts.vendorPayoutAmount,
  };
}
