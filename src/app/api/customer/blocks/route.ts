import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: true, data: [], blocks: [] });
    }

    const blockedRows = await query<any[]>(
      `SELECT bp.id as block_id, bp.blocked_user_id, bp.reason, bp.created_at,
              u.name as blocked_name, u.email as blocked_email,
              cp.id as blocked_profile_id, cp.city, cp.profession,
              (SELECT url FROM profile_photos WHERE profile_id = cp.id AND is_primary = TRUE LIMIT 1) as photo_url
       FROM blocked_profiles bp
       JOIN users u ON bp.blocked_user_id = u.id
       LEFT JOIN customer_profiles cp ON u.id = cp.user_id
       WHERE bp.user_id = ?
       ORDER BY bp.created_at DESC`,
      [session.id]
    );

    return NextResponse.json({
      success: true,
      count: blockedRows.length,
      data: blockedRows,
      blocks: blockedRows.map((b) => ({
        ...b,
        id: b.block_id,
        name: b.blocked_name,
      })),
    });
  } catch (error: any) {
    console.error('[Blocks GET Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Authentication required to block members.' }, { status: 401 });
    }

    const body = await req.json();
    let { target_user_id, target_profile_id, reason } = body;

    // Resolve target_user_id if only profile_id provided
    if (!target_user_id && target_profile_id) {
      const prof = await query<any[]>(`SELECT user_id FROM customer_profiles WHERE id = ? LIMIT 1`, [target_profile_id]);
      if (prof.length > 0) {
        target_user_id = prof[0].user_id;
      }
    }

    if (!target_user_id) {
      return NextResponse.json({ success: false, message: 'Target user or profile ID is required' }, { status: 400 });
    }

    if (target_user_id === session.id) {
      return NextResponse.json({ success: false, message: 'You cannot block your own profile.' }, { status: 400 });
    }

    // Insert block record
    const id = 'blk_' + randomUUID();
    await query(
      `INSERT INTO blocked_profiles (id, user_id, blocked_user_id, reason)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), created_at = CURRENT_TIMESTAMP`,
      [id, session.id, target_user_id, reason || 'User requested block']
    );

    // Auto-remove target from current user's shortlist and vice-versa
    try {
      const [myProf] = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`, [session.id]);
      const [targetProf] = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`, [target_user_id]);
      if (myProf && targetProf) {
        await query(
          `DELETE FROM shortlists 
           WHERE (customer_id = ? AND target_profile_id = ?) 
              OR (customer_id = ? AND target_profile_id = ?)`,
          [myProf.id, targetProf.id, targetProf.id, myProf.id]
        );
      }
    } catch {}

    await logAudit(session.id, 'BLOCK_USER', 'blocked_profiles', target_user_id, { reason });

    return NextResponse.json({
      success: true,
      message: 'Member has been blocked successfully. They will no longer appear in your search results or recommendations.',
      blocked_user_id: target_user_id,
    });
  } catch (error: any) {
    console.error('[Blocks POST Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let targetUserId = searchParams.get('target_user_id');
    const targetProfileId = searchParams.get('target_profile_id');

    if (!targetUserId && targetProfileId) {
      const prof = await query<any[]>(`SELECT user_id FROM customer_profiles WHERE id = ? LIMIT 1`, [targetProfileId]);
      if (prof.length > 0) targetUserId = prof[0].user_id;
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, message: 'target_user_id or target_profile_id is required' }, { status: 400 });
    }

    await query(
      `DELETE FROM blocked_profiles WHERE user_id = ? AND blocked_user_id = ?`,
      [session.id, targetUserId]
    );

    await logAudit(session.id, 'UNBLOCK_USER', 'blocked_profiles', targetUserId);

    return NextResponse.json({
      success: true,
      message: 'Member unblocked successfully.',
      unblocked_user_id: targetUserId,
    });
  } catch (error: any) {
    console.error('[Blocks DELETE Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
