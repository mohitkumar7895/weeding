const fs = require('fs');
const path = require('path');

const files = [
  'test-restore-tests.js',
  'fix-backups-remote.js',
  'fix-refunds-remote.js',
  'fix-notifications-remote.js',
  'create-sysconfig-remote.js',
  'create-receipts-remote.js'
];

const matchRegex = /const db = await mysql\.createConnection\(\{\s*host:\s*'193\.203\.184\.149',\s*user:\s*'u830887968_shaddi',\s*password:\s*'jEaAyse88eF!@D_shaddi',\s*database:\s*'u830887968_shaddi',\s*port:\s*3306,?\s*\}\);/g;
const replacement = `require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  });`;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.match(matchRegex)) {
      content = content.replace(matchRegex, replacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', file);
    }
  }
});
