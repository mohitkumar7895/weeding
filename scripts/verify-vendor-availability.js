const mysql = require('mysql2/promise');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== Starting Vendor Availability & Calendar Verification Test Suite ===\n');
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
    function getCookie(res) {
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) return '';
      return setCookie.split(';')[0];
    }

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
          address: '77 Royal Heritage Palace, Jaipur',
          description: 'Award-winning royal destination wedding cinematography and photography.',
          starting_price: 60000,
        }),
      });

      const data = await regRes.json();
      if (!regRes.ok) {
        throw new Error(`Vendor registration failed: ${JSON.stringify(data)}`);
      }
      const cookie = getCookie(regRes);
      return { cookie, user: data.user, vendorId: data.user.vendor_id };
    }

    async function registerCustomer(name, email) {
      const randomPhone = '91' + Math.floor(10000000 + Math.random() * 90000000);
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: randomPhone,
          password: 'Password@123',
          role: 'CUSTOMER',
        }),
      });
      const data = await regRes.json();
      if (!regRes.ok) {
        throw new Error(`Customer registration failed: ${JSON.stringify(data)}`);
      }
      return { cookie: getCookie(regRes), user: data.user };
    }

    const timestamp = Date.now();
    const vendorAEmail = `vendor_avail_a_${timestamp}@wedwithme.com`;
    const vendorBEmail = `vendor_avail_b_${timestamp}@wedwithme.com`;
    const customer1Email = `cust_avail_1_${timestamp}@wedwithme.com`;
    const customer2Email = `cust_avail_2_${timestamp}@wedwithme.com`;

    // 1. Fetch categories
    console.log('1. Fetching platform categories...');
    const catRes = await fetch(`${BASE_URL}/api/categories`);
    const catJson = await catRes.json();
    assert(catJson.success && Array.isArray(catJson.data) && catJson.data.length > 0, 'Fetched platform categories successfully');
    const validCategory = catJson.data[0];

    // 2. Register Vendor A
    console.log('\n2. Registering and authenticating Vendor A...');
    const vendorA = await registerVendor(
      'Karan Johar ' + timestamp,
      vendorAEmail,
      'Dharma Wedding Studios ' + timestamp,
      validCategory.id
    );
    const cookieA = vendorA.cookie;
    const vendorAId = vendorA.vendorId;
    assert(!!cookieA && !!vendorAId, 'Vendor A registered and authenticated with ID: ' + vendorAId);

    // Create service for Vendor A
    const srvRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        title: 'Cinematic Royal Wedding Filmmaking',
        category_id: validCategory.id,
        starting_price: 75000,
        location: 'Jaipur, Rajasthan',
        description: 'Elite royal destination film coverage.'
      }),
    });
    const srvJson = await srvRes.json();
    assert(srvRes.ok && srvJson.success, 'Created wedding service for Vendor A');
    const serviceId = srvJson.data.id;

    // Verify Vendor A in database so customer-facing endpoints can serve profile
    const dbConn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'wedwithme',
      port: parseInt(process.env.DB_PORT || '3306', 10),
    });
    await dbConn.query("UPDATE vendors SET verification_status = 'VERIFIED' WHERE id = ?", [vendorAId]);

    // 3. Test GET /api/vendor/availability
    console.log('\n3. Testing GET /api/vendor/availability for Month & Range...');
    const getMonthRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const getMonthJson = await getMonthRes.json();
    assert(getMonthRes.ok && getMonthJson.success, 'GET /api/vendor/availability returned 200 OK');
    assert(getMonthJson.data?.vendor_id === vendorAId, 'Availability data scoped to Vendor A');
    assert(getMonthJson.data?.summary?.total_days === 30, 'Month 2026-11 reports exactly 30 days');
    assert(getMonthJson.data?.summary?.available_days === 30, 'All 30 days initially available');
    assert(getMonthJson.data?.summary?.blocked_days === 0, 'Zero blocked days initially');
    assert(Array.isArray(getMonthJson.data?.services), 'Vendor services list included in availability response');

    // 4. Test Single Date Blocking & Retrieval
    console.log('\n4. Testing Single Date Blocking (POST /api/vendor/availability)...');
    const blockDate1 = '2026-11-15';
    const postBlockRes = await fetch(`${BASE_URL}/api/vendor/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        date: blockDate1,
        status: 'BLOCKED',
        reason: 'PERSONAL_LEAVE',
        notes: 'Family holiday in Switzerland',
        service_id: 'ALL',
      }),
    });
    const postBlockJson = await postBlockRes.json();
    assert(postBlockRes.ok && postBlockJson.success, 'POST /api/vendor/availability blocked date successfully');

    // Verify in GET
    const verifyBlockRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const verifyBlockJson = await verifyBlockRes.json();
    const date1Item = verifyBlockJson.data?.calendar_dates?.[blockDate1];
    assert(date1Item?.status === 'BLOCKED', 'Date 2026-11-15 status reflects BLOCKED in calendar');
    assert(date1Item?.reason === 'PERSONAL_LEAVE', 'Block reason recorded as PERSONAL_LEAVE');
    assert(date1Item?.notes === 'Family holiday in Switzerland', 'Internal notes persisted accurately');
    assert(date1Item?.can_unblock === true, 'Vendor manual block has can_unblock = true');
    assert(verifyBlockJson.data?.summary?.blocked_days === 1, 'Blocked days count incremented to 1');
    assert(verifyBlockJson.data?.summary?.available_days === 29, 'Available days count updated to 29');

    // 5. Test Single Date Unblocking
    console.log('\n5. Testing Single Date Unblocking...');
    const unblockRes = await fetch(`${BASE_URL}/api/vendor/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        date: blockDate1,
        status: 'AVAILABLE',
      }),
    });
    const unblockJson = await unblockRes.json();
    assert(unblockRes.ok && unblockJson.success, 'POST /api/vendor/availability unblocked date successfully');

    // Verify date is available again
    const checkUnblockedRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const checkUnblockedJson = await checkUnblockedRes.json();
    assert(checkUnblockedJson.data?.calendar_dates?.[blockDate1]?.status === 'AVAILABLE', 'Date 2026-11-15 reverted to AVAILABLE');
    assert(checkUnblockedJson.data?.summary?.blocked_days === 0, 'Blocked count reverted to 0');

    // 6. Test Batch Date Range Blocking
    console.log('\n6. Testing Batch Date Range Blocking (start_date to end_date)...');
    const batchRes = await fetch(`${BASE_URL}/api/vendor/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        start_date: '2026-11-20',
        end_date: '2026-11-23',
        status: 'BLOCKED',
        reason: 'TRAVEL',
        notes: 'Destination wedding shoot in Jodhpur',
        service_id: 'ALL',
      }),
    });
    const batchJson = await batchRes.json();
    assert(batchRes.ok && batchJson.success, 'Batch range block created successfully');
    assert(batchJson.data?.dates_affected?.length === 4, '4 dates affected by batch range');

    const checkBatchRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const checkBatchJson = await checkBatchRes.json();
    assert(checkBatchJson.data?.calendar_dates?.['2026-11-20']?.status === 'BLOCKED', 'Day 1 of range (2026-11-20) is BLOCKED');
    assert(checkBatchJson.data?.calendar_dates?.['2026-11-21']?.status === 'BLOCKED', 'Day 2 of range (2026-11-21) is BLOCKED');
    assert(checkBatchJson.data?.calendar_dates?.['2026-11-22']?.status === 'BLOCKED', 'Day 3 of range (2026-11-22) is BLOCKED');
    assert(checkBatchJson.data?.calendar_dates?.['2026-11-23']?.status === 'BLOCKED', 'Day 4 of range (2026-11-23) is BLOCKED');
    assert(checkBatchJson.data?.summary?.blocked_days === 4, 'Summary blocked_days correctly reports 4');

    // 7. Test Backend Validations
    console.log('\n7. Testing Backend Input Validations...');
    const invalidDateRes = await fetch(`${BASE_URL}/api/vendor/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ date: 'invalid-date-format' }),
    });
    assert(invalidDateRes.status === 400, 'Rejected invalid date format (400 Bad Request)');

    const invalidRangeRes = await fetch(`${BASE_URL}/api/vendor/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ start_date: '2026-11-25', end_date: '2026-11-20' }),
    });
    assert(invalidRangeRes.status === 400, 'Rejected start_date > end_date (400 Bad Request)');

    const missingDateRes = await fetch(`${BASE_URL}/api/vendor/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ reason: 'TEST' }),
    });
    assert(missingDateRes.status === 400, 'Rejected request missing date fields (400 Bad Request)');

    // 8. Test Confirmed Booking Immutability Guard
    console.log('\n8. Testing Confirmed Booking Immutability & Anti Double-Booking Guard...');
    const bookedDate = '2026-11-28';
    const bookingId = 'bkg_test_' + timestamp;
    const bookingNum = 'WWM-2026-CONF' + Math.floor(1000 + Math.random() * 9000);

    // Register a customer and insert a confirmed booking directly into DB
    const cust1 = await registerCustomer('Aarav Mehta ' + timestamp, customer1Email);
    const [custProfiles] = await dbConn.query('SELECT id FROM customer_profiles WHERE user_id = ?', [cust1.user.id]);
    const custProfileId = custProfiles[0].id;

    await dbConn.query(
      `INSERT INTO bookings (
        id, booking_number, customer_id, vendor_id, service_id, event_date,
        guest_count, total_amount, commission_rate, commission_amount,
        vendor_payout_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 350, 75000, 10.00, 7500, 67500, 'CONFIRMED', 'Royal Udaipur Palace Wedding')`,
      [bookingId, bookingNum, custProfileId, vendorAId, serviceId, bookedDate]
    );

    // Verify confirmed booking shows in vendor availability calendar
    const checkBookedRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const checkBookedJson = await checkBookedRes.json();
    const bookedItem = checkBookedJson.data?.calendar_dates?.[bookedDate];
    assert(bookedItem?.status === 'BOOKED', 'Confirmed booking reflects BOOKED in calendar');
    assert(bookedItem?.booking_number === bookingNum, 'Calendar displays booking number ' + bookingNum);
    assert(bookedItem?.can_unblock === false, 'Confirmed booking enforces can_unblock = false');

    // Vendor attempts to manually mark confirmed date as AVAILABLE -> MUST REJECT
    const illegalUnblockRes = await fetch(`${BASE_URL}/api/vendor/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        date: bookedDate,
        status: 'AVAILABLE',
      }),
    });
    const illegalUnblockJson = await illegalUnblockRes.json();
    assert(illegalUnblockRes.status === 409, 'Backend rejects making confirmed booked date available (409 Conflict)');
    assert(illegalUnblockJson.message?.includes('Double-booking is strictly prohibited'), 'Rejection message enforces double-booking prohibition');

    // Vendor attempts to DELETE confirmed date block -> MUST REJECT
    const illegalDeleteRes = await fetch(`${BASE_URL}/api/vendor/availability?date=${bookedDate}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(illegalDeleteRes.status === 409, 'DELETE endpoint rejects unblocking committed booking (409 Conflict)');

    // 9. Test Tenant Isolation (Vendor B cannot modify Vendor A availability)
    console.log('\n9. Testing Tenant Isolation & Cross-Vendor Protection...');
    const vendorB = await registerVendor(
      'Aditya Chopra ' + timestamp,
      vendorBEmail,
      'YRF Wedding Frames ' + timestamp,
      validCategory.id
    );
    const cookieB = vendorB.cookie;

    // Vendor B attempts to delete Vendor A's blocked date (2026-11-20)
    const vBDeleteRes = await fetch(`${BASE_URL}/api/vendor/availability?date=2026-11-20`, {
      method: 'DELETE',
      headers: { Cookie: cookieB },
    });
    // Vendor A's date block must remain completely unaffected
    const checkStillBlockedRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const checkStillBlockedJson = await checkStillBlockedRes.json();
    assert(
      checkStillBlockedJson.data?.calendar_dates?.['2026-11-20']?.status === 'BLOCKED',
      'Tenant isolation verified: Vendor B cannot mutate Vendor A availability records'
    );

    // 10. Test Booking Lock Foundation & Concurrency Protection
    console.log('\n10. Testing Booking Lock Foundation & Double-Booking Prevention...');
    const lockDate = '2026-11-10';

    // Customer 1 acquires lock on 2026-11-10
    const lockRes = await fetch(`${BASE_URL}/api/vendor/availability/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cust1.cookie },
      body: JSON.stringify({
        vendor_id: vendorAId,
        event_date: lockDate,
        service_id: serviceId,
        ttl_minutes: 15,
      }),
    });
    const lockJson = await lockRes.json();
    assert(lockRes.status === 201 && lockJson.success, 'Customer 1 acquired booking lock successfully (201 Created)');
    const lockToken = lockJson.data?.lock_token;
    assert(!!lockToken, 'Lock token generated');

    // Verify vendor calendar reflects LOCKED during active checkout
    const checkLockCalRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const checkLockCalJson = await checkLockCalRes.json();
    assert(checkLockCalJson.data?.calendar_dates?.[lockDate]?.status === 'LOCKED', 'Vendor calendar reflects LOCKED status');
    assert(checkLockCalJson.data?.summary?.locked_days >= 1, 'Summary locked_days count incremented');

    // Customer 2 registers and attempts to acquire lock on the SAME date -> MUST REJECT (409)
    const cust2 = await registerCustomer('Simran Singh ' + timestamp, customer2Email);
    const lock2Res = await fetch(`${BASE_URL}/api/vendor/availability/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cust2.cookie },
      body: JSON.stringify({
        vendor_id: vendorAId,
        event_date: lockDate,
        service_id: serviceId,
      }),
    });
    const lock2Json = await lock2Res.json();
    assert(lock2Res.status === 409, 'Customer 2 rejected when date is already locked (409 Conflict)');
    assert(lock2Json.code === 'LOCKED', 'Error code identifies LOCKED inventory slot');

    // Attempt to acquire lock on already BLOCKED date (2026-11-20) -> MUST REJECT (409)
    const lockBlockedRes = await fetch(`${BASE_URL}/api/vendor/availability/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cust1.cookie },
      body: JSON.stringify({
        vendor_id: vendorAId,
        event_date: '2026-11-20',
      }),
    });
    assert(lockBlockedRes.status === 409, 'Cannot acquire lock on vendor-blocked date (409 Conflict)');

    // Attempt to acquire lock on already BOOKED date (2026-11-28) -> MUST REJECT (409)
    const lockBookedRes = await fetch(`${BASE_URL}/api/vendor/availability/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cust1.cookie },
      body: JSON.stringify({
        vendor_id: vendorAId,
        event_date: bookedDate,
      }),
    });
    assert(lockBookedRes.status === 409, 'Cannot acquire lock on confirmed booked date (409 Conflict)');

    // Customer 1 releases the lock
    const releaseLockRes = await fetch(`${BASE_URL}/api/vendor/availability/lock?lock_token=${lockToken}`, {
      method: 'DELETE',
      headers: { Cookie: cust1.cookie },
    });
    const releaseLockJson = await releaseLockRes.json();
    assert(releaseLockRes.ok && releaseLockJson.success, 'Customer 1 released booking lock');

    // Verify date is now available again
    const checkReleasedCalRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: cookieA },
    });
    const checkReleasedCalJson = await checkReleasedCalRes.json();
    assert(checkReleasedCalJson.data?.calendar_dates?.[lockDate]?.status === 'AVAILABLE', 'Slot reverted to AVAILABLE after lock release');

    // 11. Test Customer-Facing Read-Only Availability API
    console.log('\n11. Testing Customer-Facing Read-Only Availability Check API (/api/vendors/[id]/availability)...');
    // Single date check: blocked date
    const custCheckBlocked = await fetch(`${BASE_URL}/api/vendors/${vendorAId}/availability?date=2026-11-20`);
    const custBlockedJson = await custCheckBlocked.json();
    assert(custCheckBlocked.ok && custBlockedJson.success, 'Customer availability check returned 200 OK');
    assert(custBlockedJson.data?.available === false, 'Blocked date reported as available = false');
    assert(custBlockedJson.data?.status === 'UNAVAILABLE', 'Status reported as UNAVAILABLE');
    assert(!custBlockedJson.data?.notes, 'Privacy preserved: internal notes NOT leaked to customer');
    assert(!custBlockedJson.data?.reason, 'Privacy preserved: internal reason NOT leaked to customer');

    // Single date check: available date
    const custCheckAvail = await fetch(`${BASE_URL}/api/vendors/${vendorAId}/availability?date=2026-11-05`);
    const custAvailJson = await custCheckAvail.json();
    assert(custAvailJson.data?.available === true, 'Open date reported as available = true');
    assert(custAvailJson.data?.status === 'AVAILABLE', 'Status reported as AVAILABLE');

    // Month check: returns all unavailable dates
    const custCheckMonth = await fetch(`${BASE_URL}/api/vendors/${vendorAId}/availability?month=2026-11`);
    const custMonthJson = await custCheckMonth.json();
    assert(custMonthJson.success, 'Month check returned success');
    assert(custMonthJson.data?.unavailable_dates?.includes('2026-11-20'), 'Unavailable dates list includes blocked date 2026-11-20');
    assert(custMonthJson.data?.unavailable_dates?.includes(bookedDate), 'Unavailable dates list includes booked date ' + bookedDate);

    // 12. Test Data Persistence after Logout & Re-login
    console.log('\n12. Testing Data Persistence Across Logout & Re-login...');
    // Logout
    await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookieA } });

    // Login again
    const reLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: vendorAEmail, password: 'Password@123' }),
    });
    const reLoginJson = await reLoginRes.json();
    const newCookieA = getCookie(reLoginRes);
    assert(reLoginRes.ok && reLoginJson.success, 'Vendor A re-authenticated successfully');

    // Fetch availability with new session
    const postLoginRes = await fetch(`${BASE_URL}/api/vendor/availability?month=2026-11`, {
      headers: { Cookie: newCookieA },
    });
    const postLoginJson = await postLoginRes.json();
    assert(postLoginJson.data?.calendar_dates?.['2026-11-20']?.status === 'BLOCKED', 'Blocked dates persist after re-login');
    assert(postLoginJson.data?.calendar_dates?.[bookedDate]?.status === 'BOOKED', 'Confirmed bookings persist after re-login');
    assert(postLoginJson.data?.summary?.blocked_days === 4, 'Summary metrics persist accurately');

    // Clean up test booking
    await dbConn.query('DELETE FROM bookings WHERE id = ?', [bookingId]);
    await dbConn.end();

    // 13. Final Summary
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
