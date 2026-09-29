const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });
  try {
    console.log('Adding latitude and longitude to vendors...');
    await connection.query('ALTER TABLE vendors ADD COLUMN latitude DECIMAL(10, 8)');
    await connection.query('ALTER TABLE vendors ADD COLUMN longitude DECIMAL(11, 8)');
    console.log('Columns added successfully.');
  } catch (error) {
    console.log('Error or columns already exist:', error.message);
  } finally {
    await connection.end();
  }
}
main();
