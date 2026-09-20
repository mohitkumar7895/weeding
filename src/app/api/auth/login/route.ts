import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { verifyPassword, hashPassword, signToken, logAudit } from '@/lib/auth';
import { checkRateLimit, getClientIp, safeErrorResponse } from '@/lib/security';
import { ensureOpsTables } from '@/lib/ensureOpsTables';

function asRows(result: any): any[] {
  return Array.isArray(result) ? result : [];
}

function bootstrapCreds() {
  return {
    email: (process.env.ADMIN_EMAIL || 'admin@wedwithme.com').toLowerCase().trim(),
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  };
}

function passwordFromRow(user: any): string {
  return String(user?.password_hash || user?.password || '');
}

async function findUserByIdentifier(identifier: string) {
  const emailLookup = identifier.toLowerCase().trim();
  const variants = [
    `SELECT * FROM users WHERE LOWER(TRIM(email)) = ? OR TRIM(IFNULL(phone,'')) = ? LIMIT 1`,
    `SELECT * FROM users WHERE email = ? LIMIT 1`,
  ];
  for (const sql of variants) {
    try {
      const rows = asRows(await query<any[]>(sql, [emailLookup, identifier.trim()]));
      if (rows.length) return rows[0];
    } catch (err: any) {
      console.warn('[login] lookup variant failed:', err.message);
    }
  }
  return null;
}

async function upsertBootstrapAdmin(email: string, password: string) {
  const hash = await hashPassword(password);
  const existing = await findUserByIdentifier(email);
  if (existing?.id) {
    try {
      await query(`UPDATE users SET password_hash = ?, status = 'ACTIVE' WHERE id = ?`, [hash, existing.id]);
    } catch {
      try {
        await query(`UPDATE users SET password = ?, status = 'ACTIVE' WHERE id = ?`, [hash, existing.id]);
      } catch (err: any) {
        console.warn('[login] admin password update failed:', err.message);
      }
    }
    return findUserByIdentifier(email);
  }

  const roles = ['SUPER_ADMIN', 'ADMIN'];
  for (const role of roles) {
    try {
      await query(
        `INSERT INTO users (id, email, password_hash, name, role, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
        [randomUUID(), email, hash, 'Platform Administrator', role]
      );
      return findUserByIdentifier(email);
    } catch (err: any) {
      console.warn('[login] admin insert failed for role', role, err.message);
    }
  }
  return null;
}

function loginResponse(user: any, vendorId?: string, profileId?: string, businessName?: string) {
  const role = String(user.role || '').trim().toUpperCase();
  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: role as any,
    vendor_id: vendorId,
    profile_id: profileId,
  });

  const userObj = {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    vendor_id: vendorId,
    vendorId: vendorId,
    customerProfileId: profileId,
    profile_id: profileId,
    business_name: businessName,
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
  response.cookies.set(
    'wwm_ui',
    encodeURIComponent(JSON.stringify({ name: user.name, role })),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    }
  );

  return response;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    await ensureOpsTables();
    if (!checkRateLimit(`login_${ip}`, 20, 60000)) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const identifier = String(body.email || body.phone || '').trim();
    const password = String(body.password || '');
    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }

    const emailLookup = identifier.toLowerCase();
    const boot = bootstrapCreds();

    if (emailLookup === boot.email && password === boot.password) {
      const admin = await upsertBootstrapAdmin(boot.email, boot.password);
      if (admin) {
        await logAudit({
          userId: admin.id,
          role: admin.role,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: admin.id,
        });
        return loginResponse(admin);
      }
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Account not found on this server. Register on this website, or login as admin with admin@wedwithme.com / Admin@123456',
        },
        { status: 401 }
      );
    }

    if (String(user.status || '').toUpperCase() === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: 'Your account has been suspended by administration. Please contact support.' },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, passwordFromRow(user));
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Wrong password for this account.' },
        { status: 401 }
      );
    }

    let vendorRows: any[] = [];
    let profileRows: any[] = [];
    try {
      vendorRows = asRows(await query<any[]>(`SELECT id, business_name FROM vendors WHERE user_id = ? LIMIT 1`, [user.id]));
      profileRows = asRows(await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`, [user.id]));
    } catch (linkErr: any) {
      console.warn('[login] profile lookup skipped:', linkErr.message);
    }

    await logAudit({
      userId: user.id,
      role: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
    });

    return loginResponse(
      user,
      vendorRows[0]?.id,
      profileRows[0]?.id,
      vendorRows[0]?.business_name
    );
  } catch (error: any) {
    return safeErrorResponse(error, 'Login failed');
  }
}
