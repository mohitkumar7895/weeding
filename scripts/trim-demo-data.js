const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
} catch {}

function takeTwo(rows, preferred) {
  const preferredSet = new Set(preferred);
  const preferredHits = rows.filter((id) => preferredSet.has(id));
  if (preferredHits.length >= 2) return preferredHits.slice(0, 2);
  const rest = rows.filter((id) => !preferredSet.has(id));
  return [...preferredHits, ...rest].slice(0, 2);
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [custRows] = await pool.query(
    `SELECT id FROM users WHERE role IN ('CUSTOMER','USER') ORDER BY created_at DESC`
  );
  const [vendorRows] = await pool.query(`SELECT id FROM vendors ORDER BY created_at DESC`);
  const [bookingRows] = await pool.query(`SELECT id FROM bookings ORDER BY created_at DESC`);
  const [reportRows] = await pool.query(`SELECT id FROM customer_reports ORDER BY created_at DESC`).catch(() => [[]]);
  const [disputeRows] = await pool.query(`SELECT id FROM disputes ORDER BY created_at DESC`).catch(() => [[]]);

  const keepCustomers = takeTwo(
    custRows.map((r) => r.id),
    ['usr_cust_priya', 'usr_cust_gopal']
  );
  const keepVendors = takeTwo(
    vendorRows.map((r) => r.id),
    ['ven_royal_clicks', 'ven_royal_palace']
  );
  const keepBookings = takeTwo(
    bookingRows.map((r) => r.id),
    ['book_demo_01', 'book_demo_02']
  );
  const keepReports = (reportRows || []).map((r) => r.id).slice(0, 2);
  const keepDisputes = (disputeRows || []).map((r) => r.id).slice(0, 2);

  const [keepVendorUsers] = keepVendors.length
    ? await pool.query(`SELECT user_id as id FROM vendors WHERE id IN (?)`, [keepVendors])
    : [[]];
  const keepVendorUserIds = keepVendorUsers.map((r) => r.id).filter(Boolean);

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');

  const delNotIn = async (table, ids) => {
    if (!ids.length) {
      await pool.query(`DELETE FROM ${table}`).catch(() => undefined);
      return;
    }
    await pool.query(`DELETE FROM ${table} WHERE id NOT IN (?)`, [ids]).catch((err) => {
      console.warn(table, err.message);
    });
  };

  await delNotIn('bookings', keepBookings);
  await delNotIn('vendors', keepVendors);
  if (keepCustomers.length) {
    await pool.query(
      `DELETE FROM customer_profiles WHERE user_id NOT IN (?) AND id NOT IN (?)`,
      [keepCustomers, keepCustomers.map((id) => `prof_${id}`)]
    ).catch(() => undefined);
    await pool.query(`DELETE FROM users WHERE role IN ('CUSTOMER','USER') AND id NOT IN (?)`, [keepCustomers]);
  } else {
    await pool.query(`DELETE FROM users WHERE role IN ('CUSTOMER','USER')`);
  }
  if (keepVendorUserIds.length) {
    await pool.query(
      `DELETE FROM users WHERE role = 'VENDOR' AND id NOT IN (?)`,
      [keepVendorUserIds]
    );
  }

  if (keepReports.length) await delNotIn('customer_reports', keepReports);
  else await pool.query('DELETE FROM customer_reports').catch(() => undefined);
  if (keepDisputes.length) await delNotIn('disputes', keepDisputes);
  else await pool.query('DELETE FROM disputes').catch(() => undefined);

  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  const [[c]] = await pool.query(`SELECT COUNT(*) as n FROM users WHERE role IN ('CUSTOMER','USER')`);
  const [[v]] = await pool.query(`SELECT COUNT(*) as n FROM vendors`);
  const [[b]] = await pool.query(`SELECT COUNT(*) as n FROM bookings`);
  console.log(`Kept customers=${c.n} vendors=${v.n} bookings=${b.n}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
