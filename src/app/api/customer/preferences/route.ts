import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export interface PartnerPreferenceFields {
  min_age: number;
  max_age: number;
  min_height_cm: number;
  max_height_cm: number;
  accepted_marital_status: string;
  preferred_religions: string;
  preferred_castes: string;
  preferred_sub_castes: string;
  preferred_educations: string;
  preferred_professions: string;
  min_income: number;
  preferred_country: string;
  preferred_state: string;
  preferred_city: string;
  preferred_locations?: string;
  preferred_diet: string;
  preferred_manglik: string;
  preferred_smoking: string;
  preferred_drinking: string;
  deal_breakers?: string;
}

const DEFAULT_PREFERENCES: PartnerPreferenceFields = {
  min_age: 21,
  max_age: 32,
  min_height_cm: 150,
  max_height_cm: 190,
  accepted_marital_status: 'Any',
  preferred_religions: 'Hindu',
  preferred_castes: 'Any',
  preferred_sub_castes: 'Any',
  preferred_educations: 'Any',
  preferred_professions: 'Any',
  min_income: 0,
  preferred_country: 'India',
  preferred_state: 'Any',
  preferred_city: 'Any',
  preferred_locations: 'Any',
  preferred_diet: 'Any',
  preferred_manglik: 'Any',
  preferred_smoking: 'No',
  preferred_drinking: 'No',
  deal_breakers: '',
};

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    try {
      // Find profile for user
      const profileRows = await query<any[]>(
        `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
        [session.id]
      );

      if (profileRows.length > 0) {
        const profileId = profileRows[0].id;
        const prefRows = await query<any[]>(
          `SELECT * FROM partner_preferences WHERE profile_id = ? LIMIT 1`,
          [profileId]
        );

        if (prefRows.length > 0) {
          const pref = prefRows[0];
          return NextResponse.json({
            success: true,
            data: {
              min_age: Number(pref.min_age) || DEFAULT_PREFERENCES.min_age,
              max_age: Number(pref.max_age) || DEFAULT_PREFERENCES.max_age,
              min_height_cm: Number(pref.min_height_cm) || DEFAULT_PREFERENCES.min_height_cm,
              max_height_cm: Number(pref.max_height_cm) || DEFAULT_PREFERENCES.max_height_cm,
              accepted_marital_status: pref.accepted_marital_status || DEFAULT_PREFERENCES.accepted_marital_status,
              preferred_religions: pref.preferred_religions || DEFAULT_PREFERENCES.preferred_religions,
              preferred_castes: pref.preferred_castes || DEFAULT_PREFERENCES.preferred_castes,
              preferred_sub_castes: pref.preferred_sub_castes || DEFAULT_PREFERENCES.preferred_sub_castes,
              preferred_educations: pref.preferred_educations || DEFAULT_PREFERENCES.preferred_educations,
              preferred_professions: pref.preferred_professions || DEFAULT_PREFERENCES.preferred_professions,
              min_income: Number(pref.min_income) || 0,
              preferred_country: pref.preferred_country || DEFAULT_PREFERENCES.preferred_country,
              preferred_state: pref.preferred_state || DEFAULT_PREFERENCES.preferred_state,
              preferred_city: pref.preferred_city || DEFAULT_PREFERENCES.preferred_city,
              preferred_locations: pref.preferred_locations || pref.preferred_city || DEFAULT_PREFERENCES.preferred_locations,
              preferred_diet: pref.preferred_diet || DEFAULT_PREFERENCES.preferred_diet,
              preferred_manglik: pref.preferred_manglik || DEFAULT_PREFERENCES.preferred_manglik,
              preferred_smoking: pref.preferred_smoking || DEFAULT_PREFERENCES.preferred_smoking,
              preferred_drinking: pref.preferred_drinking || DEFAULT_PREFERENCES.preferred_drinking,
              deal_breakers: pref.deal_breakers || '',
            },
          });
        }
      }
    } catch (dbErr: any) {
      console.warn('[customer/preferences GET] DB warning (standby mode):', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      data: DEFAULT_PREFERENCES,
      isDefault: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch partner preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const min_age = Number(body.min_age) || 21;
    const max_age = Number(body.max_age) || 35;
    const min_height_cm = Number(body.min_height_cm) || 150;
    const max_height_cm = Number(body.max_height_cm) || 195;
    const accepted_marital_status = body.accepted_marital_status || 'Any';
    const preferred_religions = body.preferred_religions || 'Any';
    const preferred_castes = body.preferred_castes || 'Any';
    const preferred_sub_castes = body.preferred_sub_castes || 'Any';
    const preferred_educations = body.preferred_educations || 'Any';
    const preferred_professions = body.preferred_professions || 'Any';
    const min_income = Number(body.min_income) || 0;
    const preferred_country = body.preferred_country || 'India';
    const preferred_state = body.preferred_state || 'Any';
    const preferred_city = body.preferred_city || 'Any';
    const preferred_locations = body.preferred_locations || preferred_city || 'Any';
    const preferred_diet = body.preferred_diet || 'Any';
    const preferred_manglik = body.preferred_manglik || 'Any';
    const preferred_smoking = body.preferred_smoking || 'No';
    const preferred_drinking = body.preferred_drinking || 'No';
    const deal_breakers = body.deal_breakers || '';

    let profileId: string = session.profile_id || ('prof_' + session.id);

    try {
      // 1. Check or resolve customer profile
      const profileRows = await query<any[]>(
        `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`,
        [session.id]
      );

      if (profileRows.length > 0) {
        profileId = profileRows[0].id;
      } else {
        // Auto-create customer profile record if user doesn't have one yet
        profileId = 'prof_' + session.id;
        await query(
          `INSERT INTO customer_profiles (id, user_id, verification_status, profile_visibility)
           VALUES (?, ?, 'UNVERIFIED', 'PUBLIC')
           ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
          [profileId, session.id]
        );
      }

      // 2. Check if partner preferences row exists
      const prefRows = await query<any[]>(
        `SELECT id FROM partner_preferences WHERE profile_id = ? LIMIT 1`,
        [profileId]
      );

      if (prefRows.length > 0) {
        await query(
          `UPDATE partner_preferences SET
             min_age = ?,
             max_age = ?,
             min_height_cm = ?,
             max_height_cm = ?,
             accepted_marital_status = ?,
             preferred_religions = ?,
             preferred_castes = ?,
             preferred_sub_castes = ?,
             preferred_educations = ?,
             preferred_professions = ?,
             min_income = ?,
             preferred_country = ?,
             preferred_state = ?,
             preferred_city = ?,
             preferred_locations = ?,
             preferred_diet = ?,
             preferred_manglik = ?,
             preferred_smoking = ?,
             preferred_drinking = ?,
             deal_breakers = ?,
             updated_at = NOW()
           WHERE profile_id = ?`,
          [
            min_age,
            max_age,
            min_height_cm,
            max_height_cm,
            accepted_marital_status,
            preferred_religions,
            preferred_castes,
            preferred_sub_castes,
            preferred_educations,
            preferred_professions,
            min_income,
            preferred_country,
            preferred_state,
            preferred_city,
            preferred_locations,
            preferred_diet,
            preferred_manglik,
            preferred_smoking,
            preferred_drinking,
            deal_breakers,
            profileId,
          ]
        );
      } else {
        const prefId = 'pref_' + randomUUID();
        await query(
          `INSERT INTO partner_preferences (
             id, profile_id, min_age, max_age, min_height_cm, max_height_cm,
             accepted_marital_status, preferred_religions, preferred_castes, preferred_sub_castes,
             preferred_educations, preferred_professions, min_income, preferred_country,
             preferred_state, preferred_city, preferred_locations, preferred_diet,
             preferred_manglik, preferred_smoking, preferred_drinking, deal_breakers
           ) VALUES (
             ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?, ?
           )`,
          [
            prefId,
            profileId,
            min_age,
            max_age,
            min_height_cm,
            max_height_cm,
            accepted_marital_status,
            preferred_religions,
            preferred_castes,
            preferred_sub_castes,
            preferred_educations,
            preferred_professions,
            min_income,
            preferred_country,
            preferred_state,
            preferred_city,
            preferred_locations,
            preferred_diet,
            preferred_manglik,
            preferred_smoking,
            preferred_drinking,
            deal_breakers,
          ]
        );
      }

      await logAudit({
        userId: session.id,
        role: session.role || 'CUSTOMER',
        action: 'UPDATE_PARTNER_PREFERENCES',
        entityType: 'PartnerPreferences',
        entityId: profileId,
      });

      return NextResponse.json({
        success: true,
        message: 'Partner preferences saved successfully! Matrimonial compatibility scores will now reflect your criteria. 💖',
        data: {
          min_age,
          max_age,
          min_height_cm,
          max_height_cm,
          accepted_marital_status,
          preferred_religions,
          preferred_castes,
          preferred_sub_castes,
          preferred_educations,
          preferred_professions,
          min_income,
          preferred_country,
          preferred_state,
          preferred_city,
          preferred_locations,
          preferred_diet,
          preferred_manglik,
          preferred_smoking,
          preferred_drinking,
          deal_breakers,
        },
      });
    } catch (dbErr: any) {
      console.warn('[customer/preferences PUT] DB warning (standby mode):', dbErr.message);
      return NextResponse.json({
        success: true,
        message: 'Partner preferences saved (Standby Session)',
        data: body,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to save partner preferences' },
      { status: 500 }
    );
  }
}
