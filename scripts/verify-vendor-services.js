const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== Starting Vendor Services Management Verification Test Suite ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Helper: Parse cookie from response
    function getCookie(res) {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return '';
      return setCookie.split(';')[0];
    }

    // Helper: register vendor user
    async function registerVendor(name, email, businessName, categoryId) {
      const randomPhone = '91' + Math.floor(10000000 + Math.random() * 90000000);
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: randomPhone,
          password: 'Password@123',
          role: 'VENDOR',
          business_name: businessName,
          category_id: categoryId,
          city: 'Jaipur',
          address: '12 Palace View Road, Jaipur',
          description: 'Heritage royal wedding photography and cinematography.',
          starting_price: 30000,
        })
      });

      const data = await regRes.json();
      if (!regRes.ok) {
        throw new Error(`Vendor registration failed: ${JSON.stringify(data)}`);
      }
      const cookie = getCookie(regRes);
      return { cookie, user: data.user, vendorId: data.user.vendor_id };
    }

    // Helper: login admin
    async function loginAdmin() {
      const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@wedwithme.com', password: 'Password@123' }),
      });
      const data = await adminLoginRes.json();
      if (!adminLoginRes.ok) {
        throw new Error(`Admin login failed: ${JSON.stringify(data)}`);
      }
      return getCookie(adminLoginRes);
    }

    const timestamp = Date.now();
    const vendorAEmail = `vendor_srv_a_${timestamp}@wedwithme.com`;
    const vendorBEmail = `vendor_srv_b_${timestamp}@wedwithme.com`;

    // 1. Fetch categories
    console.log('1. Fetching platform categories...');
    const catRes = await fetch(`${BASE_URL}/api/categories`);
    const catJson = await catRes.json();
    assert(catJson.success && Array.isArray(catJson.data) && catJson.data.length > 0, 'Fetched platform categories successfully');
    const validCategory = catJson.data[0];
    console.log(`   Using category: ${validCategory.name} (${validCategory.id})`);

    // 2. Authenticate Vendor A
    console.log('\n2. Registering and authenticating Vendor A...');
    const vendorA = await registerVendor(
      'Aarav Mehta ' + timestamp,
      vendorAEmail,
      'Mehta Royal Lens ' + timestamp,
      validCategory.id
    );
    const cookieA = vendorA.cookie;
    const vendorAId = vendorA.vendorId;
    assert(!!cookieA && !!vendorAId, 'Vendor A registered and authenticated successfully');

    // 3. Fetch baseline services for Vendor A
    console.log('\n3. Testing GET /api/vendor/services for Vendor A...');
    const listRes1 = await fetch(`${BASE_URL}/api/vendor/services`, {
      headers: { Cookie: cookieA }
    });
    const listJson1 = await listRes1.json();
    assert(listJson1.success && Array.isArray(listJson1.data), 'GET /api/vendor/services returned 200 with array');

    // 4. Validation: Missing title, negative price, invalid category
    console.log('\n4. Testing input validation for service creation...');
    const invalidRes1 = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: '',
        starting_price: 15000,
        category_id: validCategory.id
      })
    });
    assert(invalidRes1.status === 400, 'POST /api/vendor/services rejected empty title with 400');

    const invalidRes2 = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Drone Cinematography',
        starting_price: -500,
        category_id: validCategory.id
      })
    });
    assert(invalidRes2.status === 400, 'POST /api/vendor/services rejected negative price with 400');

    const invalidRes3 = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Drone Cinematography',
        starting_price: 25000,
        category_id: 'non-existent-category-uuid'
      })
    });
    assert(invalidRes3.status === 400, 'POST /api/vendor/services rejected invalid category_id with 400');

    // 5. Create a valid service
    console.log('\n5. Testing valid service creation (POST /api/vendor/services)...');
    const createRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Cinematic 4K Wedding Drone Coverage',
        description: 'Dual operator 4K HDR aerial coverage for Baraat, Varmala, and outdoor rituals.',
        category_id: validCategory.id,
        starting_price: 35000,
        service_location: 'Jaipur & Delhi NCR'
      })
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201 && createJson.success, 'POST /api/vendor/services created service with 201');
    const createdService = createJson.data;
    assert(createdService.title === 'Cinematic 4K Wedding Drone Coverage', 'Created service title matches');
    assert(createdService.moderation_status === 'PENDING_REVIEW', 'Created service has moderation_status = PENDING_REVIEW');
    assert(createdService.is_active === true || createdService.is_active === 1, 'Created service defaults to is_active = true');
    assert(createdService.service_location === 'Jaipur & Delhi NCR', 'Created service saved custom service_location');
    assert(createdService.category_id === validCategory.id, 'Created service saved category_id');

    const serviceId = createdService.id;

    // Verify GET list includes category join
    const listRes2 = await fetch(`${BASE_URL}/api/vendor/services`, {
      headers: { Cookie: cookieA }
    });
    const listJson2 = await listRes2.json();
    const foundService = listJson2.data.find(s => s.id === serviceId);
    assert(!!foundService, 'Service retrieved in vendor service catalog');
    assert(foundService.category_name === validCategory.name, `Category joined correctly: ${foundService.category_name}`);

    // 6. Update service details (re-queues to PENDING_REVIEW)
    console.log('\n6. Testing PUT /api/vendor/services content update...');
    const updateRes1 = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: serviceId,
        title: 'Cinematic 4K Wedding Drone Coverage - Deluxe Edition',
        starting_price: 39999,
        description: 'Updated package: 2 drone operators + licensed FPV pilot.'
      })
    });
    const updateJson1 = await updateRes1.json();
    assert(updateJson1.success, 'PUT /api/vendor/services updated details successfully');
    assert(updateJson1.data.title === 'Cinematic 4K Wedding Drone Coverage - Deluxe Edition', 'Title updated');
    assert(updateJson1.data.moderation_status === 'PENDING_REVIEW', 'Moderation status remained/reverted to PENDING_REVIEW');

    // 7. Test block self-approval
    console.log('\n7. Testing security: Vendor cannot self-approve moderation_status...');
    const selfApproveRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: serviceId,
        moderation_status: 'APPROVED'
      })
    });
    const selfApproveJson = await selfApproveRes.json();
    assert(selfApproveJson.data?.moderation_status !== 'APPROVED', 'Vendor cannot self-approve; moderation_status is not APPROVED');

    // 8. Toggle active/inactive
    console.log('\n8. Testing pause / activate toggle...');
    const pauseRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: serviceId,
        is_active: false
      })
    });
    const pauseJson = await pauseRes.json();
    assert(pauseJson.success && (pauseJson.data.is_active === false || pauseJson.data.is_active === 0), 'Service successfully paused (is_active = false)');

    const resumeRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: serviceId,
        is_active: true
      })
    });
    const resumeJson = await resumeRes.json();
    assert(resumeJson.success && (resumeJson.data.is_active === true || resumeJson.data.is_active === 1), 'Service successfully reactivated (is_active = true)');

    // 9. Tenant Isolation: Vendor B cannot modify or delete Vendor A's service
    console.log('\n9. Testing tenant isolation: Vendor B cannot mutate Vendor A\'s service...');
    const vendorB = await registerVendor(
      'Rohan Sharma ' + timestamp,
      vendorBEmail,
      'Sharma Decorators ' + timestamp,
      validCategory.id
    );
    const cookieB = vendorB.cookie;
    assert(!!cookieB, 'Vendor B registered and authenticated successfully');

    const unauthorizedEditRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({
        id: serviceId,
        title: 'Hacked by Vendor B'
      })
    });
    assert(unauthorizedEditRes.status === 404, 'Vendor B PUT on Vendor A\'s service rejected with 404');

    const unauthorizedDelRes = await fetch(`${BASE_URL}/api/vendor/services?id=${serviceId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB }
    });
    assert(unauthorizedDelRes.status === 404, 'Vendor B DELETE on Vendor A\'s service rejected with 404');

    // 10. Admin Moderation & Public Discovery Gating
    console.log('\n10. Testing Admin Moderation and Public Discovery Gating...');
    // Unapproved service must NOT appear in public storefront
    const publicRes1 = await fetch(`${BASE_URL}/api/vendors/${vendorAId}`);
    const publicJson1 = await publicRes1.json();
    const publicServicesBefore = publicJson1.data?.services || [];
    const isServiceVisibleBefore = publicServicesBefore.some(s => s.id === serviceId);
    assert(!isServiceVisibleBefore, 'Unapproved service is HIDDEN from unauthenticated public discovery');

    // Authenticate Admin
    const cookieAdmin = await loginAdmin();
    assert(!!cookieAdmin, 'Admin authenticated successfully');

    // Admin approves the service
    console.log('   Admin approves service via PUT /api/admin/services/[id]...');
    const approveRes = await fetch(`${BASE_URL}/api/admin/services/${serviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
      body: JSON.stringify({
        moderation_status: 'APPROVED'
      })
    });
    const approveJson = await approveRes.json();
    assert(approveRes.status === 200 && approveJson.success, 'Admin service approval succeeded with 200');

    // Also approve Vendor A's onboarding so the vendor storefront can be viewed publicly
    await fetch(`${BASE_URL}/api/admin/onboarding/${vendorAId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
      body: JSON.stringify({ onboarding_status: 'APPROVED' })
    });

    // Public discovery check now
    const publicRes2 = await fetch(`${BASE_URL}/api/vendors/${vendorAId}`);
    const publicJson2 = await publicRes2.json();
    const publicServicesAfter = publicJson2.data?.services || [];
    const approvedPublicService = publicServicesAfter.find(s => s.id === serviceId);
    assert(!!approvedPublicService, 'Approved active service is now VISIBLE in public storefront');
    if (approvedPublicService) {
      assert(approvedPublicService.category_name === validCategory.name, 'Public service includes joined category name');
    }

    // Now test Admin Rejection Flow
    console.log('\n11. Testing Admin Rejection with feedback reason...');
    const rejectRes = await fetch(`${BASE_URL}/api/admin/services/${serviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieAdmin },
      body: JSON.stringify({
        moderation_status: 'REJECTED',
        rejection_reason: 'Please specify drone FAA/DGCA permit number and delivery timeline in days.'
      })
    });
    const rejectJson = await rejectRes.json();
    assert(rejectJson.success, 'Admin rejected service with reason successfully');

    // Vendor A checks service in dashboard
    const listRes3 = await fetch(`${BASE_URL}/api/vendor/services`, { headers: { Cookie: cookieA } });
    const listJson3 = await listRes3.json();
    const rejectedServiceInDash = listJson3.data.find(s => s.id === serviceId);
    assert(rejectedServiceInDash.moderation_status === 'REJECTED', 'Vendor sees moderation_status = REJECTED');
    assert(rejectedServiceInDash.rejection_reason.includes('DGCA permit'), 'Vendor sees rejection_reason message');

    // Public storefront should NOT show rejected service
    const publicRes3 = await fetch(`${BASE_URL}/api/vendors/${vendorAId}`);
    const publicJson3 = await publicRes3.json();
    const isVisibleAfterReject = (publicJson3.data?.services || []).some(s => s.id === serviceId);
    assert(!isVisibleAfterReject, 'Rejected service is IMMEDIATELY HIDDEN from public storefront');

    // 12. Delete service
    console.log('\n12. Testing DELETE /api/vendor/services?id=...');
    const delRes = await fetch(`${BASE_URL}/api/vendor/services?id=${serviceId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA }
    });
    const delJson = await delRes.json();
    assert(delRes.status === 200 && delJson.success, 'DELETE /api/vendor/services deleted service with 200');

    // Verify gone
    const listRes4 = await fetch(`${BASE_URL}/api/vendor/services`, { headers: { Cookie: cookieA } });
    const listJson4 = await listRes4.json();
    const existsAfterDel = listJson4.data.some(s => s.id === serviceId);
    assert(!existsAfterDel, 'Deleted service no longer exists in vendor catalog');

    console.log(`\n=== Verification Complete: ${passed} Passed, ${failed} Failed ===\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test Suite Exception:', error);
    process.exit(1);
  }
}

runTests();
