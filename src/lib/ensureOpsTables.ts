import { query } from '@/lib/db';

const OPS_TABLES = [
  `CREATE TABLE IF NOT EXISTS fraud_flags (
      id VARCHAR(36) PRIMARY KEY,
      entity_type ENUM('USER', 'PROFILE', 'VENDOR', 'BOOKING', 'PAYMENT', 'REVIEW') NOT NULL,
      entity_id VARCHAR(36) NOT NULL,
      risk_score INT DEFAULT 50,
      flag_reason TEXT NOT NULL,
      severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
      status ENUM('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED') DEFAULT 'OPEN',
      reviewed_by VARCHAR(36) NULL,
      action_taken TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fraud_status (status, severity)
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
      funnel_type ENUM('CUSTOMER', 'VENDOR') NOT NULL,
      step_name VARCHAR(100) NOT NULL,
      step_number INT NOT NULL,
      completed BOOLEAN DEFAULT TRUE,
      metadata_json JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_funnel (funnel_type, step_number)
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
