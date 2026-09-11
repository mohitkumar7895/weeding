import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, signToken, logAudit } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Lookup user in MySQL
    const users = await query<any[]>(
      `SELECT id, email, phone, password_hash, name, role, status FROM users WHERE email = ? OR phone = ? LIMIT 1`,
      [email.toLowerCase(), email]
    );

    if (users.length === 0) {
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

    // Fetch linked vendor and customer profile IDs
    const [vendorRows, profileRows] = await Promise.all([
      query<any[]>(`SELECT id, business_name FROM vendors WHERE user_id = ? LIMIT 1`, [user.id]),
      query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`, [user.id]),
    ]);

    const vendorId = vendorRows.length > 0 ? vendorRows[0].id : undefined;
    const profileId = profileRows.length > 0 ? profileRows[0].id : undefined;

    // Create session token
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
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
