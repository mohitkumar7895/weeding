import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { calculateCompatibility } from '@/services/matchingEngine';

async function safeQuery<T = any[]>(sql: string, params: any[] = []): Promise<T> {
  try {
    const rows = await query<T>(sql, params);
    return (Array.isArray(rows) ? rows : []) as T;
  } catch (err: any) {
    console.warn('[matches API] query skipped:', err.code || '', err.message);
    return [] as T;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    const { searchParams } = new URL(req.url);

    const tab = searchParams.get('tab') || 'best';
    const filterReligion = searchParams.get('religion');
    const filterCity = searchParams.get('city');
    const filterAgeRange = searchParams.get('ageRange');
    const searchQuery = searchParams.get('search')?.trim().toLowerCase();

    let currentPref: any = null;
    let currentUserProfile: any = null;
    let currentProfileId = '';
    let excludeUserId = '';
    let shortlistedTargetIds = new Set<string>();
    const blockedUserIds = new Set<string>();

    if (session) {
      excludeUserId = session.id;

      const userProfiles = await safeQuery<any[]>(
        `SELECT cp.id as profile_id, cp.gender, cp.date_of_birth, cp.religion, cp.caste, cp.city
         FROM customer_profiles cp
         WHERE cp.user_id = ? LIMIT 1`,
        [session.id]
      );

      if (userProfiles.length > 0) {
        currentUserProfile = userProfiles[0];
        currentProfileId = userProfiles[0].profile_id;
        currentPref = { ...userProfiles[0] };

        const prefs = await safeQuery<any[]>(
          `SELECT * FROM partner_preferences WHERE profile_id = ? LIMIT 1`,
          [currentProfileId]
        );
        if (prefs[0]) currentPref = { ...currentPref, ...prefs[0] };
      }

      if (currentProfileId) {
        const slRows = await safeQuery<any[]>(
          `SELECT target_profile_id FROM shortlists WHERE customer_id = ?`,
          [currentProfileId]
        );
        shortlistedTargetIds = new Set(slRows.map((r) => r.target_profile_id));
      }

      const blocked = await safeQuery<any[]>(
        `SELECT blocked_user_id AS id FROM blocked_profiles WHERE user_id = ?
         UNION
         SELECT user_id AS id FROM blocked_profiles WHERE blocked_user_id = ?`,
        [excludeUserId, excludeUserId]
      );
      blocked.forEach((row) => {
        if (row?.id) blockedUserIds.add(row.id);
      });
    }

    if (!currentPref || (!currentPref.min_age && !currentPref.preferred_religions)) {
      currentPref = {
        ...(currentPref || {}),
        min_age: currentPref?.min_age || 0,
        max_age: currentPref?.max_age || 0,
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

    const params: any[] = [];
    let sql = `
      SELECT cp.*, u.name, u.status as user_status
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.status = 'ACTIVE'
    `;

    if (excludeUserId) {
      sql += ' AND cp.user_id != ?';
      params.push(excludeUserId);
    }

    if (currentUserProfile?.gender) {
      const userG = String(currentUserProfile.gender).toUpperCase();
      const targetGender = userG === 'MALE' ? 'FEMALE' : userG === 'FEMALE' ? 'MALE' : null;
      if (targetGender) {
        sql += ' AND UPPER(cp.gender) = ?';
        params.push(targetGender);
      }
    }

    if (filterReligion && filterReligion !== 'ALL') {
      sql += ' AND LOWER(cp.religion) = ?';
      params.push(filterReligion.toLowerCase());
    }

    if (filterCity && filterCity !== 'ALL') {
      sql += ' AND LOWER(cp.city) LIKE ?';
      params.push(`%${filterCity.toLowerCase()}%`);
    }

    sql += ' LIMIT 100';

    let candidates = await safeQuery<any[]>(sql, params);
    if (!candidates.length) {
      candidates = await safeQuery<any[]>(
        `SELECT cp.*, u.name, u.status as user_status
         FROM customer_profiles cp
         JOIN users u ON cp.user_id = u.id
         WHERE u.status = 'ACTIVE'
         ${excludeUserId ? 'AND cp.user_id != ?' : ''}
         LIMIT 100`,
        excludeUserId ? [excludeUserId] : []
      );
    }

    const photoRows = await safeQuery<any[]>(
      `SELECT profile_id, url FROM profile_photos WHERE is_primary = TRUE`
    );
    const photoByProfile = new Map(photoRows.map((p) => [p.profile_id, p.url]));

    const privacyRows = await safeQuery<any[]>(
      `SELECT user_id, photos_visibility, income_visibility, location_visibility FROM privacy_settings`
    );
    const privacyByUser = new Map(privacyRows.map((p) => [p.user_id, p]));

    const currentYear = new Date().getFullYear();
    const scoredCandidates: any[] = [];

    for (const cand of candidates) {
      if (blockedUserIds.has(cand.user_id)) continue;
      if (String(cand.profile_visibility || 'PUBLIC').toUpperCase() === 'PRIVATE') continue;
      if (String(cand.verification_status || '').toUpperCase() === 'REJECTED') continue;

      cand.photo_url = photoByProfile.get(cand.id) || cand.photo_url || null;
      const priv = privacyByUser.get(cand.user_id) || {};
      cand.priv_photos = priv.photos_visibility;
      cand.priv_income = priv.income_visibility;
      cand.priv_location = priv.location_visibility;

      const compatibility = await calculateCompatibility(currentPref, cand);

      let age = 25;
      if (cand.date_of_birth) {
        const bYear = new Date(cand.date_of_birth).getFullYear();
        if (!isNaN(bYear) && bYear > 1900) {
          age = currentYear - bYear;
        }
      }

      if (filterAgeRange && filterAgeRange !== 'ALL') {
        if (filterAgeRange === '18-24' && (age < 18 || age > 24)) continue;
        if (filterAgeRange === '25-29' && (age < 25 || age > 29)) continue;
        if (filterAgeRange === '30-34' && (age < 30 || age > 34)) continue;
        if (filterAgeRange === '35+' && age < 35) continue;
      }

      if (searchQuery) {
        const hay = `${cand.name} ${cand.profession} ${cand.education} ${cand.caste} ${cand.city} ${cand.religion}`.toLowerCase();
        if (!hay.includes(searchQuery)) continue;
      }

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
        is_shortlisted: shortlistedTargetIds.has(cand.id),
        breakdown: compatibility.breakdown,
        compatibilityDetails: compatibility,
        created_at: cand.created_at,
      });
    }

    if (tab === 'recent') {
      scoredCandidates.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    } else if (tab === 'recommended') {
      scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);
    } else {
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
    return NextResponse.json(
      { success: false, message: error.message || 'Unable to load matches' },
      { status: 500 }
    );
  }
}
