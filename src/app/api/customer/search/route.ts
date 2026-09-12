import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { calculateCompatibility } from '@/services/matchingEngine';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== 'CUSTOMER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please sign in to search matrimonial profiles.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Advanced Filter Parameters
    const minAge = searchParams.get('min_age') ? parseInt(searchParams.get('min_age')!, 10) : null;
    const maxAge = searchParams.get('max_age') ? parseInt(searchParams.get('max_age')!, 10) : null;
    const religion = searchParams.get('religion')?.trim();
    const caste = searchParams.get('caste')?.trim();
    const subCaste = searchParams.get('sub_caste')?.trim();
    const maritalStatus = searchParams.get('marital_status')?.trim();
    const education = searchParams.get('education')?.trim();
    const profession = searchParams.get('profession')?.trim();
    const minIncome = searchParams.get('min_income') ? parseFloat(searchParams.get('min_income')!) : null;
    const maxIncome = searchParams.get('max_income') ? parseFloat(searchParams.get('max_income')!) : null;
    const minHeight = searchParams.get('min_height') ? parseInt(searchParams.get('min_height')!, 10) : null;
    const maxHeight = searchParams.get('max_height') ? parseInt(searchParams.get('max_height')!, 10) : null;
    const country = searchParams.get('country')?.trim();
    const state = searchParams.get('state')?.trim();
    const city = searchParams.get('city')?.trim();
    const keyword = searchParams.get('keyword')?.trim().toLowerCase();

    // Sorting Option
    const sort = searchParams.get('sort')?.trim() || 'best_match';

    // 1. Fetch current customer's profile & partner preferences for compatibility calculation
    let currentUserProfile: any = null;
    let currentProfileId: string | null = null;
    let currentPref: any = null;
    let shortlistedTargetIds = new Set<string>();

    const userProfiles = await query<any[]>(
      `SELECT cp.*, pp.*, cp.id as profile_id
       FROM customer_profiles cp
       LEFT JOIN partner_preferences pp ON cp.id = pp.profile_id
       WHERE cp.user_id = ? LIMIT 1`,
      [session.id]
    );

    if (userProfiles.length > 0) {
      currentUserProfile = userProfiles[0];
      currentProfileId = userProfiles[0].profile_id;
      currentPref = userProfiles[0];

      if (currentProfileId) {
        try {
          const slRows = await query<any[]>(
            `SELECT target_profile_id FROM shortlists WHERE customer_id = ?`,
            [currentProfileId]
          );
          shortlistedTargetIds = new Set(slRows.map((r) => r.target_profile_id));
        } catch {}
      }
    }

    if (!currentPref) {
      currentPref = { min_age: 0, max_age: 0 };
    }

    // 2. Build SQL query for candidate matrimonial profiles
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
        AND cp.user_id != ?
    `;
    const params: any[] = [session.id];

    // Exclude blocked profiles if table exists
    try {
      const blockedTable = await query<any[]>("SHOW TABLES LIKE 'blocked_profiles'");
      if (blockedTable && blockedTable.length > 0) {
        sql += `
          AND cp.user_id NOT IN (
            SELECT blocked_user_id FROM blocked_profiles WHERE user_id = ?
          )
          AND cp.user_id NOT IN (
            SELECT user_id FROM blocked_profiles WHERE blocked_user_id = ?
          )
        `;
        params.push(session.id, session.id);
      }
    } catch {}

    // Target opposite gender if specified
    if (currentUserProfile?.gender) {
      const userG = String(currentUserProfile.gender).toUpperCase();
      const targetGender = userG === 'MALE' ? 'FEMALE' : userG === 'FEMALE' ? 'MALE' : null;
      if (targetGender) {
        sql += ' AND UPPER(cp.gender) = ?';
        params.push(targetGender);
      }
    }

    // Religion Filter
    if (religion && religion.toUpperCase() !== 'ANY' && religion.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.religion) = ?';
      params.push(religion.toLowerCase());
    }

    // Caste Filter
    if (caste && caste.toUpperCase() !== 'ANY' && caste.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.caste) LIKE ?';
      params.push(`%${caste.toLowerCase()}%`);
    }

    // Sub-caste Filter
    if (subCaste && subCaste.toUpperCase() !== 'ANY' && subCaste.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.sub_caste) LIKE ?';
      params.push(`%${subCaste.toLowerCase()}%`);
    }

    // Marital Status Filter
    if (maritalStatus && maritalStatus.toUpperCase() !== 'ANY' && maritalStatus.toUpperCase() !== 'ALL') {
      sql += ' AND (LOWER(cp.marital_status) = ? OR cp.marital_status IS NULL)';
      params.push(maritalStatus.toLowerCase());
    }

    // Education Filter
    if (education && education.toUpperCase() !== 'ANY' && education.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.education) LIKE ?';
      params.push(`%${education.toLowerCase()}%`);
    }

    // Profession Filter
    if (profession && profession.toUpperCase() !== 'ANY' && profession.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.profession) LIKE ?';
      params.push(`%${profession.toLowerCase()}%`);
    }

    // Income Range Filters (annual_income in ₹)
    if (minIncome !== null && !isNaN(minIncome) && minIncome > 0) {
      sql += ' AND (cp.annual_income >= ? OR cp.annual_income IS NULL)';
      params.push(minIncome);
    }
    if (maxIncome !== null && !isNaN(maxIncome) && maxIncome > 0) {
      sql += ' AND (cp.annual_income <= ? OR cp.annual_income IS NULL)';
      params.push(maxIncome);
    }

    // Height Range Filters (height_cm in cm)
    if (minHeight !== null && !isNaN(minHeight) && minHeight > 0) {
      sql += ' AND (cp.height_cm >= ? OR cp.height_cm IS NULL)';
      params.push(minHeight);
    }
    if (maxHeight !== null && !isNaN(maxHeight) && maxHeight > 0) {
      sql += ' AND (cp.height_cm <= ? OR cp.height_cm IS NULL)';
      params.push(maxHeight);
    }

    // Location Filters
    if (country && country.toUpperCase() !== 'ANY' && country.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.country) LIKE ?';
      params.push(`%${country.toLowerCase()}%`);
    }
    if (state && state.toUpperCase() !== 'ANY' && state.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.state) LIKE ?';
      params.push(`%${state.toLowerCase()}%`);
    }
    if (city && city.toUpperCase() !== 'ANY' && city.toUpperCase() !== 'ALL') {
      sql += ' AND LOWER(cp.city) LIKE ?';
      params.push(`%${city.toLowerCase()}%`);
    }

    // Database sorting for non-compatibility sorts
    if (sort === 'recently_added') {
      sql += ' ORDER BY cp.created_at DESC';
    } else if (sort === 'age_asc') {
      // Youngest first = highest date_of_birth DESC
      sql += ' ORDER BY cp.date_of_birth DESC';
    } else if (sort === 'age_desc') {
      // Oldest first = lowest date_of_birth ASC
      sql += ' ORDER BY cp.date_of_birth ASC';
    } else if (sort === 'income_desc') {
      sql += ' ORDER BY cp.annual_income DESC';
    }

    const candidates = await query<any[]>(sql, params);

    // 3. Process candidates: compute age, compatibility, keyword filtering, and privacy masking
    const currentYear = new Date().getFullYear();
    const processedResults: any[] = [];

    for (const cand of candidates) {
      let age = 25;
      if (cand.date_of_birth) {
        const bYear = new Date(cand.date_of_birth).getFullYear();
        if (!isNaN(bYear) && bYear > 1900) {
          age = currentYear - bYear;
        }
      }

      // Age Range Filter in Memory (precise year evaluation)
      if (minAge !== null && !isNaN(minAge) && age < minAge) continue;
      if (maxAge !== null && !isNaN(maxAge) && age > maxAge) continue;

      // Free-text keyword filter (matches name, profession, education, caste, city, religion)
      if (keyword) {
        const haystack = `${cand.name} ${cand.profession || ''} ${cand.education || ''} ${cand.caste || ''} ${cand.city || ''} ${cand.religion || ''}`.toLowerCase();
        if (!haystack.includes(keyword)) continue;
      }

      // Multi-factor compatibility calculation
      const compatibility = await calculateCompatibility(currentPref, cand);

      // Privacy enforcement: respect both customer_profiles flags and privacy_settings
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
        ? `₹${(incomeNum / 100000).toFixed(1)} Lakhs`
        : 'Confidential';

      processedResults.push({
        id: cand.id,
        profile_id: cand.id,
        userId: cand.user_id,
        name: cand.name,
        gender: cand.gender,
        age,
        heightFormatted,
        height_cm: heightCm,
        city: isLocationHidden ? 'Protected by Member' : (cand.city || 'India'),
        state: isLocationHidden ? '' : (cand.state || ''),
        country: cand.country || 'India',
        religion: cand.religion || 'Hindu',
        caste: cand.caste || '',
        sub_caste: cand.sub_caste || '',
        mother_tongue: cand.mother_tongue || 'Hindi',
        education: cand.education || 'Graduate',
        college: cand.college || '',
        profession: cand.profession || 'Professional',
        company: cand.company || '',
        annual_income: isIncomeHidden ? null : incomeNum,
        annualIncomeFormatted: incomeFormatted,
        about_me: cand.about_me || '',
        diet: cand.diet || 'Vegetarian',
        smoking: cand.smoking || 'No',
        drinking: cand.drinking || 'No',
        family_type: cand.family_type || 'Nuclear',
        family_values: cand.family_values || 'Moderate',
        photo_url: isPhotoHidden ? null : (cand.photo_url || '/images/priya.jpg'),
        is_photo_hidden: isPhotoHidden,
        is_location_hidden: isLocationHidden,
        verification_status: cand.verification_status,
        is_verified: cand.verification_status === 'VERIFIED' || cand.verification_status === 'APPROVED',
        match_score: compatibility.percentage,
        matchScoreNumber: compatibility.overallScore,
        recommendationScore: compatibility.recommendationScore,
        is_shortlisted: shortlistedTargetIds.has(cand.id),
        breakdown: compatibility.breakdown,
        compatibilityDetails: compatibility,
        profile_visibility: cand.profile_visibility || 'PUBLIC',
      });
    }

    // 4. In-Memory Sorting for Best Match
    if (sort === 'best_match' || !sort) {
      processedResults.sort((a, b) => b.matchScoreNumber - a.matchScoreNumber);
    }

    return NextResponse.json({
      success: true,
      count: processedResults.length,
      data: processedResults,
      applied_filters: {
        min_age: minAge,
        max_age: maxAge,
        religion: religion || null,
        caste: caste || null,
        sub_caste: subCaste || null,
        marital_status: maritalStatus || null,
        education: education || null,
        profession: profession || null,
        min_income: minIncome,
        max_income: maxIncome,
        min_height: minHeight,
        max_height: maxHeight,
        country: country || null,
        state: state || null,
        city: city || null,
        keyword: keyword || null,
      },
      applied_sort: sort,
    });
  } catch (error: any) {
    console.error('[Customer Search API Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'An error occurred while executing matrimonial search.' },
      { status: 500 }
    );
  }
}
