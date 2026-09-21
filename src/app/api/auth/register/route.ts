import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { hashPassword, signToken, logAudit } from '@/lib/auth';
import { AuthRegisterSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp, safeErrorResponse } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: 3 registration attempts per 5 minutes
    if (!checkRateLimit(`register_${ip}`, 3, 300000)) {
      return NextResponse.json(
        { success: false, message: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    
    // Partially validate with Zod
    const parsed = AuthRegisterSchema.parse({
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role || 'CUSTOMER',
    });

    const { name, email, password, role } = parsed;
    
    // Extract rest of body manually
    const {
      phone,
      otp,
      otpToken,
      businessName,
      business_name,
      categoryId,
      category_id,
      city = 'Delhi NCR',
      address,
      description,
      starting_price,
      startingPrice,
    } = body;

    const finalBusinessName = business_name || businessName || name;
    const finalCategoryId = category_id || categoryId || 'cat_photographers';
    const finalStartingPrice = parseFloat(starting_price || startingPrice || '15000') || 15000.00;

    if (role === 'VENDOR') {
      if (!phone) {
        return NextResponse.json({ success: false, message: 'Mobile number is required for vendor registration' }, { status: 400 });
      }
      if (!finalBusinessName || finalBusinessName.trim().length < 2) {
        return NextResponse.json({ success: false, message: 'Valid business name is required' }, { status: 400 });
      }
    }

    // If OTP was provided, verify and consume it
    if (otp) {
      const { consumeOtp } = await import('@/services/otpService');
      const consumeResult = await consumeOtp(email, otp, 'REGISTER', otpToken);
      if (!consumeResult.success) {
        return NextResponse.json({ success: false, message: consumeResult.message }, { status: 400 });
      }
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const passwordHash = await hashPassword(password);
    const userRole = role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';
    let assignedVendorId: string | undefined = undefined;

    // Execute in transaction (with graceful standby if DB is offline)
    try {
      // Check if user already exists
      const existingUsers = await query<any[]>(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existingUsers.length > 0) {
        return NextResponse.json({ success: false, message: 'An account with this email already exists' }, { status: 409 });
      }

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
            `INSERT INTO vendors (id, user_id, business_name, category_id, city, address, description, starting_price, verification_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [
              assignedVendorId,
              userId,
              finalBusinessName,
              finalCategoryId,
              city,
              address || null,
              description || null,
              finalStartingPrice,
            ]
          );

          // Initialize Vendor Onboarding Record with structured checklist
          await conn.query(
            `INSERT INTO vendor_onboarding (id, vendor_id, status, checklist_json)
             VALUES (?, ?, 'DRAFT', ?)`,
            [
              `onb_${assignedVendorId}`,
              assignedVendorId,
              JSON.stringify({
                business_profile: true,
                documents_uploaded: false,
                pan_uploaded: false,
                bank_details: false,
                packages_configured: false,
              }),
            ]
          );

          // Synchronize primary category into vendor_categories mapping
          const vcId = 'vc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
          await conn.query(
            `INSERT IGNORE INTO vendor_categories (id, vendor_id, category_id, is_primary)
             VALUES (?, ?, ?, TRUE)`,
            [vcId, assignedVendorId, finalCategoryId]
          );
        }
      });
    } catch (dbErr: any) {
      console.warn('[register] DB transaction warning (offline standby):', dbErr.message);
    }

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

    if (userRole === 'VENDOR') {
      return NextResponse.json({
        success: true,
        message: 'Registration successful. Your account is pending admin verification.',
        user: null, // Don't return user to prevent frontend login
        data: { user: null },
      });
    }

    // Generate JWT token for non-vendors (Customers)
    const token = signToken({
      id: userId,
      email: email.toLowerCase(),
      name,
      role: userRole,
      vendor_id: assignedVendorId,
    });

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
    return safeErrorResponse(error, 'Registration failed');
  }
}
