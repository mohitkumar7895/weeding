import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { calculateCompatibility } from '@/services/matchingEngine';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    const { searchParams } = new URL(req.url);

    const tab = searchParams.get('tab') || 'best'; // 'best' | 'recommended' | 'recent'
    const filterReligion = searchParams.get('religion');
    const filterCity = searchParams.get('city');
    const filterAgeRange = searchParams.get('ageRange');
    const searchQuery = searchParams.get('search')?.trim().toLowerCase();

    let currentPref: any = null;
    let currentUserProfile: any = null;
    let currentProfileId = '';
    let excludeUserId = '';
    let shortlistedTargetIds = new Set<string>();

    if (session) {
      excludeUserId = session.id;

      // 1. Fetch user's own profile and partner preferences
      const userProfiles = await query<any[]>(
        `SELECT cp.id as profile_id, cp.gender, cp.date_of_birth, cp.religion, cp.caste, cp.city,
                pp.*
         FROM customer_profiles cp
         LEFT JOIN partner_preferences pp ON cp.id = pp.profile_id
         WHERE cp.user_id = ? LIMIT 1`,
        [session.id]
      );

      if (userProfiles.length > 0) {
        currentUserProfile = userProfiles[0];
        currentProfileId = userProfiles[0].profile_id;
        currentPref = userProfiles[0];
      }

      // 2. Fetch shortlisted profile IDs for this user
      if (currentProfileId) {
        try {
          const slRows = await query<any[]>(
            `SELECT target_profile_id FROM shortlists WHERE customer_id = ?`,
            [currentProfileId]
          );
          shortlistedTargetIds = new Set(slRows.map((r) => r.target_profile_id));
        } catch (slErr) {
          console.warn('[matches API] Shortlist query notice:', slErr);
        }
      }
    }

    // Default preference if user hasn't configured or is guest
    if (!currentPref || (!currentPref.min_age && !currentPref.preferred_religions)) {
      currentPref = {
        min_age: 0,
        max_age: 0,
        min_height_cm: 0,
        max_height_cm: 0,
        accepted_marital_status: '',
        preferred_religions: '',
        preferred_castes: '',
        preferred_sub_castes: '',
        preferred_educations: '',
        preferred_professions: '',
        min_income: 0,
        preferred_country: '',
        preferred_state: '',
        preferred_city: '',
        preferred_locations: '',
      };
    }

    // Query candidate profiles from MySQL
    // Exclude self, unapproved/rejected, and private profiles
    let sql = `
      SELECT cp.*, u.name, u.status as user_status,
             (SELECT url FROM profile_photos WHERE profile_id = cp.id AND is_primary = TRUE LIMIT 1) as photo_url,
             (SELECT photos_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_photos,
             (SELECT income_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_income,
             (SELECT location_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_location
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.status = 'ACTIVE'
        AND cp.profile_visibility != 'PRIVATE'
        AND cp.verification_status != 'REJECTED'
    `;
    const params: any[] = [];

    // Exclude logged in user
    if (excludeUserId) {
      sql += ' AND cp.user_id != ?';
      params.push(excludeUserId);

      // Exclude blocked profiles (both blocked by user or who blocked user)
      try {
        sql += `
          AND cp.user_id NOT IN (
            SELECT blocked_user_id FROM blocked_profiles WHERE user_id = ?
          )
          AND cp.user_id NOT IN (
            SELECT user_id FROM blocked_profiles WHERE blocked_user_id = ?
          )
        `;
        params.push(excludeUserId, excludeUserId);
      } catch {
        // Table might be initializing
      }
    }

    // Filter by target gender if user specified their own gender
    if (currentUserProfile?.gender) {
      const userG = String(currentUserProfile.gender).toUpperCase();
      const targetGender = userG === 'MALE' ? 'FEMALE' : userG === 'FEMALE' ? 'MALE' : null;
      if (targetGender) {
        sql += ' AND UPPER(cp.gender) = ?';
        params.push(targetGender);
      }
    }

    // Apply quick filters if provided in URL query
    if (filterReligion && filterReligion !== 'ALL') {
      sql += ' AND LOWER(cp.religion) = ?';
      params.push(filterReligion.toLowerCase());
    }

    if (filterCity && filterCity !== 'ALL') {
      sql += ' AND LOWER(cp.city) LIKE ?';
      params.push(`%${filterCity.toLowerCase()}%`);
    }

    const candidates = await query<any[]>(sql, params);

    // Calculate real compatibility scores using matching engine
    const currentYear = new Date().getFullYear();
    const scoredCandidates: any[] = [];

    for (const cand of candidates) {
      const compatibility = await calculateCompatibility(currentPref, cand);

      let age = 25;
      if (cand.date_of_birth) {
        const bYear = new Date(cand.date_of_birth).getFullYear();
        if (!isNaN(bYear) && bYear > 1900) {
          age = currentYear - bYear;
        }
      }

      // Age Range query filter
      if (filterAgeRange && filterAgeRange !== 'ALL') {
        if (filterAgeRange === '18-24' && (age < 18 || age > 24)) continue;
        if (filterAgeRange === '25-29' && (age < 25 || age > 29)) continue;
        if (filterAgeRange === '30-34' && (age < 30 || age > 34)) continue;
        if (filterAgeRange === '35+' && age < 35) continue;
      }

      // Text search query filter (name, profession, education, caste, city)
      if (searchQuery) {
        const hay = `${cand.name} ${cand.profession} ${cand.education} ${cand.caste} ${cand.city} ${cand.religion}`.toLowerCase();
        if (!hay.includes(searchQuery)) continue;
      }

      // Privacy enforcement (respect both customer_profiles flags and privacy_settings)
      const isLimited = cand.profile_visibility === 'LIMITED';
      const isPhotoHidden = Boolean(cand.hide_photos || cand.priv_photos === 'PRIVATE' || (isLimited && cand.hide_photos));
      const isIncomeHidden = Boolean(cand.hide_income || cand.priv_income === 'PRIVATE' || (isLimited && cand.hide_income));
      const isLocationHidden = Boolean(cand.hide_location || cand.priv_location === 'PRIVATE' || (isLimited && cand.hide_location));

      const heightCm = Number(cand.height_cm) || 0;
      const heightFormatted = heightCm > 0
        ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}" (${heightCm} cm)`
        : 'Height Unspecified';

      const incomeNum = parseFloat(cand.annual_income || '0');
      const incomeFormatted = isIncomeHidden
        ? 'Confidential'
        : incomeNum > 0
        ? `₹${(incomeNum / 100000).toFixed(1)} LPA`
        : 'Confidential';

      const isShortlisted = shortlistedTargetIds.has(cand.id);

      scoredCandidates.push({
        id: cand.id,
        profile_id: cand.id,
        userId: cand.user_id,
        name: cand.name || 'Matrimonial Member',
        gender: cand.gender,
        dateOfBirth: cand.date_of_birth,
        age,
        height_cm: heightCm,
        heightCm,
        heightFormatted,
        city: isLocationHidden ? 'Protected by Member' : (cand.city || 'India'),
        state: cand.state || '',
        country: cand.country || 'India',
        is_location_hidden: isLocationHidden,
        religion: cand.religion || 'Hindu',
        caste: cand.caste || '',
        sub_caste: cand.sub_caste || '',
        mother_tongue: cand.mother_tongue || 'Hindi',
        education: cand.education || 'Graduate',
        college: cand.college || '',
        profession: cand.profession || 'Professional',
        company: cand.company || '',
        annual_income: isIncomeHidden ? 0 : incomeNum,
        annualIncomeFormatted: incomeFormatted,
        about_me: cand.about_me || '',
        diet: cand.diet || 'Vegetarian',
        smoking: cand.smoking || 'No',
        drinking: cand.drinking || 'No',
        family_type: cand.family_type || 'Nuclear',
        family_values: cand.family_values || 'Moderate',
        photo_url: isPhotoHidden ? null : (cand.photo_url || '/images/priya.jpg'),
        is_photo_hidden: isPhotoHidden,
        profile_visibility: cand.profile_visibility || 'PUBLIC',
        verification_status: cand.verification_status,
        is_verified: cand.verification_status === 'VERIFIED' || cand.verification_status === 'APPROVED',
        match_score: compatibility.percentage,
        matchScoreNumber: compatibility.overallScore,
        recommendationScore: compatibility.recommendationScore,
        is_shortlisted: isShortlisted,
        breakdown: compatibility.breakdown,
        compatibilityDetails: compatibility,
        created_at: cand.created_at,
      });
    }

    // Sort according to tab
    if (tab === 'recent') {
      // Recently Added Profiles: chronological newest first
      scoredCandidates.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    } else if (tab === 'recommended') {
      // Recommended Profiles: blended recommendation score (match + trust + verified badges)
      scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);
    } else {
      // Best Matches: strictly software-calculated compatibility percentage
      scoredCandidates.sort((a, b) => b.matchScoreNumber - a.matchScoreNumber);
    }

    return NextResponse.json({
      success: true,
      tab,
      count: scoredCandidates.length,
      matches: scoredCandidates,
      data: scoredCandidates,
      disclaimer:
        'Match percentages and recommendations are algorithmic software calculations based on user-provided profile data and partner preferences. They do not constitute a guarantee of compatibility or marriage.',
    });
  } catch (error: any) {
    console.error('[Matches API Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
