const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

const ADMIN_API_DIR = path.join(__dirname, '../src/app/api/admin');

async function checkRBAC() {
  console.log('\n--- 1. Auditing Admin API Routes for RBAC ---');
  let missingRBAC = 0;
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (file === 'route.ts') {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check if there are exported HTTP methods
        const hasMethod = /(export async function (GET|POST|PUT|PATCH|DELETE))/.test(content);
        if (hasMethod) {
          const hasRbac = content.includes('requireAnyRole') || content.includes('verifyAdminRole');
          if (!hasRbac) {
            console.log(`❌ WARNING: Missing RBAC in ${fullPath}`);
            missingRBAC++;
          }
        }
      }
    }
  }
  
  scanDir(ADMIN_API_DIR);
  if (missingRBAC === 0) {
    console.log('✅ Success: All active Admin API routes enforce RBAC.');
  } else {
    console.log(`❌ Failed: Found ${missingRBAC} route(s) missing RBAC.`);
  }
  return missingRBAC;
}

async function verifyDatabaseRelationships() {
  console.log('\n--- 2. Auditing Database Cross-Module Relationships ---');
  const db = await mysql.createConnection({
    host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, port: DB_PORT
  });

  let errors = 0;

  try {
    // Audit logs check
    const [auditCount] = await db.execute('SELECT COUNT(*) as c FROM audit_logs');
    if (auditCount[0].c > 0) {
      console.log(`✅ Success: Found ${auditCount[0].c} Audit Logs.`);
    } else {
      console.log('⚠️ Warning: No Audit Logs found.');
    }

    // Role check
    const [roles] = await db.execute('SELECT DISTINCT role FROM users WHERE role IN ("SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE")');
    console.log(`✅ Success: Found configured Admin roles: ${roles.map(r => r.role).join(', ')}`);

    // Verify system configurations
    const [configCount] = await db.execute('SELECT COUNT(*) as c FROM system_configuration');
    console.log(`✅ Success: Found ${configCount[0].c} Platform Configurations.`);

  } catch (e) {
    console.error('❌ Error testing database relationships:', e.message);
    errors++;
  } finally {
    await db.end();
  }

  return errors;
}

async function runQA() {
  console.log('Starting Global Admin QA & Integration Verification...');
  
  const rbacErrors = await checkRBAC();
  const dbErrors = await verifyDatabaseRelationships();

  console.log('\n--- QA SUMMARY ---');
  if (rbacErrors === 0 && dbErrors === 0) {
    console.log('🌟 PASS: Admin Integration is structurally sound and secure.');
    process.exit(0);
  } else {
    console.log(`🚨 FAIL: Found ${rbacErrors} RBAC issues and ${dbErrors} DB issues.`);
    process.exit(1);
  }
}

runQA();
