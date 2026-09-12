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
 * Generate a 6-digit numeric OTP and dispatch via Email
 */
export async function createAndSendOtp(
  email: string,
  purpose: OtpPurpose,
  userName?: string
): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cacheKey = getCacheKey(normalizedEmail, purpose);
  const now = Date.now();

  // Check rate limit / cooldown (60 seconds)
  const existingMemory = inMemoryOtpStore.get(cacheKey);
  if (existingMemory && now - existingMemory.lastSentAt < 60 * 1000) {
    const remaining = Math.ceil((60 * 1000 - (now - existingMemory.lastSentAt)) / 1000);
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

  // Attempt to persist to MySQL
  try {
    await ensureTableExists();
    const id = 'otp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    // Invalidate prior pending OTPs for this email & purpose
    await query(
      `DELETE FROM email_otps WHERE email = ? AND purpose = ?`,
      [normalizedEmail, purpose]
    );
    await query(
      `INSERT INTO email_otps (id, email, otp, purpose, expires_at, attempts, verified)
       VALUES (?, ?, ?, ?, ?, 0, FALSE)`,
      [id, normalizedEmail, otp, purpose, expiresAtDate]
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
    return {
      success: false,
      message: `Failed to send email: ${emailResult.error}`,
    };
  }

  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
  };
}

/**
 * Verify an OTP without consuming it
 */
export async function verifyOtp(
  email: string,
  enteredOtp: string,
  purpose: OtpPurpose
): Promise<{ valid: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = enteredOtp.trim();
  const now = Date.now();
  const cacheKey = getCacheKey(normalizedEmail, purpose);

  // 1. Check in-memory store
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

  // 2. Fallback to MySQL if not in memory (e.g., across server restarts)
  try {
    await ensureTableExists();
    const rows = await query<any[]>(
      `SELECT * FROM email_otps 
       WHERE email = ? AND purpose = ? AND verified = FALSE 
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, purpose]
    );

    if (rows.length === 0) {
      return { valid: false, message: 'No active OTP found. Please request a code.' };
    }

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
  } catch (err: any) {
    return { valid: false, message: 'Verification error: ' + err.message };
  }
}

/**
 * Verify and immediately consume (invalidate) the OTP
 */
export async function consumeOtp(
  email: string,
  enteredOtp: string,
  purpose: OtpPurpose
): Promise<{ success: boolean; message: string }> {
  const verifyResult = await verifyOtp(email, enteredOtp, purpose);
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
