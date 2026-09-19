const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../src');

let issuesFound = 0;

function scanForVulnerabilities(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanForVulnerabilities(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // 1. SQL Injection (Checking for unparameterized db.execute or db.query)
      if (content.includes('db.execute') || content.includes('db.query')) {
        // Look for string concatenation inside db execution
        if (/db\.(execute|query)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*(,|\))/.test(content)) {
          console.warn(`[WARNING] Potential SQL Injection (Unparameterized Template Literal) in: ${fullPath}`);
          issuesFound++;
        }
        if (/db\.(execute|query)\s*\(\s*.*?\+.*?/.test(content)) {
          console.warn(`[WARNING] Potential SQL Injection (String Concatenation) in: ${fullPath}`);
          issuesFound++;
        }
      }

      // 2. Hardcoded Secrets Leakage
      if (content.includes('password:') || content.includes('password =') || content.includes('token:')) {
        // Just flag for manual review
        if (!fullPath.includes('auth') && !fullPath.includes('db-schema')) {
          console.warn(`[INFO] Keyword "password" or "token" found in non-auth file. Review for leakage: ${fullPath}`);
        }
      }

      // 3. IDOR Check (Check if vendor/customer routes extract ID from token)
      if (fullPath.includes('/api/customer/') || fullPath.includes('/api/vendor/')) {
        if (content.includes('export async function') && !content.includes('verifyToken') && !content.includes('requireAnyRole') && !fullPath.includes('public')) {
          console.warn(`[WARNING] Missing Authentication/IDOR protection in protected route: ${fullPath}`);
          issuesFound++;
        }
      }
    }
  }
}

console.log('Starting Static Security Audit for SQLi, IDOR, and Hardcoded Secrets...');
scanForVulnerabilities(ROOT_DIR);

if (issuesFound === 0) {
  console.log('✅ Success: No critical static security vulnerabilities found.');
} else {
  console.log(`❌ Failed: Found ${issuesFound} potential security vulnerabilities requiring review.`);
}
