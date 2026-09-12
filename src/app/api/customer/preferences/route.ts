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
  min_age: 0,
  max_age: 0,
  min_height_cm: 0,
  max_height_cm: 0,
  accepted_marital_status: '',
  preferred_religions: '',
  preferred_castes: '',
  preferred_sub_castes: '',
  preferred_educations: '',
  preferred_professions: '',
  min_income: 0,
  preferred_country: '',
  preferred_state: '',
  preferred_city: '',
  preferred_locations: '',
  preferred_diet: '',
  preferred_manglik: '',
  preferred_smoking: '',
  preferred_drinking: '',
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
              min_age: Number(pref.min_age) || 0,
              max_age: Number(pref.max_age) || 0,
              min_height_cm: Number(pref.min_height_cm) || 0,
              max_height_cm: Number(pref.max_height_cm) || 0,
              accepted_marital_status: pref.accepted_marital_status || '',
              preferred_religions: pref.preferred_religions || '',
              preferred_castes: pref.preferred_castes || '',
              preferred_sub_castes: pref.preferred_sub_castes || '',
              preferred_educations: pref.preferred_educations || '',
              preferred_professions: pref.preferred_professions || '',
              min_income: Number(pref.min_income) || 0,
              preferred_country: pref.preferred_country || '',
              preferred_state: pref.preferred_state || '',
              preferred_city: pref.preferred_city || '',
              preferred_locations: pref.preferred_locations || pref.preferred_city || '',
              preferred_diet: pref.preferred_diet || '',
              preferred_manglik: pref.preferred_manglik || '',
              preferred_smoking: pref.preferred_smoking || '',
              preferred_drinking: pref.preferred_drinking || '',
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

    const min_age = Number(body.min_age) || 0;
    const max_age = Number(body.max_age) || 0;
    const min_height_cm = Number(body.min_height_cm) || 0;
    const max_height_cm = Number(body.max_height_cm) || 0;
    const accepted_marital_status = body.accepted_marital_status ?? '';
    const preferred_religions = body.preferred_religions ?? '';
    const preferred_castes = body.preferred_castes ?? '';
    const preferred_sub_castes = body.preferred_sub_castes ?? '';
    const preferred_educations = body.preferred_educations ?? '';
    const preferred_professions = body.preferred_professions ?? '';
    const min_income = Number(body.min_income) || 0;
    const preferred_country = body.preferred_country ?? '';
    const preferred_state = body.preferred_state ?? '';
    const preferred_city = body.preferred_city ?? '';
    const preferred_locations = body.preferred_locations || preferred_city || '';
    const preferred_diet = body.preferred_diet ?? '';
    const preferred_manglik = body.preferred_manglik ?? '';
    const preferred_smoking = body.preferred_smoking ?? '';
    const preferred_drinking = body.preferred_drinking ?? '';
    const deal_breakers = body.deal_breakers ?? '';

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
      console.error('[customer/preferences PUT] DB error:', dbErr.message);
      return NextResponse.json({
        success: false,
        message: 'Database save error: ' + dbErr.message,
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to save partner preferences' },
      { status: 500 }
    );
  }
}
