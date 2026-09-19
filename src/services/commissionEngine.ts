import { query } from '@/lib/db';

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

  // Default hardcoded fallback if table empty: 10%
  const commission = (totalAmount * 10) / 100;
  return {
    ruleId: 'default_fallback',
    ruleName: 'Standard 10% Fallback',
    commissionType: 'PERCENTAGE',
    commissionValue: 10,
    totalAmount,
    commissionAmount: commission,
    vendorPayoutAmount: totalAmount - commission,
  };
}

function applyRule(rule: any, totalAmount: number): CommissionCalculationResult {
  let commission = 0;
  let appliedValue = parseFloat(rule.commission_value);

  if (rule.tiers_json) {
    try {
      const tiers = typeof rule.tiers_json === 'string' ? JSON.parse(rule.tiers_json) : rule.tiers_json;
      if (Array.isArray(tiers) && tiers.length > 0) {
        // Find matching tier
        for (const tier of tiers) {
          const min = parseFloat(tier.min_amount) || 0;
          const max = tier.max_amount ? parseFloat(tier.max_amount) : Infinity;
          if (totalAmount >= min && totalAmount <= max) {
             appliedValue = parseFloat(tier.commission_value);
             break;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing commission rule tiers JSON', e);
    }
  }

  if (rule.commission_type === 'PERCENTAGE') {
    commission = (totalAmount * appliedValue) / 100;
  } else {
    commission = appliedValue;
  }

  if (rule.min_fee && commission < parseFloat(rule.min_fee)) {
    commission = parseFloat(rule.min_fee);
  }
  if (rule.max_fee && commission > parseFloat(rule.max_fee)) {
    commission = parseFloat(rule.max_fee);
  }

  return {
    ruleId: rule.id,
    ruleName: rule.rule_name,
    commissionType: rule.commission_type,
    commissionValue: appliedValue,
    totalAmount,
    commissionAmount: Math.round(commission * 100) / 100,
    vendorPayoutAmount: Math.round((totalAmount - commission) * 100) / 100,
  };
}
