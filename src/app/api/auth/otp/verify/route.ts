import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken, logAudit } from '@/lib/auth';
import { verifyOtp, consumeOtp, OtpPurpose } from '@/services/otpService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, purpose, otpToken, directLogin } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'Email and OTP code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.toString().trim();

    // 1. Verify OTP code
    const verification = await verifyOtp(normalizedEmail, normalizedOtp, purpose as OtpPurpose, otpToken);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, message: verification.message },
        { status: 400 }
      );
    }

    // 2. Handle Purpose: LOGIN or Direct sign-in from FORGOT_PASSWORD
    const isDirectSignIn = purpose === 'LOGIN' || (purpose === 'FORGOT_PASSWORD' && Boolean(directLogin));

    if (isDirectSignIn) {
      // Consume the OTP so it cannot be reused
      await consumeOtp(normalizedEmail, normalizedOtp, purpose as OtpPurpose, otpToken);

      // Fetch user from DB
      let user: any = null;
      let vendorId: string | undefined = undefined;
      let profileId: string | undefined = undefined;

      try {
        const users = await query<any[]>(
          `SELECT id, email, name, role, status FROM users WHERE email = ? LIMIT 1`,
          [normalizedEmail]
        );

        if (users.length > 0) {
          user = users[0];
          const [vendorRows, profileRows] = await Promise.all([
            query<any[]>(`SELECT id, business_name FROM vendors WHERE user_id = ? LIMIT 1`, [user.id]),
            query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`, [user.id]),
          ]);
          vendorId = vendorRows.length > 0 ? vendorRows[0].id : undefined;
          profileId = profileRows.length > 0 ? profileRows[0].id : undefined;
        }
      } catch (dbErr) {
        console.warn('[api/auth/otp/verify] DB query error:', dbErr);
      }

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Account not found. Register first, then sign in.' },
          { status: 401 }
        );
      }

      const role = String(user.role || '').trim().toUpperCase();

      const token = signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: role as any,
        vendor_id: vendorId,
        profile_id: profileId,
      });

      await logAudit({
        userId: user.id,
        role,
        action: 'USER_LOGIN_EMAIL_OTP',
        entityType: 'User',
        entityId: user.id,
      });

      const userObj = {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        vendor_id: vendorId,
        vendorId: vendorId,
        profile_id: profileId,
        customerProfileId: profileId,
      };

      const response = NextResponse.json({
        success: true,
        message: 'Signed in successfully with Email OTP!',
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

    // 3. For REGISTER or FORGOT_PASSWORD, acknowledge valid OTP
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (error: any) {
    console.error('[api/auth/otp/verify] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'OTP verification failed' },
      { status: 500 }
    );
  }
}
