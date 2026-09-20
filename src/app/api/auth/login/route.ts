import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, hashPassword, signToken, logAudit } from '@/lib/auth';
import { AuthLoginSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp, safeErrorResponse } from '@/lib/security';

function asRows(result: any): any[] {
  return Array.isArray(result) ? result : [];
}

async function ensureBootstrapAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@wedwithme.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const existing = asRows(
    await query<any[]>(`SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1`, [email])
  );
  if (existing.length) return;

  const hash = await hashPassword(password);
  try {
    await query(
      `INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
       VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 'ACTIVE', TRUE, TRUE)`,
      ['usr_super_admin_01', email, '+919999900001', hash, 'Platform Administrator']
    );
  } catch (err: any) {
    console.warn('[login] bootstrap admin skipped:', err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`login_${ip}`, 15, 60000)) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = AuthLoginSchema.parse({
      ...body,
      email: String(body.email || '').trim(),
      password: String(body.password || ''),
    });
    const identifier = parsed.email.trim();
    const password = parsed.password;
    const emailLookup = identifier.toLowerCase();

    try {
      await ensureBootstrapAdmin();
    } catch (bootErr: any) {
      console.warn('[login] bootstrap failed:', bootErr.message);
    }

    let users = asRows(
      await query<any[]>(
        `SELECT id, email, phone, password_hash, name, role, status
         FROM users
         WHERE LOWER(TRIM(email)) = ? OR TRIM(phone) = ? OR TRIM(phone) = ?
         LIMIT 1`,
        [emailLookup, identifier, emailLookup]
      )
    );

    if (!users.length) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Please check your email/phone and password.' },
        { status: 401 }
      );
    }

    const user = users[0];

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: 'Your account has been suspended by administration. Please contact support.' },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Please check your email and password.' },
        { status: 401 }
      );
    }

    let vendorRows: any[] = [];
    let profileRows: any[] = [];
    try {
      [vendorRows, profileRows] = await Promise.all([
        query<any[]>(`SELECT id, business_name FROM vendors WHERE user_id = ? LIMIT 1`, [user.id]).then(asRows),
        query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`, [user.id]).then(asRows),
      ]);
    } catch (linkErr: any) {
      console.warn('[login] profile lookup skipped:', linkErr.message);
    }

    const vendorId = vendorRows.length > 0 ? vendorRows[0].id : undefined;
    const profileId = profileRows.length > 0 ? profileRows[0].id : undefined;

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      vendor_id: vendorId,
      profile_id: profileId,
    });

    await logAudit({
      userId: user.id,
      role: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
    });

    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      vendor_id: vendorId,
      vendorId: vendorId,
      customerProfileId: profileId,
      profile_id: profileId,
      business_name: vendorRows.length > 0 ? vendorRows[0].business_name : undefined,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userObj,
      data: { user: userObj },
    });

    response.cookies.set('wwm_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return safeErrorResponse(error, 'Login failed');
  }
}
