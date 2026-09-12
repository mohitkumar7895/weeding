const BASE_URL = 'http://localhost:3000';

const credentials = {
  SUPER_ADMIN: { email: 'admin@wedwithme.com', password: 'Password@123' },
  ADMIN: { email: 'admin.ops@wedwithme.com', password: 'Password@123' },
  SUPPORT: { email: 'support@wedwithme.com', password: 'Password@123' },
  FINANCE: { email: 'finance@wedwithme.com', password: 'Password@123' },
};

async function login(role) {
  const creds = credentials[role];
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });

  const cookieHeader = res.headers.get('set-cookie');
  const body = await res.json();
  if (!body.success) {
    throw new Error(`Login failed for ${role}: ${body.message}`);
  }

  // Extract auth token cookie
  let cookie = '';
  if (cookieHeader) {
    cookie = cookieHeader.split(';')[0];
  }
  return { role, cookie, user: body.user };
}

async function testEndpoint(role, cookie, name, url, method = 'GET', body = null, expectedStatus = 200) {
  const options = {
    method,
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${url}`, options);
  const data = await res.json().catch(() => ({}));
  const pass = res.status === expectedStatus;

  const symbol = pass ? '✅' : '❌';
  console.log(`  ${symbol} [${role}] ${method} ${name} -> Expected ${expectedStatus}, Got ${res.status}`);
  if (!pass) {
    console.log(`     Error details:`, data);
  }
  return pass;
}

async function runRBACTests() {
  console.log('====================================================');
  console.log('🔒 Testing Section 5: Admin Roles and Permissions RBAC');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  async function check(...args) {
    totalTests++;
    const passed = await testEndpoint(...args);
    if (passed) passedTests++;
  }

  // 1. Log in all roles
  console.log('🔑 Authenticating all 4 Administrative Roles...');
  const superAdmin = await login('SUPER_ADMIN');
  const admin = await login('ADMIN');
  const support = await login('SUPPORT');
  const finance = await login('FINANCE');
  console.log('   All 4 accounts authenticated.\n');

  // --- SUPER_ADMIN Tests ---
  console.log('👑 [SUPER_ADMIN] Full Platform Governance & Root Privileges');
  await check('SUPER_ADMIN', superAdmin.cookie, 'Admin Stats', '/api/admin/stats', 'GET', null, 200);
  await check('SUPER_ADMIN', superAdmin.cookie, 'Audit Logs', '/api/admin/audit-logs', 'GET', null, 200);
  await check('SUPER_ADMIN', superAdmin.cookie, 'Staff List (Roles GET)', '/api/admin/roles', 'GET', null, 200);

  // Fetch weights first to send a valid 100% payload
  const weightsRes = await fetch(`${BASE_URL}/api/admin/weights`, { headers: { Cookie: superAdmin.cookie } });
  const weightsData = await weightsRes.json();
  const validWeightsPayload = weightsData.data.map(w => ({ id: w.id, weight_percent: Number(w.weight_percent), is_active: true }));
  await check('SUPER_ADMIN', superAdmin.cookie, 'Configure Match Weights', '/api/admin/weights', 'PUT', { weights: validWeightsPayload }, 200);
  await check('SUPER_ADMIN', superAdmin.cookie, 'Payouts List', '/api/admin/payouts', 'GET', null, 200);
  await check('SUPER_ADMIN', superAdmin.cookie, 'Commission Rules', '/api/admin/commission-rules', 'GET', null, 200);
  await check('SUPER_ADMIN', superAdmin.cookie, 'Vendor Onboarding', '/api/admin/vendors', 'GET', null, 200);
  await check('SUPER_ADMIN', superAdmin.cookie, 'Review Moderation', '/api/admin/reviews', 'GET', null, 200);
  await check('SUPER_ADMIN', superAdmin.cookie, 'Disputes Listing', '/api/disputes', 'GET', null, 200);

  console.log('\n🛡️ [ADMIN] Operations Management (No finance / role admin / audit logs)');
  await check('ADMIN', admin.cookie, 'Admin Stats', '/api/admin/stats', 'GET', null, 200);
  await check('ADMIN', admin.cookie, 'Vendor Onboarding', '/api/admin/vendors', 'GET', null, 200);
  await check('ADMIN', admin.cookie, 'Disputes Listing', '/api/disputes', 'GET', null, 200);
  await check('ADMIN', admin.cookie, 'Review Moderation', '/api/admin/reviews', 'GET', null, 200);
  await check('ADMIN', admin.cookie, 'Staff List (Read allowed)', '/api/admin/roles', 'GET', null, 200);
  // Protected restrictions
  await check('ADMIN', admin.cookie, 'Audit Logs (Restricted)', '/api/admin/audit-logs', 'GET', null, 403);
  await check('ADMIN', admin.cookie, 'Reassign Roles (Restricted)', '/api/admin/roles', 'PUT', { user_id: support.user.id, new_role: 'ADMIN' }, 403);
  await check('ADMIN', admin.cookie, 'Configure Match Weights (Restricted)', '/api/admin/weights', 'PUT', { weights: [] }, 403);
  await check('ADMIN', admin.cookie, 'Payouts Ledger (Restricted)', '/api/admin/payouts', 'GET', null, 403);
  await check('ADMIN', admin.cookie, 'Create Commission Rule (Restricted)', '/api/admin/commission-rules', 'POST', { rule_name: 'Test', commission_type: 'PERCENTAGE', commission_value: 10 }, 403);

  console.log('\n🎧 [SUPPORT] Support Cases & Disputes (No financial or role-administration)');
  await check('SUPPORT', support.cookie, 'Admin Stats', '/api/admin/stats', 'GET', null, 200);
  await check('SUPPORT', support.cookie, 'Disputes Listing', '/api/disputes', 'GET', null, 200);
  await check('SUPPORT', support.cookie, 'Review Moderation', '/api/admin/reviews', 'GET', null, 200);
  // Protected restrictions
  await check('SUPPORT', support.cookie, 'Audit Logs (Restricted)', '/api/admin/audit-logs', 'GET', null, 403);
  await check('SUPPORT', support.cookie, 'Staff List (Restricted)', '/api/admin/roles', 'GET', null, 403);
  await check('SUPPORT', support.cookie, 'Reassign Roles (Restricted)', '/api/admin/roles', 'PUT', { user_id: admin.user.id, new_role: 'SUPPORT' }, 403);
  await check('SUPPORT', support.cookie, 'Payouts Ledger (Restricted)', '/api/admin/payouts', 'GET', null, 403);
  await check('SUPPORT', support.cookie, 'Commission Engine (Restricted)', '/api/admin/commission-rules', 'GET', null, 403);
  await check('SUPPORT', support.cookie, 'Vendor Onboarding (Restricted)', '/api/admin/onboarding/dummy-id', 'GET', null, 403);

  console.log('\n💳 [FINANCE] Settlements, Payouts & Commission Engine');
  await check('FINANCE', finance.cookie, 'Admin Stats', '/api/admin/stats', 'GET', null, 200);
  await check('FINANCE', finance.cookie, 'Payouts Ledger', '/api/admin/payouts', 'GET', null, 200);
  await check('FINANCE', finance.cookie, 'Commission Engine Rules', '/api/admin/commission-rules', 'GET', null, 200);
  await check('FINANCE', finance.cookie, 'Disputes (Settlement tracking)', '/api/disputes', 'GET', null, 200);
  // Protected restrictions
  await check('FINANCE', finance.cookie, 'Audit Logs (Restricted)', '/api/admin/audit-logs', 'GET', null, 403);
  await check('FINANCE', finance.cookie, 'Staff List (Restricted)', '/api/admin/roles', 'GET', null, 403);
  await check('FINANCE', finance.cookie, 'Reassign Roles (Restricted)', '/api/admin/roles', 'PUT', { user_id: admin.user.id, new_role: 'FINANCE' }, 403);
  await check('FINANCE', finance.cookie, 'Vendor Onboarding (Restricted)', '/api/admin/onboarding/dummy-id', 'GET', null, 403);
  await check('FINANCE', finance.cookie, 'Review Moderation (Restricted)', '/api/admin/reviews', 'GET', null, 403);
  await check('FINANCE', finance.cookie, 'Match Weights (Restricted)', '/api/admin/weights', 'PUT', { weights: [] }, 403);

  // Protected: Sole Super Admin demotion protection
  console.log('\n🔒 [SECURITY] Sole Super Admin Demotion Protection');
  await check('SUPER_ADMIN', superAdmin.cookie, 'Demote Sole Super Admin', '/api/admin/roles', 'PUT', { user_id: superAdmin.user.id, new_role: 'ADMIN' }, 400);

  console.log('\n====================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');
  if (passedTests === totalTests) {
    console.log('🎉 ALL SECTION 5 RBAC PERMISSION CONTROLS VERIFIED!');
  } else {
    process.exit(1);
  }
}

runRBACTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
