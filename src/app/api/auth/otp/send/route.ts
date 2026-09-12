import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createAndSendOtp, OtpPurpose } from '@/services/otpService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, purpose } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'A valid email address is required' },
        { status: 400 }
      );
    }

    const validPurposes: OtpPurpose[] = ['LOGIN', 'REGISTER', 'FORGOT_PASSWORD'];
    if (!purpose || !validPurposes.includes(purpose)) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP purpose' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    let userName: string | undefined = undefined;

    // Check account status against MySQL
    try {
      const users = await query<any[]>(
        `SELECT id, name, status FROM users WHERE email = ? LIMIT 1`,
        [normalizedEmail]
      );

      if (purpose === 'LOGIN' || purpose === 'FORGOT_PASSWORD') {
        if (users.length === 0) {
          return NextResponse.json(
            { success: false, message: 'No account found with this email address. Please check or register.' },
            { status: 404 }
          );
        }
        if (users[0].status === 'SUSPENDED') {
          return NextResponse.json(
            { success: false, message: 'Your account is suspended. Please contact support.' },
            { status: 403 }
          );
        }
        userName = users[0].name;
      } else if (purpose === 'REGISTER') {
        if (users.length > 0) {
          return NextResponse.json(
            { success: false, message: 'An account with this email already exists. Please sign in instead.' },
            { status: 409 }
          );
        }
      }
    } catch (dbErr) {
      // If DB is offline during local dev, proceed gracefully
      console.warn('[api/auth/otp/send] DB check skipped (offline):', dbErr);
    }

    const result = await createAndSendOtp(normalizedEmail, purpose as OtpPurpose, userName);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, cooldownSeconds: result.cooldownSeconds },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[api/auth/otp/send] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
