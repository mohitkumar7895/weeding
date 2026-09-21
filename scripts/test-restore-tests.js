const mysql = require('mysql2/promise');

async function run() {
  require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  });

  try {
    const [tests] = await db.execute(`
      SELECT r.*, u.name as tested_by_name 
      FROM restore_test_records r
      LEFT JOIN users u ON r.tested_by = u.id
      ORDER BY r.created_at DESC
    `);
    console.log(tests);
  } catch (err) {
    console.error(err);
  }
  await db.end();
}
run();
