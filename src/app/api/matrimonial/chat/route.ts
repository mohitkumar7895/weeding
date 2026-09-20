import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { isMatrimonialChatEnabled } from '@/lib/systemConfig';
import { uuidv4 } from '@/lib/uuid';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(req: NextRequest) {
  try {
    if (!(await isMatrimonialChatEnabled())) {
      return NextResponse.json({ success: true, data: [], enabled: false, message: 'Matrimonial chat is disabled' });
    }
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: true, data: [], enabled: true });

    await ensureOpsTables();
    const threadId = new URL(req.url).searchParams.get('thread_id');
    if (threadId) {
      const messages = await safeSelect<any[]>(
        `SELECT m.*, u.name as sender_name
         FROM matrimonial_messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.thread_id = ?
         ORDER BY m.created_at ASC`,
        [threadId]
      );
      return NextResponse.json({ success: true, data: messages, enabled: true });
    }

    const threads = await safeSelect<any[]>(
      `SELECT t.*,
        u1.name as user_a_name,
        u2.name as user_b_name
       FROM matrimonial_threads t
       LEFT JOIN users u1 ON t.user_a_id = u1.id
       LEFT JOIN users u2 ON t.user_b_id = u2.id
       WHERE t.user_a_id = ? OR t.user_b_id = ?
       ORDER BY t.updated_at DESC`,
      [user.id, user.id]
    );
    return NextResponse.json({ success: true, data: threads, enabled: true });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: [], enabled: true, message: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isMatrimonialChatEnabled())) {
      return NextResponse.json({ success: false, message: 'Matrimonial chat is disabled' }, { status: 403 });
    }
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const peerId = body.peer_user_id;
    const message = (body.message || '').trim();
    if (!peerId || !message) {
      return NextResponse.json({ success: false, message: 'peer_user_id and message required' }, { status: 400 });
    }

    await ensureOpsTables();

    const accepted = await safeSelect<any[]>(
      `SELECT id FROM matrimonial_interests
       WHERE status = 'ACCEPTED'
         AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
       LIMIT 1`,
      [user.id, peerId, peerId, user.id]
    );
    if (!accepted.length) {
      return NextResponse.json(
        { success: false, message: 'Chat unlocks after an interest is accepted' },
        { status: 403 }
      );
    }

    const blocked = await safeSelect<any[]>(
      `SELECT id FROM blocked_profiles WHERE (user_id = ? AND blocked_user_id = ?) OR (user_id = ? AND blocked_user_id = ?)`,
      [user.id, peerId, peerId, user.id]
    );
    if (blocked.length) {
      return NextResponse.json({ success: false, message: 'Chat blocked' }, { status: 403 });
    }

    const [a, b] = user.id < peerId ? [user.id, peerId] : [peerId, user.id];
    let threads = await safeSelect<any[]>(
      `SELECT id FROM matrimonial_threads WHERE user_a_id = ? AND user_b_id = ?`,
      [a, b]
    );
    if (!threads.length) {
      const id = uuidv4();
      try {
        await query(
          `INSERT INTO matrimonial_threads (id, user_a_id, user_b_id, status, updated_at)
           VALUES (?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)`,
          [id, a, b]
        );
        threads = [{ id }];
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message || 'Could not start chat' }, { status: 500 });
      }
    }

    const msgId = uuidv4();
    await query(
      `INSERT INTO matrimonial_messages (id, thread_id, sender_id, message)
       VALUES (?, ?, ?, ?)`,
      [msgId, threads[0].id, user.id, message]
    );
    await query(`UPDATE matrimonial_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [threads[0].id]).catch(
      () => undefined
    );

    return NextResponse.json({ success: true, thread_id: threads[0].id, message_id: msgId });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Could not send message' }, { status: 500 });
  }
}
