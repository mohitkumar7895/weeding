import crypto from 'crypto';
import { query } from '@/lib/db';
import { sendEmail, getOtpEmailTemplate } from './emailService';

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

export interface StoredOtp {
  email: string;
  otp: string;
  purpose: OtpPurpose;
  expiresAt: number; // timestamp in ms
  attempts: number;
  lastSentAt: number;
  verified: boolean;
}

// In-memory fallback cache (used if MySQL is temporarily offline)
const inMemoryOtpStore = new Map<string, StoredOtp>();

function getCacheKey(email: string, purpose: OtpPurpose): string {
  return `${email.toLowerCase()}_${purpose}`;
}

let isTableInitialized = false;

/**
 * Ensure `email_otps` table exists in MySQL
 */
async function ensureTableExists() {
  if (isTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(191) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        purpose ENUM('LOGIN', 'REGISTER', 'FORGOT_PASSWORD') NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT DEFAULT 0,
        verified BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_purpose (email, purpose, verified)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    isTableInitialized = true;
  } catch (err: any) {
    // Database may be unreachable in dev; memory store will take over gracefully
    // console.warn('[OtpService] DB initialization notice:', err.message);
  }
}

/**
 * Generate a stateless, cryptographically signed OTP token for serverless environments
 */
export function generateOtpToken(email: string, otp: string, purpose: OtpPurpose): string {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'wedwithme_secret_key';
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${email.toLowerCase()}|${purpose}|${otp.trim()}|${expiresAt}`)
    .digest('hex');
  const payload = `${email.toLowerCase()}|${purpose}|${expiresAt}|${hmac}`;
  return Buffer.from(payload).toString('base64');
}

/**
 * Verify a stateless cryptographic OTP token
 */
export function verifyOtpToken(email: string, enteredOtp: string, purpose: OtpPurpose, token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [tokenEmail, tokenPurpose, expiresAtStr, receivedHmac] = decoded.split('|');
    if (!tokenEmail || !tokenPurpose || !expiresAtStr || !receivedHmac) return false;
    if (tokenEmail.toLowerCase() !== email.trim().toLowerCase() || tokenPurpose !== purpose) return false;
    if (Date.now() > parseInt(expiresAtStr, 10)) return false;

    const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'wedwithme_secret_key';
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(`${tokenEmail}|${tokenPurpose}|${enteredOtp.trim()}|${expiresAtStr}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

/**
 * Generate a 6-digit numeric OTP and dispatch via Email
 */
export async function createAndSendOtp(
  email: string,
  purpose: OtpPurpose,
  userName?: string,
  isResend: boolean = false
): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  alreadyActive?: boolean;
  otpToken?: string;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const cacheKey = getCacheKey(normalizedEmail, purpose);
  const now = Date.now();
  const COOLDOWN_SECONDS = 45;
  const COOLDOWN_MS = COOLDOWN_SECONDS * 1000;

  // 1. Check in-memory store
  const existingMemory = inMemoryOtpStore.get(cacheKey);
  let lastSentAt: number | null = existingMemory ? existingMemory.lastSentAt : null;
  let hasValidActiveOtp = Boolean(
    existingMemory && existingMemory.expiresAt > now && !existingMemory.verified
  );
  let activeOtpVal = existingMemory?.otp;

  // 2. Check MySQL DB if in-memory store does not have record (e.g., fresh serverless container)
  if (!lastSentAt) {
    try {
      await ensureTableExists();
      const recentRows = await query<any[]>(
        `SELECT otp, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_ago, expires_at, verified 
         FROM email_otps 
         WHERE email = ? AND purpose = ? AND verified = FALSE 
         ORDER BY created_at DESC LIMIT 1`,
        [normalizedEmail, purpose]
      );
      if (recentRows.length > 0) {
        const row = recentRows[0];
        if (row.seconds_ago !== null && row.seconds_ago < COOLDOWN_SECONDS) {
          lastSentAt = now - row.seconds_ago * 1000;
        }
        const expiresAtTime = new Date(row.expires_at).getTime();
        if (expiresAtTime > now && !row.verified) {
          hasValidActiveOtp = true;
          activeOtpVal = row.otp;
        }
      }
    } catch (_) {
      // Ignore db check error if offline
    }
  }

  // 3. Evaluate cooldown
  if (lastSentAt && now - lastSentAt < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastSentAt)) / 1000);

    // If an OTP is already active and the user is NOT requesting an explicit resend
    // (e.g. they refreshed, reopened modal, or re-submitted form), seamlessly let them enter the OTP
    if (!isResend && hasValidActiveOtp) {
      const existingToken = activeOtpVal
        ? generateOtpToken(normalizedEmail, activeOtpVal, purpose)
        : undefined;

      return {
        success: true,
        message: `A verification code was already sent to ${normalizedEmail}. Please check your inbox or enter it below.`,
        cooldownSeconds: remaining,
        alreadyActive: true,
        otpToken: existingToken,
      };
    }

    // Explicit resend requested before cooldown elapsed
    return {
      success: false,
      message: `Please wait ${remaining}s before requesting a new OTP`,
      cooldownSeconds: remaining,
    };
  }

  // Generate 6-digit cryptographic OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAtMs = now + 10 * 60 * 1000; // 10 minutes
  const expiresAtDate = new Date(expiresAtMs);
  const otpToken = generateOtpToken(normalizedEmail, otp, purpose);

  // Store in memory cache
  inMemoryOtpStore.set(cacheKey, {
    email: normalizedEmail,
    otp,
    purpose,
    expiresAt: expiresAtMs,
    attempts: 0,
    lastSentAt: now,
    verified: false,
  });

  const otpId = 'otp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // Attempt to persist to MySQL
  try {
    await ensureTableExists();
    // Invalidate prior pending OTPs for this email & purpose
    await query(
      `DELETE FROM email_otps WHERE email = ? AND purpose = ?`,
      [normalizedEmail, purpose]
    );
    await query(
      `INSERT INTO email_otps (id, email, otp, purpose, expires_at, attempts, verified)
       VALUES (?, ?, ?, ?, ?, 0, FALSE)`,
      [otpId, normalizedEmail, otp, purpose, expiresAtDate]
    );
  } catch (dbErr: any) {
    // Memory store fallback already holds the OTP
    console.warn('[OtpService] Saved to in-memory store (MySQL standby):', dbErr.message);
  }

  // Prepare & Send Branded Email
  const { subject, html } = getOtpEmailTemplate({
    otp,
    purpose,
    userName,
  });

  const emailResult = await sendEmail({
    to: normalizedEmail,
    subject,
    html,
  });

  if (!emailResult.success && emailResult.error) {
    // Rollback so the user isn't stuck with a rate-limit cooldown on an undelivered email
    inMemoryOtpStore.delete(cacheKey);
    try {
      await query(`DELETE FROM email_otps WHERE id = ?`, [otpId]);
    } catch (_) { }

    return {
      success: false,
      message: `Failed to send email: ${emailResult.error}`,
    };
  }

  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
    cooldownSeconds: COOLDOWN_SECONDS,
    otpToken,
  };
}

