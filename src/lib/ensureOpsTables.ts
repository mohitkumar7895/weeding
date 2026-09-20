import { query } from '@/lib/db';

const OPS_TABLES = [
  `CREATE TABLE IF NOT EXISTS fraud_flags (
      id VARCHAR(36) PRIMARY KEY,
      entity_type VARCHAR(40) NOT NULL,
      entity_id VARCHAR(36) NOT NULL,
      risk_score INT DEFAULT 50,
      flag_reason TEXT NOT NULL,
      severity VARCHAR(20) DEFAULT 'MEDIUM',
      status VARCHAR(20) DEFAULT 'OPEN',
      reviewed_by VARCHAR(36) NULL,
      action_taken TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS risk_flags (
      id VARCHAR(36) PRIMARY KEY,
      entity_type VARCHAR(40) NOT NULL,
      entity_id VARCHAR(36) NOT NULL,
      risk_category VARCHAR(100) NOT NULL,
      reason TEXT NOT NULL,
      severity VARCHAR(20) DEFAULT 'LOW',
      status VARCHAR(20) DEFAULT 'OPEN',
      reviewed_by VARCHAR(36) NULL,
      review_notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS risk_events (
      id VARCHAR(36) PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(36) NOT NULL,
      details_json JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS funnel_events (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      funnel_type VARCHAR(20) NOT NULL,
      step_name VARCHAR(100) NOT NULL,
      step_number INT NOT NULL,
      completed BOOLEAN DEFAULT TRUE,
      metadata_json JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS vendor_reels (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      video_url VARCHAR(255) NOT NULL,
      thumbnail_url VARCHAR(255) NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT,
      views_count INT DEFAULT 0,
      likes_count INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'PENDING',
      is_approved BOOLEAN DEFAULT FALSE,
      display_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS backup_records (
      id VARCHAR(36) PRIMARY KEY,
      status VARCHAR(20) NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NULL,
      destination_reference VARCHAR(255) NULL,
      error_information TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS restore_tests (
      id VARCHAR(36) PRIMARY KEY,
      backup_reference VARCHAR(255) NOT NULL,
      test_date DATETIME NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
      environment_reference VARCHAR(255) NOT NULL,
      notes TEXT NULL,
      tested_by VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS duplicate_profile_cases (
      id VARCHAR(36) PRIMARY KEY,
      primary_profile_id VARCHAR(36) NOT NULL,
      suspected_duplicate_id VARCHAR(36) NOT NULL,
      detection_signals TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'OPEN',
      reviewed_by VARCHAR(36) NULL,
      review_notes TEXT NULL,
      risk_flag_id VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS api_security_logs (
      id VARCHAR(36) PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      endpoint VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      user_id VARCHAR(36) NULL,
      details TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS backup_configuration (
      id INT PRIMARY KEY,
      is_enabled TINYINT DEFAULT 0,
      frequency VARCHAR(40) DEFAULT 'DAILY',
      retention_days INT DEFAULT 30,
      destination_reference VARCHAR(255) NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let ensured = false;

export async function ensureOpsTables() {
  if (ensured) return;
  for (const sql of OPS_TABLES) {
    try {
      await query(sql);
    } catch (err: any) {
      console.warn('[ensureOpsTables]', err.message);
    }
  }
  try {
    await query(`ALTER TABLE vendor_reels ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING'`);
  } catch {
    /* already exists */
  }
  try {
    await query(
      `INSERT IGNORE INTO backup_configuration (id, is_enabled, frequency, retention_days) VALUES (1, 0, 'DAILY', 30)`
    );
  } catch {
    /* table missing or already seeded */
  }
  ensured = true;
}

export async function safeSelect<T = any[]>(sql: string, params: any[] = []): Promise<T> {
  try {
    const rows = await query<T>(sql, params);
    return (Array.isArray(rows) ? rows : []) as T;
  } catch (err: any) {
    console.warn('[safeSelect]', err.message);
    return [] as T;
  }
}

export function firstCount(rows: any[], key = 'count'): number {
  return Number(rows?.[0]?.[key] || 0);
}
