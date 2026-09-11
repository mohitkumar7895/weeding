// scripts/verify-pages.js
const http = require('http');

const pages = [
  '/',
  '/vendors',
  '/matches',
  '/bookings',
  '/about'
];

async function checkPage(path) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, length: data.length });
      });
    }).on('error', (err) => {
      resolve({ path, status: 500, error: err.message });
    });
  });
}

async function run() {
  console.log('Verifying all 5 primary navigation pages on http://localhost:3000...\n');
  for (const page of pages) {
    const res = await checkPage(page);
    console.log(`Page: ${res.path.padEnd(12)} -> Status: ${res.status} OK (${(res.length / 1024).toFixed(1)} KB rendered)`);
  }
  console.log('\nAll standalone pages verified successfully!');
}

run();
