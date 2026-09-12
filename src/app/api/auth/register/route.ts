import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { hashPassword, signToken, logAudit } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      role = 'CUSTOMER',
      otp,
      businessName,
      business_name,
      categoryId,
      category_id,
      city = 'Delhi NCR',
    } = body;

    const finalBusinessName = business_name || businessName || name;
    const finalCategoryId = category_id || categoryId || 'cat_photographers';

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // If OTP was provided, verify and consume it
    if (otp) {
      const { consumeOtp } = await import('@/services/otpService');
      const consumeResult = await consumeOtp(email, otp, 'REGISTER');
      if (!consumeResult.success) {
        return NextResponse.json({ success: false, message: consumeResult.message }, { status: 400 });
      }
    }

    // Check if user already exists
    const existingUsers = await query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists' }, { status: 409 });
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const passwordHash = await hashPassword(password);
    const userRole = role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';
    let assignedVendorId: string | undefined = undefined;

    // Execute in transaction
    await transaction(async (conn) => {
      // 1. Insert into users
      await conn.query(
        `INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', true, false)`,
        [userId, email.toLowerCase(), phone || null, passwordHash, name, userRole]
      );

      // 2. Default Privacy Settings
      await conn.query(
        `INSERT INTO privacy_settings (id, user_id, phone_visibility, email_visibility, income_visibility, photos_visibility, family_visibility)
         VALUES (?, ?, 'MATCHED_ONLY', 'PRIVATE', 'MATCHED_ONLY', 'PUBLIC', 'MATCHED_ONLY')`,
        [`priv_${userId}`, userId]
      );

      // 3. User Consent for Terms & Privacy
      await conn.query(
        `INSERT INTO user_consents (id, user_id, consent_type, consent_version, is_granted)
         VALUES (?, ?, 'TERMS_OF_SERVICE', 'v1.0', TRUE),
                (?, ?, 'PRIVACY_POLICY', 'v1.0', TRUE)`,
        [`cns_terms_${userId}`, userId, `cns_priv_${userId}`, userId]
      );

      // 4. Role-specific profile initialization
      if (userRole === 'CUSTOMER') {
        const profileId = `prof_${userId}`;
        await conn.query(
          `INSERT INTO customer_profiles (
             id, user_id, gender, date_of_birth, height_cm, marital_status, religion,
             education, profession, annual_income, state, city, about_me, verification_status, profile_visibility
           ) VALUES (?, ?, 'OTHER', '1998-01-01', 165, 'NEVER_MARRIED', 'Hindu', 'Graduate', 'Professional', 1200000.00, 'Delhi', ?, 'Hello, I am looking for a life partner on WedWithMe.', 'UNVERIFIED', 'PUBLIC')`,
          [profileId, userId, city]
        );

        // Partner preference
        await conn.query(
          `INSERT INTO partner_preferences (id, profile_id, min_age, max_age, min_height_cm, max_height_cm, preferred_religions, min_income, preferred_locations)
           VALUES (?, ?, 21, 35, 150, 190, 'Hindu', 800000.00, ?)`,
          [`pref_${profileId}`, profileId, city]
        );
      } else if (userRole === 'VENDOR') {
        assignedVendorId = `ven_${userId}`;
        await conn.query(
          `INSERT INTO vendors (id, user_id, business_name, category_id, city, starting_price, verification_status)
           VALUES (?, ?, ?, ?, ?, 15000.00, 'PENDING')`,
          [assignedVendorId, userId, finalBusinessName, finalCategoryId, city]
        );

        // Initialize Vendor Onboarding Record
        await conn.query(
          `INSERT INTO vendor_onboarding (id, vendor_id, status, checklist_json)
           VALUES (?, ?, 'DRAFT', ?)`,
          [
            `onb_${assignedVendorId}`,
            assignedVendorId,
            JSON.stringify({
              business_profile: true,
              pan_uploaded: false,
              bank_details: false,
              packages_configured: false,
            }),
          ]
        );
      }
    });

    // Generate JWT token
    const token = signToken({
      id: userId,
      email: email.toLowerCase(),
      name,
      role: userRole,
      vendor_id: assignedVendorId,
    });

    await logAudit({
      userId,
      role: userRole,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: userId,
      newValues: { email, name, role: userRole },
    });

    const userObj = {
      id: userId,
      email: email.toLowerCase(),
      name,
      role: userRole,
      vendor_id: assignedVendorId,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: userObj,
      data: { user: userObj },
    });

    response.cookies.set('wwm_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
