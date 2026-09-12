const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'wedwithme_super_secret_jwt_key_2026_production';
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== WedWithMe Customer Suite Verification ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wedwithme',
  });

  try {
    // 1. Get 2 active customers with customer_profiles
    const [users] = await connection.query(`
      SELECT u.id, u.email, u.name, u.role, cp.id as profile_id
      FROM users u
      JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'CUSTOMER' AND u.status = 'ACTIVE'
      LIMIT 2
    `);

    if (users.length < 2) {
      console.error('❌ Need at least 2 active customers with profiles in DB.');
      process.exit(1);
    }

    const userA = users[0];
    const userB = users[1];
    console.log(`User A (Tester): ${userA.name} (${userA.email}) [Profile: ${userA.profile_id}]`);
    console.log(`User B (Target): ${userB.name} (${userB.email}) [Profile: ${userB.profile_id}]\n`);

    const tokenA = jwt.sign(
      { id: userA.id, email: userA.email, name: userA.name, role: userA.role, profile_id: userA.profile_id },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const tokenB = jwt.sign(
      { id: userB.id, email: userB.email, name: userB.name, role: userB.role, profile_id: userB.profile_id },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const authHeaderA = {
      Cookie: `wwm_auth_token=${tokenA}`,
      'Content-Type': 'application/json',
    };
    const authHeaderB = {
      Cookie: `wwm_auth_token=${tokenB}`,
      'Content-Type': 'application/json',
    };

    // Clean previous test artifacts between A and B
    await connection.query('DELETE FROM shortlists WHERE customer_id = ? OR target_profile_id = ?', [userA.profile_id, userB.profile_id]);
    await connection.query('DELETE FROM blocked_profiles WHERE user_id IN (?, ?) OR blocked_user_id IN (?, ?)', [userA.id, userB.id, userA.id, userB.id]);
    await connection.query('DELETE FROM customer_reports WHERE reporter_user_id = ?', [userA.id]);

    // ================= TEST 1: SHORTLIST FUNCTIONALITY =================
    console.log('--- 1. Testing Shortlist Add, View & Remove ---');
    // Add User B to User A's shortlist
    const addShortlistRes = await fetch(`${BASE_URL}/api/customer/shortlist`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ target_profile_id: userB.profile_id, action: 'add' }),
    });
    const addShortlistData = await addShortlistRes.json();
    console.log('Shortlist Add Response:', addShortlistData);
    if (!addShortlistData.success) throw new Error('Shortlist Add failed');

    // Retrieve Shortlist
    const getShortlistRes = await fetch(`${BASE_URL}/api/customer/shortlist`, {
      headers: authHeaderA,
    });
    const getShortlistData = await getShortlistRes.json();
    const foundB = getShortlistData.shortlists?.find((p) => p.id === userB.profile_id);
    if (!foundB) throw new Error('User B not found in User A shortlist');
    console.log(`✓ User B successfully listed in User A shortlist (Count: ${getShortlistData.count})`);

    // Remove from Shortlist via DELETE
    const delShortlistRes = await fetch(`${BASE_URL}/api/customer/shortlist?target_profile_id=${userB.profile_id}`, {
      method: 'DELETE',
      headers: authHeaderA,
    });
    const delShortlistData = await delShortlistRes.json();
    console.log('Shortlist Delete Response:', delShortlistData);
    if (!delShortlistData.success) throw new Error('Shortlist Delete failed');
    console.log('✓ Shortlist Add, Get & Remove verified successfully!\n');

    // ================= TEST 2: BLOCKING & MUTUAL EXCLUSION =================
    console.log('--- 2. Testing Blocking & Mutual Exclusion ---');
    // First, add back to shortlist to test auto-clearing upon block
    await fetch(`${BASE_URL}/api/customer/shortlist`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({ target_profile_id: userB.profile_id, action: 'add' }),
    });

    // User A blocks User B
    const blockRes = await fetch(`${BASE_URL}/api/customer/blocks`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({
        target_profile_id: userB.profile_id,
        target_user_id: userB.id,
        reason: 'Verification test block',
      }),
    });
    const blockData = await blockRes.json();
    console.log('Block User Response:', blockData);
    if (!blockData.success) throw new Error('Block User failed');

    // Verify User A blocked list
    const listBlocksRes = await fetch(`${BASE_URL}/api/customer/blocks`, {
      headers: authHeaderA,
    });
    const listBlocksData = await listBlocksRes.json();
    const foundBlock = listBlocksData.blocks?.find((b) => b.blocked_user_id === userB.id);
    if (!foundBlock) throw new Error('Blocked user not found in blocks list');
    console.log(`✓ User B listed in User A blocks (${foundBlock.name}, reason: ${foundBlock.reason})`);

    // Verify Shortlist was auto-cleared upon blocking
    const checkShortlistPostBlock = await fetch(`${BASE_URL}/api/customer/shortlist`, {
      headers: authHeaderA,
    });
    const slPostBlock = await checkShortlistPostBlock.json();
    const slFound = slPostBlock.shortlists?.find((p) => p.id === userB.profile_id);
    if (slFound) throw new Error('Shortlist entry was NOT cleared after blocking!');
    console.log('✓ Shortlist entry between blocked users was automatically severed.');

    // Verify direct profile view is blocked (Mutual exclusion)
    const profileViewRes = await fetch(`${BASE_URL}/api/customer/profiles/${userB.profile_id}`, {
      headers: authHeaderA,
    });
    console.log('Direct profile view status code when blocked:', profileViewRes.status);
    if (profileViewRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${profileViewRes.status}`);
    console.log('✓ Direct profile view correctly returned 403 Forbidden due to block.');

    // Verify reverse: User B cannot view User A's profile either
    const reverseViewRes = await fetch(`${BASE_URL}/api/customer/profiles/${userA.profile_id}`, {
      headers: authHeaderB,
    });
    console.log('Reverse direct profile view status code:', reverseViewRes.status);
    if (reverseViewRes.status !== 403) throw new Error(`Expected 403 Forbidden for reverse view, got ${reverseViewRes.status}`);
    console.log('✓ Reverse profile view correctly blocked mutually with 403 Forbidden.');

    // Unblock User B
    const unblockRes = await fetch(`${BASE_URL}/api/customer/blocks?target_user_id=${userB.id}`, {
      method: 'DELETE',
      headers: authHeaderA,
    });
    const unblockData = await unblockRes.json();
    console.log('Unblock User Response:', unblockData);
    if (!unblockData.success) throw new Error('Unblock failed');
    console.log('✓ Unblocking verified successfully!\n');

    // ================= TEST 3: REPORTING & DUPLICATE LIMIT =================
    console.log('--- 3. Testing Profile Reporting & Rate Limiting ---');
    // Submit valid report
    const reportRes = await fetch(`${BASE_URL}/api/customer/reports`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({
        reported_profile_id: userB.profile_id,
        reported_user_id: userB.id,
        category: 'ABUSE',
        description: 'Test report for harassment behavior',
      }),
    });
    const reportData = await reportRes.json();
    console.log('Report Submission Response:', reportData);
    if (!reportData.success) throw new Error('Report submission failed');
    console.log('✓ Report successfully recorded in database.');

    // Attempt immediate duplicate report -> Should be rate limited (429)
    const dupReportRes = await fetch(`${BASE_URL}/api/customer/reports`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({
        reported_profile_id: userB.profile_id,
        reported_user_id: userB.id,
        category: 'FRAUD',
        description: 'Duplicate test report within 24 hours',
      }),
    });
    console.log('Duplicate report status code:', dupReportRes.status);
    if (dupReportRes.status !== 429) throw new Error(`Expected 429 Too Many Requests, got ${dupReportRes.status}`);
    console.log('✓ 24-hour duplicate report prevention verified (429 returned).');

    // Test invalid category validation
    const invalidCatRes = await fetch(`${BASE_URL}/api/customer/reports`, {
      method: 'POST',
      headers: authHeaderA,
      body: JSON.stringify({
        reported_profile_id: userB.profile_id,
        reported_user_id: userB.id,
        category: 'INVALID_CATEGORY',
      }),
    });
    console.log('Invalid category status code:', invalidCatRes.status);
    if (invalidCatRes.status !== 400) throw new Error(`Expected 400 Bad Request, got ${invalidCatRes.status}`);
    console.log('✓ Category schema validation verified (400 returned).\n');

    // ================= TEST 4: ACCOUNT DELETION WORKFLOW =================
    console.log('--- 4. Testing Account Deletion Request Workflow ---');
    // Create a temporary test user to test deletion without affecting permanent accounts
    const testEmail = `test_delete_${Date.now()}@example.com`;
    const [insertResult] = await connection.query(`
      INSERT INTO users (id, email, password_hash, name, role, status)
      VALUES (UUID(), ?, 'hash123', 'Test Deletion User', 'CUSTOMER', 'ACTIVE')
    `, [testEmail]);

    const [createdUserRows] = await connection.query('SELECT id, email, role FROM users WHERE email = ?', [testEmail]);
    const delUser = createdUserRows[0];

    await connection.query(`
      INSERT INTO customer_profiles (id, user_id, gender, profile_visibility, verification_status)
      VALUES (UUID(), ?, 'MALE', 'PUBLIC', 'APPROVED')
    `, [delUser.id]);

    const delToken = jwt.sign(
      { id: delUser.id, email: delUser.email, name: 'Test Deletion User', role: delUser.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Call Account Deletion API
    const deleteRes = await fetch(`${BASE_URL}/api/customer/account/delete`, {
      method: 'POST',
      headers: {
        Cookie: `wwm_auth_token=${delToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Testing automated deletion workflow', confirmation: true }),
    });
    const deleteData = await deleteRes.json();
    console.log('Account Deletion API Response:', deleteData);
    if (!deleteData.success) throw new Error('Account deletion request failed');

    // Check cookie clear header
    const setCookieHeader = deleteRes.headers.get('set-cookie');
    console.log('Set-Cookie on Deletion:', setCookieHeader);
    if (!setCookieHeader || !setCookieHeader.includes('Max-Age=0')) {
      console.warn('⚠️ Warning: set-cookie did not clear token Max-Age=0');
    }

    // Verify DB state
    const [dbUserRows] = await connection.query('SELECT status, deleted_at FROM users WHERE id = ?', [delUser.id]);
    const [dbProfileRows] = await connection.query('SELECT profile_visibility FROM customer_profiles WHERE user_id = ?', [delUser.id]);
    const [dbReqRows] = await connection.query('SELECT * FROM account_deletion_requests WHERE user_id = ?', [delUser.id]);

    console.log(`DB User Status: ${dbUserRows[0].status}, Deleted At: ${dbUserRows[0].deleted_at}`);
    console.log(`DB Profile Visibility: ${dbProfileRows[0].profile_visibility}`);
    console.log(`DB Deletion Request records found: ${dbReqRows.length}`);

    if (dbUserRows[0].status !== 'SUSPENDED') throw new Error('User status was not set to SUSPENDED');
    if (dbProfileRows[0].profile_visibility !== 'PRIVATE') throw new Error('Profile visibility was not set to PRIVATE');
    if (dbReqRows.length === 0) throw new Error('account_deletion_requests row was not created');

    console.log('✓ Account Deletion immediate deactivation & private visibility verified.\n');

    // Clean up temporary user
    await connection.query('DELETE FROM account_deletion_requests WHERE user_id = ?', [delUser.id]);
    await connection.query('DELETE FROM customer_profiles WHERE user_id = ?', [delUser.id]);
    await connection.query('DELETE FROM users WHERE id = ?', [delUser.id]);

    // Clean up report record created in Test 3
    await connection.query('DELETE FROM customer_reports WHERE reporter_user_id = ?', [userA.id]);

    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY! Customer Matrimonial Suite is verified & operational.');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
