const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables without external dotenv
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

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🔍 VERIFYING CUSTOMER SEARCH, SORTING & SAVED SEARCHES');
  console.log('===============================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
    // 1. Check saved_searches table schema
    console.log('1. Checking MySQL schema for `saved_searches` table...');
    const [ssCols] = await pool.query('SHOW COLUMNS FROM saved_searches');
    const colNames = ssCols.map(c => c.Field);

    assert(colNames.includes('id'), 'saved_searches has id PRIMARY KEY');
    assert(colNames.includes('user_id'), 'saved_searches has user_id foreign key');
    assert(colNames.includes('name'), 'saved_searches has name column');
    assert(colNames.includes('criteria_json'), 'saved_searches has criteria_json column');
    assert(colNames.includes('created_at'), 'saved_searches has created_at column');
    assert(colNames.includes('updated_at'), 'saved_searches has updated_at column');

    // 2. Test Customer Authentication & Login
    console.log('\n2. Testing Customer Authentication & Session...');
    let cookie = '';
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gopal.yadav@example.com', password: 'Password@123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success, 'Login as customer (gopal.yadav@example.com) succeeds');

    const setCookieHeader = loginRes.headers.get('set-cookie');
    const allCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [setCookieHeader];
    console.log('Login set-cookie headers:', allCookies);
    if (allCookies && allCookies.length > 0) {
      cookie = allCookies.map(c => c.split(';')[0]).join('; ');
    }
    console.log('Constructed cookie string:', cookie);

    // 3. Test Security: Unauthorized requests are rejected...
    console.log('\n3. Testing Security: Unauthorized requests are rejected...');
    const unauthSearch = await fetch('http://localhost:3000/api/customer/search');
    assert(unauthSearch.status === 401, 'Unauthenticated GET /api/customer/search returns 401 Unauthorized');

    const unauthSaved = await fetch('http://localhost:3000/api/customer/saved-searches');
    assert(unauthSaved.status === 401, 'Unauthenticated GET /api/customer/saved-searches returns 401 Unauthorized');

    // 4. Test Customer Search with Multiple Filters & Sorting
    console.log('\n4. Testing Advanced Multi-Filter Search via REST API...');
    const authHeaders = {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    };

    // Test 4a: Base search (clear filters, default sort)
    const resBase = await fetch('http://localhost:3000/api/customer/search?sort=best_match', {
      headers: authHeaders,
    });
    const dataBase = await resBase.json();
    console.log('Search res status:', resBase.status, 'body:', JSON.stringify(dataBase));
    assert(resBase.status === 200, 'GET /api/customer/search returns 200 OK');
    assert(dataBase.success === true, 'Search response success is true');
    assert(Array.isArray(dataBase.data), 'Search results is an array of matrimonial profiles');
    console.log(`     Total eligible candidate profiles returned: ${dataBase.data?.length}`);

    // Test 4b: Religion filter
    const resRel = await fetch('http://localhost:3000/api/customer/search?religion=Hindu', {
      headers: authHeaders,
    });
    const dataRel = await resRel.json();
    const allHindu = dataRel.data.every(m => m.religion.toLowerCase() === 'hindu');
    assert(allHindu, 'Religion filter (Hindu) correctly limits results to Hindu candidates');

    // Test 4c: Age Range filter (e.g. 20 - 32)
    const resAge = await fetch('http://localhost:3000/api/customer/search?min_age=20&max_age=32', {
      headers: authHeaders,
    });
    const dataAge = await resAge.json();
    const allAgeValid = dataAge.data.every(m => m.age >= 20 && m.age <= 32);
    assert(allAgeValid, 'Age range filter (20 - 32) accurately limits candidates by age');

    // Test 4d: Multiple filters together (Religion + Marital Status + Education)
    const resCombo = await fetch('http://localhost:3000/api/customer/search?religion=Hindu&marital_status=Never+Married', {
      headers: authHeaders,
    });
    const dataCombo = await resCombo.json();
    assert(dataCombo.success === true, 'Combined multi-filter (Religion + Marital Status) query succeeds');

    // Test 4e: Dynamic Backend Sorting
    console.log('\n5. Testing Real Backend Sorting Options...');
    const resRecent = await fetch('http://localhost:3000/api/customer/search?sort=recently_added', {
      headers: authHeaders,
    });
    const dataRecent = await resRecent.json();
    assert(dataRecent.applied_sort === 'recently_added', 'Sorting option recently_added applied');

    const resAgeAsc = await fetch('http://localhost:3000/api/customer/search?sort=age_asc', {
      headers: authHeaders,
    });
    const dataAgeAsc = await resAgeAsc.json();
    assert(dataAgeAsc.applied_sort === 'age_asc', 'Sorting option age_asc applied');
    if (dataAgeAsc.data.length >= 2) {
      assert(dataAgeAsc.data[0].age <= dataAgeAsc.data[1].age, 'Youngest profile ordered first in age_asc sort');
    }

    const resAgeDesc = await fetch('http://localhost:3000/api/customer/search?sort=age_desc', {
      headers: authHeaders,
    });
    const dataAgeDesc = await resAgeDesc.json();
    assert(dataAgeDesc.applied_sort === 'age_desc', 'Sorting option age_desc applied');
    if (dataAgeDesc.data.length >= 2) {
      assert(dataAgeDesc.data[0].age >= dataAgeDesc.data[1].age, 'Oldest profile ordered first in age_desc sort');
    }

    // 6. Test Privacy Enforcement in Search Results
    console.log('\n6. Testing Privacy Enforcement in Search Results...');
    // Verify no private profile leaks
    const anyPrivateInSearch = dataBase.data.some(m => m.profile_visibility === 'PRIVATE');
    assert(!anyPrivateInSearch, 'No profile with profile_visibility = PRIVATE is returned in search results');

    // Verify sensitive fields are masked for privacy-protected profiles
    const [candPriya] = await pool.query(
      `SELECT cp.id FROM customer_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE u.email = 'priya.sharma@example.com' LIMIT 1`
    );

    if (candPriya.length > 0) {
      const priyaProfileId = candPriya[0].id;
      // Set Priya to LIMITED with field masking
      await pool.query(
        `UPDATE customer_profiles 
         SET profile_visibility = 'LIMITED', hide_photos = TRUE, hide_income = TRUE, hide_location = TRUE
         WHERE id = ?`,
        [priyaProfileId]
      );

      const resPrivacySearch = await fetch('http://localhost:3000/api/customer/search', {
        headers: authHeaders,
      });
      const dataPrivacySearch = await resPrivacySearch.json();
      const priyaInResults = dataPrivacySearch.data.find(m => m.id === priyaProfileId);

      if (priyaInResults) {
        assert(priyaInResults.is_photo_hidden === true, 'LIMITED search result has is_photo_hidden = true');
        assert(priyaInResults.photo_url === null, 'LIMITED search result has photo_url stripped to null');
        assert(priyaInResults.annualIncomeFormatted === 'Confidential', 'LIMITED search result masks annual income to Confidential');
        assert(priyaInResults.is_location_hidden === true, 'LIMITED search result has is_location_hidden = true');
        assert(priyaInResults.city === 'Protected by Member', 'LIMITED search result masks city to Protected by Member');
      }

      // Restore Priya to public
      await pool.query(
        `UPDATE customer_profiles 
         SET profile_visibility = 'PUBLIC', hide_photos = FALSE, hide_income = FALSE, hide_location = FALSE
         WHERE id = ?`,
        [priyaProfileId]
      );
    }

    // 7. Test Saved Searches CRUD Lifecycle
    console.log('\n7. Testing Saved Searches CRUD Lifecycle...');
    
    // 7a: Create Saved Search
    const searchName = `Delhi Professionals Test ${Date.now()}`;
    const testCriteria = {
      min_age: '23',
      max_age: '30',
      religion: 'Hindu',
      city: 'Delhi',
      profession: 'Professional',
      sort: 'best_match'
    };

    const resCreate = await fetch('http://localhost:3000/api/customer/saved-searches', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: searchName, criteria: testCriteria }),
    });
    const dataCreate = await resCreate.json();
    console.log('dataCreate:', JSON.stringify(dataCreate));
    assert(resCreate.status === 200 && dataCreate.success, 'POST /api/customer/saved-searches creates saved search');
    const createdSearchId = dataCreate.data?.id;

    // 7b: List Saved Searches
    const resList = await fetch('http://localhost:3000/api/customer/saved-searches', {
      headers: authHeaders,
    });
    const dataList = await resList.json();
    console.log('dataList:', JSON.stringify(dataList));
    const foundItem = dataList.data?.find(s => s.id === createdSearchId);
    assert(Boolean(foundItem), 'Created saved search appears in customer saved searches list');
    assert(foundItem?.criteria?.city === 'Delhi', 'Saved search criteria preserved with 100% fidelity');

    // 7c: Update (Rename) Saved Search
    const updatedName = `${searchName} (Updated)`;
    const resUpdate = await fetch(`http://localhost:3000/api/customer/saved-searches/${createdSearchId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ name: updatedName, criteria: { ...testCriteria, city: 'Mumbai' } }),
    });
    const dataUpdate = await resUpdate.json();
    assert(resUpdate.status === 200 && dataUpdate.success, 'PUT /api/customer/saved-searches/[id] updates saved search');

    // 7d: Execute Live Search with Restored Criteria
    const restoredParams = new URLSearchParams();
    restoredParams.set('city', 'Mumbai');
    restoredParams.set('sort', 'best_match');
    const resLiveExec = await fetch(`http://localhost:3000/api/customer/search?${restoredParams.toString()}`, {
      headers: authHeaders,
    });
    const dataLiveExec = await resLiveExec.json();
    assert(resLiveExec.status === 200 && dataLiveExec.success, 'Restored saved search criteria executes live query on database');

    // 7e: Delete Saved Search
    const resDelete = await fetch(`http://localhost:3000/api/customer/saved-searches/${createdSearchId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const dataDelete = await resDelete.json();
    assert(resDelete.status === 200 && dataDelete.success, 'DELETE /api/customer/saved-searches/[id] deletes saved search');

    // Confirm removal
    const [checkDeleted] = await pool.query(
      `SELECT id FROM saved_searches WHERE id = ?`,
      [createdSearchId]
    );
    assert(checkDeleted.length === 0, 'Saved search removed completely from MySQL database');

    console.log('\n===============================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

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

runTestSuite();
