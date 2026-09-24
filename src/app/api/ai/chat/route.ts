import { NextRequest, NextResponse } from 'next/server';
import { processAIChat } from '@/services/aiService';
import { getSessionUser } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const body = await req.json();
    const { message, conversation_id } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Message is required' },
        { status: 400 }
      );
    }

    const result = await processAIChat(
      user ? user.id : null,
      conversation_id || null,
      message
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('API /api/ai/chat Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'AI assistant error' },
      { status: 500 }
    );
  }
}
