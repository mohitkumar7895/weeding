import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

export async function runPart2Migrations() {
  console.log(`Connecting to ${DB_NAME} on ${DB_HOST}:${DB_PORT} for Part 2 migrations...`);
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  const tableDefinitions = [
    // 1. Vendor Onboarding Workflow
    `CREATE TABLE IF NOT EXISTS vendor_onboarding (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) UNIQUE NOT NULL,
      status ENUM(
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED',
        'VERIFICATION_PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'
      ) DEFAULT 'DRAFT',
      checklist_json JSON,
      admin_reviewer_id VARCHAR(36) NULL,
      rejection_reason TEXT NULL,
      submitted_at DATETIME NULL,
      approved_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 2. Vendor KYC Documents
    `CREATE TABLE IF NOT EXISTS vendor_documents (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      doc_type ENUM('PAN', 'GST', 'BUSINESS_REG', 'BANK_PASSBOOK', 'ID_PROOF', 'OTHER') NOT NULL,
      document_number VARCHAR(100) NULL,
      file_url VARCHAR(255) NOT NULL,
      file_size INT DEFAULT 0,
      mime_type VARCHAR(50) DEFAULT 'application/pdf',
      verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
      rejection_reason TEXT NULL,
      verified_by VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      INDEX idx_vendor_docs (vendor_id, doc_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 2b. Vendor Multi-Category Mappings
    `CREATE TABLE IF NOT EXISTS vendor_categories (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      category_id VARCHAR(36) NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_vendor_category (vendor_id, category_id),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 3. Package Items & Add-ons
    `CREATE TABLE IF NOT EXISTS vendor_package_items (
      id VARCHAR(36) PRIMARY KEY,
      package_id VARCHAR(36) NOT NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT,
      is_optional BOOLEAN DEFAULT FALSE,
      add_on_price DECIMAL(10, 2) DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES vendor_packages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 4. Booking Status History
    `CREATE TABLE IF NOT EXISTS booking_status_history (
      id VARCHAR(36) PRIMARY KEY,
      booking_id VARCHAR(36) NOT NULL,
      from_status VARCHAR(50) NOT NULL,
      to_status VARCHAR(50) NOT NULL,
      changed_by VARCHAR(36) NOT NULL,
      reason TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      INDEX idx_booking_hist (booking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 5. Payment Provider Events & Webhooks Ledger
    `CREATE TABLE IF NOT EXISTS payment_provider_events (
      id VARCHAR(36) PRIMARY KEY,
      provider VARCHAR(50) NOT NULL,
      event_id VARCHAR(100) UNIQUE NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      payload_json JSON NOT NULL,
      status ENUM('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED') DEFAULT 'RECEIVED',
      processed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 6. Dynamic Commission Rules Engine
    `CREATE TABLE IF NOT EXISTS commission_rules (
      id VARCHAR(36) PRIMARY KEY,
      rule_name VARCHAR(100) NOT NULL,
      category_id VARCHAR(36) NULL,
      vendor_id VARCHAR(36) NULL,
      commission_type ENUM('PERCENTAGE', 'FIXED') DEFAULT 'PERCENTAGE',
      commission_value DECIMAL(8, 2) NOT NULL DEFAULT 10.00,
      min_fee DECIMAL(10, 2) DEFAULT 500.00,
      max_fee DECIMAL(10, 2) NULL,
      effective_from DATE NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 7. Payout Attempts Tracking
    `CREATE TABLE IF NOT EXISTS payout_attempts (
      id VARCHAR(36) PRIMARY KEY,
      payout_id VARCHAR(36) NOT NULL,
      attempt_number INT NOT NULL,
      status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
      response_payload JSON NULL,
      error_message TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 8. Dispute Evidence & Thread Messages
    `CREATE TABLE IF NOT EXISTS dispute_evidence (
      id VARCHAR(36) PRIMARY KEY,
      dispute_id VARCHAR(36) NOT NULL,
      uploaded_by VARCHAR(36) NOT NULL,
      file_url VARCHAR(255) NOT NULL,
      file_type VARCHAR(50) DEFAULT 'image/jpeg',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS dispute_messages (
      id VARCHAR(36) PRIMARY KEY,
      dispute_id VARCHAR(36) NOT NULL,
      sender_id VARCHAR(36) NOT NULL,
      sender_role ENUM('CUSTOMER', 'VENDOR', 'ADMIN') NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 9. Review Reports & Moderation
    `CREATE TABLE IF NOT EXISTS review_reports (
      id VARCHAR(36) PRIMARY KEY,
      review_id VARCHAR(36) NOT NULL,
      reported_by VARCHAR(36) NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED') DEFAULT 'PENDING',
      admin_resolution TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 10. Notification Preferences & Direct Scoped Messages
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) UNIQUE NOT NULL,
      email_enabled BOOLEAN DEFAULT TRUE,
      sms_enabled BOOLEAN DEFAULT FALSE,
      whatsapp_enabled BOOLEAN DEFAULT FALSE,
      in_app_enabled BOOLEAN DEFAULT TRUE,
      marketing_enabled BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR(36) PRIMARY KEY,
      booking_id VARCHAR(36) NULL,
      customer_id VARCHAR(36) NOT NULL,
      vendor_id VARCHAR(36) NOT NULL,
      status ENUM('ACTIVE', 'ARCHIVED', 'BLOCKED') DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS conversation_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      sender_id VARCHAR(36) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 11. Vendor Reels / Short Video Feed
    `CREATE TABLE IF NOT EXISTS vendor_reels (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      video_url VARCHAR(255) NOT NULL,
      thumbnail_url VARCHAR(255) NOT NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT,
      views_count INT DEFAULT 0,
      likes_count INT DEFAULT 0,
      is_approved BOOLEAN DEFAULT TRUE,
      display_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      INDEX idx_reels_appr (is_approved, display_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 12. Analytics Events & Funnel Tracking
    `CREATE TABLE IF NOT EXISTS analytics_events (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      session_id VARCHAR(100) NULL,
      event_name VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NULL,
      entity_id VARCHAR(36) NULL,
      properties_json JSON NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_event_name (event_name, created_at)
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

    // 13. Fraud Flags & Risk Events
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

    // 14. Privacy Settings, Consents, Data Export & Retention
    `CREATE TABLE IF NOT EXISTS privacy_settings (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) UNIQUE NOT NULL,
      phone_visibility ENUM('PUBLIC', 'MATCHED_ONLY', 'PRIVATE', 'ADMIN_ONLY') DEFAULT 'MATCHED_ONLY',
      email_visibility ENUM('PUBLIC', 'MATCHED_ONLY', 'PRIVATE', 'ADMIN_ONLY') DEFAULT 'PRIVATE',
      income_visibility ENUM('PUBLIC', 'MATCHED_ONLY', 'PRIVATE', 'ADMIN_ONLY') DEFAULT 'MATCHED_ONLY',
      photos_visibility ENUM('PUBLIC', 'MATCHED_ONLY', 'PRIVATE', 'ADMIN_ONLY') DEFAULT 'PUBLIC',
      family_visibility ENUM('PUBLIC', 'MATCHED_ONLY', 'PRIVATE', 'ADMIN_ONLY') DEFAULT 'MATCHED_ONLY',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS user_consents (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      consent_type ENUM('PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'MARKETING', 'AI_PROCESSING', 'WHATSAPP_COMMUNICATION') NOT NULL,
      consent_version VARCHAR(20) DEFAULT 'v1.0',
      is_granted BOOLEAN DEFAULT TRUE,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME NULL,
      ip_address VARCHAR(45) NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uq_user_consent (user_id, consent_type, consent_version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS data_export_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      status ENUM('PENDING', 'PROCESSING', 'READY', 'EXPIRED') DEFAULT 'PENDING',
      download_url VARCHAR(255) NULL,
      expires_at DATETIME NULL,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS data_retention_policies (
      id VARCHAR(36) PRIMARY KEY,
      entity_name VARCHAR(100) UNIQUE NOT NULL,
      retention_days INT NOT NULL,
      action_on_expiry ENUM('ANONYMIZE', 'SOFT_DELETE', 'HARD_DELETE', 'ARCHIVE') DEFAULT 'ARCHIVE',
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  for (let i = 0; i < tableDefinitions.length; i++) {
    await db.query(tableDefinitions[i]);
  }
  console.log(`Successfully verified Part 2 tables.`);

  // Optional Safe Column Alterations
  try {
    await db.query(`ALTER TABLE vendor_packages ADD COLUMN moderation_status ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED'`);
  } catch {}
  try {
    await db.query(`ALTER TABLE vendor_packages ADD COLUMN is_published BOOLEAN DEFAULT TRUE`);
  } catch {}
  try {
    await db.query(`ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS category_id VARCHAR(36) NULL`);
    await db.query(`ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS service_location VARCHAR(191) NULL`);
    await db.query(`ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL`);
    await db.query(`ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    await db.query(`ALTER TABLE vendor_services ADD COLUMN moderation_status ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED') DEFAULT 'PENDING_REVIEW'`);
  } catch {}
  try {
    await db.query(`ALTER TABLE reviews ADD COLUMN moderation_status ENUM('APPROVED', 'FLAGGED', 'REMOVED') DEFAULT 'APPROVED'`);
  } catch {}
  try {
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'Rajasthan'`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'India'`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT NULL`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_area_cities TEXT DEFAULT NULL`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_radius_km INT DEFAULT 50`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS travels_to_venue BOOLEAN DEFAULT TRUE`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 1`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS year_established INT DEFAULT NULL`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50) DEFAULT NULL`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_email VARCHAR(100) DEFAULT NULL`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website_url VARCHAR(255) DEFAULT NULL`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100) DEFAULT NULL`);
    await db.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS profile_status ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED') DEFAULT 'APPROVED'`);
  } catch {}

  // Seed default commission rules & retention policies
  try {
    await db.query(`
      INSERT IGNORE INTO commission_rules (id, rule_name, category_id, vendor_id, commission_type, commission_value, min_fee, effective_from)
      VALUES 
      ('rule_default_10', 'Standard Marketplace 10% Commission', NULL, NULL, 'PERCENTAGE', 10.00, 500.00, '2026-01-01')
    `);

    await db.query(`
      INSERT IGNORE INTO data_retention_policies (id, entity_name, retention_days, action_on_expiry)
      VALUES 
      ('ret_logs', 'audit_logs', 730, 'ARCHIVE'),
      ('ret_analytics', 'analytics_events', 365, 'ANONYMIZE'),
      ('ret_ai', 'ai_messages', 180, 'SOFT_DELETE')
    `);

    // Seed sample vendor reels
    await db.query(`
      INSERT IGNORE INTO vendor_reels (id, vendor_id, video_url, thumbnail_url, title, description, views_count, likes_count, is_approved, display_order)
      VALUES 
      ('reel_1', 'ven_royal_clicks', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', '/images/photographer.jpg', 'Cinematic Royal Palace Teaser', '4K Drone wedding shoot at Udaipur Palace', 12400, 890, TRUE, 1),
      ('reel_2', 'ven_zaika_caterers', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', '/images/caterer.jpg', 'Live Royal Chaat Counter', '3-course imperial dining experience', 9800, 620, TRUE, 2),
      ('reel_3', 'ven_dream_decor', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', '/images/decorator.jpg', 'Grand Floral Mandap Reveal', '10,000 fresh orchids and crystal chandeliers', 18500, 1420, TRUE, 3)
    `);

    // Seed initial onboarding for sample vendor
    await db.query(`
      INSERT IGNORE INTO vendor_onboarding (id, vendor_id, status, checklist_json, submitted_at, approved_at)
      VALUES 
      ('onb_royal_clicks', 'ven_royal_clicks', 'APPROVED', JSON_OBJECT('business_profile', true, 'pan_verified', true, 'bank_verified', true, 'packages_added', true), '2026-01-10', '2026-01-11'),
      ('onb_zaika', 'ven_zaika_caterers', 'APPROVED', JSON_OBJECT('business_profile', true, 'pan_verified', true, 'bank_verified', true, 'packages_added', true), '2026-01-12', '2026-01-13'),
      ('onb_dream_decor', 'ven_dream_decor', 'APPROVED', JSON_OBJECT('business_profile', true, 'pan_verified', true, 'bank_verified', true, 'packages_added', true), '2026-01-15', '2026-01-16'),
      ('onb_royal_palace', 'ven_royal_palace', 'APPROVED', JSON_OBJECT('business_profile', true, 'pan_verified', true, 'bank_verified', true, 'packages_added', true), '2026-01-18', '2026-01-19')
    `);

    console.log('Seeded Part 2 default rules, reels, and onboarding records.');
  } catch (err: any) {
    console.error('Seed error:', err.message);
  }

  await db.end();
  console.log('Part 2 migration successfully applied to MySQL!');
}

if (require.main === module) {
  runPart2Migrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
