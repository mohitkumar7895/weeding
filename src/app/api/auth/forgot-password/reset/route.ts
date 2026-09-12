import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, logAudit } from '@/lib/auth';
import { consumeOtp } from '@/services/otpService';
import { sendEmail, getPasswordResetSuccessTemplate } from '@/services/emailService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, OTP code, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.toString().trim();

    // 1. Verify and consume the OTP
    const consumeResult = await consumeOtp(normalizedEmail, normalizedOtp, 'FORGOT_PASSWORD');
    if (!consumeResult.success) {
      return NextResponse.json(
        { success: false, message: consumeResult.message },
        { status: 400 }
      );
    }

    // 2. Hash new password
    const passwordHash = await hashPassword(newPassword);

    // 3. Update password in MySQL
    let userUpdated = false;
    let userName: string | undefined = undefined;

    try {
      const userRows = await query<any[]>(
        `SELECT id, name FROM users WHERE email = ? LIMIT 1`,
        [normalizedEmail]
      );

      if (userRows.length > 0) {
        const user = userRows[0];
        userName = user.name;
        await query(
          `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?`,
          [passwordHash, normalizedEmail]
        );
        userUpdated = true;

        await logAudit({
          userId: user.id,
          action: 'PASSWORD_RESET_VIA_EMAIL_OTP',
          entityType: 'User',
          entityId: user.id,
        });
      }
    } catch (dbErr) {
      console.warn('[forgot-password/reset] DB update warning:', dbErr);
    }

    // 4. Send confirmation email to user
    try {
      const confirmationTpl = getPasswordResetSuccessTemplate(userName);
      await sendEmail({
        to: normalizedEmail,
        subject: confirmationTpl.subject,
        html: confirmationTpl.html,
      });
    } catch (mailErr) {
      console.warn('[forgot-password/reset] Confirmation email failed:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully! Please sign in with your new password.',
    });
  } catch (error: any) {
    console.error('[forgot-password/reset] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
