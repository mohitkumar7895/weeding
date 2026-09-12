import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const SMTP_EMAIL = process.env.SMTP_EMAIL || 'prtmohit.provisioningtech.com@gmail.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'vkrdsipfchlkgyxj';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'WedWithMe <onboarding@resend.dev>';

// Cached nodemailer transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Send an email using SMTP (Gmail) with automatic fallback to Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, text } = options;

  // 1. Try Gmail SMTP via Nodemailer
  if (SMTP_EMAIL && SMTP_PASSWORD) {
    try {
      const mailClient = getTransporter();
      const info = await mailClient.sendMail({
        from: `"WedWithMe" <${SMTP_EMAIL}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ''),
      });

      console.log(`[EmailService] SMTP sent successfully to ${to}, MessageID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (smtpErr: any) {
      console.warn(`[EmailService] SMTP failed for ${to}:`, smtpErr.message);
    }
  }

  // 2. Fallback to Resend API if API Key is configured
  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''),
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`[EmailService] Resend API sent to ${to}, ID: ${resData.id}`);
        return { success: true, messageId: resData.id };
      } else {
        console.warn(`[EmailService] Resend API failed:`, resData);
      }
    } catch (resendErr: any) {
      console.warn(`[EmailService] Resend error:`, resendErr.message);
    }
  }

  // 3. Fallback for offline dev
  console.log(`\n==========================================`);
  console.log(`[EmailService MOCK/DEV OUTPUT]`);
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`==========================================\n`);

  return { success: true, messageId: 'mock_' + Date.now() };
}

/**
 * Generate Luxury WedWithMe Branded OTP Email Template
 */
export function getOtpEmailTemplate(params: {
  otp: string;
  purpose: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
  userName?: string;
}): { subject: string; html: string } {
  const { otp, purpose, userName } = params;

  let title = 'Your Verification Code';
  let subject = `[WedWithMe] Your Verification Code is ${otp}`;
  let purposeDescription = 'Please use the 6-digit OTP below to verify your email address.';

  if (purpose === 'LOGIN') {
    title = 'Sign In Verification Code';
    subject = `[WedWithMe] Login OTP: ${otp}`;
    purposeDescription = 'Use this code to securely sign in to your WedWithMe account.';
  } else if (purpose === 'REGISTER') {
    title = 'Welcome to WedWithMe!';
    subject = `[WedWithMe] Email Verification OTP: ${otp}`;
    purposeDescription = 'Welcome to WedWithMe — From Match to Marriage! Verify your email to activate your account.';
  } else if (purpose === 'FORGOT_PASSWORD') {
    title = 'Reset Your Password';
    subject = `[WedWithMe] Password Reset Code: ${otp}`;
    purposeDescription = 'We received a request to reset your password. Enter this one-time code to create a new password.';
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #03150d;
          color: #ffffff;
        }
        .container {
          max-width: 540px;
          margin: 30px auto;
          background: linear-gradient(180deg, #072a1e 0%, #031810 100%);
          border-radius: 20px;
          border: 1px solid rgba(229, 193, 88, 0.35);
          overflow: hidden;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
        }
        .header {
          text-align: center;
          padding: 34px 20px 20px;
          border-bottom: 1px solid rgba(229, 193, 88, 0.15);
        }
        .brand-name {
          font-size: 26px;
          font-weight: 800;
          color: #e5c158;
          letter-spacing: 0.5px;
          margin: 0;
        }
        .brand-tagline {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #fae8a4;
          margin-top: 4px;
        }
        .body {
          padding: 32px 30px 24px;
          text-align: center;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 12px;
        }
        .description {
          font-size: 14px;
          color: #a5b9af;
          line-height: 1.5;
          margin: 0 0 26px;
        }
        .otp-box {
          display: inline-block;
          background: rgba(0, 0, 0, 0.45);
          border: 1.5px dashed #ff2a73;
          border-radius: 14px;
          padding: 16px 36px;
          margin: 0 auto 26px;
          box-shadow: 0 4px 20px rgba(255, 42, 115, 0.2);
        }
        .otp-code {
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #ff2a73;
          font-family: monospace;
          margin: 0;
        }
        .expiry-note {
          font-size: 12.5px;
          color: #e5c158;
          font-weight: 600;
          margin-bottom: 22px;
        }
        .security-note {
          font-size: 12px;
          color: #799184;
          line-height: 1.4;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 18px;
        }
        .footer {
          text-align: center;
          padding: 18px;
          font-size: 11px;
          color: #5d7568;
          background: rgba(0, 0, 0, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="brand-name">WedWithMe</h1>
          <div class="brand-tagline">From Match to Marriage</div>
        </div>
        <div class="body">
          <h2 class="title">${userName ? `Hello ${userName},` : ''} ${title}</h2>
          <p class="description">${purposeDescription}</p>

          <div class="otp-box">
            <p class="otp-code">${otp}</p>
          </div>

          <div class="expiry-note">⏱️ This OTP is valid for 10 minutes.</div>

          <div class="security-note">
            ⚠️ If you did not initiate this request, please disregard this email or contact our support immediately. Never share your OTP with anyone.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} WedWithMe Inc. Protected by Escrow & Privacy Shield.
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Generate Password Reset Success Email Template
 */
export function getPasswordResetSuccessTemplate(userName?: string): { subject: string; html: string } {
  const subject = '[WedWithMe] Your Password Has Been Successfully Reset';
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { margin: 0; padding: 0; font-family: sans-serif; background-color: #03150d; color: #ffffff; }
        .container { max-width: 520px; margin: 30px auto; background: #072a1e; border-radius: 16px; border: 1px solid #e5c158; padding: 30px; text-align: center; }
        .title { color: #10b981; font-size: 22px; font-weight: bold; margin-bottom: 12px; }
        .desc { color: #a5b9af; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 style="color: #e5c158; margin-bottom: 4px;">WedWithMe</h2>
        <div style="font-size: 11px; color: #fae8a4; margin-bottom: 24px;">FROM MATCH TO MARRIAGE</div>
        <div class="title">✓ Password Reset Successful</div>
        <p class="desc">Hello ${userName || 'there'}, your WedWithMe account password was successfully updated. You can now sign in using your new credentials.</p>
        <p style="font-size: 12px; color: #799184;">If you did not perform this change, please contact our support team immediately.</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
}
