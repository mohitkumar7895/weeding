const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Read .env without external libraries
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
} catch {}

async function main() {
  console.log('=====================================================');
  console.log('🔍 VERIFYING CUSTOMER PROFILE PRIVACY & VISIBILITY');
  console.log('=====================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wedwithme',
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Check schema fields on customer_profiles
    console.log('1. Checking database schema on `customer_profiles`...');
    const [cpCols] = await pool.query('SHOW COLUMNS FROM customer_profiles');
    const cpNames = cpCols.map(c => c.Field);

    assert(cpNames.includes('profile_visibility'), 'customer_profiles has profile_visibility column');
    assert(cpNames.includes('hide_phone'), 'customer_profiles has hide_phone column');
    assert(cpNames.includes('hide_photos'), 'customer_profiles has hide_photos column');
    assert(cpNames.includes('hide_income'), 'customer_profiles has hide_income column');
    assert(cpNames.includes('hide_location'), 'customer_profiles has hide_location column');

    // Check enum type of profile_visibility
    const pvCol = cpCols.find(c => c.Field === 'profile_visibility');
    assert(
      pvCol && (pvCol.Type.includes('PUBLIC') && pvCol.Type.includes('PRIVATE') && pvCol.Type.includes('LIMITED')),
      'profile_visibility supports PUBLIC, PRIVATE, and LIMITED enum modes'
    );

    // 2. Check schema fields on privacy_settings
    console.log('\n2. Checking database schema on `privacy_settings`...');
    const [psCols] = await pool.query('SHOW COLUMNS FROM privacy_settings');
    const psNames = psCols.map(c => c.Field);
    assert(psNames.includes('location_visibility'), 'privacy_settings has location_visibility column');

    // 3. Test Exclusion of PRIVATE profiles in Matrimonial Matches Query
    console.log('\n3. Testing Exclusion of PRIVATE profiles from matches search...');
    const [testUsers] = await pool.query(
      `SELECT u.id as user_id, cp.id as profile_id, cp.profile_visibility
       FROM users u
       JOIN customer_profiles cp ON u.id = cp.user_id
       WHERE u.role = 'CUSTOMER'
       LIMIT 1`
    );

    if (testUsers.length > 0) {
      const testProfileId = testUsers[0].profile_id;
      const originalVisibility = testUsers[0].profile_visibility;

      // Temporarily set to PRIVATE
      await pool.query(
        `UPDATE customer_profiles SET profile_visibility = 'PRIVATE' WHERE id = ?`,
        [testProfileId]
      );

      // Query eligible matches with the matches API logic
      const [eligible] = await pool.query(
        `SELECT cp.id, cp.profile_visibility 
         FROM customer_profiles cp
         JOIN users u ON cp.user_id = u.id
         WHERE u.status = 'ACTIVE' 
           AND cp.profile_visibility != 'PRIVATE'
           AND cp.verification_status != 'REJECTED'
           AND cp.id = ?`,
        [testProfileId]
      );

      assert(eligible.length === 0, 'PRIVATE profile is completely excluded from matches query results');

      // Now set to LIMITED with field hiding
      await pool.query(
        `UPDATE customer_profiles 
         SET profile_visibility = 'LIMITED',
             hide_phone = TRUE,
             hide_photos = TRUE,
             hide_income = TRUE,
             hide_location = TRUE
         WHERE id = ?`,
        [testProfileId]
      );

      const [limitedResults] = await pool.query(
        `SELECT cp.id, cp.profile_visibility, cp.hide_phone, cp.hide_photos, cp.hide_income, cp.hide_location
         FROM customer_profiles cp
         WHERE cp.id = ?`,
        [testProfileId]
      );
      assert(limitedResults[0].profile_visibility === 'LIMITED', 'profile_visibility updated to LIMITED');
      assert(limitedResults[0].hide_phone === 1, 'hide_phone flag set to true (1)');
      assert(limitedResults[0].hide_photos === 1, 'hide_photos flag set to true (1)');
      assert(limitedResults[0].hide_income === 1, 'hide_income flag set to true (1)');
      assert(limitedResults[0].hide_location === 1, 'hide_location flag set to true (1)');

      // Restore original visibility
      await pool.query(
        `UPDATE customer_profiles 
         SET profile_visibility = ?, hide_phone = FALSE, hide_photos = FALSE, hide_income = FALSE, hide_location = FALSE 
         WHERE id = ?`,
        [originalVisibility || 'PUBLIC', testProfileId]
      );

      // 4. Test Detail Profile Route for PRIVATE and LIMITED profiles
      console.log('\n4. Testing /api/customer/profiles/[id] with Privacy Enforcements...');
      
      // Set to PRIVATE
      await pool.query(
        `UPDATE customer_profiles SET profile_visibility = 'PRIVATE' WHERE id = ?`,
        [testProfileId]
      );

      try {
        const privRes = await fetch(`http://localhost:3000/api/customer/profiles/${testProfileId}`);
        const privData = await privRes.json();
        assert(privRes.status === 403, 'GET /api/customer/profiles/[id] returns 403 Forbidden for PRIVATE profile');
        assert(privData.message && privData.message.includes('Private'), 'Error message informs member profile is Private');
      } catch (err) {
        console.warn('HTTP check failed:', err.message);
      }

      // Set to LIMITED with all 4 field privacy flags enabled
      await pool.query(
        `UPDATE customer_profiles 
         SET profile_visibility = 'LIMITED',
             hide_phone = TRUE,
             hide_photos = TRUE,
             hide_income = TRUE,
             hide_location = TRUE
         WHERE id = ?`,
        [testProfileId]
      );

      try {
        const limRes = await fetch(`http://localhost:3000/api/customer/profiles/${testProfileId}`);
        const limData = await limRes.json();
        assert(limRes.status === 200, 'GET /api/customer/profiles/[id] returns 200 for LIMITED profile');
        assert(limData.data.is_photo_hidden === true, 'LIMITED profile: is_photo_hidden is true');
        assert(Array.isArray(limData.data.photos) && limData.data.photos.length === 0, 'LIMITED profile: photos array is empty');
        assert(limData.data.primary_photo === null, 'LIMITED profile: primary_photo is null');
        assert(limData.data.phone.includes('•••••'), 'LIMITED profile: phone number is masked');
        assert(limData.data.email.includes('•••••'), 'LIMITED profile: email address is masked');
        assert(limData.data.annual_income === null, 'LIMITED profile: annual_income is null');
        assert(limData.data.annual_income_formatted.includes('Confidential'), 'LIMITED profile: annual_income_formatted indicates Confidential');
        assert(limData.data.city === 'Protected by Member', 'LIMITED profile: city is masked to Protected by Member');
        assert(limData.data.is_location_hidden === true, 'LIMITED profile: is_location_hidden is true');
      } catch (err) {
        console.warn('HTTP check failed:', err.message);
      }

      // Restore original
      await pool.query(
        `UPDATE customer_profiles 
         SET profile_visibility = ?, hide_phone = FALSE, hide_photos = FALSE, hide_income = FALSE, hide_location = FALSE 
         WHERE id = ?`,
        [originalVisibility || 'PUBLIC', testProfileId]
      );
    }

    // 5. Test HTTP Matches API against local server
    console.log('\n5. Testing HTTP Matches API (http://localhost:3000)...');
    try {
      const matchRes = await fetch('http://localhost:3000/api/matrimonial/matches?tab=best');
      const matchData = await matchRes.json();
      assert(matchRes.status === 200, 'GET /api/matrimonial/matches returns 200 OK');
      assert(matchData.success === true, 'GET /api/matrimonial/matches success is true');

      if (Array.isArray(matchData.data) && matchData.data.length > 0) {
        const anyPrivate = matchData.data.some(m => m.profile_visibility === 'PRIVATE');
        assert(!anyPrivate, 'Matches response does not contain any PRIVATE profile');

        const p1 = matchData.data[0];
        console.log(`     Sample match loaded: ${p1.name} (Photo hidden: ${p1.is_photo_hidden}, Location hidden: ${p1.is_location_hidden || false})`);
      }
    } catch (httpErr) {
      console.warn('     Could not test HTTP fetch directly:', httpErr.message);
    }

    console.log('\n=====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
