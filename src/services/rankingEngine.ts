export interface VendorRankingFactors {
  rating: number; // 0 to 5
  review_count: number;
  verification_status: string;
  has_portfolio: boolean;
  city: string;
  search_city?: string;
  is_featured?: boolean;
  is_sponsored?: boolean;
}

export interface RankedVendor extends VendorRankingFactors {
  organic_rank_score: number;
  is_sponsored_badge: boolean;
  is_featured_badge: boolean;
}

/**
 * Calculates deterministic organic ranking score (0 to 100) based on quality, trust, and completeness.
 * Sponsored listings are clearly separated and flagged.
 */
export function calculateVendorScore(vendor: VendorRankingFactors): number {
  let score = 0;

  // 1. Rating Weight (35 max)
  const normalizedRating = Math.min(Math.max(vendor.rating || 0, 0), 5);
  score += (normalizedRating / 5) * 35;

  // 2. Review Volume Weight (20 max) - logarithmic scaling
  const reviewCount = vendor.review_count || 0;
  const reviewScore = Math.min(Math.log10(reviewCount + 1) / 3, 1) * 20;
  score += reviewScore;

  // 3. Verification Trust Bonus (25 max)
  if (vendor.verification_status === 'VERIFIED') {
    score += 25;
  } else if (vendor.verification_status === 'PENDING') {
    score += 10;
  }

  // 4. Profile & Portfolio Completeness (10 max)
  if (vendor.has_portfolio) {
    score += 10;
  }

  // 5. City / Location Match (10 max)
  if (vendor.search_city && vendor.city) {
    if (vendor.city.toLowerCase().trim() === vendor.search_city.toLowerCase().trim()) {
      score += 10;
    } else if (vendor.city.toLowerCase().includes(vendor.search_city.toLowerCase())) {
      score += 5;
    }
  } else {
    score += 5; // Baseline location neutrality
  }

  return Math.min(Math.round(score * 10) / 10, 100);
}
