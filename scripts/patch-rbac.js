const fs = require('fs');
const path = require('path');

const ADMIN_API_DIR = path.join(__dirname, '../src/app/api/admin');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it already has RBAC
  if (content.includes('requireAnyRole') || content.includes('verifyAdminRole')) {
    return false;
  }

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  let patched = false;

  // Add the import if not present and we need to patch
  if (methods.some(m => content.includes(`export async function ${m}`))) {
    if (!content.includes(`import { requireAnyRole }`)) {
      // Find the last import and insert after it, or at top
      if (content.includes('import ')) {
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + `import { requireAnyRole } from '@/lib/rbac';\n` + content.slice(endOfLine + 1);
      } else {
        content = `import { requireAnyRole } from '@/lib/rbac';\n\n` + content;
      }
    }
  }

  // Inject into each method
  for (const method of methods) {
    const methodSignature = `export async function ${method}(request: Request`;
    const altSignature = `export async function ${method}(req: Request`; // some files might use req
    const alt2 = `export async function ${method}(request: NextRequest`;
    
    let regex = new RegExp(`export async function ${method}\\s*\\(([^\\)]*)\\)\\s*\\{`);
    
    if (regex.test(content)) {
      const authInjection = `\n    const authResult = await requireAnyRole(arguments[0], ['SUPER_ADMIN', 'ADMIN']);\n    if (authResult instanceof Response) return authResult;\n`;
      // It's safer to just inject standard auth using the first parameter
      content = content.replace(regex, (match, args) => {
        const paramName = args.split(':')[0].trim() || 'request';
        return `${match}\n    const authResult = await requireAnyRole(${paramName}, ['SUPER_ADMIN', 'ADMIN']);\n    if (authResult instanceof Response) return authResult;\n`;
      });
      patched = true;
    }
  }

  // Check if NextResponse needs to be imported
  if (patched && !content.includes('import { NextResponse }') && !content.includes('import {NextResponse}')) {
     if (content.includes('import { NextRequest } from "next/server"')) {
         content = content.replace('import { NextRequest } from "next/server"', 'import { NextRequest, NextResponse } from "next/server"');
     } else if (content.includes('import { NextRequest } from \'next/server\'')) {
         content = content.replace('import { NextRequest } from \'next/server\'', 'import { NextRequest, NextResponse } from \'next/server\'');
     }
  }

  if (patched) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

let patchedCount = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (file === 'route.ts') {
      if (patchFile(fullPath)) {
        console.log(`Patched: ${fullPath}`);
        patchedCount++;
      }
    }
  }
}

console.log('Starting automated RBAC patching...');
scanDir(ADMIN_API_DIR);
console.log(`Finished patching ${patchedCount} files.`);
