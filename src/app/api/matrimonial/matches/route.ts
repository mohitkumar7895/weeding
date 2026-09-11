import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { calculateCompatibility } from '@/services/matchingEngine';

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    let currentPref: any = null;
    let excludeUserId = '';

    if (session) {
      excludeUserId = session.id;
      const userProfiles = await query<any[]>(
        `SELECT cp.id, cp.gender, pp.* FROM customer_profiles cp
         LEFT JOIN partner_preferences pp ON cp.id = pp.profile_id
         WHERE cp.user_id = ? LIMIT 1`,
        [session.id]
      );
      if (userProfiles.length > 0) {
        currentPref = userProfiles[0];
      }
    }

    // Default preference if user hasn't configured
    if (!currentPref) {
      currentPref = {
        min_age: 21,
        max_age: 32,
        min_height_cm: 150,
        max_height_cm: 190,
        accepted_marital_status: 'NEVER_MARRIED',
        preferred_religions: 'Hindu',
        min_income: 800000,
        preferred_locations: 'Agra, Delhi NCR, Lucknow, Jaipur',
      };
    }

    // Query candidate profiles from MySQL
    const targetGender = currentPref.gender === 'MALE' ? 'FEMALE' : currentPref.gender === 'FEMALE' ? 'MALE' : null;
    let sql = `
      SELECT cp.*, u.name, u.email,
             (SELECT url FROM profile_photos WHERE profile_id = cp.id AND is_primary = TRUE LIMIT 1) as photo_url
      FROM customer_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.status = 'ACTIVE' AND cp.profile_visibility != 'PRIVATE'
    `;
    const params: any[] = [];

    if (excludeUserId) {
      sql += ' AND cp.user_id != ?';
      params.push(excludeUserId);
    }
    if (targetGender) {
      sql += ' AND cp.gender = ?';
      params.push(targetGender);
    }

    const candidates = await query<any[]>(sql, params);

    // Calculate real scores using matching engine
    const scoredCandidates = [];
    for (const cand of candidates) {
      const compatibility = await calculateCompatibility(currentPref, cand);
      const age = new Date().getFullYear() - new Date(cand.date_of_birth).getFullYear();
      scoredCandidates.push({
        id: cand.id,
        profile_id: cand.id,
        userId: cand.user_id,
        name: cand.name,
        gender: cand.gender,
        dateOfBirth: cand.date_of_birth,
        age,
        height_cm: cand.height_cm,
        heightCm: cand.height_cm,
        height: `${Math.floor(cand.height_cm / 30.48)}'${Math.round((cand.height_cm % 30.48) / 2.54)}"`,
        heightFormatted: `${Math.floor(cand.height_cm / 30.48)}'${Math.round((cand.height_cm % 30.48) / 2.54)}"`,
        city: cand.city,
        state: cand.state,
        religion: cand.religion,
        caste: cand.caste,
        education: cand.education,
        profession: cand.profession,
        annual_income: cand.annual_income,
        annualIncome: cand.hide_income ? 'Confidential' : `₹${(parseFloat(cand.annual_income) / 100000).toFixed(1)} LPA`,
        about_me: cand.about_me,
        aboutMe: cand.about_me,
        photo_url: cand.photo_url || '/images/priya.jpg',
        photoUrl: cand.photo_url || '/images/priya.jpg',
        verification_status: cand.verification_status,
        verificationStatus: cand.verification_status,
        match_score: compatibility.percentage,
        matchScore: compatibility.percentage,
        breakdown: compatibility.breakdown,
        compatibilityDetails: compatibility,
      });
    }

    // Sort by compatibility score descending
    scoredCandidates.sort((a, b) => b.compatibilityDetails.overallScore - a.compatibilityDetails.overallScore);

    return NextResponse.json({
      success: true,
      count: scoredCandidates.length,
      matches: scoredCandidates,
      data: scoredCandidates,
    });
  } catch (error: any) {
    console.error('Matches API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
