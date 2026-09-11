import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { review_id, reason } = body;

    if (!review_id || !reason) {
      return NextResponse.json({ success: false, message: 'review_id and reason are required' }, { status: 400 });
    }

    const reportId = randomUUID();
    await query(
      `INSERT INTO review_reports (id, review_id, reported_by, reason, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [reportId, review_id, user.id, reason]
    );

    await logAudit(user.id, 'REPORT_REVIEW', 'reviews', reviewIdSafe(review_id), { reason });

    return NextResponse.json({
      success: true,
      message: 'Review report submitted for trust & safety investigation.',
      data: { id: reportId }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

function reviewIdSafe(id: string) {
  return id ? id.slice(0, 36) : 'N/A';
}
