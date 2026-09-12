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
  recommendationScore: number; // 0 to 100
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
  let weightsRows: any[] = [];
  try {
    weightsRows = await query<any[]>(
      'SELECT factor_name, weight_percent FROM match_factor_weights WHERE is_active = TRUE'
    );
  } catch (err: any) {
    console.warn('[matchingEngine] Could not load match_factor_weights, using defaults:', err.message);
  }

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

  const pref = customerPreference || {};

  // Calculate Candidate Age
  let candidateAge = 25;
  if (candidateProfile.date_of_birth) {
    const birthYear = new Date(candidateProfile.date_of_birth).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(birthYear) && birthYear > 1900) {
      candidateAge = currentYear - birthYear;
    }
  }

  const breakdown: FactorScore[] = [];

  // --- Factor 1: Age Compatibility ---
  const ageWeight = weightsMap['Age Compatibility'] ?? defaultWeights['Age Compatibility'];
  const minAge = Number(pref.min_age) || 0;
  const maxAge = Number(pref.max_age) || 0;
  let ageScore = 1.0;
  let ageReason = 'Age criteria open / within range';
  let ageMatched = true;

  if (minAge > 0 && maxAge > 0) {
    if (candidateAge >= minAge && candidateAge <= maxAge) {
      ageScore = 1.0;
      ageReason = `Age (${candidateAge} yrs) matches preferred range (${minAge}-${maxAge} yrs)`;
      ageMatched = true;
    } else if (candidateAge < minAge) {
      const diff = minAge - candidateAge;
      ageScore = Math.max(0.1, 1 - diff * 0.2);
      ageReason = `Candidate is ${diff} yr(s) younger than preferred min (${minAge} yrs)`;
      ageMatched = ageScore >= 0.7;
    } else {
      const diff = candidateAge - maxAge;
      ageScore = Math.max(0.1, 1 - diff * 0.2);
      ageReason = `Candidate is ${diff} yr(s) older than preferred max (${maxAge} yrs)`;
      ageMatched = ageScore >= 0.7;
    }
  } else {
    ageReason = `Age (${candidateAge} yrs) - flexible age criteria`;
  }
  breakdown.push({ factor: 'Age Compatibility', weight: ageWeight, score: ageScore, matched: ageMatched, reason: ageReason });

  // --- Factor 2: Religion, Caste & Sub-caste ---
  const relWeight = weightsMap['Religion & Caste Preference'] ?? defaultWeights['Religion & Caste Preference'];
  const prefRelStr = (pref.preferred_religions || '').toLowerCase();
  const prefCasteStr = (pref.preferred_castes || '').toLowerCase();
  const prefSubCasteStr = (pref.preferred_sub_castes || '').toLowerCase();
  const candRel = (candidateProfile.religion || '').toLowerCase();
  const candCaste = (candidateProfile.caste || '').toLowerCase();
  const candSubCaste = (candidateProfile.sub_caste || '').toLowerCase();

  let relScore = 1.0;
  let relMatched = true;
  let relReason = 'Open to all communities';

  if (prefRelStr && prefRelStr !== 'any') {
    const allowedRels = prefRelStr.split(',').map((s: string) => s.trim());
    const isRelMatch = allowedRels.some((r: string) => r && (candRel.includes(r) || r.includes(candRel) || r === 'any'));
    if (!isRelMatch) {
      relScore = 0.4;
      relMatched = false;
      relReason = `Different religion (${candidateProfile.religion || 'Unspecified'})`;
    } else {
      relReason = `Religion aligned (${candidateProfile.religion})`;
      // Check caste if religion matched
      if (prefCasteStr && prefCasteStr !== 'any' && !prefCasteStr.includes('open to all')) {
        const allowedCastes = prefCasteStr.split(',').map((s: string) => s.trim());
        const isCasteMatch = allowedCastes.some((c: string) => c && (candCaste.includes(c) || c.includes(candCaste)));
        if (isCasteMatch) {
          relScore = 1.0;
          relReason += ` • Caste matched (${candidateProfile.caste})`;
          // Sub-caste bonus
          if (prefSubCasteStr && prefSubCasteStr !== 'any' && candSubCaste && (candSubCaste.includes(prefSubCasteStr) || prefSubCasteStr.includes(candSubCaste))) {
            relReason += ` • Gotra / Sub-caste aligned`;
          }
        } else {
          relScore = 0.8;
          relReason += ` • Different caste community`;
        }
      }
    }
  }
  breakdown.push({ factor: 'Religion & Caste', weight: relWeight, score: relScore, matched: relMatched, reason: relReason });

  // --- Factor 3: Marital Status ---
  const maritalWeight = weightsMap['Marital Status Compatibility'] ?? defaultWeights['Marital Status Compatibility'];
  const prefMaritalStr = (pref.accepted_marital_status || '').toUpperCase();
  const candMarital = (candidateProfile.marital_status || 'NEVER_MARRIED').toUpperCase();
  let maritalScore = 1.0;
  let maritalMatched = true;
  let maritalReason = 'Marital status acceptable';

  if (prefMaritalStr && prefMaritalStr !== 'ANY') {
    const allowedStatuses = prefMaritalStr.split(',').map((s: string) => s.trim().replace(/\s+/g, '_'));
    const normalizedCand = candMarital.replace(/\s+/g, '_');
    maritalMatched = allowedStatuses.includes(normalizedCand) || allowedStatuses.includes('ANY') || allowedStatuses.some((st: string) => normalizedCand.includes(st) || st.includes(normalizedCand));
    maritalScore = maritalMatched ? 1.0 : 0.2;
    maritalReason = maritalMatched
      ? `Marital status compatible (${candidateProfile.marital_status || 'Never Married'})`
      : `Marital status (${candidateProfile.marital_status}) outside preference`;
  }
  breakdown.push({ factor: 'Marital Status', weight: maritalWeight, score: maritalScore, matched: maritalMatched, reason: maritalReason });

  // --- Factor 4: Education Level Matching ---
  const eduWeight = weightsMap['Education Level Matching'] ?? defaultWeights['Education Level Matching'];
  const prefEduStr = (pref.preferred_educations || '').toLowerCase();
  const candEdu = (candidateProfile.education || '').toLowerCase();
  let eduScore = 1.0;
  let eduMatched = true;
  let eduReason = `Educational qualification: ${candidateProfile.education || 'Graduate'}`;

  if (prefEduStr && prefEduStr !== 'any') {
    const allowedEdus = prefEduStr.split(',').map((s: string) => s.trim());
    const isDirectMatch = allowedEdus.some((ed: string) => ed && (candEdu.includes(ed) || ed.includes(candEdu) || ed === 'any'));
    if (isDirectMatch) {
      eduScore = 1.0;
      eduReason = `Education matches criteria (${candidateProfile.education})`;
    } else {
      eduScore = 0.75;
      eduMatched = false;
      eduReason = `Education (${candidateProfile.education}) partially aligns`;
    }
  }
  breakdown.push({ factor: 'Education Level', weight: eduWeight, score: eduScore, matched: eduMatched, reason: eduReason });

  // --- Factor 5: Profession & Career ---
  const profWeight = weightsMap['Profession & Career Field'] ?? defaultWeights['Profession & Career Field'];
  const prefProfStr = (pref.preferred_professions || '').toLowerCase();
  const candProf = (candidateProfile.profession || '').toLowerCase();
  let profScore = 1.0;
  let profMatched = true;
  let profReason = `Career profile: ${candidateProfile.profession || 'Professional'}`;

  if (prefProfStr && prefProfStr !== 'any') {
    const allowedProfs = prefProfStr.split(',').map((s: string) => s.trim());
    const isProfMatch = allowedProfs.some((p: string) => p && (candProf.includes(p) || p.includes(candProf) || p === 'any'));
    if (isProfMatch) {
      profScore = 1.0;
      profReason = `Profession matches preference (${candidateProfile.profession})`;
    } else {
      profScore = 0.75;
      profMatched = false;
      profReason = `Profession (${candidateProfile.profession}) is in an adjacent industry`;
    }
  }
  breakdown.push({ factor: 'Career & Profession', weight: profWeight, score: profScore, matched: profMatched, reason: profReason });

  // --- Factor 6: Income Expectation ---
  const incWeight = weightsMap['Annual Income Expectation'] ?? defaultWeights['Annual Income Expectation'];
  const candIncome = parseFloat(candidateProfile.annual_income || '0');
  const minIncPref = parseFloat(pref.min_income || '0');
  let incScore = 1.0;
  let incMatched = true;
  let incReason = 'Flexible financial expectation';

  if (minIncPref > 0) {
    if (candIncome >= minIncPref) {
      incScore = 1.0;
      incMatched = true;
      incReason = `Income aligns with expectation (₹${(candIncome / 100000).toFixed(1)} LPA)`;
    } else if (candIncome > 0) {
      incScore = Math.max(0.4, candIncome / minIncPref);
      incMatched = incScore >= 0.8;
      incReason = `Income slightly below specified expectation`;
    } else {
      incScore = 0.6;
      incMatched = false;
      incReason = 'Income details confidential / below filter bar';
    }
  } else if (candIncome > 0) {
    incReason = `Declared income: ₹${(candIncome / 100000).toFixed(1)} LPA`;
  }
  breakdown.push({ factor: 'Income Expectation', weight: incWeight, score: incScore, matched: incMatched, reason: incReason });

  // --- Factor 7: Height Preference ---
  const heightWeight = weightsMap['Height Preference Match'] ?? defaultWeights['Height Preference Match'];
  const candH = Number(candidateProfile.height_cm) || 165;
  const minH = Number(pref.min_height_cm) || 0;
  const maxH = Number(pref.max_height_cm) || 0;
  let hScore = 1.0;
  let hMatched = true;
  let hReason = `Height: ${candH} cm`;

  if (minH > 0 && maxH > 0) {
    if (candH >= minH && candH <= maxH) {
      hScore = 1.0;
      hReason = `Height (${candH} cm) within preferred range (${minH}-${maxH} cm)`;
    } else {
      const diff = candH < minH ? minH - candH : candH - maxH;
      hScore = Math.max(0.3, 1 - diff * 0.08);
      hMatched = hScore >= 0.75;
      hReason = `Height (${candH} cm) slightly outside target range`;
    }
  }
  breakdown.push({ factor: 'Height Preference', weight: heightWeight, score: hScore, matched: hMatched, reason: hReason });

  // --- Factor 8: Location & Settlement ---
  const locWeight = weightsMap['Location & City Distance'] ?? defaultWeights['Location & City Distance'];
  const prefCountry = (pref.preferred_country || '').toLowerCase();
  const prefState = (pref.preferred_state || '').toLowerCase();
  const prefCity = (pref.preferred_city || '').toLowerCase();
  const prefLocations = (pref.preferred_locations || '').toLowerCase();
  const candCity = (candidateProfile.city || '').toLowerCase();
  const candState = (candidateProfile.state || '').toLowerCase();
  const candCountry = (candidateProfile.country || 'india').toLowerCase();

  let locScore = 1.0;
  let locMatched = true;
  let locReason = `Location: ${candidateProfile.city || candidateProfile.state || 'India'}`;

  const hasLocFilter = (prefCity && prefCity !== 'any') || (prefState && prefState !== 'any') || (prefLocations && prefLocations !== 'any');
  if (hasLocFilter) {
    const isCityMatch = (prefCity && candCity.includes(prefCity)) || (prefLocations && prefLocations.includes(candCity));
    const isStateMatch = prefState && (candState.includes(prefState) || prefState.includes(candState));

    if (isCityMatch) {
      locScore = 1.0;
      locReason = `City matches preference (${candidateProfile.city})`;
    } else if (isStateMatch) {
      locScore = 0.85;
      locReason = `State matches preference (${candidateProfile.state})`;
    } else {
      locScore = 0.65;
      locMatched = false;
      locReason = `Location: ${candidateProfile.city || candidateProfile.state}`;
    }
  }
  breakdown.push({ factor: 'Location & Distance', weight: locWeight, score: locScore, matched: locMatched, reason: locReason });

  // --- Factor 9: Profile Completeness & Verification ---
  const trustWeight = weightsMap['Profile Completeness & Verification'] ?? defaultWeights['Profile Completeness & Verification'];
  const isVerified = candidateProfile.verification_status === 'VERIFIED' || candidateProfile.verification_status === 'APPROVED';
  const hasBio = Boolean(candidateProfile.about_me && candidateProfile.about_me.length > 20);
  const trustScore = isVerified ? 1.0 : hasBio ? 0.85 : 0.7;
  breakdown.push({
    factor: 'Verification & Authenticity',
    weight: trustWeight,
    score: trustScore,
    matched: isVerified,
    reason: isVerified ? 'Verified matrimonial member badge' : 'Active community profile',
  });

  // Calculate Overall Weighted Score (0 to 100)
  let weightedSum = 0;
  let totalWeights = 0;
  for (const item of breakdown) {
    weightedSum += item.score * item.weight;
    totalWeights += item.weight;
  }

  const finalPercentage = totalWeights > 0 ? (weightedSum / totalWeights) * 100 : 85;
  const roundedOverall = Math.min(99, Math.max(50, Math.round(finalPercentage * 10) / 10));

  // Recommendation Score for Recommended Profiles tab:
  // Blends match compatibility with verification credibility, complete bio, and high-trust signals
  let recScore = roundedOverall * 0.65;
  if (isVerified) recScore += 18;
  if (candidateProfile.photo_url) recScore += 10;
  if (hasBio) recScore += 7;
  const roundedRec = Math.min(99, Math.round(recScore * 10) / 10);

  const matchedCriteria = breakdown.filter((b) => b.matched).map((b) => b.factor);
  const missingCriteria = breakdown.filter((b) => !b.matched).map((b) => b.factor);

  const explanation = `Software-calculated compatibility of ${roundedOverall}% based on ${matchedCriteria.length} matching preferences including ${matchedCriteria.slice(0, 3).join(', ')}.`;

  return {
    overallScore: roundedOverall,
    recommendationScore: roundedRec,
    percentage: `${Math.round(roundedOverall)}%`,
    breakdown,
    matchedCriteria,
    missingCriteria,
    explanation,
    isHighMatch: roundedOverall >= 82,
  };
}
