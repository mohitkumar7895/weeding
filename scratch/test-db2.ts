import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: '193.203.184.149',
    user: 'u830887968_shaddi',
    password: 'jEaAyse88eF!@D_shaddi',
    database: 'u830887968_shaddi',
    port: 3306
  });
  try {
    const [rows] = await conn.query('SELECT * FROM user_consents LIMIT 1');
    console.log("Success:", rows);
  } catch (err: any) {
    console.error("DB Error:", err.message);
  } finally {
    await conn.end();
  }
}
main();
