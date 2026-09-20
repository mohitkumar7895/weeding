import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';
import { query } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;
    await ensureOpsTables();

    const cases = await safeSelect<any[]>(
      `SELECT c.*, u.name as reviewer_name
       FROM duplicate_profile_cases c
       LEFT JOIN users u ON c.reviewed_by = u.id
       WHERE c.id = ?`,
      [id]
    );
    if (!cases.length) {
      return NextResponse.json({ success: false, error: 'Duplicate case not found' }, { status: 404 });
    }

    const dupCase = cases[0];
    const profiles = await safeSelect<any[]>(
      `SELECT p.*, u.email, u.status as account_status, u.created_at as user_created_at
       FROM customer_profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id IN (?, ?)`,
      [dupCase.primary_profile_id, dupCase.suspected_duplicate_id]
    );

    let profileA = null;
    let profileB = null;
    for (const p of profiles) {
      const emailParts = String(p.email || '').split('@');
      p.masked_email = emailParts[0]
        ? `${emailParts[0].substring(0, 3)}***@${emailParts[1] || ''}`
        : '';
      delete p.email;
      if (p.user_id === dupCase.primary_profile_id) profileA = p;
      else profileB = p;
    }

    return NextResponse.json({
      success: true,
      data: { caseDetails: dupCase, profileA, profileB },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch duplicate case' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { status, review_notes } = body;
    await ensureOpsTables();

    const rows = await safeSelect<any[]>(
      `SELECT status, risk_flag_id FROM duplicate_profile_cases WHERE id = ?`,
      [id]
    );
    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }

    const riskFlagId = rows[0].risk_flag_id;
    await query(
      `UPDATE duplicate_profile_cases SET status = ?, review_notes = ?, reviewed_by = ? WHERE id = ?`,
      [status, review_notes || null, auth.user?.id || null, id]
    );

    if (riskFlagId) {
      let riskStatus = 'UNDER_REVIEW';
      if (status === 'CONFIRMED_DUPLICATE' || status === 'NOT_DUPLICATE') riskStatus = 'RESOLVED';
      if (status === 'DISMISSED') riskStatus = 'DISMISSED';
      await query(
        `UPDATE risk_flags SET status = ?, review_notes = ?, reviewed_by = ? WHERE id = ?`,
        [riskStatus, `Synced from duplicate case review: ${status}`, auth.user?.id || null, riskFlagId]
      ).catch(() => undefined);
    }

    return NextResponse.json({ success: true, message: 'Duplicate case updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update case' }, { status: 500 });
  }
}
