import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { uuidv4 } from '@/lib/uuid';
import { sendNotification } from '@/services/notificationEngine';

async function ensureInterestTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS matrimonial_interests (
      id VARCHAR(36) PRIMARY KEY,
      from_user_id VARCHAR(36) NOT NULL,
      to_user_id VARCHAR(36) NOT NULL,
      from_profile_id VARCHAR(36) NULL,
      to_profile_id VARCHAR(36) NULL,
      status ENUM('PENDING', 'ACCEPTED', 'DECLINED') DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_interest_pair (from_user_id, to_user_id),
      INDEX idx_interest_to (to_user_id, status),
      INDEX idx_interest_from (from_user_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function profileForUser(userId: string) {
  const rows = await query<any[]>(
    `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function userForProfile(profileId: string) {
  const rows = await query<any[]>(
    `SELECT user_id, id FROM customer_profiles WHERE id = ? LIMIT 1`,
    [profileId]
  );
  return rows[0] || null;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    await ensureInterestTables();

    const sent = await query<any[]>(
      `SELECT i.*, u.name as peer_name, u.id as peer_user_id,
              (SELECT url FROM profile_photos pp JOIN customer_profiles cp ON pp.profile_id = cp.id
               WHERE cp.user_id = i.to_user_id AND pp.is_primary = TRUE LIMIT 1) as photo_url
       FROM matrimonial_interests i
       JOIN users u ON u.id = i.to_user_id
       WHERE i.from_user_id = ?
       ORDER BY i.updated_at DESC`,
      [user.id]
    );
    const received = await query<any[]>(
      `SELECT i.*, u.name as peer_name, u.id as peer_user_id,
              (SELECT url FROM profile_photos pp JOIN customer_profiles cp ON pp.profile_id = cp.id
               WHERE cp.user_id = i.from_user_id AND pp.is_primary = TRUE LIMIT 1) as photo_url
       FROM matrimonial_interests i
       JOIN users u ON u.id = i.from_user_id
       WHERE i.to_user_id = ?
       ORDER BY i.updated_at DESC`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      sent,
      received,
      sentProfileIds: sent.map((row) => row.to_profile_id).filter(Boolean),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    await ensureInterestTables();

    const body = await req.json();
    const toProfileId = body.to_profile_id as string | undefined;
    let toUserId = body.to_user_id as string | undefined;
    if (toProfileId && !toUserId) {
      const target = await userForProfile(toProfileId);
      if (!target) {
        return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 });
      }
      toUserId = target.user_id;
    }
    if (!toUserId) {
      return NextResponse.json({ success: false, message: 'to_profile_id is required' }, { status: 400 });
    }
    if (toUserId === user.id) {
      return NextResponse.json({ success: false, message: 'You cannot send interest to yourself' }, { status: 400 });
    }

    const blocked = await query<any[]>(
      `SELECT id FROM blocked_profiles WHERE (user_id = ? AND blocked_user_id = ?) OR (user_id = ? AND blocked_user_id = ?)`,
      [user.id, toUserId, toUserId, user.id]
    );
    if (blocked.length) {
      return NextResponse.json({ success: false, message: 'This member is not available' }, { status: 403 });
    }

    const fromProfile = await profileForUser(user.id);
    const existing = await query<any[]>(
      `SELECT * FROM matrimonial_interests WHERE from_user_id = ? AND to_user_id = ? LIMIT 1`,
      [user.id, toUserId]
    );
    if (existing.length) {
      return NextResponse.json({
        success: true,
        message: existing[0].status === 'PENDING' ? 'Interest already sent' : `Interest is ${existing[0].status.toLowerCase()}`,
        data: existing[0],
      });
    }

    const reverse = await query<any[]>(
      `SELECT * FROM matrimonial_interests WHERE from_user_id = ? AND to_user_id = ? LIMIT 1`,
      [toUserId, user.id]
    );

    const id = uuidv4();
    await query(
      `INSERT INTO matrimonial_interests (id, from_user_id, to_user_id, from_profile_id, to_profile_id, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [id, user.id, toUserId, fromProfile?.id || null, toProfileId || reverse[0]?.from_profile_id || null]
    );

    try {
      const sender = await query<any[]>(`SELECT name FROM users WHERE id = ? LIMIT 1`, [user.id]);
      await sendNotification({
        userId: toUserId,
        title: 'New matrimonial interest',
        message: `${sender[0]?.name || 'A member'} sent you an interest.`,
        category: 'CHAT',
        link: '/dashboard?tab=interests',
      });
    } catch (notifyErr) {
      console.warn('[interests] notification failed', notifyErr);
    }

    await logAudit(user.id, 'SEND_INTEREST', 'matrimonial_interests', id, { to_user_id: toUserId });

    return NextResponse.json({ success: true, message: 'Interest sent', interest_id: id });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
