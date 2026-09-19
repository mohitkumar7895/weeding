export interface VendorRankingFactors {
  rating: number; // 0 to 5
  review_count: number;
  verification_status: string;
  has_portfolio: boolean;
  city: string;
  search_city?: string;
  is_featured?: boolean;
  is_sponsored?: boolean;
  distance_km?: number | null; // Added for distance based ranking
  completion_rate?: number; // 0 to 1
  response_rate?: number; // 0 to 1
}

export interface RankedVendor extends VendorRankingFactors {
  organic_rank_score: number;
  is_sponsored_badge: boolean;
  is_featured_badge: boolean;
}

// Configurable weights that could later be moved to a DB config table
export const RANKING_WEIGHTS = {
  rating_weight: 30, // max score
  review_volume_weight: 15,
  verification_bonus: 20,
  portfolio_completeness: 10,
  location_match: 15, // now includes distance
  reliability_score: 10, // based on completion and response rates
};

/**
 * Calculates deterministic organic ranking score (0 to 100) based on quality, trust, and completeness.
 * Sponsored listings are clearly separated and flagged.
 */
export function calculateVendorScore(vendor: VendorRankingFactors): number {
  let score = 0;

  // 1. Rating Weight (30 max)
  const normalizedRating = Math.min(Math.max(vendor.rating || 0, 0), 5);
  score += (normalizedRating / 5) * RANKING_WEIGHTS.rating_weight;

  // 2. Review Volume Weight (15 max) - logarithmic scaling
  const reviewCount = vendor.review_count || 0;
  const reviewScore = Math.min(Math.log10(reviewCount + 1) / 3, 1) * RANKING_WEIGHTS.review_volume_weight;
  score += reviewScore;

  // 3. Verification Trust Bonus (20 max)
  if (vendor.verification_status === 'VERIFIED' || vendor.verification_status === 'APPROVED') {
    score += RANKING_WEIGHTS.verification_bonus;
  } else if (vendor.verification_status === 'PENDING' || vendor.verification_status === 'PENDING_REVIEW') {
    score += 5;
  }

  // 4. Profile & Portfolio Completeness (10 max)
  if (vendor.has_portfolio) {
    score += RANKING_WEIGHTS.portfolio_completeness;
  }

  // 5. City / Location Match & Distance (15 max)
  if (vendor.distance_km !== undefined && vendor.distance_km !== null) {
    // If we have actual distance (e.g. 0 to 50km is good)
    if (vendor.distance_km === 0) {
      score += RANKING_WEIGHTS.location_match;
    } else if (vendor.distance_km <= 20) {
      score += RANKING_WEIGHTS.location_match * 0.8;
    } else if (vendor.distance_km <= 50) {
      score += RANKING_WEIGHTS.location_match * 0.5;
    } else {
      score += RANKING_WEIGHTS.location_match * 0.2;
    }
  } else if (vendor.search_city && vendor.city) {
    // Fallback to basic string match if distance is null
    if (vendor.city.toLowerCase().trim() === vendor.search_city.toLowerCase().trim()) {
      score += RANKING_WEIGHTS.location_match;
    } else if (vendor.city.toLowerCase().includes(vendor.search_city.toLowerCase())) {
      score += RANKING_WEIGHTS.location_match * 0.5;
    }
  } else {
    // Baseline location neutrality if no search city
    score += RANKING_WEIGHTS.location_match * 0.3;
  }

  // 6. Reliability Score (10 max)
  // If we don't have completion/response data, give a neutral average score
  const completion = vendor.completion_rate !== undefined ? vendor.completion_rate : 0.8;
  const response = vendor.response_rate !== undefined ? vendor.response_rate : 0.8;
  const reliability = (completion + response) / 2;
  score += reliability * RANKING_WEIGHTS.reliability_score;

  return Math.min(Math.round(score * 10) / 10, 100);
}

