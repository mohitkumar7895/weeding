import { query } from '@/lib/db';

export interface FactorScore {
  factor: string;
  weight: number;
  score: number; // 0 to 1
  matched: boolean;
  reason: string;
}

export interface CompatibilityResult {
  overallScore: number; // 0 to 100
  percentage: string;
  breakdown: FactorScore[];
  matchedCriteria: string[];
  missingCriteria: string[];
  explanation: string;
  isHighMatch: boolean;
}

/**
 * Calculate multi-factor compatibility between a customer's preferences and a candidate profile
 */
export async function calculateCompatibility(
  customerPreference: any,
  candidateProfile: any
): Promise<CompatibilityResult> {
  // 1. Fetch active weights from MySQL table `match_factor_weights`
  const weightsRows = await query<any[]>(
    'SELECT factor_name, weight_percent FROM match_factor_weights WHERE is_active = TRUE'
  );

  const defaultWeights: { [key: string]: number } = {
    'Age Compatibility': 15,
    'Religion & Caste Preference': 15,
    'Marital Status Compatibility': 10,
    'Education Level Matching': 10,
    'Profession & Career Field': 10,
    'Annual Income Expectation': 10,
    'Height Preference Match': 5,
    'Location & City Distance': 15,
    'Profile Completeness & Verification': 10,
  };

  const weightsMap: { [key: string]: number } = {};
  for (const row of weightsRows) {
    weightsMap[row.factor_name] = parseFloat(row.weight_percent);
  }

  // Calculate Candidate Age
  const birthYear = new Date(candidateProfile.date_of_birth).getFullYear();
  const currentYear = new Date().getFullYear();
  const candidateAge = currentYear - birthYear;

  const breakdown: FactorScore[] = [];

  // --- Factor 1: Age Compatibility ---
  const ageWeight = weightsMap['Age Compatibility'] ?? defaultWeights['Age Compatibility'];
  let ageScore = 1.0;
  let ageReason = `Age (${candidateAge} yrs) matches preferred range (${customerPreference.min_age}-${customerPreference.max_age} yrs)`;
  let ageMatched = true;

  if (candidateAge < customerPreference.min_age) {
    const diff = customerPreference.min_age - candidateAge;
    ageScore = Math.max(0, 1 - diff * 0.25);
    ageReason = `Candidate is ${diff} year(s) younger than preferred minimum (${customerPreference.min_age} yrs)`;
    ageMatched = ageScore >= 0.7;
  } else if (candidateAge > customerPreference.max_age) {
    const diff = candidateAge - customerPreference.max_age;
    ageScore = Math.max(0, 1 - diff * 0.25);
    ageReason = `Candidate is ${diff} year(s) older than preferred maximum (${customerPreference.max_age} yrs)`;
    ageMatched = ageScore >= 0.7;
  }
  breakdown.push({ factor: 'Age Compatibility', weight: ageWeight, score: ageScore, matched: ageMatched, reason: ageReason });

  // --- Factor 2: Religion & Caste ---
  const relWeight = weightsMap['Religion & Caste Preference'] ?? defaultWeights['Religion & Caste Preference'];
  const prefReligions = (customerPreference.preferred_religions || 'Hindu').split(',').map((s: string) => s.trim().toLowerCase());
  const candidateRel = (candidateProfile.religion || '').trim().toLowerCase();
  let relScore = 0.5;
  let relReason = 'Different religious background';
  let relMatched = false;

  if (prefReligions.includes(candidateRel) || prefReligions.includes('any')) {
    relScore = 1.0;
    relReason = `Religion matches preference (${candidateProfile.religion})`;
    relMatched = true;
  }
  breakdown.push({ factor: 'Religion & Caste', weight: relWeight, score: relScore, matched: relMatched, reason: relReason });

  // --- Factor 3: Marital Status ---
  const maritalWeight = weightsMap['Marital Status Compatibility'] ?? defaultWeights['Marital Status Compatibility'];
  const acceptedStatuses = (customerPreference.accepted_marital_status || 'NEVER_MARRIED').split(',').map((s: string) => s.trim().toUpperCase());
  const candidateMarital = (candidateProfile.marital_status || 'NEVER_MARRIED').toUpperCase();
  const maritalMatched = acceptedStatuses.includes(candidateMarital) || acceptedStatuses.includes('ANY');
  breakdown.push({
    factor: 'Marital Status',
    weight: maritalWeight,
    score: maritalMatched ? 1.0 : 0.0,
    matched: maritalMatched,
    reason: maritalMatched ? `Marital status compatible (${candidateProfile.marital_status})` : 'Marital status outside preference',
  });

  // --- Factor 4: Education Level ---
  const eduWeight = weightsMap['Education Level Matching'] ?? defaultWeights['Education Level Matching'];
  const candidateEdu = (candidateProfile.education || '').toLowerCase();
  const isHighEdu = candidateEdu.includes('b.tech') || candidateEdu.includes('mba') || candidateEdu.includes('m.tech') || candidateEdu.includes('phd') || candidateEdu.includes('doctor') || candidateEdu.includes('master');
  breakdown.push({
    factor: 'Education Level',
    weight: eduWeight,
    score: isHighEdu ? 1.0 : 0.85,
    matched: true,
    reason: `Verified educational qualification (${candidateProfile.education})`,
  });

  // --- Factor 5: Profession & Career ---
  const profWeight = weightsMap['Profession & Career Field'] ?? defaultWeights['Profession & Career Field'];
  const candidateProf = (candidateProfile.profession || '').toLowerCase();
  const isEstablished = candidateProf.length > 3;
  breakdown.push({
    factor: 'Career & Profession',
    weight: profWeight,
    score: isEstablished ? 1.0 : 0.8,
    matched: isEstablished,
    reason: `Professional status: ${candidateProfile.profession}`,
  });

  // --- Factor 6: Income Expectation ---
  const incWeight = weightsMap['Annual Income Expectation'] ?? defaultWeights['Annual Income Expectation'];
  const candidateIncome = parseFloat(candidateProfile.annual_income || '0');
  const minIncomePref = parseFloat(customerPreference.min_income || '800000');
  const incomeMatched = candidateIncome >= minIncomePref;
  const incomeScore = candidateIncome >= minIncomePref ? 1.0 : Math.max(0.4, candidateIncome / minIncomePref);
  breakdown.push({
    factor: 'Income Expectation',
    weight: incWeight,
    score: incomeScore,
    matched: incomeMatched,
    reason: incomeMatched
      ? `Income aligns with expectations (₹${(candidateIncome / 100000).toFixed(1)} LPA)`
      : `Income slightly below specified expectation`,
  });

  // --- Factor 7: Height Preference ---
  const heightWeight = weightsMap['Height Preference Match'] ?? defaultWeights['Height Preference Match'];
  const cHeight = candidateProfile.height_cm || 165;
  const minH = customerPreference.min_height_cm || 150;
  const maxH = customerPreference.max_height_cm || 190;
  const heightMatched = cHeight >= minH && cHeight <= maxH;
  breakdown.push({
    factor: 'Height Preference',
    weight: heightWeight,
    score: heightMatched ? 1.0 : 0.7,
    matched: heightMatched,
    reason: heightMatched ? `Height (${cHeight} cm) in target range` : `Height (${cHeight} cm) outside target range`,
  });

  // --- Factor 8: Location & City ---
  const locWeight = weightsMap['Location & City Distance'] ?? defaultWeights['Location & City Distance'];
  const prefLocations = (customerPreference.preferred_locations || '').toLowerCase();
  const cCity = (candidateProfile.city || '').toLowerCase();
  const isCityMatch = prefLocations.includes(cCity);
  breakdown.push({
    factor: 'Location & Distance',
    weight: locWeight,
    score: isCityMatch ? 1.0 : 0.75,
    matched: isCityMatch,
    reason: isCityMatch ? `Location matches preferred regions (${candidateProfile.city})` : `Location: ${candidateProfile.city}`,
  });

  // --- Factor 9: Profile Completeness & Verification ---
  const trustWeight = weightsMap['Profile Completeness & Verification'] ?? defaultWeights['Profile Completeness & Verification'];
  const isVerified = candidateProfile.verification_status === 'VERIFIED';
  breakdown.push({
    factor: 'Verification & Authenticity',
    weight: trustWeight,
    score: isVerified ? 1.0 : 0.85,
    matched: isVerified,
    reason: isVerified ? 'Verified profile badge' : 'Standard profile completion',
  });

  // Total weighted score
  let weightedSum = 0;
  let totalWeights = 0;

  for (const item of breakdown) {
    weightedSum += item.score * item.weight;
    totalWeights += item.weight;
  }

  const finalPercentage = totalWeights > 0 ? (weightedSum / totalWeights) * 100 : 80;
  const rounded = Math.round(finalPercentage * 10) / 10;

  const matchedCriteria = breakdown.filter((b) => b.matched).map((b) => b.factor);
  const missingCriteria = breakdown.filter((b) => !b.matched).map((b) => b.factor);

  const explanation = `Software-calculated compatibility of ${rounded}% based on ${matchedCriteria.length} matching preferences including ${matchedCriteria.slice(0, 3).join(', ')}.`;

  return {
    overallScore: rounded,
    percentage: `${Math.round(rounded)}%`,
    breakdown,
    matchedCriteria,
    missingCriteria,
    explanation,
    isHighMatch: rounded >= 85,
  };
}
