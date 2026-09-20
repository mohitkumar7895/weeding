import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: true, count: 0, shortlists: [], shortlistedIds: [] });
    }

    const profiles = await query<any[]>(
      `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
      [session.id]
    );

    if (profiles.length === 0) {
      return NextResponse.json({ success: true, count: 0, shortlists: [], shortlistedIds: [] });
    }

    const customerId = profiles[0].id;
    const shortlists = await query<any[]>(
      `SELECT s.id as shortlist_id, s.target_profile_id, s.created_at as shortlisted_at,
              cp.*,
              u.name, u.status as user_status,
              (SELECT url FROM profile_photos WHERE profile_id = cp.id AND is_primary = TRUE LIMIT 1) as photo_url,
              (SELECT photos_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_photos,
              (SELECT income_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_income,
              (SELECT location_visibility FROM privacy_settings WHERE user_id = cp.user_id LIMIT 1) as priv_location
       FROM shortlists s
       JOIN customer_profiles cp ON s.target_profile_id = cp.id
       JOIN users u ON cp.user_id = u.id
       WHERE s.customer_id = ?
         AND u.status = 'ACTIVE'
         AND cp.profile_visibility != 'PRIVATE'
         AND cp.user_id NOT IN (SELECT blocked_user_id FROM blocked_profiles WHERE user_id = ?)
         AND cp.user_id NOT IN (SELECT user_id FROM blocked_profiles WHERE blocked_user_id = ?)
       ORDER BY s.created_at DESC`,
      [customerId, session.id, session.id]
    );

    const formattedList = shortlists.map((p) => {
      let age = 25;
      if (p.date_of_birth) {
        const bYear = new Date(p.date_of_birth).getFullYear();
        if (!isNaN(bYear) && bYear > 1900) {
          age = new Date().getFullYear() - bYear;
        }
      }

      const heightCm = Number(p.height_cm) || 0;
      const heightFormatted = heightCm > 0
        ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}" (${heightCm} cm)`
        : '5\'6" (168 cm)';

      const isLimited = p.profile_visibility === 'LIMITED';
      const isPhotoHidden = Boolean(p.hide_photos || p.priv_photos === 'PRIVATE' || (isLimited && p.hide_photos));
      const isIncomeHidden = Boolean(p.hide_income || p.priv_income === 'PRIVATE' || (isLimited && p.hide_income));
      const isLocationHidden = Boolean(p.hide_location || p.priv_location === 'PRIVATE' || (isLimited && p.hide_location));

      const incomeNum = parseFloat(p.annual_income || '0');
      const annualIncomeFormatted = isIncomeHidden
        ? 'Confidential'
        : incomeNum > 0
        ? `₹${(incomeNum / 100000).toFixed(1)} Lakhs`
        : 'Confidential';

      return {
        id: p.target_profile_id,
        profile_id: p.target_profile_id,
        shortlist_id: p.shortlist_id,
        userId: p.user_id,
        name: p.name,
        gender: p.gender,
        age,
        height_cm: heightCm,
        heightFormatted,
        city: isLocationHidden ? 'Protected by Member' : (p.city || 'Delhi NCR'),
        state: isLocationHidden ? '' : (p.state || ''),
        country: p.country || 'India',
        is_location_hidden: isLocationHidden,
        religion: p.religion || 'Hindu',
        caste: p.caste || '',
        sub_caste: p.sub_caste || '',
        mother_tongue: p.mother_tongue || 'Hindi',
        education: p.education || 'Graduate',
        college: p.college || '',
        profession: p.profession || 'Professional',
        company: p.company || '',
        annual_income: isIncomeHidden ? null : incomeNum,
        annualIncomeFormatted,
        about_me: p.about_me || '',
        diet: p.diet || 'Vegetarian',
        smoking: p.smoking || 'No',
        drinking: p.drinking || 'No',
        family_type: p.family_type || 'Nuclear',
        family_values: p.family_values || 'Moderate',
        photo_url: isPhotoHidden ? null : (p.photo_url || '/images/priya.jpg'),
        is_photo_hidden: isPhotoHidden,
        verification_status: p.verification_status || 'VERIFIED',
        is_verified: p.verification_status === 'VERIFIED' || p.verification_status === 'APPROVED',
        is_shortlisted: true,
        shortlisted_at: p.shortlisted_at,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedList.length,
      shortlists: formattedList,
      data: formattedList,
      shortlistedIds: formattedList.map((s) => s.id),
    });
  } catch (error: any) {
    console.error('[Shortlist GET Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetProfileId = searchParams.get('target_profile_id');
    if (!targetProfileId) {
      return NextResponse.json({ success: false, message: 'target_profile_id is required' }, { status: 400 });
    }

    const profiles = await query<any[]>(
      `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
      [session.id]
    );
    if (profiles.length === 0) {
      return NextResponse.json({ success: true, message: 'Removed from shortlist' });
    }

    await query(
      `DELETE FROM shortlists WHERE customer_id = ? AND target_profile_id = ?`,
      [profiles[0].id, targetProfileId]
    );

    await logAudit(session.id, 'REMOVE_SHORTLIST', 'shortlists', targetProfileId);

    return NextResponse.json({
      success: true,
      message: 'Profile removed from your shortlist.',
      shortlisted: false,
    });
  } catch (error: any) {
    console.error('[Shortlist DELETE Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Please sign in to shortlist profiles.' }, { status: 401 });
    }

    const body = await req.json();
    const { target_profile_id, action = 'toggle' } = body;

    if (!target_profile_id) {
      return NextResponse.json({ success: false, message: 'target_profile_id is required' }, { status: 400 });
    }

    // Get or auto-create current user's customer profile
    let customerProfileId = session.profile_id || ('prof_' + session.id);
    const existingCust = await query<any[]>(
      `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
      [session.id]
    );

    if (existingCust.length > 0) {
      customerProfileId = existingCust[0].id;
    } else {
      customerProfileId = 'prof_' + session.id;
      await query(
        `INSERT INTO customer_profiles (id, user_id, verification_status, profile_visibility)
         VALUES (?, ?, 'UNVERIFIED', 'PUBLIC')
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
        [customerProfileId, session.id]
      );
    }

    // Cannot shortlist own profile
    if (customerProfileId === target_profile_id) {
      return NextResponse.json({ success: false, message: 'You cannot shortlist your own profile.' }, { status: 400 });
    }

    // Check if currently shortlisted
    const existing = await query<any[]>(
      `SELECT id FROM shortlists WHERE customer_id = ? AND target_profile_id = ? LIMIT 1`,
      [customerProfileId, target_profile_id]
    );

    const isCurrentlyShortlisted = existing.length > 0;

    if (action === 'remove' || (action === 'toggle' && isCurrentlyShortlisted)) {
      // Remove from shortlist
      await query(
        `DELETE FROM shortlists WHERE customer_id = ? AND target_profile_id = ?`,
        [customerProfileId, target_profile_id]
      );

      await logAudit(session.id, 'REMOVE_SHORTLIST', 'shortlists', target_profile_id);

      return NextResponse.json({
        success: true,
        shortlisted: false,
        target_profile_id,
        message: 'Profile removed from your shortlist.',
      });
    } else {
      // Add to shortlist
      const id = 'sl_' + randomUUID();
      await query(
        `INSERT INTO shortlists (id, customer_id, target_profile_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
        [id, customerProfileId, target_profile_id]
      );

      await logAudit(session.id, 'ADD_SHORTLIST', 'shortlists', target_profile_id);

      return NextResponse.json({
        success: true,
        shortlisted: true,
        target_profile_id,
        message: 'Profile added to your shortlisted matches! ❤️',
      });
    }
  } catch (error: any) {
    console.error('[Shortlist POST Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
