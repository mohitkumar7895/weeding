import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { generateSagunResponse, getSagunSystemPrompt, SagunMessage } from '@/services/sagunProvider';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ success: false, message: 'sessionId required' }, { status: 400 });

    const [session] = await query<any[]>(`SELECT * FROM sagun_sessions WHERE id = ? AND user_id = ?`, [sessionId, user.id]);
    if (!session) return NextResponse.json({ success: false, message: 'Session not found or forbidden' }, { status: 404 });

    const messages = await query<any[]>(
      `SELECT * FROM sagun_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId]
    );

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { sessionId, content } = body;

    if (!sessionId || !content) {
      return NextResponse.json({ success: false, message: 'sessionId and content required' }, { status: 400 });
    }

    const [session] = await query<any[]>(`SELECT * FROM sagun_sessions WHERE id = ? AND user_id = ?`, [sessionId, user.id]);
    if (!session) return NextResponse.json({ success: false, message: 'Session not found or forbidden' }, { status: 404 });

    // 1. Insert USER message
    const userMsgId = randomUUID();
    await query(
      `INSERT INTO sagun_messages (id, session_id, role, content) VALUES (?, ?, 'USER', ?)`,
      [userMsgId, sessionId, content]
    );
    await query(`UPDATE sagun_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sessionId]);

    // 2. Hydrate context for LLM
    const previousMessages = await query<any[]>(
      `SELECT role, content FROM sagun_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 20`,
      [sessionId]
    );

    const llmMessages: SagunMessage[] = [
      { role: 'SYSTEM', content: getSagunSystemPrompt() }
    ];

    // Inject dynamic platform context if VENDOR_DISCOVERY
    if (session.context_type === 'VENDOR_DISCOVERY') {
      llmMessages.push({
         role: 'SYSTEM', 
         content: 'Platform Context: The user is currently searching for vendors. Do not invent vendors. Suggest they use the "Search Vendors" page for exact pricing.'
      });
    }

    // Inject dynamic platform context if BOOKING
    if (session.context_type === 'BOOKING' && session.context_id) {
      const [booking] = await query<any[]>(
        `SELECT b.status, b.payable_amount, v.business_name
         FROM bookings b
         JOIN vendors v ON b.vendor_id = v.id
         WHERE b.id = ? AND b.customer_id = ?`,
        [session.context_id, user.id]
      );

      if (booking) {
        llmMessages.push({
          role: 'SYSTEM', 
          content: `Platform Context: The user is asking about their booking with "${booking.business_name}". 
          Current Booking Status is EXACTLY: [${booking.status}]. 
          Payable Amount is: ${booking.payable_amount}.
          Rule: Do not guess the status. You cannot change the status. If PENDING, suggest they proceed to payment via [Pay Now](/customer/bookings/${session.context_id}/payment). If COMPLETED, suggest reviewing the vendor.`
        });
      }
    }

    // Append history
    previousMessages.forEach(m => {
      llmMessages.push({ role: m.role, content: m.content });
    });

    // 3. Call AI Provider
    const aiResponseContent = await generateSagunResponse(llmMessages);

    // 4. Insert ASSISTANT message
    const assistantMsgId = randomUUID();
    await query(
      `INSERT INTO sagun_messages (id, session_id, role, content) VALUES (?, ?, 'ASSISTANT', ?)`,
      [assistantMsgId, sessionId, aiResponseContent]
    );

    // Return the new messages to the UI
    return NextResponse.json({ 
      success: true, 
      user_message: { id: userMsgId, role: 'USER', content },
      assistant_message: { id: assistantMsgId, role: 'ASSISTANT', content: aiResponseContent }
    });

  } catch (error: any) {
    console.error('Sagun Messages POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
