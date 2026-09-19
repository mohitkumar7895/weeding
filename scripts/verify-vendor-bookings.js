const mysql = require('mysql2/promise');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== Starting Vendor Booking Requests & Management Verification Suite ===\n');
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

    // Helper: Register Vendor
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
          address: '77 Royal Palace Road, Jaipur',
          description: 'Luxury destination wedding cinematography and photography.',
          starting_price: 50000,
        }),
      });

      const data = await regRes.json();
      if (!regRes.ok) {
        throw new Error(`Vendor registration failed: ${JSON.stringify(data)}`);
      }
      const cookie = getCookie(regRes);
      return { cookie, user: data.user, vendorId: data.user.vendor_id };
    }

    // Helper: Register Customer
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
      const cookie = getCookie(regRes);
      return { cookie, user: data.user };
    }

    // Helper: Login
    async function login(email, password = 'Password@123') {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
      const cookie = getCookie(res);
      return { cookie, user: data.user };
    }

    // --- TEST 1: Database Schema Verification ---
    console.log('\n--- Section 1: Database Schema & Migration Verification ---');
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'wedwithme',
    });

    const [cols] = await db.query(`DESCRIBE bookings`);
    const colNames = cols.map(c => c.Field);
    assert(colNames.includes('event_location'), 'bookings table contains event_location column');
    assert(colNames.includes('special_instructions'), 'bookings table contains special_instructions column');
    assert(colNames.includes('add_ons_json'), 'bookings table contains add_ons_json column');

    const [indexes] = await db.query(`SHOW INDEX FROM bookings`);
    const indexNames = indexes.map(i => i.Key_name);
    assert(indexNames.includes('idx_bookings_vendor_status'), 'bookings has idx_bookings_vendor_status index');
    assert(indexNames.includes('idx_bookings_vendor_date'), 'bookings has idx_bookings_vendor_date index');

    const [bshTable] = await db.query(`SHOW TABLES LIKE 'booking_status_history'`);
    assert(bshTable.length > 0, 'booking_status_history table exists for lifecycle audit logs');

    // Get a category
    const [categories] = await db.query(`SELECT id FROM categories LIMIT 1`);
    const categoryId = categories[0]?.id;

    // --- TEST 2: Users & Vendor Setup ---
    console.log('\n--- Section 2: Vendors & Customer Setup ---');
    const ts = Date.now();
    const vendorEmailA = `vendor.elite.${ts}@test.com`;
    const vendorEmailB = `vendor.aura.${ts}@test.com`;
    const customerEmail = `customer.ananya.${ts}@test.com`;

    const vendorA = await registerVendor('Vikram Rathore', vendorEmailA, 'Elite Royal Media', categoryId);
    assert(vendorA.vendorId, 'Vendor A registered with ID: ' + vendorA.vendorId);

    const vendorB = await registerVendor('Siddharth Sen', vendorEmailB, 'Aura Wedding Planners', categoryId);
    assert(vendorB.vendorId, 'Vendor B registered with ID: ' + vendorB.vendorId);

    const customer = await registerCustomer('Ananya Sharma', customerEmail);
    assert(customer.user.id, 'Customer registered with ID: ' + customer.user.id);

    // Approve Vendor A
    await db.query(`UPDATE vendors SET verification_status = 'APPROVED' WHERE id = ?`, [vendorA.vendorId]);
    await db.query(`UPDATE vendor_onboarding SET status = 'APPROVED' WHERE vendor_id = ?`, [vendorA.vendorId]);

    // Vendor A creates a service, package, and add-on
    const srvRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({
        title: 'Royal Destination Wedding Photography',
        category_id: categoryId,
        starting_price: 75000,
        service_location: 'Jaipur & Udaipur',
        description: 'Complete high-definition coverage of wedding ceremonies.',
      }),
    });
    const srvData = await srvRes.json();
    assert(srvData.success, 'Vendor A created service: ' + srvData.data?.title);
    const serviceId = srvData.data.id;

    // Auto-approve service for testing
    await db.query(`UPDATE vendor_services SET moderation_status = 'APPROVED', is_active = 1 WHERE id = ?`, [serviceId]);

    const pkgRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({
        name: 'Imperial Heritage Luxury',
        service_id: serviceId,
        package_tier: 'PREMIUM',
        price: 150000,
        guest_capacity: 500,
        description: '3 Days unlimited cinematography, 2 photographers, 4K teaser video.',
        included_items: ['Pre-wedding shoot', '4K Drone coverage', 'Traditional album (50 pages)'],
      }),
    });
    const pkgData = await pkgRes.json();
    assert(pkgData.success, 'Vendor A created premium package: ' + pkgData.data?.name);
    const packageId = pkgData.data.id;
    await db.query(`UPDATE vendor_packages SET moderation_status = 'APPROVED', is_active = 1 WHERE id = ?`, [packageId]);

    const addonRes = await fetch(`${BASE_URL}/api/vendor/add-ons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({
        name: '4K Ultra-HD Drone Coverage',
        price: 25000,
        service_id: serviceId,
        description: 'Dedicated pilot and secondary drone camera for aerial entries.',
      }),
    });
    const addonData = await addonRes.json();
    assert(addonData.success, 'Vendor A created add-on: ' + addonData.data?.name);
    const addonId = addonData.data.id;

    // --- TEST 3: Customer Creates Booking 1 ---
    console.log('\n--- Section 3: Booking Request Creation & Initial State ---');
    const bookingDate1 = '2026-11-20';
    const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customer.cookie },
      body: JSON.stringify({
        vendor_id: vendorA.vendorId,
        service_id: serviceId,
        package_id: packageId,
        event_date: bookingDate1,
        event_location: 'Umaid Bhawan Palace, Jodhpur, Rajasthan',
        guest_count: 350,
        special_instructions: 'Please arrive 2 hours before the evening Baraat procession.',
        add_ons: [{ id: addonId, name: '4K Ultra-HD Drone Coverage', price: 25000 }],
      }),
    });
    const bookData = await bookRes.json();
    assert(bookRes.ok && bookData.success, 'Customer created Booking 1 successfully');
    const booking1 = bookData.data;
    assert(booking1.booking_number && (booking1.booking_number.startsWith('WWM-') || booking1.booking_number.startsWith('BK-')), 'Booking 1 has valid booking number: ' + booking1.booking_number);
    assert(booking1.status === 'REQUESTED', 'Booking 1 initial status is REQUESTED');
    assert(parseFloat(booking1.total_amount) === 175000, 'Total amount includes package (150k) + add-on (25k) = 175,000');
    assert(parseFloat(booking1.vendor_payout_amount) > 0, 'Vendor payout amount calculated properly');

    // Verify availability hold in vendor_availability
    const [holds] = await db.query(
      `SELECT * FROM vendor_availability WHERE vendor_id = ? AND date = ?`,
      [vendorA.vendorId, bookingDate1]
    );
    assert(holds.length > 0 && holds[0].is_booked === 1, 'Date 2026-11-20 is marked as booked/hold in vendor_availability');

    // --- TEST 4: Vendor A Retrieval & Filters ---
    console.log('\n--- Section 4: Vendor Bookings Retrieval & Search Filters ---');
    const vBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      headers: { Cookie: vendorA.cookie },
    });
    const vBookData = await vBookRes.json();
    assert(vBookData.success, 'Vendor A fetched bookings successfully');
    assert(vBookData.data.some(b => b.id === booking1.id), 'Vendor A bookings list includes Booking 1');

    // Search query test
    const searchRes = await fetch(`${BASE_URL}/api/bookings?search=Umaid`, {
      headers: { Cookie: vendorA.cookie },
    });
    const searchData = await searchRes.json();
    assert(searchData.data.length >= 1 && searchData.data[0].id === booking1.id, 'Search by venue "Umaid" returns Booking 1');

    // Status filter test
    const pendRes = await fetch(`${BASE_URL}/api/bookings?status=PENDING`, {
      headers: { Cookie: vendorA.cookie },
    });
    const pendData = await pendRes.json();
    assert(pendData.data.some(b => b.id === booking1.id), 'Filter ?status=PENDING returns Booking 1');

    const compRes = await fetch(`${BASE_URL}/api/bookings?status=COMPLETED`, {
      headers: { Cookie: vendorA.cookie },
    });
    const compData = await compRes.json();
    assert(!compData.data.some(b => b.id === booking1.id), 'Filter ?status=COMPLETED does not return Booking 1');

    // --- TEST 5: Full Booking Detail Dossier ---
    console.log('\n--- Section 5: Authorized Booking Detail Dossier ---');
    const detailRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}`, {
      headers: { Cookie: vendorA.cookie },
    });
    const detailData = await detailRes.json();
    assert(detailData.success, 'Vendor A fetched single booking detail dossier');
    const dossier = detailData.data;
    assert(dossier.customer_name === 'Ananya Sharma', 'Dossier exposes customer name: ' + dossier.customer_name);
    assert(dossier.customer_phone, 'Dossier exposes customer phone for fulfillment: ' + dossier.customer_phone);
    assert(dossier.customer_email === customerEmail, 'Dossier exposes customer email: ' + dossier.customer_email);
    assert(dossier.event_location === 'Umaid Bhawan Palace, Jodhpur, Rajasthan', 'Dossier contains correct venue location');
    assert(dossier.package_name === 'Imperial Heritage Luxury', 'Dossier contains package name');
    assert(dossier.package_tier === 'PREMIUM', 'Dossier contains package tier');
    assert(Array.isArray(dossier.package_inclusions) && dossier.package_inclusions.length === 3, 'Dossier contains package inclusions list');
    assert(Array.isArray(dossier.add_ons) && dossier.add_ons.length === 1, 'Dossier contains selected add-on');
    assert(dossier.conversation_id, 'Dossier contains linked conversation ID for instant chat');
    assert(Array.isArray(dossier.status_history), 'Dossier contains status history timeline');

    // --- TEST 6: State Machine Enforcement ---
    console.log('\n--- Section 6: State Machine Validation & Invalid Jumps ---');
    const invalidJump1 = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert(invalidJump1.status === 400, 'Invalid transition REQUESTED -> COMPLETED rejected with 400 Bad Request');

    const invalidJump2 = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    assert(invalidJump2.status === 400, 'Invalid transition REQUESTED -> IN_PROGRESS rejected with 400 Bad Request');

    // --- TEST 7: Vendor A Accepts Booking 1 ---
    console.log('\n--- Section 7: Vendor Booking Acceptance & Availability Lock ---');
    const acceptRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    const acceptData = await acceptRes.json();
    assert(acceptRes.ok && acceptData.success, 'Vendor A accepted booking: ' + acceptData.message);

    // Verify status updated in DB
    const [dbB1] = await db.query(`SELECT status FROM bookings WHERE id = ?`, [booking1.id]);
    assert(dbB1[0].status === 'ACCEPTED', 'Booking 1 status in database is ACCEPTED');

    // Verify audit log written
    const [bshLogs] = await db.query(
      `SELECT * FROM booking_status_history WHERE booking_id = ? AND to_status = 'ACCEPTED'`,
      [booking1.id]
    );
    assert(bshLogs.length > 0 && bshLogs[0].to_status === 'ACCEPTED', 'Status history recorded transition to ACCEPTED');

    // --- TEST 8: Double-Booking Prevention ---
    console.log('\n--- Section 8: Concurrency & Double-Booking Prevention ---');
    const customer2 = await registerCustomer('Rohit Verma', `customer.rohit.${ts}@test.com`);
    const doubleBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customer2.cookie },
      body: JSON.stringify({
        vendor_id: vendorA.vendorId,
        service_id: serviceId,
        package_id: packageId,
        event_date: bookingDate1, // Same date!
        guest_count: 200,
      }),
    });
    assert(doubleBookRes.status === 409, 'Double-booking request on already locked date rejected with 409 Conflict');

    // --- TEST 9: Full Lifecycle (ACCEPTED -> CONFIRMED -> IN_PROGRESS -> COMPLETED) ---
    console.log('\n--- Section 9: Full Booking Lifecycle Progression ---');
    // Customer / Payment confirms booking
    const confirmRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: customer.cookie },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    assert(confirmRes.ok, 'Booking transitioned to CONFIRMED');

    // Vendor starts fulfillment
    const startRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    assert(startRes.ok, 'Booking transitioned to IN_PROGRESS (Vendor started fulfillment)');

    // Vendor completes event
    const compEventRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert(compEventRes.ok, 'Booking transitioned to COMPLETED (Event celebration fulfilled)');

    const [dbB1Final] = await db.query(`SELECT status FROM bookings WHERE id = ?`, [booking1.id]);
    assert(dbB1Final[0].status === 'COMPLETED', 'Final database status is COMPLETED');

    // --- TEST 10: Decline with Reason & Date Release ---
    console.log('\n--- Section 10: Vendor Decline with Reason & Date Lock Release ---');
    const bookingDate2 = '2026-12-15';
    const book2Res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customer.cookie },
      body: JSON.stringify({
        vendor_id: vendorA.vendorId,
        service_id: serviceId,
        package_id: packageId,
        event_date: bookingDate2,
        guest_count: 250,
      }),
    });
    const book2Data = await book2Res.json();
    assert(book2Data.success, 'Customer created Booking 2 on 2026-12-15');
    const booking2 = book2Data.data;

    // Verify tentative hold
    const [hold2] = await db.query(
      `SELECT * FROM vendor_availability WHERE vendor_id = ? AND date = ?`,
      [vendorA.vendorId, bookingDate2]
    );
    assert(hold2.length > 0 && hold2[0].is_booked === 1, 'Tentative availability hold created for Booking 2');

    // Vendor declines with reason
    const declineReasonText = 'Venue outside operating radius: Udaipur palace distance exceeds policy';
    const declineRes = await fetch(`${BASE_URL}/api/bookings/${booking2.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'REJECTED', reason: declineReasonText }),
    });
    const declineData = await declineRes.json();
    assert(declineRes.ok && declineData.success, 'Vendor A declined Booking 2');

    // Verify status is REJECTED
    const [dbB2] = await db.query(`SELECT status FROM bookings WHERE id = ?`, [booking2.id]);
    assert(dbB2[0].status === 'REJECTED', 'Booking 2 status in database is REJECTED');

    // Verify date lock released
    const [hold2After] = await db.query(
      `SELECT * FROM vendor_availability WHERE vendor_id = ? AND date = ?`,
      [vendorA.vendorId, bookingDate2]
    );
    assert(hold2After.length === 0, 'Availability hold for 2026-12-15 completely released after decline');

    // Verify audit log has exact decline reason
    const [declineLogs] = await db.query(
      `SELECT * FROM booking_status_history WHERE booking_id = ? AND to_status = 'REJECTED'`,
      [booking2.id]
    );
    assert(declineLogs.length > 0, 'Audit log recorded REJECTED entry');
    assert(declineLogs[0].reason === declineReasonText, 'Audit log records exact decline reason: ' + declineLogs[0].reason);

    // --- TEST 11: Tenant Isolation ---
    console.log('\n--- Section 11: Tenant Isolation & Authorization ---');
    // Vendor B tries to view Vendor A's Booking 1
    const vBViewRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}`, {
      headers: { Cookie: vendorB.cookie },
    });
    assert(vBViewRes.status === 404 || vBViewRes.status === 403, 'Vendor B cannot view Vendor A booking (HTTP ' + vBViewRes.status + ')');

    // Vendor B tries to modify Vendor A's Booking 1
    const vBModRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: vendorB.cookie },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert(vBModRes.status === 404 || vBModRes.status === 403, 'Vendor B cannot modify Vendor A booking (HTTP ' + vBModRes.status + ')');

    // --- TEST 12: Integrated Booking Chat Messaging ---
    console.log('\n--- Section 12: Integrated Booking Chat Messaging ---');
    // Customer sends message
    const custMsgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customer.cookie },
      body: JSON.stringify({
        booking_id: booking1.id,
        body: 'Hello Vikram! What time will your drone cinematography crew arrive at Umaid Bhawan?',
      }),
    });
    const custMsgData = await custMsgRes.json();
    assert(custMsgRes.ok && custMsgData.success, 'Customer sent chat message linked to Booking 1');

    // Vendor A sends reply
    const vendorMsgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({
        booking_id: booking1.id,
        body: 'Namaste Ananya! Our 4K drone crew will arrive at 11:00 AM for pre-ceremony setup.',
      }),
    });
    const vendorMsgData = await vendorMsgRes.json();
    assert(vendorMsgRes.ok && vendorMsgData.success, 'Vendor A replied with chat message linked to Booking 1');

    // Vendor A retrieves chat history
    const getChatRes = await fetch(`${BASE_URL}/api/messages?booking_id=${booking1.id}`, {
      headers: { Cookie: vendorA.cookie },
    });
    const getChatData = await getChatRes.json();
    assert(getChatRes.ok && getChatData.success, 'Vendor A retrieved booking conversation');
    const msgs = Array.isArray(getChatData.data) ? getChatData.data : (getChatData.messages || []);
    assert(msgs.length >= 2, 'Retrieved at least 2 booking messages in conversation');
    const hasVendorReply = msgs.some(m => (m.body || m.message || '').includes('Namaste Ananya'));
    const hasCustMsg = msgs.some(m => (m.body || m.message || '').includes('Umaid Bhawan'));
    assert(hasVendorReply && hasCustMsg, 'Conversation preserves real chat thread contents');

    // --- TEST 13: Persistence Across Logout & Re-login ---
    console.log('\n--- Section 13: Persistence Across Sessions ---');
    const relogin = await login(vendorEmailA);
    const reloginBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      headers: { Cookie: relogin.cookie },
    });
    const reloginBookData = await reloginBookRes.json();
    assert(reloginBookData.success, 'Vendor A re-authenticated successfully');
    const persistedB1 = reloginBookData.data.find(b => b.id === booking1.id);
    assert(persistedB1 && persistedB1.status === 'COMPLETED', 'Persisted Booking 1 maintains COMPLETED status');
    const persistedB2 = reloginBookData.data.find(b => b.id === booking2.id);
    assert(persistedB2 && persistedB2.status === 'REJECTED', 'Persisted Booking 2 maintains REJECTED status');

    await db.end();

    console.log('\n========================================');
    console.log(`Verification Suite Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