/**
 * Verify an OTP without consuming it
 */
export async function verifyOtp(
  email: string,
  enteredOtp: string,
  purpose: OtpPurpose,
  otpToken?: string
): Promise<{ valid: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = enteredOtp.trim();
  const now = Date.now();

  // 1. Stateless cryptographic signature verification (works across independent serverless lambdas)
  if (otpToken && verifyOtpToken(normalizedEmail, trimmedOtp, purpose, otpToken)) {
    return { valid: true, message: 'OTP verified successfully.' };
  }

  // 2. Check in-memory store
  const cacheKey = getCacheKey(normalizedEmail, purpose);
  const memRecord = inMemoryOtpStore.get(cacheKey);
  if (memRecord) {
    if (memRecord.expiresAt < now) {
      inMemoryOtpStore.delete(cacheKey);
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }
    if (memRecord.attempts >= 5) {
      inMemoryOtpStore.delete(cacheKey);
      return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }
    if (memRecord.otp !== trimmedOtp) {
      memRecord.attempts += 1;
      return { valid: false, message: `Invalid OTP code. (${5 - memRecord.attempts} attempts remaining)` };
    }
    return { valid: true, message: 'OTP verified successfully.' };
  }

  // 3. Fallback to MySQL if not in memory (e.g., across server restarts)
  try {
    await ensureTableExists();
    const rows = await query<any[]>(
      `SELECT * FROM email_otps 
       WHERE email = ? AND purpose = ? AND verified = FALSE 
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, purpose]
    );

    if (rows.length > 0) {
      const row = rows[0];
      const expiry = new Date(row.expires_at).getTime();

      if (expiry < now) {
        return { valid: false, message: 'OTP has expired. Please request a new one.' };
      }

      if (row.attempts >= 5) {
        return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
      }

      if (row.otp !== trimmedOtp) {
        await query(`UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?`, [row.id]);
        return { valid: false, message: `Invalid OTP code.` };
      }

      return { valid: true, message: 'OTP verified successfully.' };
    }
  } catch (err: any) {
    console.warn('[OtpService] DB verification error:', err.message);
  }

  return { valid: false, message: 'Invalid or expired verification code.' };
}

/**
 * Verify and immediately consume (invalidate) the OTP
 */
export async function consumeOtp(
  email: string,
  enteredOtp: string,
  purpose: OtpPurpose,
  otpToken?: string
): Promise<{ success: boolean; message: string }> {
  const verifyResult = await verifyOtp(email, enteredOtp, purpose, otpToken);
  if (!verifyResult.valid) {
    return { success: false, message: verifyResult.message };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cacheKey = getCacheKey(normalizedEmail, purpose);

  // Clear from memory
  inMemoryOtpStore.delete(cacheKey);

  // Mark as verified in MySQL
  try {
    await query(
      `UPDATE email_otps SET verified = TRUE 
       WHERE email = ? AND purpose = ? AND verified = FALSE`,
      [normalizedEmail, purpose]
    );
  } catch (e) {
    // Ignore db write error if offline
  }

  return { success: true, message: 'OTP verified and consumed.' };
}


