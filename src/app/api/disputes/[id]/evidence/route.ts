import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { file_url, description, file_type = 'image/jpeg' } = body;

    if (!file_url) return NextResponse.json({ success: false, message: 'file_url required' }, { status: 400 });

    const evidenceId = randomUUID();
    await query(
      `INSERT INTO dispute_evidence (id, dispute_id, uploaded_by, file_url, file_type, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [evidenceId, id, user.id, file_url, file_type, description || '']
    );

    await logAudit(user.id, 'UPLOAD_DISPUTE_EVIDENCE', 'dispute_evidence', evidenceId, { disputeId: id });

    return NextResponse.json({
      success: true,
      message: 'Evidence attached to dispute.',
      data: { id: evidenceId }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
