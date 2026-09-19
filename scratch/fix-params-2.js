const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('route.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix syntax error
      content = content.replace(/\(req as any, \{ params \}: any\)/g, '{ params }: any');
      content = content.replace(/\(req: NextRequest, \(req as any, \{ params \}: any\) \{/g, '(req: NextRequest, { params }: any) {');
      content = content.replace(/\(req: NextRequest, \{ params \}: any\)/g, '(req: NextRequest, { params }: any)');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(path.join(__dirname, '..', 'src', 'app', 'api'));
