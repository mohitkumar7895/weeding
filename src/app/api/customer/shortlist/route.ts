import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await query<any[]>(
      `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
      [session.id]
    );

    if (profiles.length === 0) {
      return NextResponse.json({ success: true, shortlists: [] });
    }

    const customerId = profiles[0].id;
    const shortlists = await query<any[]>(
      `SELECT s.id, s.target_profile_id, s.created_at,
              cp.gender, cp.city, cp.profession, cp.annual_income,
              u.name,
              (SELECT url FROM profile_photos WHERE profile_id = cp.id AND is_primary = TRUE LIMIT 1) as photo_url
       FROM shortlists s
       JOIN customer_profiles cp ON s.target_profile_id = cp.id
       JOIN users u ON cp.user_id = u.id
       WHERE s.customer_id = ?
       ORDER BY s.created_at DESC`,
      [customerId]
    );

    return NextResponse.json({
      success: true,
      count: shortlists.length,
      shortlists,
      shortlistedIds: shortlists.map((s) => s.target_profile_id),
    });
  } catch (error: any) {
    console.error('[Shortlist GET Error]:', error);
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
