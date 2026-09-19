const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== Starting Vendor Packages & Optional Add-ons Verification Test Suite ===\n');
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
          city: 'Udaipur',
          address: '88 Lake Palace Road, Udaipur',
          description: 'Premier heritage royal wedding photography and cinematography.',
          starting_price: 35000,
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
    const vendorAEmail = `vendor_pkg_a_${timestamp}@wedwithme.com`;
    const vendorBEmail = `vendor_pkg_b_${timestamp}@wedwithme.com`;

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
      'Kabir Sharma ' + timestamp,
      vendorAEmail,
      'Sharma Royal Studios ' + timestamp,
      validCategory.id
    );
    const cookieA = vendorA.cookie;
    const vendorAId = vendorA.vendorId;
    assert(!!cookieA && !!vendorAId, 'Vendor A registered and authenticated with ID: ' + vendorAId);

    // 3. Create a service for Vendor A
    console.log('\n3. Creating wedding service for Vendor A...');
    const createSrvRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Full Day Royal Wedding Photography & Film',
        category_id: validCategory.id,
        starting_price: 35000,
        location: 'Udaipur, Rajasthan',
        description: 'Comprehensive candid and traditional wedding coverage for high-end ceremonies.'
      })
    });
    const createSrvJson = await createSrvRes.json();
    assert(createSrvRes.ok && createSrvJson.success && createSrvJson.data?.id, 'Created wedding service for Vendor A');
    const serviceId = createSrvJson.data.id;
    console.log(`   Service ID: ${serviceId}`);

    // 4. Test Package Validation (Negative price & empty name)
    console.log('\n4. Testing Package Creation Validation...');
    const invalidPriceRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Invalid Price Package',
        package_tier: 'BASIC',
        price: -5000,
        service_id: serviceId,
        description: 'Should fail with negative price'
      })
    });
    assert(invalidPriceRes.status === 400, 'Rejected package creation with negative price (400 Bad Request)');

    const invalidNameRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: '',
        package_tier: 'BASIC',
        price: 25000,
        service_id: serviceId,
        description: 'Should fail with empty name'
      })
    });
    assert(invalidNameRes.status === 400, 'Rejected package creation with empty name (400 Bad Request)');

    // 5. Create BASIC, STANDARD, and PREMIUM packages
    console.log('\n5. Creating BASIC, STANDARD, and PREMIUM packages for Vendor A...');
    
    // 5a. BASIC package
    const basicRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Silver Ceremony Package',
        package_tier: 'BASIC',
        price: 35000,
        guest_capacity: 150,
        service_id: serviceId,
        description: 'Essential wedding day ceremony coverage with single master photographer.',
        inclusions: ['1 Lead Photographer', 'High-res digital album', 'Online gallery access']
      })
    });
    const basicJson = await basicRes.json();
    assert(basicRes.ok && basicJson.success && basicJson.data?.id, 'Created BASIC tier package');
    assert(basicJson.data.package_tier === 'BASIC', 'Package tier stored as BASIC');
    assert(basicJson.data.moderation_status === 'PENDING_REVIEW', 'Default moderation status is PENDING_REVIEW');
    const basicPkgId = basicJson.data.id;

    // 5b. STANDARD package
    const stdRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Gold Grand Celebration Package',
        package_tier: 'STANDARD',
        price: 75000,
        guest_capacity: 400,
        service_id: serviceId,
        description: 'Complete 2-day wedding celebration coverage with photo and video team.',
        inclusions: ['2 Photographers', '1 Lead Cinematographer', '4K Wedding Teaser', 'Printed Luxury Album']
      })
    });
    const stdJson = await stdRes.json();
    assert(stdRes.ok && stdJson.success && stdJson.data?.id, 'Created STANDARD tier package');
    assert(stdJson.data.package_tier === 'STANDARD', 'Package tier stored as STANDARD');
    const stdPkgId = stdJson.data.id;

    // 5c. PREMIUM package
    const premRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Kohinoor Royal Luxury Suite',
        package_tier: 'PREMIUM',
        price: 150000,
        guest_capacity: 1000,
        service_id: serviceId,
        description: 'Unrestricted multi-day celebration with full cinematic and aerial production.',
        inclusions: ['3 Photographers', '2 Cinematographers', '4K Drone Aerial Coverage', 'Cinematic Film (15-20 min)', 'Same-day edit reel', 'Leather-bound heirloom albums']
      })
    });
    const premJson = await premRes.json();
    assert(premRes.ok && premJson.success && premJson.data?.id, 'Created PREMIUM tier package');
    assert(premJson.data.package_tier === 'PREMIUM', 'Package tier stored as PREMIUM');
    const premPkgId = premJson.data.id;

    // 6. Test Optional Add-ons Management
    console.log('\n6. Testing Optional Add-ons Management...');
    
    // 6a. Create Add-on 1: Drone
    const addon1Res = await fetch(`${BASE_URL}/api/vendor/add-ons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Drone 4K Aerial Cinematography',
        price: 15000,
        service_id: serviceId,
        description: 'Licensed DGCA drone pilot capturing breathtaking bird-eye perspectives of your procession and mandap.'
      })
    });
    const addon1Json = await addon1Res.json();
    assert(addon1Res.ok && addon1Json.success && addon1Json.data?.id, 'Created Add-on 1: Drone 4K Cinematography (+₹15,000)');
    const addon1Id = addon1Json.data.id;

    // 6b. Create Add-on 2: Express Delivery
    const addon2Res = await fetch(`${BASE_URL}/api/vendor/add-ons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Express 48-Hour Photo Delivery',
        price: 8000,
        service_id: serviceId,
        description: 'Priority editing queue delivering fully color-graded high-resolution photos in 48 hours.'
      })
    });
    const addon2Json = await addon2Res.json();
    assert(addon2Res.ok && addon2Json.success && addon2Json.data?.id, 'Created Add-on 2: Express Delivery (+₹8,000)');
    const addon2Id = addon2Json.data.id;

    // 6c. Create Add-on 3: Sunset Portrait Session
    const addon3Res = await fetch(`${BASE_URL}/api/vendor/add-ons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Pre-Wedding Sunset Portrait Session',
        price: 25000,
        service_id: serviceId,
        description: '3-hour romantic sunset outdoor shoot with 2 outfit changes and 50 edited portraits.'
      })
    });
    const addon3Json = await addon3Res.json();
    assert(addon3Res.ok && addon3Json.success && addon3Json.data?.id, 'Created Add-on 3: Pre-Wedding Shoot (+₹25,000)');
    const addon3Id = addon3Json.data.id;

    // 6d. Edit Add-on 2: Update price to 10000
    const editAddon2Res = await fetch(`${BASE_URL}/api/vendor/add-ons`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: addon2Id,
        name: 'VIP Express 48-Hour Photo Delivery',
        price: 10000,
        description: 'Priority expedited delivery guaranteed in 48 hours.'
      })
    });
    const editAddon2Json = await editAddon2Res.json();
    assert(editAddon2Res.ok && editAddon2Json.success && Number(editAddon2Json.data.price) === 10000, 'Updated Add-on 2 price to ₹10,000 and updated title');

    // 6e. Deactivate Add-on 3 (toggle is_active = false)
    const toggleAddon3Res = await fetch(`${BASE_URL}/api/vendor/add-ons`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: addon3Id,
        is_active: false
      })
    });
    const toggleAddon3Json = await toggleAddon3Res.json();
    assert(toggleAddon3Res.ok && toggleAddon3Json.data.is_active === false, 'Deactivated Add-on 3 (is_active = false)');

    // 7. Test Moderation Workflow & Public Discovery Gating
    console.log('\n7. Testing Moderation Workflow and Public Discovery Gating...');
    
    // 7a. Public endpoint should NOT return pending packages
    const publicPkgsBeforeRes = await fetch(`${BASE_URL}/api/vendor/packages?vendor_id=${vendorAId}`);
    const publicPkgsBeforeJson = await publicPkgsBeforeRes.json();
    assert(publicPkgsBeforeJson.success && publicPkgsBeforeJson.data.length === 0, 'Public API returns 0 packages when moderation_status is PENDING_REVIEW');

    // 7b. Vendor dashboard endpoint (with cookie) DOES return all own packages
    const vendorOwnPkgsRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      headers: { Cookie: cookieA }
    });
    const vendorOwnPkgsJson = await vendorOwnPkgsRes.json();
    assert(vendorOwnPkgsJson.success && vendorOwnPkgsJson.data.length >= 3, 'Vendor authenticated endpoint returns all 3 own packages');

    // 7c. Admin approves all 3 packages
    console.log('   Logging in admin and approving packages...');
    const adminCookie = await loginAdmin();
    for (const pkgId of [basicPkgId, stdPkgId, premPkgId]) {
      const approveRes = await fetch(`${BASE_URL}/api/admin/packages/${pkgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ moderation_status: 'APPROVED' })
      });
      const approveJson = await approveRes.json();
      assert(approveRes.ok && approveJson.success && approveJson.data.moderation_status === 'APPROVED', `Admin approved package ${pkgId}`);
    }

    // 7d. Public endpoint now returns all 3 approved packages
    const publicPkgsAfterRes = await fetch(`${BASE_URL}/api/vendor/packages?vendor_id=${vendorAId}`);
    const publicPkgsAfterJson = await publicPkgsAfterRes.json();
    assert(publicPkgsAfterJson.success && publicPkgsAfterJson.data.length === 3, 'Public API now returns all 3 approved and active packages');

    // 8. Test Package Comparison Endpoint (/api/packages/compare)
    console.log('\n8. Testing Package Comparison Endpoint (/api/packages/compare)...');
    const compareRes = await fetch(`${BASE_URL}/api/packages/compare?vendor_id=${vendorAId}&service_id=${serviceId}`);
    const compareJson = await compareRes.json();
    assert(compareRes.ok && compareJson.success, 'GET /api/packages/compare returned 200 OK');
    assert(compareJson.data?.vendor?.id === vendorAId, 'Comparison data includes correct vendor details');
    assert(compareJson.data?.service?.id === serviceId, 'Comparison data includes correct service details');
    assert(Array.isArray(compareJson.data?.packages) && compareJson.data.packages.length === 3, 'Comparison returns 3 packages');
    
    // Check tier order: BASIC -> STANDARD -> PREMIUM
    const tiers = compareJson.data.packages.map(p => p.package_tier);
    assert(tiers[0] === 'BASIC' && tiers[1] === 'STANDARD' && tiers[2] === 'PREMIUM', 'Packages correctly sorted by tier: BASIC -> STANDARD -> PREMIUM');
    
    // Check feature matrix aggregation
    assert(Array.isArray(compareJson.data?.all_features) && compareJson.data.all_features.length > 0, 'Aggregated all_features matrix returned');
    console.log(`   Discovered ${compareJson.data.all_features.length} unique features across tiers`);

    // Check available add-ons: should only include active ones (Add-on 1 & 2), NOT deactivated Add-on 3
    const availableAddOns = compareJson.data?.available_add_ons || [];
    const availableAddOnIds = availableAddOns.map(a => a.id);
    assert(availableAddOnIds.includes(addon1Id), 'Active Add-on 1 present in comparison');
    assert(availableAddOnIds.includes(addon2Id), 'Active Add-on 2 present in comparison');
    assert(!availableAddOnIds.includes(addon3Id), 'Deactivated Add-on 3 excluded from comparison');

    // 9. Test Tenant Isolation & Security (Vendor B cannot access Vendor A's packages/add-ons)
    console.log('\n9. Testing Tenant Isolation and Cross-Vendor Protection...');
    const vendorB = await registerVendor(
      'Ananya Sen ' + timestamp,
      vendorBEmail,
      'Sen Elegance ' + timestamp,
      validCategory.id
    );
    const cookieB = vendorB.cookie;

    // 9a. Vendor B attempts to update Vendor A's package
    const vBUpdatePkgRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({
        id: basicPkgId,
        name: 'Hacked Package Name',
        price: 1000
      })
    });
    assert(vBUpdatePkgRes.status === 403 || vBUpdatePkgRes.status === 404, 'Vendor B prevented from updating Vendor A package (403 Forbidden or 404)');

    // 9b. Vendor B attempts to delete Vendor A's package
    const vBDeletePkgRes = await fetch(`${BASE_URL}/api/vendor/packages?id=${basicPkgId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB }
    });
    assert(vBDeletePkgRes.status === 403 || vBDeletePkgRes.status === 404, 'Vendor B prevented from deleting Vendor A package (403 Forbidden or 404)');

    // 9c. Vendor B attempts to update Vendor A's add-on
    const vBUpdateAddonRes = await fetch(`${BASE_URL}/api/vendor/add-ons`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({
        id: addon1Id,
        name: 'Hacked Add-on Name',
        price: 500
      })
    });
    assert(vBUpdateAddonRes.status === 403 || vBUpdateAddonRes.status === 404, 'Vendor B prevented from updating Vendor A add-on (403 Forbidden or 404)');

    // 9d. Vendor B attempts to delete Vendor A's add-on
    const vBDeleteAddonRes = await fetch(`${BASE_URL}/api/vendor/add-ons?id=${addon1Id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB }
    });
    assert(vBDeleteAddonRes.status === 403 || vBDeleteAddonRes.status === 404, 'Vendor B prevented from deleting Vendor A add-on (403 Forbidden or 404)');

    // 10. Test Package Deactivation & Deletion by Owner
    console.log('\n10. Testing Package Deactivation & Deletion by Owner...');
    
    // 10a. Vendor A toggles STANDARD package is_active = false
    const togglePkgRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        id: stdPkgId,
        is_active: false
      })
    });
    assert(togglePkgRes.ok, 'Vendor A paused STANDARD package (is_active = false)');

    // 10b. Public endpoint should now return only 2 packages (BASIC and PREMIUM)
    const publicAfterPauseRes = await fetch(`${BASE_URL}/api/vendor/packages?vendor_id=${vendorAId}`);
    const publicAfterPauseJson = await publicAfterPauseRes.json();
    assert(publicAfterPauseJson.data.length === 2, 'Public endpoint omits paused package (returned 2 packages)');
    assert(!publicAfterPauseJson.data.map(p => p.id).includes(stdPkgId), 'Paused package is excluded from public discovery');

    // 10c. Vendor A deletes BASIC package
    const delPkgRes = await fetch(`${BASE_URL}/api/vendor/packages?id=${basicPkgId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA }
    });
    assert(delPkgRes.ok, 'Vendor A deleted BASIC package');

    // 10d. Vendor A deletes Add-on 1
    const delAddonRes = await fetch(`${BASE_URL}/api/vendor/add-ons?id=${addon1Id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA }
    });
    assert(delAddonRes.ok, 'Vendor A deleted Add-on 1');

    // 11. Final Summary
    console.log('\n======================================================');
    console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
    
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('\nUnexpected test error:', err);
    process.exit(1);
  }
}

runTests();
