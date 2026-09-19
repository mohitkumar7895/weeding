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
      
      // Fix `{ params }: { params: { id: string } }` or similar
      content = content.replace(/\{ params \}:\s*\{ params:\s*\{ ([a-zA-Z0-9_]+):\s*string;? \}\s*\}/g, '(req as any, { params }: any');
      content = content.replace(/\(req: NextRequest,\s*\{ params \}:\s*\{ params:\s*\{ ([a-zA-Z0-9_]+):\s*string;? \}\s*\}\)/g, '(req: NextRequest, { params }: any)');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(path.join(__dirname, '..', 'src', 'app', 'api'));
