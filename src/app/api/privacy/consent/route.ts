import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const consents = await query<any[]>(
      `SELECT * FROM user_consents WHERE user_id = ? ORDER BY granted_at DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, data: consents });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { consent_type, is_granted = true, consent_version = 'v1.0' } = body;

    const validTypes = ['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'MARKETING', 'AI_PROCESSING', 'WHATSAPP_COMMUNICATION'];
    if (!validTypes.includes(consent_type)) {
      return NextResponse.json({ success: false, message: 'Invalid consent type' }, { status: 400 });
    }

    const revokedAt = !is_granted ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

    await query(
      `INSERT INTO user_consents (id, user_id, consent_type, consent_version, is_granted, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        is_granted = VALUES(is_granted),
        revoked_at = VALUES(revoked_at)`,
      [randomUUID(), user.id, consent_type, consent_version, is_granted ? 1 : 0, revokedAt]
    );

    await logAudit(user.id, 'UPDATE_CONSENT', 'user_consents', user.id, { consent_type, is_granted });

    return NextResponse.json({
      success: true,
      message: `Consent for ${consent_type} updated successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
