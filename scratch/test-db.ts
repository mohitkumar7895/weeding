import { query } from '../src/lib/db';

async function main() {
  try {
    const res = await query('SELECT * FROM user_consents LIMIT 1');
    console.log(res);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
