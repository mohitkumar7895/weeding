import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { calculateCompatibility } from '@/services/matchingEngine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionUser();

    // 1. Fetch candidate profile
    const profileRows = await query<any[]>(
      `SELECT cp.*, u.name, u.email, u.phone, u.status as user_status,
              (SELECT photos_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_photos,
              (SELECT phone_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_phone,
              (SELECT email_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_email,
              (SELECT income_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_income,
              (SELECT family_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_family,
              (SELECT location_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_location
       FROM customer_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.id = ? AND u.status = 'ACTIVE' LIMIT 1`,
      [id]
    );

    if (profileRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Matrimonial profile not found or is currently inactive.' },
        { status: 404 }
      );
    }

    const cand = profileRows[0];

    // Determine viewer relationship
    const isOwner = Boolean(session && (session.id === cand.user_id || session.profile_id === cand.id));

    // Block enforcement: If either party has blocked the other, deny access
    if (session && session.id !== cand.user_id) {
      try {
        const blocks = await query<any[]>(
          `SELECT id FROM blocked_profiles 
           WHERE (user_id = ? AND blocked_user_id = ?) 
              OR (user_id = ? AND blocked_user_id = ?) 
           LIMIT 1`,
          [session.id, cand.user_id, cand.user_id, session.id]
        );
        if (blocks.length > 0) {
          return NextResponse.json(
            { success: false, message: 'This matrimonial profile is not available.' },
            { status: 403 }
          );
        }
      } catch {}
    }

    // Profile Visibility Enforcement: If profile is Private and viewer is not the owner, block access
    if (!isOwner && cand.profile_visibility === 'PRIVATE') {
      return NextResponse.json(
        { success: false, message: 'This matrimonial profile is currently set to Private by the member.' },
        { status: 403 }
      );
    }

    // 2. Fetch approved photos
    const photos = await query<any[]>(
      `SELECT id, url, is_primary FROM profile_photos
       WHERE profile_id = ? AND is_approved = TRUE
       ORDER BY is_primary DESC, created_at DESC`,
      [id]
    );

    // 3. Fetch logged in user's preferences for compatibility calculation
    let currentPref: any = null;
    let isShortlisted = false;

    if (session) {
      const userProfiles = await query<any[]>(
        `SELECT cp.id as profile_id, pp.* FROM customer_profiles cp
         LEFT JOIN partner_preferences pp ON cp.id = pp.profile_id
         WHERE cp.user_id = ? LIMIT 1`,
        [session.id]
      );

      if (userProfiles.length > 0) {
        currentPref = userProfiles[0];
        const myProfileId = userProfiles[0].profile_id;

        // Check shortlist status
        const sl = await query<any[]>(
          `SELECT id FROM shortlists WHERE customer_id = ? AND target_profile_id = ? LIMIT 1`,
          [myProfileId, id]
        );
        isShortlisted = sl.length > 0;
      }
    }

    const compatibility = await calculateCompatibility(currentPref || {}, cand);

    // 4. Calculate Age & Height
    let age = 25;
    if (cand.date_of_birth) {
      const bYear = new Date(cand.date_of_birth).getFullYear();
      if (!isNaN(bYear) && bYear > 1900) {
        age = new Date().getFullYear() - bYear;
      }
    }

    const heightCm = Number(cand.height_cm) || 0;
    const heightFormatted = heightCm > 0
      ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}" (${heightCm} cm)`
      : 'Unspecified';

    // 5. Apply privacy controls (enforce server-side when viewer is not owner)
    const isLimited = cand.profile_visibility === 'LIMITED';
    const isPhotoHidden = !isOwner && Boolean(cand.hide_photos || cand.priv_photos === 'PRIVATE' || (isLimited && cand.hide_photos));
    const isIncomeHidden = !isOwner && Boolean(cand.hide_income || cand.priv_income === 'PRIVATE' || (isLimited && cand.hide_income));
    const isLocationHidden = !isOwner && Boolean(cand.hide_location || cand.priv_location === 'PRIVATE' || (isLimited && cand.hide_location));
    const isPhoneHidden = !isOwner && Boolean(cand.hide_phone || cand.priv_phone === 'PRIVATE' || cand.priv_phone === 'MATCHED_ONLY' || (isLimited && cand.hide_phone));
    const isEmailHidden = !isOwner && Boolean(cand.priv_email === 'PRIVATE' || cand.priv_email === 'MATCHED_ONLY');
    const isFamilyHidden = !isOwner && Boolean(cand.priv_family === 'PRIVATE');

    const incomeNum = parseFloat(cand.annual_income || '0');
    const incomeFormatted = isIncomeHidden
      ? 'Confidential / Disclosed after connection'
      : incomeNum > 0
      ? `₹${(incomeNum / 100000).toFixed(1)} Lakhs per annum`
      : 'Confidential';

    return NextResponse.json({
      success: true,
      data: {
        id: cand.id,
        profile_id: cand.id,
        userId: cand.user_id,
        name: cand.name,
        gender: cand.gender,
        age,
        date_of_birth: isOwner ? cand.date_of_birth : undefined,
        height_cm: heightCm,
        heightFormatted,
        marital_status: cand.marital_status || 'Never Married',
        religion: cand.religion || 'Hindu',
        caste: cand.caste || '',
        sub_caste: cand.sub_caste || '',
        mother_tongue: cand.mother_tongue || 'Hindi',
        education: cand.education || 'Graduate',
        college: cand.college || '',
        profession: cand.profession || 'Professional',
        company: cand.company || '',
        annual_income: isIncomeHidden ? null : incomeNum,
        annual_income_formatted: incomeFormatted,
        country: cand.country || 'India',
        state: cand.state || '',
        city: isLocationHidden ? 'Protected by Member' : (cand.city || 'India'),
        is_location_hidden: isLocationHidden,
        about_me: cand.about_me || '',
        diet: cand.diet || 'Vegetarian',
        smoking: cand.smoking || 'No',
        drinking: cand.drinking || 'No',
        interests: cand.interests || '',
        hobbies: cand.hobbies || '',
        family_type: isFamilyHidden ? 'Confidential' : (cand.family_type || 'Nuclear'),
        family_values: isFamilyHidden ? 'Confidential' : (cand.family_values || 'Moderate'),
        father_occupation: isFamilyHidden ? '' : (cand.father_occupation || ''),
        mother_occupation: isFamilyHidden ? '' : (cand.mother_occupation || ''),
        siblings_details: isFamilyHidden ? '' : (cand.siblings_details || ''),
        verification_status: cand.verification_status,
        is_verified: cand.verification_status === 'VERIFIED' || cand.verification_status === 'APPROVED',
        phone: isPhoneHidden ? '+91 ••••• ••••• (Contact via Send Interest)' : cand.phone,
        email: isEmailHidden ? '••••••@•••••.com (Verified member)' : cand.email,
        photos: isPhotoHidden ? [] : photos.map((p) => p.url),
        primary_photo: isPhotoHidden ? null : (photos[0]?.url || '/images/priya.jpg'),
        is_photo_hidden: isPhotoHidden,
        is_shortlisted: isShortlisted,
        profile_visibility: cand.profile_visibility || 'PUBLIC',
        is_owner: isOwner,
        owner_privacy_settings: isOwner
          ? {
              profile_visibility: cand.profile_visibility || 'PUBLIC',
              hide_phone: Boolean(cand.hide_phone),
              hide_photos: Boolean(cand.hide_photos),
              hide_income: Boolean(cand.hide_income),
              hide_location: Boolean(cand.hide_location),
            }
          : undefined,
        compatibility,
        match_score: compatibility.percentage,
        disclaimer:
          'Match percentage is an automated software calculation based on member-reported profile factors and partner criteria. It is not an absolute warranty or guarantee of marriage compatibility.',
      },
    });
  } catch (error: any) {
    console.error('[Profile Detail API Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
