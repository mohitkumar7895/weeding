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
  `CREATE TABLE IF NOT EXISTS notification_templates (
      id VARCHAR(36) PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      channel VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS notification_delivery_logs (
      id VARCHAR(36) PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      recipient_type VARCHAR(20) NOT NULL,
      recipient_id VARCHAR(36) NOT NULL,
      channel VARCHAR(20) NOT NULL,
      template_id VARCHAR(36) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
      failure_reason TEXT NULL,
      entity_id VARCHAR(36) NULL,
      entity_type VARCHAR(50) NULL,
      idempotency_key VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME NULL,
      delivered_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS customer_reports (
      id VARCHAR(36) PRIMARY KEY,
      reporter_user_id VARCHAR(36) NOT NULL,
      reported_user_id VARCHAR(36) NOT NULL,
      reported_profile_id VARCHAR(36) NULL,
      category VARCHAR(40) NOT NULL,
      description TEXT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(36) PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      booking_id VARCHAR(36) NOT NULL,
      payment_id VARCHAR(36) NULL,
      customer_id VARCHAR(36) NOT NULL,
      vendor_id VARCHAR(36) NOT NULL,
      customer_billing_info JSON NULL,
      vendor_billing_info JSON NULL,
      taxable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
      tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'DRAFT',
      issued_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  `CREATE TABLE IF NOT EXISTS matrimonial_threads (
      id VARCHAR(36) PRIMARY KEY,
      user_a_id VARCHAR(36) NOT NULL,
      user_b_id VARCHAR(36) NOT NULL,
      status VARCHAR(20) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_mat_thread (user_a_id, user_b_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS matrimonial_messages (
      id VARCHAR(36) PRIMARY KEY,
      thread_id VARCHAR(36) NOT NULL,
      sender_id VARCHAR(36) NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mat_msg_thread (thread_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS matrimonial_interests (
      id VARCHAR(36) PRIMARY KEY,
      from_user_id VARCHAR(36) NOT NULL,
      to_user_id VARCHAR(36) NOT NULL,
      from_profile_id VARCHAR(36) NULL,
      to_profile_id VARCHAR(36) NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_interest_pair (from_user_id, to_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS blocked_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      blocked_user_id VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_block_pair (user_id, blocked_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS saved_searches (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      criteria_json TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_saved_user (user_id, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS receipts (
      id VARCHAR(36) PRIMARY KEY,
      receipt_reference VARCHAR(50) UNIQUE NOT NULL,
      payment_id VARCHAR(36) NOT NULL UNIQUE,
      booking_id VARCHAR(36) NOT NULL,
      invoice_id VARCHAR(36) NULL,
      amount DECIMAL(12, 2) NOT NULL,
      payment_date DATETIME NOT NULL,
      status VARCHAR(20) DEFAULT 'ISSUED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS system_configuration (
        config_key VARCHAR(100) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        config_value JSON NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(36) NULL,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS system_notification_settings (
        event_type VARCHAR(100) PRIMARY KEY,
        category ENUM('ACCOUNT', 'BOOKING', 'PAYMENT', 'DISPUTE', 'SYSTEM') NOT NULL,
        in_app_enabled BOOLEAN DEFAULT TRUE,
        email_enabled BOOLEAN DEFAULT TRUE,
        sms_enabled BOOLEAN DEFAULT FALSE,
        push_enabled BOOLEAN DEFAULT FALSE,
        whatsapp_enabled BOOLEAN DEFAULT FALSE,
        is_mandatory BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS backup_logs (
        id VARCHAR(36) PRIMARY KEY,
        status ENUM('SUCCESS', 'FAILED', 'IN_PROGRESS') NOT NULL,
        destination_reference VARCHAR(255) NULL,
        file_size_bytes BIGINT NULL,
        failure_reason TEXT NULL,
        started_at DATETIME NOT NULL,
        completed_at DATETIME NULL,
        INDEX idx_backup_status (status),
        INDEX idx_backup_started_at (started_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS restore_test_records (
        id VARCHAR(36) PRIMARY KEY,
        test_environment VARCHAR(100) NOT NULL,
        backup_reference VARCHAR(255) NOT NULL,
        status ENUM('PLANNED', 'IN_PROGRESS', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PLANNED',
        tested_by VARCHAR(36) NULL,
        notes_and_results TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tested_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
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

  // Seed default notification configurations
  const defaultEvents = [
    { event_type: 'ACCOUNT_CREATED', category: 'ACCOUNT', is_mandatory: false },
    { event_type: 'PASSWORD_RESET', category: 'ACCOUNT', is_mandatory: true },
    { event_type: 'SECURITY_ALERT', category: 'ACCOUNT', is_mandatory: true },
    { event_type: 'BOOKING_REQUESTED', category: 'BOOKING', is_mandatory: false },
    { event_type: 'BOOKING_CONFIRMED', category: 'BOOKING', is_mandatory: true },
    { event_type: 'BOOKING_CANCELLED', category: 'BOOKING', is_mandatory: true },
    { event_type: 'PAYMENT_SUCCESS', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'PAYMENT_FAILED', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'REFUND_PROCESSED', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'PAYOUT_INITIATED', category: 'PAYMENT', is_mandatory: true },
    { event_type: 'DISPUTE_OPENED', category: 'DISPUTE', is_mandatory: true },
    { event_type: 'DISPUTE_RESOLVED', category: 'DISPUTE', is_mandatory: true },
    { event_type: 'MARKETPLACE_UPDATE', category: 'SYSTEM', is_mandatory: false },
    { event_type: 'VENDOR_APPROVED', category: 'SYSTEM', is_mandatory: true }
  ];
  
  for (const ev of defaultEvents) {
    try {
      await query(`
        INSERT INTO system_notification_settings (event_type, category, is_mandatory)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE category = VALUES(category), is_mandatory = VALUES(is_mandatory)
      `, [ev.event_type, ev.category, ev.is_mandatory]);
    } catch {
      /* ignore */
    }
  }

  // Seed default configurations
  const defaultConfigs = [
    { key: 'GST_RATE', category: 'FINANCIAL', value: { rate: 18, type: 'PERCENTAGE' }, description: 'GST rate used for invoices.' },
    { key: 'PAYOUT_DELAY_DAYS', category: 'FINANCIAL', value: { days: 3 }, description: 'Days after booking completion before payout eligibility.' },
    { key: 'MATRIMONIAL_CHAT_ENABLED', category: 'PRODUCT', value: { enabled: true }, description: 'Enable customer-to-customer matrimonial chat.' },
    { key: 'AUTO_REFUND_ENABLED', category: 'FINANCIAL', value: { enabled: true }, description: 'Automatically process refunds for cancellations matching the policy.' },
    { key: 'DISCOVERY_DEFAULT_RADIUS', category: 'MARKETPLACE', value: { radius_km: 50 }, description: 'Default discovery search radius for customers.' },
    { key: 'MAX_PENDING_BOOKINGS', category: 'MARKETPLACE', value: { limit: 20 }, description: 'Max pending booking requests allowed per vendor.' }
  ];
  for (const conf of defaultConfigs) {
    try {
      await query(`
        INSERT INTO system_configuration (config_key, category, config_value, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [conf.key, conf.category, JSON.stringify(conf.value), conf.description]);
    } catch {
      /* ignore */
    }
  }
  try {
    await query(`ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER'`);
  } catch {
    /* already compatible */
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
