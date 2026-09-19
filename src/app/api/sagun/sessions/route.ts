import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const sessions = await query<any[]>(
      `SELECT * FROM sagun_sessions WHERE user_id = ? ORDER BY updated_at DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { context_type = 'GENERAL', context_id } = body;

    const sessionId = randomUUID();
    
    await query(
      `INSERT INTO sagun_sessions (id, user_id, context_type, context_id) VALUES (?, ?, ?, ?)`,
      [sessionId, user.id, context_type, context_id || null]
    );

    const [newSession] = await query<any[]>(`SELECT * FROM sagun_sessions WHERE id = ?`, [sessionId]);

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
