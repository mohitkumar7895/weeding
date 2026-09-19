const mysql = require('mysql2/promise');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== Starting Vendor Earnings & Performance Verification Suite ===\n');
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

    // --- SECTION 1: Database Schema Verification ---
    console.log('--- Section 1: Database Schema & Setup Verification ---');
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'wedwithme',
    });

    const [payoutsCols] = await db.query(`DESCRIBE payouts`);
    const pColNames = payoutsCols.map(c => c.Field);
    assert(pColNames.includes('vendor_id'), 'payouts table has vendor_id');
    assert(pColNames.includes('booking_id'), 'payouts table has booking_id');
    assert(pColNames.includes('amount'), 'payouts table has amount');
    assert(pColNames.includes('status'), 'payouts table has status');
    assert(pColNames.includes('reference_id'), 'payouts table has reference_id');

    const [analyticsCols] = await db.query(`DESCRIBE analytics_events`);
    const aColNames = analyticsCols.map(c => c.Field);
    assert(aColNames.includes('event_name'), 'analytics_events table has event_name');
    assert(aColNames.includes('entity_type'), 'analytics_events table has entity_type');
    assert(aColNames.includes('entity_id'), 'analytics_events table has entity_id');

    const [reviewsCols] = await db.query(`DESCRIBE reviews`);
    const rColNames = reviewsCols.map(c => c.Field);
    assert(rColNames.includes('vendor_id'), 'reviews table has vendor_id');
    assert(rColNames.includes('rating'), 'reviews table has rating');
    assert(rColNames.includes('is_verified_booking'), 'reviews table has is_verified_booking');

    const [categories] = await db.query(`SELECT id FROM categories LIMIT 1`);
    const categoryId = categories[0]?.id;

    // --- SECTION 2: User Setup & Zero-State Verification ---
    console.log('\n--- Section 2: Zero-State Verification for Fresh Vendor ---');
    const ts = Date.now();
    const vendorEmailA = `vendor.earnings.a.${ts}@test.com`;
    const vendorEmailB = `vendor.earnings.b.${ts}@test.com`;
    const customerEmail = `customer.earnings.${ts}@test.com`;

    const vendorA = await registerVendor('Kavita Rathore', vendorEmailA, 'Kavita Cinematics', categoryId);
    assert(vendorA.vendorId, 'Vendor A registered with ID: ' + vendorA.vendorId);

    const vendorB = await registerVendor('Rohan Mehra', vendorEmailB, 'Mehra Decorators', categoryId);
    assert(vendorB.vendorId, 'Vendor B registered with ID: ' + vendorB.vendorId);

    const customer = await registerCustomer('Sneha Kapoor', customerEmail);
    assert(customer.user.id, 'Customer registered with ID: ' + customer.user.id);

    // Approve Vendor A
    await db.query(`UPDATE vendors SET verification_status = 'VERIFIED' WHERE id = ?`, [vendorA.vendorId]);
    await db.query(`UPDATE vendor_onboarding SET status = 'APPROVED' WHERE vendor_id = ?`, [vendorA.vendorId]);

    // Zero-state check on /api/vendor/earnings
    const initialEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      headers: { Cookie: vendorA.cookie },
    });
    const initialEarningsData = await initialEarningsRes.json();
    assert(initialEarningsRes.ok && initialEarningsData.success, 'Vendor A initial earnings fetched successfully');
    assert(initialEarningsData.data.summary.gross_revenue === 0, 'Initial gross revenue is 0');
    assert(initialEarningsData.data.summary.commission_deducted === 0, 'Initial commission deducted is 0');
    assert(initialEarningsData.data.summary.net_vendor_earnings === 0, 'Initial net vendor earnings is 0');
    assert(initialEarningsData.data.summary.settled_earnings === 0, 'Initial settled earnings is 0');
    assert(initialEarningsData.data.summary.pending_settlement === 0, 'Initial pending settlement is 0');
    assert(initialEarningsData.data.summary.escrow_held_earnings === 0, 'Initial escrow held earnings is 0');
    assert(initialEarningsData.data.summary.pipeline_requested_volume === 0, 'Initial pipeline requested volume is 0');
    assert(initialEarningsData.data.recent_payouts.length === 0, 'Initial recent payouts is empty array');
    assert(initialEarningsData.data.itemized_bookings.length === 0, 'Initial itemized bookings is empty array');

    // Zero-state check on /api/vendor/performance
    const initialPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorA.cookie },
    });
    const initialPerfData = await initialPerfRes.json();
    assert(initialPerfRes.ok && initialPerfData.success, 'Vendor A initial performance fetched successfully');
    assert(initialPerfData.data.metrics.profile_views === 0, 'Initial profile views is 0');
    assert(initialPerfData.data.metrics.inquiries_count === 0, 'Initial inquiries count is 0');
    assert(initialPerfData.data.metrics.confirmed_bookings_count === 0, 'Initial confirmed bookings count is 0');
    assert(initialPerfData.data.metrics.completed_bookings_count === 0, 'Initial completed bookings count is 0');
    assert(initialPerfData.data.metrics.conversion_rate === 0, 'Initial conversion rate is 0%');
    assert(initialPerfData.data.metrics.completion_rate === 0, 'Initial completion rate is 0%');
    assert(initialPerfData.data.reviews_summary.total_reviews === 0, 'Initial total reviews is 0');
    assert(initialPerfData.data.reviews_summary.recent_reviews.length === 0, 'Initial recent reviews is empty');

    // --- SECTION 3: Service, Package, and Requested Booking (Pipeline Stage) ---
    console.log('\n--- Section 3: Booking Request & Pipeline Inbound Tracking ---');
    const srvRes = await fetch(`${BASE_URL}/api/vendor/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({
        title: 'Cinematic Royal Wedding Films',
        category_id: categoryId,
        starting_price: 60000,
        service_location: 'Jaipur & Udaipur',
        description: 'Bespoke 4K cinematography coverage.',
      }),
    });
    const srvData = await srvRes.json();
    const serviceId = srvData.data.id;
    await db.query(`UPDATE vendor_services SET moderation_status = 'APPROVED', is_active = 1 WHERE id = ?`, [serviceId]);

    const pkgRes = await fetch(`${BASE_URL}/api/vendor/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({
        name: 'Grand Heritage Package',
        service_id: serviceId,
        package_tier: 'PREMIUM',
        price: 150000,
        guest_capacity: 400,
        description: 'Complete 3-day luxury film coverage.',
        included_items: ['Pre-wedding shoot', '4K Teaser', 'Traditional full documentary'],
      }),
    });
    const pkgData = await pkgRes.json();
    const packageId = pkgData.data.id;
    await db.query(`UPDATE vendor_packages SET moderation_status = 'APPROVED', is_active = 1 WHERE id = ?`, [packageId]);

    // Customer creates Booking 1 for ₹150,000
    const todayStr = new Date().toISOString().split('T')[0];
    const bookingDate1 = todayStr;
    const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customer.cookie },
      body: JSON.stringify({
        vendor_id: vendorA.vendorId,
        service_id: serviceId,
        package_id: packageId,
        event_date: bookingDate1,
        event_location: 'City Palace, Udaipur',
        guest_count: 300,
        special_instructions: 'Capture drone shots of lake entry.',
      }),
    });
    const bookData = await bookRes.json();
    assert(bookRes.ok && bookData.success, 'Customer created Booking 1 (₹150,000)');
    const booking1 = bookData.data;

    // Check pipeline earnings
    const pipelineEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      headers: { Cookie: vendorA.cookie },
    });
    const pipelineEarnings = (await pipelineEarningsRes.json()).data;
    assert(pipelineEarnings.summary.pipeline_requested_volume === 150000, 'Pipeline requested volume correctly reflects ₹150,000');
    assert(pipelineEarnings.summary.gross_revenue === 0, 'Gross revenue remains 0 while booking is REQUESTED');

    // Check inquiries count in performance
    const pipelinePerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorA.cookie },
    });
    const pipelinePerf = (await pipelinePerfRes.json()).data;
    assert(pipelinePerf.metrics.inquiries_count === 1, 'Performance inquiries_count incremented to 1');
    assert(pipelinePerf.metrics.total_leads === 1, 'Performance total_leads incremented to 1');

    // --- SECTION 4: Booking Confirmation & Escrow Held Earnings ---
    console.log('\n--- Section 4: Booking Confirmation & Escrow Earnings Calculation ---');
    const confirmRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.ok && confirmData.success, 'Vendor A accepted and confirmed Booking 1');

    const confirmedEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      headers: { Cookie: vendorA.cookie },
    });
    const confirmedEarnings = (await confirmedEarningsRes.json()).data;
    // Gross: 150,000, Commission: 10% = 15,000, Net Vendor Payable = 135,000
    assert(confirmedEarnings.summary.gross_revenue === 150000, 'Gross revenue updated to ₹150,000 upon confirmation');
    assert(confirmedEarnings.summary.commission_deducted === 15000, 'Commission deducted is 10% (₹15,000)');
    assert(confirmedEarnings.summary.commission_rate_applied === 10, 'Commission rate applied is 10%');
    assert(confirmedEarnings.summary.net_vendor_earnings === 135000, 'Net vendor earnings is ₹135,000');
    assert(confirmedEarnings.summary.escrow_held_earnings === 135000, 'Escrow held earnings is ₹135,000 (locked pending event)');
    assert(confirmedEarnings.summary.pending_settlement === 0, 'Pending settlement is 0 until completion');
    assert(confirmedEarnings.summary.settled_earnings === 0, 'Settled earnings is 0');
    assert(confirmedEarnings.summary.average_order_value === 150000, 'Average order value is ₹150,000');

    // Check confirmed conversion rate in performance
    const confirmedPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorA.cookie },
    });
    const confirmedPerf = (await confirmedPerfRes.json()).data;
    assert(confirmedPerf.metrics.confirmed_bookings_count === 1, 'Confirmed bookings count is 1');
    assert(confirmedPerf.metrics.conversion_rate === 100, 'Conversion rate is 100% (1 inquiry / 1 confirmed)');
    assert(confirmedPerf.metrics.acceptance_rate === 100, 'Acceptance rate is 100%');

    // --- SECTION 5: Event Completion & Automated Payout Generation ---
    console.log('\n--- Section 5: Event Completion & Automated Payout Ledger Generation ---');
    const completeRes = await fetch(`${BASE_URL}/api/bookings/${booking1.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const completeData = await completeRes.json();
    assert(completeRes.ok && completeData.success, 'Vendor A marked Booking 1 as COMPLETED');

    // Verify database directly: payouts table must have automated pending payout
    const [payoutRows] = await db.query(`SELECT * FROM payouts WHERE booking_id = ?`, [booking1.id]);
    assert(payoutRows.length === 1, 'Automated payout record inserted into MySQL payouts table');
    const payout1 = payoutRows[0];
    assert(payout1.vendor_id === vendorA.vendorId, 'Payout belongs to Vendor A');
    assert(parseFloat(payout1.amount) === 135000, 'Payout amount is exactly ₹135,000 (net after 10% commission)');
    assert(payout1.status === 'PENDING', 'Payout status is initialized to PENDING');
    assert(payout1.reference_id && payout1.reference_id.startsWith('PAY-'), 'Payout has formatted reference ID: ' + payout1.reference_id);

    // Verify /api/vendor/earnings after completion
    const completedEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      headers: { Cookie: vendorA.cookie },
    });
    const completedEarnings = (await completedEarningsRes.json()).data;
    assert(completedEarnings.summary.escrow_held_earnings === 0, 'Escrow held earnings dropped to 0 after completion');
    assert(completedEarnings.summary.pending_settlement === 135000, 'Pending settlement is now ₹135,000');
    assert(completedEarnings.summary.settled_earnings === 0, 'Settled earnings still 0 before admin clearance');
    assert(completedEarnings.recent_payouts.length === 1, 'recent_payouts contains 1 entry');
    assert(completedEarnings.recent_payouts[0].reference_id === payout1.reference_id, 'recent_payouts matches reference ID');
    assert(completedEarnings.recent_payouts[0].status === 'PENDING', 'recent_payouts status is PENDING');

    // Verify itemized bookings breakdown
    assert(completedEarnings.itemized_bookings.length === 1, 'itemized_bookings contains 1 booking');
    const item1 = completedEarnings.itemized_bookings[0];
    assert(item1.booking_number === booking1.booking_number, 'itemized_booking matches booking number');
    assert(item1.gross_amount === 150000, 'itemized_booking gross_amount is 150,000');
    assert(item1.commission_amount === 15000, 'itemized_booking commission_amount is 15,000');
    assert(item1.net_vendor_payout === 135000, 'itemized_booking net_vendor_payout is 135,000');
    assert(item1.settlement_status === 'PENDING', 'itemized_booking settlement_status is PENDING');

    // Check performance completion metrics
    const completedPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorA.cookie },
    });
    const completedPerf = (await completedPerfRes.json()).data;
    assert(completedPerf.metrics.completed_bookings_count === 1, 'Completed bookings count is 1');
    assert(completedPerf.metrics.completion_rate === 100, 'Completion rate is 100%');

    // --- SECTION 6: Admin Settlement Disbursement Update ---
    console.log('\n--- Section 6: Settlement Clearing to PAID Status ---');
    const now = new Date();
    await db.query(`UPDATE payouts SET status = 'PAID', payout_date = ? WHERE id = ?`, [now, payout1.id]);

    const settledEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      headers: { Cookie: vendorA.cookie },
    });
    const settledEarnings = (await settledEarningsRes.json()).data;
    assert(settledEarnings.summary.settled_earnings === 135000, 'Settled earnings is now ₹135,000 after payout marked PAID');
    assert(settledEarnings.summary.pending_settlement === 0, 'Pending settlement reduced to 0');
    assert(settledEarnings.recent_payouts[0].status === 'PAID', 'recent_payouts status updated to PAID');
    assert(settledEarnings.itemized_bookings[0].settlement_status === 'PAID', 'itemized_bookings settlement_status updated to PAID');

    // --- SECTION 7: Period Filtering Validation ---
    console.log('\n--- Section 7: Multi-Period Filtering Validation ---');
    // Test THIS_MONTH
    const tmRes = await fetch(`${BASE_URL}/api/vendor/earnings?period=THIS_MONTH`, {
      headers: { Cookie: vendorA.cookie },
    });
    const tmData = (await tmRes.json()).data;
    assert(tmData.summary.gross_revenue === 150000, 'THIS_MONTH filter captures the booking');

    // Test THIS_YEAR
    const tyRes = await fetch(`${BASE_URL}/api/vendor/earnings?period=THIS_YEAR`, {
      headers: { Cookie: vendorA.cookie },
    });
    const tyData = (await tyRes.json()).data;
    assert(tyData.summary.gross_revenue === 150000, 'THIS_YEAR filter captures the booking');

    // Test LAST_MONTH (should not contain today's booking)
    const lmRes = await fetch(`${BASE_URL}/api/vendor/earnings?period=LAST_MONTH`, {
      headers: { Cookie: vendorA.cookie },
    });
    const lmData = (await lmRes.json()).data;
    assert(lmData.summary.gross_revenue === 0, 'LAST_MONTH filter returns 0 gross revenue');
    assert(lmData.itemized_bookings.length === 0, 'LAST_MONTH itemized bookings is empty');

    // Test CUSTOM range matching today
    const customMatchingRes = await fetch(`${BASE_URL}/api/vendor/earnings?period=CUSTOM&from_date=${todayStr}&to_date=${todayStr}`, {
      headers: { Cookie: vendorA.cookie },
    });
    const customMatchingData = (await customMatchingRes.json()).data;
    assert(customMatchingData.summary.gross_revenue === 150000, 'CUSTOM range covering today captures the booking');

    // Test CUSTOM range in past (2020)
    const customPastRes = await fetch(`${BASE_URL}/api/vendor/earnings?period=CUSTOM&from_date=2020-01-01&to_date=2020-12-31`, {
      headers: { Cookie: vendorA.cookie },
    });
    const customPastData = (await customPastRes.json()).data;
    assert(customPastData.summary.gross_revenue === 0, 'CUSTOM range in past returns 0');

    // --- SECTION 8: Profile Views Analytics & Verified Reviews Integration ---
    console.log('\n--- Section 8: Profile Views Tracking & Customer Reviews Integration ---');
    // Public visit to Vendor A's profile (triggers analytics_events logging)
    const publicProfileRes = await fetch(`${BASE_URL}/api/vendors/${vendorA.vendorId}`);
    assert(publicProfileRes.ok, 'Public profile visited successfully');

    // Check performance profile views
    const viewPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorA.cookie },
    });
    const viewPerf = (await viewPerfRes.json()).data;
    assert(viewPerf.metrics.profile_views >= 1, 'Vendor profile view captured in performance metrics: ' + viewPerf.metrics.profile_views);

    // Insert verified customer review into MySQL reviews table
    const [cpRows] = await db.query(`SELECT id FROM customer_profiles WHERE user_id = ?`, [customer.user.id]);
    const customerProfileId = cpRows[0].id;
    await db.query(`
      INSERT INTO reviews (id, vendor_id, customer_id, rating, comment, is_verified_booking, moderation_status, created_at)
      VALUES (UUID(), ?, ?, 5, 'Exceptional royal cinematography! The teaser brought tears to our eyes.', 1, 'APPROVED', NOW())
    `, [vendorA.vendorId, customerProfileId]);

    const reviewPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorA.cookie },
    });
    const reviewPerf = (await reviewPerfRes.json()).data;
    assert(reviewPerf.reviews_summary.total_reviews === 1, 'Reviews summary total_reviews is 1');
    assert(reviewPerf.reviews_summary.average_rating === 5.0, 'Reviews summary average_rating is 5.0');
    assert(reviewPerf.reviews_summary.rating_distribution['5_star'] === 1, '5-star rating count is 1');
    assert(reviewPerf.reviews_summary.recent_reviews.length === 1, 'recent_reviews has 1 entry');
    assert(reviewPerf.reviews_summary.recent_reviews[0].comment.includes('Exceptional royal cinematography'), 'Review comment matches verified text');

    // --- SECTION 9: Multi-Booking Metrics (Cancellation Rate) ---
    console.log('\n--- Section 9: Multi-Booking Metrics & Cancellation Tracking ---');
    // Customer creates Booking 2 for ₹80,000
    const bookRes2 = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customer.cookie },
      body: JSON.stringify({
        vendor_id: vendorA.vendorId,
        service_id: serviceId,
        package_id: packageId,
        event_date: '2026-12-25',
        event_location: 'Taj Lake Palace, Udaipur',
        guest_count: 200,
        special_instructions: 'Christmas wedding coverage.',
      }),
    });
    const bookData2 = await bookRes2.json();
    const booking2 = bookData2.data;

    // Vendor declines Booking 2
    const cancelRes = await fetch(`${BASE_URL}/api/bookings/${booking2.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ status: 'CANCELLED', cancellation_reason: 'Fully booked for holiday weekend' }),
    });
    assert(cancelRes.ok, 'Booking 2 cancelled successfully');

    const multiPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorA.cookie },
    });
    const multiPerf = (await multiPerfRes.json()).data;
    assert(multiPerf.metrics.inquiries_count === 2, 'Total inquiries count is 2');
    assert(multiPerf.metrics.cancelled_bookings_count === 1, 'Cancelled bookings count is 1');
    assert(multiPerf.metrics.cancellation_rate === 50, 'Cancellation rate is 50% (1 cancelled out of 2)');

    // --- SECTION 10: Strict Tenant Isolation & Security ---
    console.log('\n--- Section 10: Strict Tenant Isolation & Security Verification ---');
    // Vendor B must NOT see Vendor A's earnings
    const vendorBEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      headers: { Cookie: vendorB.cookie },
    });
    const vendorBEarnings = (await vendorBEarningsRes.json()).data;
    assert(vendorBEarnings.summary.gross_revenue === 0, 'Tenant Isolation: Vendor B gross revenue is 0');
    assert(vendorBEarnings.recent_payouts.length === 0, 'Tenant Isolation: Vendor B has 0 payouts');
    assert(vendorBEarnings.itemized_bookings.length === 0, 'Tenant Isolation: Vendor B has 0 itemized bookings');

    // Vendor B must NOT see Vendor A's performance
    const vendorBPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: vendorB.cookie },
    });
    const vendorBPerf = (await vendorBPerfRes.json()).data;
    assert(vendorBPerf.metrics.profile_views === 0, 'Tenant Isolation: Vendor B profile views is 0');
    assert(vendorBPerf.metrics.inquiries_count === 0, 'Tenant Isolation: Vendor B inquiries count is 0');
    assert(vendorBPerf.reviews_summary.total_reviews === 0, 'Tenant Isolation: Vendor B reviews count is 0');

    // Anonymous request rejected
    const anonEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`);
    assert(anonEarningsRes.status === 401, 'Security: Anonymous request to /api/vendor/earnings rejected with 401');

    const anonPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`);
    assert(anonPerfRes.status === 401, 'Security: Anonymous request to /api/vendor/performance rejected with 401');

    // Customer request rejected (role check)
    const custEarningsRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      headers: { Cookie: customer.cookie },
    });
    assert(custEarningsRes.status === 403, 'Security: Customer request to /api/vendor/earnings rejected with 403');

    const custPerfRes = await fetch(`${BASE_URL}/api/vendor/performance`, {
      headers: { Cookie: customer.cookie },
    });
    assert(custPerfRes.status === 403, 'Security: Customer request to /api/vendor/performance rejected with 403');

    // Read-only guarantee: attempt POST / PATCH on /api/vendor/earnings
    const mutateRes = await fetch(`${BASE_URL}/api/vendor/earnings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: vendorA.cookie },
      body: JSON.stringify({ amount: 999999 }),
    });
    assert(mutateRes.status === 405, 'Security: POST /api/vendor/earnings rejected with 405 Method Not Allowed (strictly read-only)');

    await db.end();

    console.log(`\n=== Earnings & Performance Test Suite Completed ===`);
    console.log(`Total Assertions Passed: ${passed}`);
    console.log(`Total Assertions Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error running verification suite:', err);
    process.exit(1);
  }
}

runTests();
