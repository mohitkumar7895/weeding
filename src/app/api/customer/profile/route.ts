import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { detectDuplicateProfile } from '@/lib/fraud-service';

interface ProfileFields {
  gender?: string;
  date_of_birth?: string;
  height_cm?: number;
  marital_status?: string;
  religion?: string;
  caste?: string;
  sub_caste?: string;
  mother_tongue?: string;
  education?: string;
  college?: string;
  profession?: string;
  company?: string;
  annual_income?: number;
  country?: string;
  state?: string;
  city?: string;
  about_me?: string;
  family_details?: string;
  family_type?: string;
  family_values?: string;
  father_occupation?: string;
  mother_occupation?: string;
  siblings_details?: string;
  hobbies?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  interests?: string;
}

/**
 * Compute real-time matrimonial profile completion percentage (0 - 100%)
 */
export function calculateProfileCompletion(
  name?: string,
  profile?: ProfileFields,
  hasPhoto?: boolean
): { percentage: number; missingFields: { key: string; label: string; points: number }[] } {
  let score = 0;
  const missing: { key: string; label: string; points: number }[] = [];

  // 1. Profile Photo (15 points)
  if (hasPhoto) {
    score += 15;
  } else {
    missing.push({ key: 'photo', label: 'Profile Photo', points: 15 });
  }

  // 2. Basic Details (15 points: name 3, gender 3, dob 3, height 3, marital_status 3)
  if (name && name.trim().length > 0) score += 3;
  else missing.push({ key: 'name', label: 'Full Name', points: 3 });

  if (profile?.gender) score += 3;
  else missing.push({ key: 'gender', label: 'Gender', points: 3 });

  if (profile?.date_of_birth) score += 3;
  else missing.push({ key: 'date_of_birth', label: 'Date of Birth', points: 3 });

  if (profile?.height_cm && profile.height_cm > 100) score += 3;
  else missing.push({ key: 'height_cm', label: 'Height', points: 3 });

  if (profile?.marital_status) score += 3;
  else missing.push({ key: 'marital_status', label: 'Marital Status', points: 3 });

  // 3. Religious & Cultural Background (15 points: religion 5, caste 5, mother_tongue 5)
  if (profile?.religion && profile.religion.trim().length > 0) score += 5;
  else missing.push({ key: 'religion', label: 'Religion', points: 5 });

  if (profile?.caste && profile.caste.trim().length > 0) score += 5;
  else missing.push({ key: 'caste', label: 'Caste / Community', points: 5 });

  if (profile?.mother_tongue && profile.mother_tongue.trim().length > 0) score += 5;
  else missing.push({ key: 'mother_tongue', label: 'Mother Tongue', points: 5 });

  // 4. Education & Institution (15 points: education 8, college 7)
  if (profile?.education && profile.education.trim().length > 0) score += 8;
  else missing.push({ key: 'education', label: 'Highest Education', points: 8 });

  if (profile?.college && profile.college.trim().length > 0) score += 7;
  else missing.push({ key: 'college', label: 'College / University', points: 7 });

  // 5. Profession & Financials (15 points: profession 5, company 5, annual_income 5)
  if (profile?.profession && profile.profession.trim().length > 0) score += 5;
  else missing.push({ key: 'profession', label: 'Profession', points: 5 });

  if (profile?.company && profile.company.trim().length > 0) score += 5;
  else missing.push({ key: 'company', label: 'Company / Organization', points: 5 });

  if (profile?.annual_income && Number(profile.annual_income) > 0) score += 5;
  else missing.push({ key: 'annual_income', label: 'Annual Income', points: 5 });

  // 6. Location Details (10 points: country 3, state 3, city 4)
  if (profile?.country) score += 3;
  else missing.push({ key: 'country', label: 'Country', points: 3 });

  if (profile?.state && profile.state.trim().length > 0) score += 3;
  else missing.push({ key: 'state', label: 'State', points: 3 });

  if (profile?.city && profile.city.trim().length > 0) score += 4;
  else missing.push({ key: 'city', label: 'City', points: 4 });

  // 7. Family Details (10 points: family_type 3, father_occ 3, mother_occ 2, siblings 2)
  if (profile?.family_type) score += 3;
  else missing.push({ key: 'family_type', label: 'Family Type', points: 3 });

  if (profile?.father_occupation && profile.father_occupation.trim().length > 0) score += 3;
  else missing.push({ key: 'father_occupation', label: "Father's Occupation", points: 3 });

  if (profile?.mother_occupation && profile.mother_occupation.trim().length > 0) score += 2;
  else missing.push({ key: 'mother_occupation', label: "Mother's Occupation", points: 2 });

  if (profile?.siblings_details && profile.siblings_details.trim().length > 0) score += 2;
  else missing.push({ key: 'siblings_details', label: 'Siblings Info', points: 2 });

  // 8. About Me & Lifestyle (5 points: about_me 2, hobbies 2, diet 1)
  if (profile?.about_me && profile.about_me.trim().length > 10) score += 2;
  else missing.push({ key: 'about_me', label: 'About Me Bio', points: 2 });

  if (profile?.hobbies && profile.hobbies.trim().length > 0) score += 2;
  else missing.push({ key: 'hobbies', label: 'Hobbies & Interests', points: 2 });

  if (profile?.diet) score += 1;
  else missing.push({ key: 'diet', label: 'Dietary Preference', points: 1 });

  return {
    percentage: Math.min(100, Math.round(score)),
    missingFields: missing,
  };
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // 1. Fetch user record
    let user: any = null;
    let profile: any = null;
    let photos: any[] = [];

    try {
      const userRows = await query<any[]>(
        `SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ? LIMIT 1`,
        [session.id]
      );
      if (userRows.length > 0) {
        user = userRows[0];
      }

      // 2. Fetch customer profile
      const profileRows = await query<any[]>(
        `SELECT * FROM customer_profiles WHERE user_id = ? LIMIT 1`,
        [session.id]
      );
      if (profileRows.length > 0) {
        profile = profileRows[0];
      }

      // 3. Fetch photos
      if (profile) {
        photos = await query<any[]>(
          `SELECT id, url, is_primary, is_approved, created_at 
           FROM profile_photos 
           WHERE profile_id = ? 
           ORDER BY is_primary DESC, created_at DESC`,
          [profile.id]
        );
      }
    } catch (dbErr: any) {
      console.warn('[customer/profile GET] Database warning (standby mode):', dbErr.message);
    }

    // Fallback for offline / mock user
    if (!user) {
      user = {
        id: session.id,
        name: session.name || '',
        email: session.email || '',
        phone: '',
        role: session.role || 'CUSTOMER',
      };
    }

    if (!profile) {
      profile = {
        id: 'prof_' + session.id,
        user_id: session.id,
        gender: '',
        date_of_birth: '',
        height_cm: null,
        marital_status: '',
        religion: '',
        caste: '',
        sub_caste: '',
        mother_tongue: '',
        education: '',
        college: '',
        profession: '',
        company: '',
        annual_income: null,
        country: '',
        state: '',
        city: '',
        about_me: '',
        family_details: '',
        family_type: '',
        family_values: '',
        father_occupation: '',
        mother_occupation: '',
        siblings_details: '',
        hobbies: '',
        diet: '',
        smoking: '',
        drinking: '',
        interests: '',
        verification_status: 'UNVERIFIED',
        profile_score: 0,
      };
    }

    const hasPhoto = photos.length > 0 && Boolean(photos[0].url);
    const primaryPhotoUrl = photos.find((p) => p.is_primary)?.url || (photos[0]?.url ?? null);

    const completion = calculateProfileCompletion(user.name, profile, hasPhoto);

    return NextResponse.json({
      success: true,
      data: {
        user,
        profile: {
          ...profile,
          name: user.name || '',
          photo_url: primaryPhotoUrl,
          primaryPhotoUrl,
          profile_visibility: profile.profile_visibility || 'PUBLIC',
          hide_phone: profile.hide_phone !== undefined && profile.hide_phone !== null ? Boolean(profile.hide_phone) : true,
          hide_photos: Boolean(profile.hide_photos),
          hide_income: Boolean(profile.hide_income),
          hide_location: Boolean(profile.hide_location),
        },
        photos,
        completionPercentage: completion.percentage,
        missingFields: completion.missingFields,
      },
    });
  } catch (error: any) {
    console.error('[customer/profile GET] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      gender = '',
      date_of_birth = '',
      height_cm = null,
      marital_status = '',
      religion = '',
      caste = '',
      sub_caste = '',
      mother_tongue = '',
      education = '',
      college = '',
      profession = '',
      company = '',
      annual_income = null,
      country = '',
      state = '',
      city = '',
      about_me = '',
      family_details = '',
      family_type = '',
      family_values = '',
      father_occupation = '',
      mother_occupation = '',
      siblings_details = '',
      hobbies = '',
      diet = '',
      smoking = '',
      drinking = '',
      interests = '',
      photo_url,
      profile_visibility = 'PUBLIC',
      hide_phone = true,
      hide_photos = false,
      hide_income = false,
      hide_location = false,
    } = body;

    const finalGender = ['MALE', 'FEMALE', 'OTHER'].includes(String(gender).toUpperCase()) ? String(gender).toUpperCase() : null;
    const finalDob = date_of_birth && String(date_of_birth).trim() ? String(date_of_birth).trim().substring(0, 10) : null;
    const finalHeight = height_cm && Number(height_cm) > 0 ? Number(height_cm) : null;
    const finalIncome = annual_income !== null && annual_income !== undefined && annual_income !== '' && !isNaN(Number(annual_income)) ? Number(annual_income) : null;
    const finalVisibility = ['PUBLIC', 'PRIVATE', 'LIMITED'].includes(String(profile_visibility).toUpperCase())
      ? String(profile_visibility).toUpperCase()
      : 'PUBLIC';
    const finalHidePhone = hide_phone !== undefined && hide_phone !== null ? Boolean(hide_phone) : true;
    const finalHidePhotos = Boolean(hide_photos);
    const finalHideIncome = Boolean(hide_income);
    const finalHideLocation = Boolean(hide_location);

    let profileId: string = session.profile_id || ('prof_' + session.id);
    let hasPhoto = Boolean(photo_url);

    try {
      // 1. Update user name in users table
      if (name && name.trim()) {
        await query(`UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?`, [name.trim(), session.id]);
      }

      // 2. Check if customer profile exists
      const existingProfile = await query<any[]>(
        `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
        [session.id]
      );

      if (existingProfile.length > 0) {
        profileId = existingProfile[0].id;
        // Update customer profile
        await query(
          `UPDATE customer_profiles SET
             gender = ?,
             date_of_birth = ?,
             height_cm = ?,
             marital_status = ?,
             religion = ?,
             caste = ?,
             sub_caste = ?,
             mother_tongue = ?,
             education = ?,
             college = ?,
             profession = ?,
             company = ?,
             annual_income = ?,
             country = ?,
             state = ?,
             city = ?,
             about_me = ?,
             family_details = ?,
             family_type = ?,
             family_values = ?,
             father_occupation = ?,
             mother_occupation = ?,
             siblings_details = ?,
             hobbies = ?,
             diet = ?,
             smoking = ?,
             drinking = ?,
             interests = ?,
             profile_visibility = ?,
             hide_phone = ?,
             hide_photos = ?,
             hide_income = ?,
             hide_location = ?,
             updated_at = NOW()
           WHERE id = ?`,
          [
            finalGender,
            finalDob,
            finalHeight,
            marital_status,
            religion,
            caste,
            sub_caste,
            mother_tongue,
            education,
            college,
            profession,
            company,
            finalIncome,
            country,
            state,
            city,
            about_me,
            family_details,
            family_type,
            family_values,
            father_occupation,
            mother_occupation,
            siblings_details,
            hobbies,
            diet,
            smoking,
            drinking,
            interests,
            finalVisibility,
            finalHidePhone,
            finalHidePhotos,
            finalHideIncome,
            finalHideLocation,
            profileId,
          ]
        );
      } else {
        profileId = 'prof_' + session.id;
        // Insert new customer profile
        await query(
          `INSERT INTO customer_profiles (
             id, user_id, gender, date_of_birth, height_cm, marital_status, religion,
             caste, sub_caste, mother_tongue, education, college, profession, company,
             annual_income, country, state, city, about_me, family_details, family_type,
             family_values, father_occupation, mother_occupation, siblings_details,
             hobbies, diet, smoking, drinking, interests, verification_status,
             profile_visibility, hide_phone, hide_photos, hide_income, hide_location
           ) VALUES (
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNVERIFIED',
             ?, ?, ?, ?, ?
           )`,
          [
            profileId,
            session.id,
            finalGender,
            finalDob,
            finalHeight,
            marital_status,
            religion,
            caste,
            sub_caste,
            mother_tongue,
            education,
            college,
            profession,
            company,
            finalIncome,
            country,
            state,
            city,
            about_me,
            family_details,
            family_type,
            family_values,
            father_occupation,
            mother_occupation,
            siblings_details,
            hobbies,
            diet,
            smoking,
            drinking,
            interests,
            finalVisibility,
            finalHidePhone,
            finalHidePhotos,
            finalHideIncome,
            finalHideLocation,
          ]
        );
      }

      // Synchronize to privacy_settings table
      try {
        await query(
          `INSERT INTO privacy_settings (id, user_id, phone_visibility, email_visibility, income_visibility, photos_visibility, location_visibility)
           VALUES (?, ?, ?, 'PRIVATE', ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             phone_visibility = VALUES(phone_visibility),
             income_visibility = VALUES(income_visibility),
             photos_visibility = VALUES(photos_visibility),
             location_visibility = VALUES(location_visibility),
             updated_at = CURRENT_TIMESTAMP`,
          [
            randomUUID(),
            session.id,
            finalHidePhone ? 'PRIVATE' : 'PUBLIC',
            finalHideIncome ? 'PRIVATE' : 'PUBLIC',
            finalHidePhotos ? 'PRIVATE' : 'PUBLIC',
            finalHideLocation ? 'PRIVATE' : 'PUBLIC',
          ]
        );
      } catch (syncErr: any) {
        console.warn('Sync to privacy_settings warning:', syncErr.message);
      }

      // 3. Handle photo upload / update
      if (photo_url && photo_url.trim()) {
        const photoId = 'pho_' + randomUUID();
        // Unset previous primary photo
        await query(
          `UPDATE profile_photos SET is_primary = FALSE WHERE profile_id = ?`,
          [profileId]
        );
        // Insert new primary photo
        await query(
          `INSERT INTO profile_photos (id, profile_id, url, is_primary, is_approved)
           VALUES (?, ?, ?, TRUE, TRUE)`,
          [photoId, profileId, photo_url]
        );
        hasPhoto = true;
      } else {
        // Check if user already has photo
        const existingPhotos = await query<any[]>(
          `SELECT id FROM profile_photos WHERE profile_id = ? LIMIT 1`,
          [profileId]
        );
        hasPhoto = existingPhotos.length > 0;
      }

      // 4. Calculate and persist new profile score
      const profileData: ProfileFields = {
        gender,
        date_of_birth,
        height_cm: Number(height_cm) || 168,
        marital_status,
        religion,
        caste,
        sub_caste,
        mother_tongue,
        education,
        college,
        profession,
        company,
        annual_income: Number(annual_income) || 0,
        country,
        state,
        city,
        about_me,
        family_details,
        family_type,
        family_values,
        father_occupation,
        mother_occupation,
        siblings_details,
        hobbies,
        diet,
        smoking,
        drinking,
        interests,
      };

      const completion = calculateProfileCompletion(name, profileData, hasPhoto);

      await query(
        `UPDATE customer_profiles SET profile_score = ? WHERE id = ?`,
        [completion.percentage, profileId]
      );

      await logAudit({
        userId: session.id,
        role: session.role || 'CUSTOMER',
        action: 'UPDATE_CUSTOMER_PROFILE',
        entityType: 'CustomerProfile',
        entityId: profileId,
      });

      // Background duplicate profile detection
      detectDuplicateProfile(session.id, profileId, {
        name: name || '',
        gender: finalGender || '',
        date_of_birth: finalDob || '',
      }).catch(err => console.error('[Fraud Service bg error]', err));

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully! ✨',
        data: {
          completionPercentage: completion.percentage,
          missingFields: completion.missingFields,
        },
      });
    } catch (dbErr: any) {
      console.error('[customer/profile PUT] DB error:', dbErr.message);
      return NextResponse.json({
        success: false,
        message: 'Database save error: ' + dbErr.message,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[customer/profile PUT] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
