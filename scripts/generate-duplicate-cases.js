const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function scanForDuplicates() {
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log('Scanning for deterministic duplicate matrimonial profiles...');

  let casesCreated = 0;

  try {
    // Detect similar profiles (Same Last Name + DOB + Gender)
    const [matches] = await db.execute(`
      SELECT 
        a.user_id as primary_id, 
        b.user_id as duplicate_id,
        a.last_name,
        a.date_of_birth
      FROM customer_profiles a
      JOIN customer_profiles b 
        ON a.last_name = b.last_name 
        AND a.date_of_birth = b.date_of_birth 
        AND a.gender = b.gender
        AND a.user_id < b.user_id
    `);

    for (const match of matches) {
      try {
        const signals = JSON.stringify(['last_name', 'date_of_birth', 'gender']);
        
        // Check if case already exists
        const [existing] = await db.execute(`
          SELECT id FROM duplicate_profile_cases 
          WHERE primary_profile_id = ? AND suspected_duplicate_id = ?
        `, [match.primary_id, match.duplicate_id]);

        if (existing.length === 0) {
          const caseId = uuidv4();
          
          // Optionally create a risk flag
          const riskFlagId = uuidv4();
          await db.execute(`
            INSERT INTO risk_flags (id, entity_type, entity_id, risk_category, reason, severity)
            VALUES (?, 'PROFILE', ?, 'POTENTIAL_DUPLICATE', ?, 'MEDIUM')
          `, [riskFlagId, match.primary_id, 'Detected potential duplicate profile based on matching Name, DOB, and Gender.']);

          await db.execute(`
            INSERT INTO duplicate_profile_cases (id, primary_profile_id, suspected_duplicate_id, detection_signals, risk_flag_id)
            VALUES (?, ?, ?, ?, ?)
          `, [caseId, match.primary_id, match.duplicate_id, signals, riskFlagId]);

          casesCreated++;
        }
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') console.error('Error inserting duplicate case:', e.message);
      }
    }

    console.log(`Scan complete. Inserted ${casesCreated} new duplicate profile cases.`);
  } catch (error) {
    console.error('Error during duplicate scan:', error.message);
  } finally {
    await db.end();
  }
}

scanForDuplicates();
