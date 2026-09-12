const mysql = require('mysql2/promise');

async function clean() {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wedwithme',
  });

  const [testUsers] = await c.query("SELECT id FROM users WHERE email LIKE 'test_delete_%'");
  if (testUsers.length > 0) {
    const ids = testUsers.map(u => u.id);
    for (const id of ids) {
      await c.query("DELETE FROM account_deletion_requests WHERE user_id = ?", [id]);
      await c.query("DELETE FROM shortlists WHERE customer_id IN (SELECT id FROM customer_profiles WHERE user_id = ?)", [id]);
      await c.query("DELETE FROM customer_profiles WHERE user_id = ?", [id]);
      await c.query("DELETE FROM users WHERE id = ?", [id]);
    }
    console.log(`Cleaned up ${ids.length} test users.`);
  } else {
    console.log('No test users to clean.');
  }

  await c.end();
}

clean();
