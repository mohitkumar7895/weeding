const mysql = require('mysql2/promise');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runSuite() {
  console.log('================================================================');
  console.log('WEDWITHME: VENDOR BUSINESS PROFILE VERIFICATION SUITE');
  console.log('================================================================');

  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  const timestamp = Date.now();
  const testEmailA = `vendor.alpha_${timestamp}@wedwithme.test`;
  const testEmailB = `vendor.beta_${timestamp}@wedwithme.test`;
  const testPassword = 'Password123!';
  const testPhoneA = '91' + Math.floor(10000000 + Math.random() * 90000000);
  const testPhoneB = '92' + Math.floor(10000000 + Math.random() * 90000000);

  let vendorCookieA = '';
  let vendorUserIdA = '';
  let vendorIdA = '';

  let vendorCookieB = '';
  let vendorUserIdB = '';
  let vendorIdB = '';

  try {
    // -------------------------------------------------------------
    // TEST 1: Vendor Registration & Baseline Setup
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Vendor Registration & Database Profile Persistence...');
    const regResA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alpha Photographer Owner ' + timestamp,
        email: testEmailA,
        phone: testPhoneA,
        password: testPassword,
        role: 'VENDOR',
        business_name: 'Royal Heritage Studios ' + timestamp,
        category_id: 'cat_photographers',
        city: 'Jaipur',
        address: '12 Palace View Road, Jaipur',
        description: 'Heritage royal wedding photography and cinematography.',
        starting_price: 30000,
      }),
    });

    const regDataA = await regResA.json();
    assert.strictEqual(regResA.status, 200, `Vendor A registration failed: ${JSON.stringify(regDataA)}`);
    vendorCookieA = regResA.headers.get('set-cookie').split(';')[0];
    vendorUserIdA = regDataA.user.id;
    vendorIdA = regDataA.user.vendor_id;

    // Verify DB baseline
    const [vRows] = await conn.query('SELECT * FROM vendors WHERE id = ?', [vendorIdA]);
    assert.strictEqual(vRows.length, 1, 'Vendor A must exist in vendors table');
    assert.strictEqual(vRows[0].verification_status, 'PENDING', 'Initial verification status must be PENDING');
    assert.strictEqual(vRows[0].city, 'Jaipur', 'City must match');

    // Verify vendor_categories baseline
    const [vcRows] = await conn.query('SELECT * FROM vendor_categories WHERE vendor_id = ?', [vendorIdA]);
    assert(vcRows.length >= 1, 'Primary category must be mapped in vendor_categories');
    assert.strictEqual(vcRows[0].category_id, 'cat_photographers', 'Category must be cat_photographers');
    console.log('  ✓ Vendor A registered and baseline records stored in MySQL.');

    // -------------------------------------------------------------
    // TEST 2: Authenticated Fetch via GET /api/vendor/profile
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Authenticated GET /api/vendor/profile...');
    const getProfileRes = await fetch(`${BASE_URL}/api/vendor/profile`, {
      headers: { Cookie: vendorCookieA },
    });
    const getProfileData = await getProfileRes.json();
    assert.strictEqual(getProfileRes.status, 200, 'GET /api/vendor/profile must return 200');
    assert.strictEqual(getProfileData.success, true, 'Response must be success');

    const profile = getProfileData.data;
    assert.strictEqual(profile.id, vendorIdA, 'Profile ID must match vendorIdA');
    assert.strictEqual(profile.city, 'Jaipur', 'City must be Jaipur');
    assert.strictEqual(profile.category_id, 'cat_photographers', 'Primary category ID must match');
    assert.strictEqual(profile.verification_status, 'PENDING', 'Verification status must be PENDING');
    assert.strictEqual(profile.is_verified, false, 'is_verified must be false');
    assert(Array.isArray(profile.categories), 'Categories must be an array');
    assert(Array.isArray(profile.service_area_cities), 'Service area cities must be an array');
    console.log('  ✓ Vendor profile fetched with categories, structured location, and KYC state.');

    // -------------------------------------------------------------
    // TEST 3: Business Profile Update via PUT /api/vendor/profile
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Business Profile Update with Multi-Category & Coverage...');
    const updatedName = 'Royal Palace Cinematography ' + timestamp;
    const updateRes = await fetch(`${BASE_URL}/api/vendor/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorCookieA },
      body: JSON.stringify({
        business_name: updatedName,
        category_id: 'cat_photographers',
        additional_category_ids: ['cat_decorators', 'cat_venues'],
        description: 'Elite royal destination wedding cinematography and mandap decor coverage.',
        starting_price: 55000,
        experience_years: 9,
        year_established: 2015,
        country: 'India',
        state: 'Rajasthan',
        city: 'Jaipur',
        pincode: '302001',
        address: '42 Royal Crescent, Near Jal Mahal, Jaipur',
        service_radius_km: 180,
        service_area_cities: ['Jaipur', 'Udaipur', 'Jodhpur', 'Delhi NCR'],
        travels_to_venue: true,
        business_phone: '+91 98290 99887',
        business_email: 'bookings@royalpalacestudios.com',
        website_url: 'https://royalpalacestudios.com',
        instagram_handle: '@royalpalace_weddings',
      }),
    });

    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200, `Profile update failed: ${JSON.stringify(updateData)}`);
    assert.strictEqual(updateData.success, true, 'Update success must be true');

    // Verify MySQL persistence
    const [updatedRows] = await conn.query('SELECT * FROM vendors WHERE id = ?', [vendorIdA]);
    assert.strictEqual(updatedRows[0].business_name, updatedName, 'Business name must persist');
    assert.strictEqual(updatedRows[0].state, 'Rajasthan', 'State must persist');
    assert.strictEqual(updatedRows[0].pincode, '302001', 'Pincode must persist');
    assert.strictEqual(updatedRows[0].service_radius_km, 180, 'Service radius must persist');
    assert.strictEqual(Number(updatedRows[0].starting_price), 55000, 'Starting price must persist');
    assert.strictEqual(updatedRows[0].experience_years, 9, 'Experience years must persist');
    assert.strictEqual(updatedRows[0].year_established, 2015, 'Year established must persist');
    assert.strictEqual(updatedRows[0].business_phone, '+91 98290 99887', 'Business phone must persist');
    assert.strictEqual(updatedRows[0].business_email, 'bookings@royalpalacestudios.com', 'Business email must persist');
    assert.strictEqual(updatedRows[0].website_url, 'https://royalpalacestudios.com', 'Website must persist');
    assert.strictEqual(updatedRows[0].instagram_handle, '@royalpalace_weddings', 'Instagram must persist');

    // Verify multi-category relationships in vendor_categories
    const [savedCats] = await conn.query(
      'SELECT category_id, is_primary FROM vendor_categories WHERE vendor_id = ? ORDER BY category_id',
      [vendorIdA]
    );
    assert.strictEqual(savedCats.length, 3, 'Must have 3 categories mapped');
    const catMap = Object.fromEntries(savedCats.map((c) => [c.category_id, c.is_primary]));
    assert.strictEqual(catMap['cat_photographers'], 1, 'cat_photographers must be primary');
    assert.strictEqual(catMap['cat_decorators'], 0, 'cat_decorators must be secondary');
    assert.strictEqual(catMap['cat_venues'], 0, 'cat_venues must be secondary');

    // Verify onboarding checklist updated
    const [onbRows] = await conn.query('SELECT checklist_json FROM vendor_onboarding WHERE vendor_id = ?', [vendorIdA]);
    const checklist = typeof onbRows[0].checklist_json === 'string' ? JSON.parse(onbRows[0].checklist_json) : onbRows[0].checklist_json;
    assert.strictEqual(checklist.business_profile, true, 'Checklist business_profile must be true');

    console.log('  ✓ Verified MySQL persistence of all structured profile, category, and location fields.');

    // -------------------------------------------------------------
    // TEST 4: Tamper Resistance (Vendor Cannot Self-Verify)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Tamper Resistance: Blocking Self-Verification & Rating Forgery...');
    const tamperRes = await fetch(`${BASE_URL}/api/vendor/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorCookieA },
      body: JSON.stringify({
        verification_status: 'VERIFIED',
        rating: 5.0,
        review_count: 999,
        is_featured: true,
      }),
    });

    const [afterTamperRows] = await conn.query('SELECT verification_status, rating, review_count FROM vendors WHERE id = ?', [vendorIdA]);
    assert.strictEqual(afterTamperRows[0].verification_status, 'PENDING', 'verification_status must remain PENDING (tampering blocked)');
    assert(Number(afterTamperRows[0].rating) < 5.0, 'Rating tampering must be ignored');
    console.log('  ✓ Enforced tamper resistance: Vendor cannot forge VERIFIED status or ratings.');

    // -------------------------------------------------------------
    // TEST 5: Tenant Isolation & Security
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Tenant Isolation & Access Control...');
    // Register Vendor B
    const regResB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Beta Vendor Owner ' + timestamp,
        email: testEmailB,
        phone: testPhoneB,
        password: testPassword,
        role: 'VENDOR',
        business_name: 'Beta Caterers ' + timestamp,
        category_id: 'cat_caterers',
        city: 'Delhi NCR',
        address: 'Connaught Place, New Delhi',
        description: 'Gourmet wedding catering.',
        starting_price: 25000,
      }),
    });
    const regDataB = await regResB.json();
    vendorCookieB = regResB.headers.get('set-cookie').split(';')[0];
    vendorUserIdB = regDataB.user.id;
    vendorIdB = regDataB.user.vendor_id;

    // Vendor B fetches /api/vendor/profile -> MUST return Vendor B's data, NOT Vendor A
    const bProfileRes = await fetch(`${BASE_URL}/api/vendor/profile`, {
      headers: { Cookie: vendorCookieB },
    });
    const bProfileData = await bProfileRes.json();
    assert.strictEqual(bProfileData.data.id, vendorIdB, 'Vendor B must receive their own profile ID');
    assert.strictEqual(bProfileData.data.city, 'Delhi NCR', 'Vendor B must receive their own city');

    // Unauthenticated access to /api/vendor/profile
    const unauthRes = await fetch(`${BASE_URL}/api/vendor/profile`);
    assert.strictEqual(unauthRes.status, 403, 'Unauthenticated profile request must return 403');
    console.log('  ✓ Tenant isolation verified: Vendor profiles are strictly partitioned per authenticated session.');

    // -------------------------------------------------------------
    // TEST 6: Public Profile Readiness & Unapproved Gating
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Public Profile Readiness & Unapproved Gating...');

    // 6A: Vendor A is PENDING -> Public request to /api/vendors/${vendorIdA} must return 404
    const anonRes = await fetch(`${BASE_URL}/api/vendors/${vendorIdA}`);
    assert.strictEqual(anonRes.status, 404, 'Unapproved vendor must NOT be accessible publicly (404 expected)');
    console.log('  ✓ Gated unapproved vendor from public discovery.');

    // 6B: Log in as Admin and approve Vendor A's profile
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@wedwithme.com', password: 'Password@123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, `Admin login failed: ${JSON.stringify(adminLoginData)}`);
    const adminCookie = adminLoginRes.headers.get('set-cookie').split(';')[0];

    // Admin approves vendor profile
    const adminApproveRes = await fetch(`${BASE_URL}/api/admin/vendors/${vendorIdA}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        verification_status: 'VERIFIED',
        profile_status: 'APPROVED',
      }),
    });
    const adminApproveData = await adminApproveRes.json();
    assert.strictEqual(adminApproveRes.status, 200, `Admin approval failed: ${JSON.stringify(adminApproveData)}`);

    // 6C: Now request /api/vendors/${vendorIdA} publicly as anonymous user
    const publicApprovedRes = await fetch(`${BASE_URL}/api/vendors/${vendorIdA}`);
    assert.strictEqual(publicApprovedRes.status, 200, 'Approved vendor must be accessible publicly');
    const publicData = await publicApprovedRes.json();
    assert.strictEqual(publicData.success, true);
    assert.strictEqual(publicData.data.is_verified, true, 'is_verified must be true');
    assert.strictEqual(publicData.data.categories.length, 3, 'Categories list must be included');
    assert(Array.isArray(publicData.data.service_area_cities), 'Service area cities must be returned');

    // 6D: Verify zero privacy leakage of sensitive financial/KYC data
    assert.strictEqual(publicData.data.pan_number, undefined, 'PAN number must NOT leak in public profile');
    assert.strictEqual(publicData.data.gst_number, undefined, 'GST number must NOT leak in public profile');
    assert.strictEqual(publicData.data.bank_account_number, undefined, 'Bank account must NOT leak in public profile');
    assert.strictEqual(publicData.data.bank_ifsc, undefined, 'Bank IFSC must NOT leak in public profile');
    console.log('  ✓ Public profile safely published with multi-categories, coverage, and zero KYC data leakage.');

    // -------------------------------------------------------------
    // TEST 7: Admin Moderation (Suspension & Rejection Flow)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Admin Moderation & Suspension Flow...');
    const adminSuspendRes = await fetch(`${BASE_URL}/api/admin/vendors/${vendorIdA}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        profile_status: 'SUSPENDED',
        verification_status: 'SUSPENDED',
        rejection_reason: 'Suspended pending compliance documentation audit',
      }),
    });
    assert.strictEqual(adminSuspendRes.status, 200, 'Admin suspension must succeed');

    // Public request is immediately blocked again
    const publicAfterSuspend = await fetch(`${BASE_URL}/api/vendors/${vendorIdA}`);
    assert.strictEqual(publicAfterSuspend.status, 404, 'Suspended vendor must NOT be accessible publicly');
    console.log('  ✓ Admin moderation suspension immediately hides profile from public view.');

    // -------------------------------------------------------------
    // TEST 8: Regression Suite Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Verifying Existing Categories, Search, and Customer Endpoints...');

    // Categories endpoint
    const catRes = await fetch(`${BASE_URL}/api/categories`);
    const catData = await catRes.json();
    assert.strictEqual(catRes.status, 200, '/api/categories must succeed');
    assert(catData.data.length >= 4, 'Active categories must be returned');

    // Public marketplace vendor listing
    const mktRes = await fetch(`${BASE_URL}/api/vendors`);
    const mktData = await mktRes.json();
    assert.strictEqual(mktRes.status, 200, '/api/vendors must succeed');
    assert(Array.isArray(mktData.data), 'Vendors array must be returned');

    // Customer search requires auth
    const searchRes = await fetch(`${BASE_URL}/api/customer/search`);
    assert.strictEqual(searchRes.status, 401, 'Unauthenticated customer search must return 401');

    console.log('  ✓ Zero regressions across existing categories, marketplace, and customer modules.');

    console.log('\n================================================================');
    console.log('ALL VENDOR BUSINESS PROFILE TESTS PASSED (8/8) SUCCESS!');
    console.log('================================================================\n');
  } finally {
    // Clean up test vendors
    if (vendorUserIdA) {
      await conn.query('DELETE FROM users WHERE id = ?', [vendorUserIdA]).catch(() => {});
    }
    if (vendorUserIdB) {
      await conn.query('DELETE FROM users WHERE id = ?', [vendorUserIdB]).catch(() => {});
    }
    await conn.end();
  }
}

runSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
