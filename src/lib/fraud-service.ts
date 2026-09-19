import { query } from './db';
import { randomUUID } from 'crypto';

interface ProfileData {
  gender: string;
  date_of_birth: string;
  name: string; // from users table
}

export async function detectDuplicateProfile(userId: string, profileId: string, profileData: ProfileData) {
  try {
    const { gender, date_of_birth, name } = profileData;

    if (!gender || !date_of_birth || !name) {
      return; // Not enough data to check for duplicates
    }

    // A simple MVP rule: if there is another customer with the exact same name, gender, and DOB.
    const potentialDuplicates = await query<any[]>(
      `SELECT u.id as duplicate_user_id, p.id as duplicate_profile_id 
       FROM users u
       JOIN customer_profiles p ON u.id = p.user_id
       WHERE u.role = 'CUSTOMER' 
         AND u.id != ? 
         AND LOWER(TRIM(u.name)) = LOWER(TRIM(?))
         AND p.gender = ? 
         AND p.date_of_birth = ?
       LIMIT 1`,
      [userId, name, gender, date_of_birth]
    );

    if (potentialDuplicates.length > 0) {
      const duplicate = potentialDuplicates[0];
      
      // Check if this duplicate flag already exists so we don't spam
      const existingFlags = await query<any[]>(
        `SELECT id FROM fraud_flags 
         WHERE entity_type = 'PROFILE' AND entity_id = ? AND status = 'OPEN'`,
        [profileId]
      );

      if (existingFlags.length === 0) {
        const flagId = 'flag_' + randomUUID();
        const reason = `Possible duplicate profile detected. Matches Name, Gender, and DOB with profile ${duplicate.duplicate_profile_id} (User: ${duplicate.duplicate_user_id}).`;
        
        await query(
          `INSERT INTO fraud_flags (id, entity_type, entity_id, risk_score, flag_reason, severity, status)
           VALUES (?, 'PROFILE', ?, 80, ?, 'HIGH', 'OPEN')`,
          [flagId, profileId, reason]
        );

        console.log(`[Fraud Service] Logged duplicate profile flag for profile ${profileId}`);
      }
    }
  } catch (err: any) {
    console.error('[Fraud Service] Error detecting duplicate profile:', err.message);
  }
}
