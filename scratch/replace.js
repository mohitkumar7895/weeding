const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, '../src/app/api/admin'), function(filePath) {
  if (!filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  content = content.replace(/import \{ requireAnyRole \} from '@\/lib\/rbac';/g, "import { verifyAdminRole } from '@/lib/rbac';");
  content = content.replace(/const (\w+) = await requireAnyRole\((?:req|request), (\[.*?\])\);/g, "const $1 = await verifyAdminRole($2);");
  content = content.replace(/if \(\w+ instanceof Response\) return \w+;/g, match => {
    const varName = match.match(/if \((\w+) instanceof Response\)/)[1];
    return `if (!${varName}.ok) return ${varName}.response;`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
