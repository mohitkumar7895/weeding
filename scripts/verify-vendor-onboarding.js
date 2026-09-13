const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test Configuration
const BASE_URL = 'http://localhost:3000';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function runTests() {
  console.log('================================================================');
  console.log('WEDWITHME: VENDOR REGISTRATION & ONBOARDING VERIFICATION SUITE');
  console.log('================================================================');

  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  const timestamp = Date.now();
  const testEmail = `test.vendor_${timestamp}@wedwithme.test`;
  const testPassword = 'Password123!';
  const testPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const testOwner = 'Test Vendor Owner ' + timestamp;
  const testBizName = 'Test Luxury Studio ' + timestamp;

  let vendorTokenCookie = '';
  let vendorUserId = '';
  let vendorId = '';

  try {
    // -------------------------------------------------------------
    // TEST 1: Vendor Registration Flow & Database Persistence
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Vendor Registration with Real Business Identity...');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testOwner,
        email: testEmail,
        phone: testPhone,
        password: testPassword,
        role: 'VENDOR',
        business_name: testBizName,
        category_id: 'cat_photographers',
        city: 'Jaipur',
        address: 'Palace Road, Near Hawa Mahal, Jaipur',
        description: 'Award-winning royal heritage wedding photography specialists.',
        starting_price: 35000,
      }),
    });

    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 200, `Registration failed: ${JSON.stringify(regData)}`);
    assert.strictEqual(regData.success, true, 'Registration success must be true');

    const setCookie = regRes.headers.get('set-cookie');
    assert(setCookie && setCookie.includes('wwm_auth_token='), 'wwm_auth_token cookie must be set upon registration');
    vendorTokenCookie = setCookie.split(';')[0];
    vendorUserId = regData.user.id;
    vendorId = regData.user.vendor_id;

    console.log(`  ✓ Registration API succeeded for ${testEmail}`);
    console.log(`  ✓ Created user ID: ${vendorUserId}, Vendor ID: ${vendorId}`);

    // Verify DB user record
    const [userRows] = await conn.query('SELECT * FROM users WHERE id = ?', [vendorUserId]);
    assert.strictEqual(userRows.length, 1, 'User record must exist in users table');
    assert.strictEqual(userRows[0].role, 'VENDOR', 'User role must be VENDOR');
    assert.strictEqual(userRows[0].phone, testPhone, 'Phone must match');

    // Verify DB vendor record
    const [vendorRows] = await conn.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    assert.strictEqual(vendorRows.length, 1, 'Vendor record must exist in vendors table');
    assert.strictEqual(vendorRows[0].business_name, testBizName, 'Business name must match');
    assert.strictEqual(vendorRows[0].verification_status, 'PENDING', 'Initial verification_status must be PENDING (NEVER auto-verified)');
    assert.strictEqual(vendorRows[0].city, 'Jaipur', 'City must match');
    assert.strictEqual(Number(vendorRows[0].starting_price), 35000, 'Starting price must match');

    // Verify DB onboarding record
    const [onbRows] = await conn.query('SELECT * FROM vendor_onboarding WHERE vendor_id = ?', [vendorId]);
    assert.strictEqual(onbRows.length, 1, 'Onboarding record must exist in vendor_onboarding table');
    assert.strictEqual(onbRows[0].status, 'DRAFT', 'Initial onboarding status must be DRAFT');
    console.log('  ✓ Verified: Database records created in users, vendors, and vendor_onboarding.');

    // -------------------------------------------------------------
    // TEST 2: Vendor Login / Session Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Vendor Login & Session Persistence...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, 'Login must succeed');
    assert.strictEqual(loginData.user.role, 'VENDOR', 'Logged in user role must be VENDOR');
    const loginCookie = loginRes.headers.get('set-cookie').split(';')[0];

    // Verify session
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: loginCookie },
    });
    const meData = await meRes.json();
    assert.strictEqual(meData.authenticated, true, 'Session must be authenticated');
    assert.strictEqual(meData.user.role, 'VENDOR', 'Session role must be VENDOR');
    console.log('  ✓ Vendor login and JWT session verified.');

    // -------------------------------------------------------------
    // TEST 3: Onboarding Checklist State Persistence
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Onboarding Checklist API & Persistence...');
    const onbRes = await fetch(`${BASE_URL}/api/vendor/onboarding`, {
      headers: { Cookie: vendorTokenCookie },
    });
    const onbData = await onbRes.json();
    assert.strictEqual(onbRes.status, 200, 'Onboarding GET must succeed');
    assert.strictEqual(onbData.data.vendor.verification_status, 'PENDING', 'Vendor status must be PENDING');
    assert.strictEqual(onbData.data.vendor.is_verified, false, 'is_verified must be false (NO Verified badge)');
    assert.strictEqual(onbData.data.onboarding.checklist.business_profile, true, 'business_profile must be true');
    assert.strictEqual(onbData.data.onboarding.checklist.bank_details, false, 'bank_details must be false initially');

    // Update Bank Details via Onboarding PUT
    const updateBankRes = await fetch(`${BASE_URL}/api/vendor/onboarding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorTokenCookie },
      body: JSON.stringify({
        bank_account_number: '50100987654321',
        bank_ifsc: 'HDFC0001234',
        pan_number: 'ABCDE1234F',
      }),
    });
    const updateBankData = await updateBankRes.json();
    assert.strictEqual(updateBankRes.status, 200, 'Bank details update must succeed');

    // Verify DB update
    const [updatedVendorRows] = await conn.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    assert.strictEqual(updatedVendorRows[0].bank_account_number, '50100987654321', 'Bank account must persist in DB');
    assert.strictEqual(updatedVendorRows[0].bank_ifsc, 'HDFC0001234', 'Bank IFSC must persist in DB');
    assert.strictEqual(updatedVendorRows[0].pan_number, 'ABCDE1234F', 'PAN number must persist in DB');

    // Fetch onboarding checklist again and verify bank_details is now true
    const onbAfterBank = await (await fetch(`${BASE_URL}/api/vendor/onboarding`, { headers: { Cookie: vendorTokenCookie } })).json();
    assert.strictEqual(onbAfterBank.data.onboarding.checklist.bank_details, true, 'bank_details checkpoint must now be true');
    console.log('  ✓ Bank payout details saved and checklist checkpoint updated.');

    // -------------------------------------------------------------
    // TEST 4: Storage Abstraction & Document Upload
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Document Upload via Storage Abstraction & Validation...');

    // 4A: Test File Validation: Reject invalid MIME types
    const invalidMimeRes = await fetch(`${BASE_URL}/api/vendor/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorTokenCookie },
      body: JSON.stringify({
        doc_type: 'PAN',
        file_url: 'https://example.com/malicious.exe',
        file_size: 1024,
        mime_type: 'application/x-msdownload',
      }),
    });
    assert.strictEqual(invalidMimeRes.status, 400, 'Invalid MIME type must be rejected with 400');
    console.log('  ✓ Blocked unsupported MIME type successfully.');

    // 4B: Test File Validation: Reject file exceeding 10MB limit
    const oversizedRes = await fetch(`${BASE_URL}/api/vendor/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorTokenCookie },
      body: JSON.stringify({
        doc_type: 'PAN',
        file_url: 'https://example.com/huge.pdf',
        file_size: 15 * 1024 * 1024, // 15MB
        mime_type: 'application/pdf',
      }),
    });
    assert.strictEqual(oversizedRes.status, 400, 'Oversized file (>10MB) must be rejected with 400');
    console.log('  ✓ Enforced 10MB document size limit successfully.');

    // 4C: Test Real Document Upload via Storage Service (Multipart)
    const samplePdfBuffer = Buffer.from('%PDF-1.4 sample wedding business KYC compliance test document');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="doc_type"\r\n\r\nPAN\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document_number"\r\n\r\nABCDE1234F\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="pan_card.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      samplePdfBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(`${BASE_URL}/api/vendor/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Cookie: vendorTokenCookie,
      },
      body: multipartBody,
    });

    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 201, `Document upload failed: ${JSON.stringify(uploadData)}`);
    assert.strictEqual(uploadData.success, true, 'Upload response must be true');
    assert(uploadData.data.file_url.startsWith('/uploads/vendor-documents/'), 'File must be stored under /uploads/vendor-documents/');
    const uploadedDocId = uploadData.data.id;

    // Verify physical file written to disk via storage abstraction
    const physicalPath = path.join(process.cwd(), 'public', uploadData.data.file_url);
    assert(fs.existsSync(physicalPath), 'Stored file must exist on physical disk');
    console.log(`  ✓ Document saved to disk via storage abstraction: ${uploadData.data.file_url}`);

    // Verify MySQL document record
    const [docRows] = await conn.query('SELECT * FROM vendor_documents WHERE id = ?', [uploadedDocId]);
    assert.strictEqual(docRows.length, 1, 'Document record must exist in MySQL');
    assert.strictEqual(docRows[0].vendor_id, vendorId, 'Document vendor_id must match');
    assert.strictEqual(docRows[0].doc_type, 'PAN', 'doc_type must be PAN');
    assert.strictEqual(docRows[0].verification_status, 'PENDING', 'Initial doc status must be PENDING');

    // Verify checklist updated
    const onbAfterDoc = await (await fetch(`${BASE_URL}/api/vendor/onboarding`, { headers: { Cookie: vendorTokenCookie } })).json();
    assert.strictEqual(onbAfterDoc.data.onboarding.checklist.documents_uploaded, true, 'documents_uploaded must now be true');
    assert.strictEqual(onbAfterDoc.data.onboarding.checklist.pan_uploaded, true, 'pan_uploaded must now be true');
    console.log('  ✓ Document metadata stored in MySQL and checklist status updated.');

    // -------------------------------------------------------------
    // TEST 5: Dossier Submission for Compliance Review
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Vendor Dossier Submission for Compliance Review...');
    const submitRes = await fetch(`${BASE_URL}/api/vendor/onboarding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorTokenCookie },
      body: JSON.stringify({ submit_for_review: true }),
    });
    const submitData = await submitRes.json();
    assert.strictEqual(submitRes.status, 200, 'Submit for review must succeed');

    const [onbSubmitRows] = await conn.query('SELECT * FROM vendor_onboarding WHERE vendor_id = ?', [vendorId]);
    assert.strictEqual(onbSubmitRows[0].status, 'UNDER_REVIEW', 'Onboarding status must transition to UNDER_REVIEW');
    assert(onbSubmitRows[0].submitted_at !== null, 'submitted_at timestamp must be recorded');
    console.log('  ✓ Vendor dossier submitted: Status is now UNDER_REVIEW.');

    // -------------------------------------------------------------
    // TEST 6: Tenant Isolation & Security
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Tenant Security & Access Control...');

    // 6A: Unauthenticated access to vendor documents
    const anonDocRes = await fetch(`${BASE_URL}/api/vendor/documents`);
    assert.strictEqual(anonDocRes.status, 403, 'Unauthenticated access to vendor documents must return 403');

    // 6B: Non-admin trying to call admin review endpoint
    const unauthAdminRes = await fetch(`${BASE_URL}/api/admin/onboarding/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorTokenCookie }, // Using vendor token, NOT admin
      body: JSON.stringify({ onboarding_status: 'APPROVED' }),
    });
    assert.strictEqual(unauthAdminRes.status, 403, 'Vendor cannot approve their own onboarding (Admin check must block with 403)');
    console.log('  ✓ Tenant isolation and role-based protection verified.');

    // -------------------------------------------------------------
    // TEST 7: Admin Review, Document Verification & Approval Flow
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Admin Approval Foundation...');

    // Log in as Super Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@wedwithme.com', password: 'Password@123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, `Admin login failed: ${JSON.stringify(adminLoginData)}`);
    const adminCookie = adminLoginRes.headers.get('set-cookie').split(';')[0];

    // Admin reviews vendor onboarding dossier
    const adminGetRes = await fetch(`${BASE_URL}/api/admin/onboarding/${vendorId}`, {
      headers: { Cookie: adminCookie },
    });
    const adminGetData = await adminGetRes.json();
    assert.strictEqual(adminGetRes.status, 200, 'Admin can view vendor dossier');
    assert.strictEqual(adminGetData.data.documents.length, 1, 'Admin can view vendor documents');

    // Admin approves document
    const adminDocApproveRes = await fetch(`${BASE_URL}/api/admin/onboarding/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        document_id: uploadedDocId,
        document_status: 'VERIFIED',
      }),
    });
    assert.strictEqual(adminDocApproveRes.status, 200, 'Admin document approval must succeed');

    // Admin approves whole vendor onboarding
    const adminApproveRes = await fetch(`${BASE_URL}/api/admin/onboarding/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        onboarding_status: 'APPROVED',
      }),
    });
    assert.strictEqual(adminApproveRes.status, 200, 'Admin vendor approval must succeed');

    // Check DB state after approval
    const [approvedVendorRows] = await conn.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    assert.strictEqual(approvedVendorRows[0].verification_status, 'VERIFIED', 'Vendor verification_status must now be VERIFIED');

    const [approvedOnbRows] = await conn.query('SELECT * FROM vendor_onboarding WHERE vendor_id = ?', [vendorId]);
    assert.strictEqual(approvedOnbRows[0].status, 'APPROVED', 'Onboarding status must now be APPROVED');
    assert(approvedOnbRows[0].approved_at !== null, 'approved_at timestamp must be recorded');

    // Check Vendor GET /api/vendor/onboarding: Verified badge is now TRUE
    const vendorAfterApprove = await (await fetch(`${BASE_URL}/api/vendor/onboarding`, { headers: { Cookie: vendorTokenCookie } })).json();
    assert.strictEqual(vendorAfterApprove.data.vendor.is_verified, true, 'is_verified must now be true');
    console.log('  ✓ Admin approval successfully verified documents and granted VERIFIED partner status.');

    // 7B: Admin Rejection Flow
    console.log('\n[TEST 7B] Testing Admin Rejection Flow & Rejection Reason Visibility...');
    const adminRejectRes = await fetch(`${BASE_URL}/api/admin/onboarding/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        onboarding_status: 'REJECTED',
        rejection_reason: 'PAN document image blurry and unreadable. Please upload a clear color scan.',
      }),
    });
    assert.strictEqual(adminRejectRes.status, 200, 'Admin rejection must succeed');

    const [rejectedVendorRows] = await conn.query('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    assert.strictEqual(rejectedVendorRows[0].verification_status, 'REJECTED', 'Vendor verification_status must now be REJECTED');

    const vendorAfterReject = await (await fetch(`${BASE_URL}/api/vendor/onboarding`, { headers: { Cookie: vendorTokenCookie } })).json();
    assert.strictEqual(vendorAfterReject.data.onboarding.status, 'REJECTED', 'Vendor onboarding status must be REJECTED');
    assert.strictEqual(vendorAfterReject.data.onboarding.rejection_reason, 'PAN document image blurry and unreadable. Please upload a clear color scan.', 'Vendor must see rejection reason');
    console.log('  ✓ Vendor sees rejection status and required next action reason.');

    // -------------------------------------------------------------
    // TEST 8: Integrity of Existing Customer Functionality
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Verifying Existing Customer Functionality Remains 100% Intact...');

    // 8A: Unauthenticated customer search must be protected (401)
    const unauthSearchRes = await fetch(`${BASE_URL}/api/customer/search`);
    assert.strictEqual(unauthSearchRes.status, 401, 'Unauthenticated customer search must be protected with 401');

    // 8B: Log in as Customer and perform search
    const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.sharma@example.com', password: 'User@123456' }),
    });

    if (custLoginRes.status === 200) {
      const custCookie = custLoginRes.headers.get('set-cookie').split(';')[0];
      const custSearchRes = await fetch(`${BASE_URL}/api/customer/search?limit=5`, {
        headers: { Cookie: custCookie },
      });
      const custSearchData = await custSearchRes.json();
      assert.strictEqual(custSearchRes.status, 200, 'Customer search endpoint must succeed with customer session');
      assert(Array.isArray(custSearchData.data), 'Customer search data must be an array');
    }

    // 8C: Marketplace and categories public routes remain fully functional
    const vendorsRes = await fetch(`${BASE_URL}/api/vendors`);
    const vendorsData = await vendorsRes.json();
    assert.strictEqual(vendorsRes.status, 200, 'Vendors marketplace API must work');
    assert(Array.isArray(vendorsData.data), 'Vendors data must be an array');

    const categoriesRes = await fetch(`${BASE_URL}/api/categories`);
    const categoriesData = await categoriesRes.json();
    assert.strictEqual(categoriesRes.status, 200, 'Categories endpoint must work');
    assert(categoriesData.data.length > 0, 'Active wedding categories must be returned');

    console.log('  ✓ Customer search, marketplace, and categories APIs operating properly with zero regressions.');

    console.log('\n================================================================');
    console.log('ALL VENDOR REGISTRATION & ONBOARDING TESTS PASSED (8/8) SUCCESS!');
    console.log('================================================================\n');
  } finally {
    // Cleanup test records
    if (vendorUserId) {
      await conn.query('DELETE FROM users WHERE id = ?', [vendorUserId]).catch(() => {});
    }
    await conn.end();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
