import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Please sign in to report a profile.' }, { status: 401 });
    }

    const body = await req.json();
    let { reported_user_id, reported_profile_id, category, description } = body;

    // Validate category
    const validCategories = ['ABUSE', 'FRAUD', 'IMPERSONATION'];
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, message: 'Invalid report category. Must be one of: Abuse, Fraud, or Impersonation.' },
        { status: 400 }
      );
    }

    // Resolve reported_user_id from profile_id if not directly supplied
    if (!reported_user_id && reported_profile_id) {
      const prof = await query<any[]>(`SELECT user_id FROM customer_profiles WHERE id = ? LIMIT 1`, [reported_profile_id]);
      if (prof.length > 0) {
        reported_user_id = prof[0].user_id;
      }
    }

    if (!reported_user_id) {
      return NextResponse.json(
        { success: false, message: 'Reported member user ID or profile ID is required' },
        { status: 400 }
      );
    }

    if (reported_user_id === session.id) {
      return NextResponse.json(
        { success: false, message: 'You cannot report your own account.' },
        { status: 400 }
      );
    }

    // Prevent duplicate spam submissions within 24 hours
    const recentReports = await query<any[]>(
      `SELECT id FROM customer_reports 
       WHERE reporter_user_id = ? AND reported_user_id = ? AND status = 'PENDING'
         AND created_at >= NOW() - INTERVAL 24 HOUR LIMIT 1`,
      [session.id, reported_user_id]
    );

    if (recentReports.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'You have already submitted a report for this profile that is currently under review by our Trust & Safety team.',
        },
        { status: 429 }
      );
    }

    const reportId = 'rep_' + randomUUID();
    await query(
      `INSERT INTO customer_reports (id, reporter_user_id, reported_user_id, reported_profile_id, category, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [reportId, session.id, reported_user_id, reported_profile_id || null, category, description?.trim() || null]
    );

    await logAudit(session.id, 'SUBMIT_CUSTOMER_REPORT', 'customer_reports', reportId, {
      reported_user_id,
      category,
    });

    return NextResponse.json({
      success: true,
      report_id: reportId,
      message: 'Report submitted successfully. Our Trust & Safety team has received your report and will take appropriate action.',
    });
  } catch (error: any) {
    console.error('[Customer Reports POST Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
