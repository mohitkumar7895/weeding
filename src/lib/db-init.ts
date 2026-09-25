import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;

export async function initializeDatabase() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

  // Step 1: Ensure database exists
  const serverConn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
  });

  await serverConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await serverConn.end();
  console.log(`Database \`${DB_NAME}\` verified.`);

  // Step 2: Connect to the specific database
  const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });

  console.log(`Creating tables sequentially in \`${DB_NAME}\`...`);

  // Array of individual table definitions
  const tableDefinitions = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(191) UNIQUE NOT NULL,
      phone VARCHAR(50) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(191) NOT NULL,
      role ENUM('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'VENDOR', 'CUSTOMER') DEFAULT 'CUSTOMER',
      status ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') DEFAULT 'ACTIVE',
      email_verified BOOLEAN DEFAULT FALSE,
      phone_verified BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_users_role_status (role, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      module VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id VARCHAR(36) NOT NULL,
      permission_id VARCHAR(36) NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS customer_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) UNIQUE NOT NULL,
      gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
      date_of_birth DATE NULL,
      height_cm INT NULL,
      marital_status VARCHAR(50) DEFAULT 'NEVER_MARRIED',
      religion VARCHAR(50) NULL,
      caste VARCHAR(50),
      sub_caste VARCHAR(50),
      mother_tongue VARCHAR(50) DEFAULT 'Hindi',
      education VARCHAR(100) NULL,
      college VARCHAR(150),
      profession VARCHAR(100) NULL,
      company VARCHAR(150),
      annual_income DECIMAL(12, 2) NULL,
      country VARCHAR(50) DEFAULT 'India',
      state VARCHAR(50) NULL,
      city VARCHAR(50) NULL,
      about_me TEXT,
      family_details TEXT,
      family_type VARCHAR(50) DEFAULT 'Nuclear',
      family_values VARCHAR(50) DEFAULT 'Moderate',
      father_occupation VARCHAR(100),
      mother_occupation VARCHAR(100),
      siblings_details VARCHAR(255),
      hobbies TEXT,
      diet VARCHAR(50) DEFAULT 'Vegetarian',
      smoking VARCHAR(50) DEFAULT 'No',
      drinking VARCHAR(50) DEFAULT 'No',
      interests TEXT,
      verification_status ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'UNVERIFIED',
      profile_visibility ENUM('PUBLIC', 'PRIVATE', 'LIMITED', 'REGISTERED_ONLY') DEFAULT 'PUBLIC',
      hide_phone BOOLEAN DEFAULT TRUE,
      hide_photos BOOLEAN DEFAULT FALSE,
      hide_income BOOLEAN DEFAULT FALSE,
      hide_location BOOLEAN DEFAULT FALSE,
      profile_score INT DEFAULT 85,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_profiles_filter (gender, marital_status, religion, city)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS profile_photos (
      id VARCHAR(36) PRIMARY KEY,
      profile_id VARCHAR(36) NOT NULL,
      url MEDIUMTEXT NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      is_approved BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES customer_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS partner_preferences (
      id VARCHAR(36) PRIMARY KEY,
      profile_id VARCHAR(36) UNIQUE NOT NULL,
      min_age INT DEFAULT 21,
      max_age INT DEFAULT 32,
      min_height_cm INT DEFAULT 150,
      max_height_cm INT DEFAULT 190,
      accepted_marital_status VARCHAR(255) DEFAULT 'Any',
      preferred_religions VARCHAR(255) DEFAULT 'Hindu',
      preferred_castes VARCHAR(255) DEFAULT 'Any',
      preferred_sub_castes VARCHAR(255) DEFAULT 'Any',
      preferred_educations VARCHAR(255) DEFAULT 'Any',
      preferred_professions VARCHAR(255) DEFAULT 'Any',
      min_income DECIMAL(12, 2) DEFAULT 0,
      preferred_country VARCHAR(100) DEFAULT 'India',
      preferred_state VARCHAR(100) DEFAULT 'Any',
      preferred_city VARCHAR(100) DEFAULT 'Any',
      preferred_locations VARCHAR(255) DEFAULT 'Any',
      preferred_diet VARCHAR(100) DEFAULT 'Any',
      preferred_manglik VARCHAR(50) DEFAULT 'Any',
      preferred_smoking VARCHAR(50) DEFAULT 'No',
      preferred_drinking VARCHAR(50) DEFAULT 'No',
      deal_breakers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES customer_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS match_factor_weights (
      id VARCHAR(36) PRIMARY KEY,
      factor_name VARCHAR(50) UNIQUE NOT NULL,
      weight_percent DECIMAL(5, 2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS match_scores (
      id VARCHAR(36) PRIMARY KEY,
      source_profile_id VARCHAR(36) NOT NULL,
      target_profile_id VARCHAR(36) NOT NULL,
      score_percent DECIMAL(5, 2) NOT NULL,
      breakdown_json JSON NOT NULL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_source_target (source_profile_id, target_profile_id),
      FOREIGN KEY (source_profile_id) REFERENCES customer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (target_profile_id) REFERENCES customer_profiles(id) ON DELETE CASCADE,
      INDEX idx_scores (source_profile_id, score_percent)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS shortlists (
      id VARCHAR(36) PRIMARY KEY,
      customer_id VARCHAR(36) NOT NULL,
      target_profile_id VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_shortlist (customer_id, target_profile_id),
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (target_profile_id) REFERENCES customer_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(36) PRIMARY KEY,
      slug VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon_svg TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vendors (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) UNIQUE NOT NULL,
      business_name VARCHAR(191) NOT NULL,
      category_id VARCHAR(36) NOT NULL,
      city VARCHAR(50) NOT NULL,
      address TEXT,
      description TEXT,
      rating DECIMAL(3, 2) DEFAULT 4.80,
      review_count INT DEFAULT 0,
      starting_price DECIMAL(10, 2) DEFAULT 15000.00,
      cover_image VARCHAR(255),
      verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED') DEFAULT 'VERIFIED',
      pan_number VARCHAR(50),
      gst_number VARCHAR(50),
      bank_account_number VARCHAR(50),
      bank_ifsc VARCHAR(50),
      is_featured BOOLEAN DEFAULT FALSE,
      is_sponsored BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      INDEX idx_vendors_cat_city (category_id, city, verification_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vendor_services (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT,
      starting_price DECIMAL(10, 2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vendor_packages (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      name VARCHAR(191) NOT NULL,
      description TEXT,
      guest_capacity INT DEFAULT 200,
      price DECIMAL(10, 2) NOT NULL,
      included_items_json JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vendor_portfolios (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      caption VARCHAR(255),
      is_cover BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS vendor_availability (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      date DATE NOT NULL,
      is_booked BOOLEAN DEFAULT FALSE,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_vendor_date (vendor_id, date),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      customer_id VARCHAR(36) NOT NULL,
      rating INT NOT NULL,
      comment TEXT,
      is_verified_booking BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(36) PRIMARY KEY,
      booking_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id VARCHAR(36) NOT NULL,
      vendor_id VARCHAR(36) NOT NULL,
      service_id VARCHAR(36),
      package_id VARCHAR(36),
      event_date DATE NOT NULL,
      guest_count INT DEFAULT 200,
      total_amount DECIMAL(12, 2) NOT NULL,
      commission_rate DECIMAL(5, 2) DEFAULT 10.00,
      commission_amount DECIMAL(12, 2) NOT NULL,
      vendor_payout_amount DECIMAL(12, 2) NOT NULL,
      status ENUM(
        'DRAFT', 'PENDING', 'REQUESTED', 'PENDING_VENDOR', 'ACCEPTED', 'REJECTED',
        'PAYMENT_PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
        'CANCELLED', 'REFUND_PROCESSING', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED'
      ) DEFAULT 'REQUESTED',
      cancellation_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      INDEX idx_bookings_status (status),
      INDEX idx_bookings_date (event_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS payment_transactions (
      id VARCHAR(36) PRIMARY KEY,
      booking_id VARCHAR(36) NOT NULL,
      transaction_ref VARCHAR(100) UNIQUE NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      provider VARCHAR(50) DEFAULT 'razorpay',
      status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
      payment_details JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS commission_records (
      id VARCHAR(36) PRIMARY KEY,
      booking_id VARCHAR(36) UNIQUE NOT NULL,
      percentage DECIMAL(5, 2) NOT NULL,
      commission_amount DECIMAL(12, 2) NOT NULL,
      is_settled BOOLEAN DEFAULT FALSE,
      settled_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS payouts (
      id VARCHAR(36) PRIMARY KEY,
      vendor_id VARCHAR(36) NOT NULL,
      booking_id VARCHAR(36) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED') DEFAULT 'PENDING',
      payout_date DATETIME NULL,
      reference_id VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS refunds (
      id VARCHAR(36) PRIMARY KEY,
      booking_id VARCHAR(36) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      reason TEXT,
      status ENUM('REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED') DEFAULT 'REQUESTED',
      reference_id VARCHAR(100),
      processed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS disputes (
      id VARCHAR(36) PRIMARY KEY,
      booking_id VARCHAR(36) NOT NULL,
      raised_by_user_id VARCHAR(36) NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
      resolution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(191) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      link VARCHAR(255),
      is_read BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_read (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      role VARCHAR(50),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(50) NOT NULL,
      old_values JSON,
      new_values JSON,
      ip_address VARCHAR(50),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_action (action, entity_type),
      INDEX idx_audit_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS system_settings (
      id VARCHAR(36) PRIMARY KEY,
      \`key\` VARCHAR(100) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT,
      updated_by VARCHAR(36),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      session_token VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS ai_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      sender ENUM('USER', 'SAGUN') NOT NULL,
      content TEXT NOT NULL,
      structured_data JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS blocked_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      blocked_user_id VARCHAR(36) NOT NULL,
      reason VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_block (user_id, blocked_user_id),
      INDEX idx_blocked_user (blocked_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS saved_searches (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      criteria_json JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_saved_searches (user_id, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS customer_reports (
      id VARCHAR(36) PRIMARY KEY,
      reporter_user_id VARCHAR(36) NOT NULL,
      reported_user_id VARCHAR(36) NOT NULL,
      reported_profile_id VARCHAR(36) NULL,
      category ENUM('ABUSE', 'FRAUD', 'IMPERSONATION') NOT NULL,
      description TEXT NULL,
      status ENUM('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED') DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_reports_reported (reported_user_id, status),
      INDEX idx_reports_reporter (reporter_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS account_deletion_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      reason TEXT NULL,
      feedback TEXT NULL,
      status ENUM('REQUESTED', 'PROCESSING', 'COMPLETED', 'CANCELLED') DEFAULT 'REQUESTED',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      scheduled_deletion_at DATETIME NULL,
      processed_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_deletion_user (user_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (let i = 0; i < tableDefinitions.length; i++) {
    await db.query(tableDefinitions[i]);
  }
  console.log(`Successfully verified ${tableDefinitions.length} tables.`);

  // Safe incremental migrations for existing customer_profiles
  const migrations = [
    `ALTER TABLE bookings MODIFY status ENUM(
        'DRAFT', 'PENDING', 'REQUESTED', 'PENDING_VENDOR', 'ACCEPTED', 'REJECTED',
        'PAYMENT_PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
        'CANCELLED', 'REFUND_PROCESSING', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED'
      ) DEFAULT 'REQUESTED'`,
    `ALTER TABLE vendor_reels ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'`,
    `ALTER TABLE vendor_reels ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL`,
    `ALTER TABLE customer_profiles MODIFY gender ENUM('MALE', 'FEMALE', 'OTHER') NULL`,
    `ALTER TABLE customer_profiles MODIFY date_of_birth DATE NULL`,
    `ALTER TABLE customer_profiles MODIFY height_cm INT NULL`,
    `ALTER TABLE customer_profiles MODIFY religion VARCHAR(50) NULL`,
    `ALTER TABLE customer_profiles MODIFY education VARCHAR(100) NULL`,
    `ALTER TABLE customer_profiles MODIFY profession VARCHAR(100) NULL`,
    `ALTER TABLE customer_profiles MODIFY annual_income DECIMAL(12, 2) NULL`,
    `ALTER TABLE customer_profiles MODIFY country VARCHAR(50) NULL DEFAULT 'India'`,
    `ALTER TABLE customer_profiles MODIFY state VARCHAR(50) NULL`,
    `ALTER TABLE customer_profiles MODIFY city VARCHAR(50) NULL`,
    `ALTER TABLE customer_profiles MODIFY marital_status VARCHAR(50) NULL DEFAULT 'NEVER_MARRIED'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS mother_tongue VARCHAR(50) DEFAULT 'Hindi'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS college VARCHAR(150)`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS company VARCHAR(150)`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS diet VARCHAR(50) DEFAULT 'Vegetarian'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS smoking VARCHAR(50) DEFAULT 'No'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS drinking VARCHAR(50) DEFAULT 'No'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS family_type VARCHAR(50) DEFAULT 'Nuclear'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS family_values VARCHAR(50) DEFAULT 'Moderate'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(100)`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(100)`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS siblings_details VARCHAR(255)`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS interests TEXT`,
    `ALTER TABLE profile_photos MODIFY COLUMN url MEDIUMTEXT NOT NULL`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_sub_castes VARCHAR(255) DEFAULT 'Any'`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_country VARCHAR(100) DEFAULT 'India'`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_state VARCHAR(100) DEFAULT 'Any'`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_city VARCHAR(100) DEFAULT 'Any'`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_diet VARCHAR(100) DEFAULT 'Any'`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_manglik VARCHAR(50) DEFAULT 'Any'`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_smoking VARCHAR(50) DEFAULT 'No'`,
    `ALTER TABLE partner_preferences ADD COLUMN IF NOT EXISTS preferred_drinking VARCHAR(50) DEFAULT 'No'`,
    `ALTER TABLE customer_profiles MODIFY profile_visibility ENUM('PUBLIC', 'PRIVATE', 'LIMITED', 'REGISTERED_ONLY') DEFAULT 'PUBLIC'`,
    `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS hide_location BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS location_visibility ENUM('PUBLIC', 'PRIVATE', 'MATCHED_ONLY', 'ADMIN_ONLY') DEFAULT 'PUBLIC'`,
    `CREATE TABLE IF NOT EXISTS blocked_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      blocked_user_id VARCHAR(36) NOT NULL,
      reason VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_block (user_id, blocked_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS customer_reports (
      id VARCHAR(36) PRIMARY KEY,
      reporter_user_id VARCHAR(36) NOT NULL,
      reported_user_id VARCHAR(36) NOT NULL,
      reported_profile_id VARCHAR(36) NULL,
      category ENUM('ABUSE', 'FRAUD', 'IMPERSONATION') NOT NULL,
      description TEXT NULL,
      status ENUM('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED') DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_reports_reported (reported_user_id, status),
      INDEX idx_reports_reporter (reporter_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS account_deletion_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      reason TEXT NULL,
      feedback TEXT NULL,
      status ENUM('REQUESTED', 'PROCESSING', 'COMPLETED', 'CANCELLED') DEFAULT 'REQUESTED',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      scheduled_deletion_at DATETIME NULL,
      processed_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_deletion_user (user_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  for (const sql of migrations) {
    try {
      await db.query(sql);
    } catch (_) {}
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS matrimonial_threads (
        id VARCHAR(36) PRIMARY KEY,
        user_a_id VARCHAR(36) NOT NULL,
        user_b_id VARCHAR(36) NOT NULL,
        status ENUM('ACTIVE', 'BLOCKED', 'ARCHIVED') DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_mat_thread (user_a_id, user_b_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS matrimonial_messages (
        id VARCHAR(36) PRIMARY KEY,
        thread_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mat_msg_thread (thread_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS matrimonial_interests (
        id VARCHAR(36) PRIMARY KEY,
        from_user_id VARCHAR(36) NOT NULL,
        to_user_id VARCHAR(36) NOT NULL,
        from_profile_id VARCHAR(36) NULL,
        to_profile_id VARCHAR(36) NULL,
        status ENUM('PENDING', 'ACCEPTED', 'DECLINED') DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_interest_pair (from_user_id, to_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (_) {}

  // Step 4: Seed Initial Data
  await seedInitialData(db);

  await db.end();
  console.log('Database initialization complete!');
}

async function seedInitialData(db: mysql.Connection) {
  console.log('Seeding initial system data...');

  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const userPasswordHash = await bcrypt.hash('User@123456', 10);

  // 1. Roles
  const roles = [
    { id: 'role_super_admin', name: 'SUPER_ADMIN', description: 'Complete platform control' },
    { id: 'role_admin', name: 'ADMIN', description: 'Operations and moderation' },
    { id: 'role_support', name: 'SUPPORT', description: 'Customer support and disputes' },
    { id: 'role_finance', name: 'FINANCE', description: 'Commissions, payouts, and refunds' },
    { id: 'role_vendor', name: 'VENDOR', description: 'Wedding service provider' },
    { id: 'role_customer', name: 'CUSTOMER', description: 'End-user bride/groom/family' },
  ];
  for (const r of roles) {
    await db.query(
      `INSERT INTO roles (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [r.id, r.name, r.description]
    );
  }

  // 2. Super Admin User
  await db.query(
    `INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
     VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 'ACTIVE', true, true)
     ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)`,
    ['usr_super_admin_01', 'admin@wedwithme.com', '+919999900001', passwordHash, 'Platform Administrator']
  );

  // 3. Configurable Match Factor Weights (Sum = 100%)
  const factorWeights = [
    { id: 'mf_age', name: 'Age Compatibility', weight: 15.00 },
    { id: 'mf_religion', name: 'Religion & Caste Preference', weight: 15.00 },
    { id: 'mf_marital', name: 'Marital Status Compatibility', weight: 10.00 },
    { id: 'mf_education', name: 'Education Level Matching', weight: 10.00 },
    { id: 'mf_profession', name: 'Profession & Career Field', weight: 10.00 },
    { id: 'mf_income', name: 'Annual Income Expectation', weight: 10.00 },
    { id: 'mf_height', name: 'Height Preference Match', weight: 5.00 },
    { id: 'mf_location', name: 'Location & City Distance', weight: 15.00 },
    { id: 'mf_profile', name: 'Profile Completeness & Verification', weight: 10.00 },
  ];
  for (const fw of factorWeights) {
    await db.query(
      `INSERT INTO match_factor_weights (id, factor_name, weight_percent, is_active, version)
       VALUES (?, ?, ?, true, 1)
       ON DUPLICATE KEY UPDATE weight_percent = VALUES(weight_percent)`,
      [fw.id, fw.name, fw.weight]
    );
  }

  // 4. Marketplace Categories
  const { VENDOR_CATEGORIES } = await import('@/lib/vendorCategories');
  const categories = [
    ...VENDOR_CATEGORIES.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      desc: c.description,
      order: c.display_order,
    })),
    {
      id: 'cat_mehendi',
      slug: 'mehendi',
      name: 'Mehendi Artists',
      desc: 'Intricate & Traditional Henna Designs',
      order: 11,
    },
  ];
  for (const c of categories) {
    await db.query(
      `INSERT INTO categories (id, slug, name, description, is_active, display_order)
       VALUES (?, ?, ?, ?, true, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
      [c.id, c.slug, c.name, c.desc, c.order]
    );
  }

  // 5. Seed Verified Vendors matching the design
  const vendors = [
    {
      id: 'ven_royal_clicks',
      userId: 'usr_vendor_photo',
      email: 'vendor.photo@wedwithme.com',
      name: 'Amit Sharma',
      businessName: 'Royal Clicks Photography',
      categoryId: 'cat_photographers',
      city: 'Delhi NCR',
      price: 15000,
      rating: 4.8,
      reviews: 1240,
      cover: '/images/photographer.jpg',
      desc: 'Award-winning candid wedding photographers with over 8 years of experience shooting royal destination weddings.',
    },
    {
      id: 'ven_zaika_caterers',
      userId: 'usr_vendor_cater',
      email: 'vendor.cater@wedwithme.com',
      name: 'Chef Rajesh Mehra',
      businessName: 'Zaika Caterers',
      categoryId: 'cat_caterers',
      city: 'Agra',
      price: 20000,
      rating: 4.7,
      reviews: 980,
      cover: '/images/caterer.jpg',
      desc: 'Royal Indian banquet catering, signature live tandoor and chaat counters, authentic Mughlai and multi-cuisine spreads.',
    },
    {
      id: 'ven_dream_decor',
      userId: 'usr_vendor_decor',
      email: 'vendor.decor@wedwithme.com',
      name: 'Sunil Verma',
      businessName: 'Dream Decor',
      categoryId: 'cat_decorators',
      city: 'Jaipur',
      price: 25000,
      rating: 4.9,
      reviews: 1520,
      cover: '/images/decorator.jpg',
      desc: 'Grand floral mandaps, fairy light tunnels, royal crimson drapery, and thematic stage design.',
    },
    {
      id: 'ven_royal_palace',
      userId: 'usr_vendor_venue',
      email: 'vendor.venue@wedwithme.com',
      name: 'Rana Pratap Singh',
      businessName: 'Royal Palace Venue',
      categoryId: 'cat_venues',
      city: 'Agra',
      price: 50000,
      rating: 4.6,
      reviews: 760,
      cover: '/images/venue.jpg',
      desc: 'Heritage palace resort overlooking royal gardens, banquet hall capacity for 1500+ guests, luxury suites, and poolside cocktail lawns.',
    },
  ];

  const demoVendors = vendors.filter((v) => v.id === 'ven_royal_clicks' || v.id === 'ven_royal_palace');

  for (const v of demoVendors) {
    await db.query(
      `INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
       VALUES (?, ?, ?, ?, ?, 'VENDOR', 'ACTIVE', true, true)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [v.userId, v.email, `+9198765000${v.price}`, passwordHash, v.name]
    );

    await db.query(
      `INSERT INTO vendors (id, user_id, business_name, category_id, city, starting_price, rating, review_count, cover_image, description, verification_status, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', true)
       ON DUPLICATE KEY UPDATE business_name = VALUES(business_name), rating = VALUES(rating), starting_price = VALUES(starting_price)`,
      [v.id, v.userId, v.businessName, v.categoryId, v.city, v.price, v.rating, v.reviews, v.cover, v.desc]
    );

    if (v.id === 'ven_royal_palace') {
      await db.query(
        `INSERT INTO vendor_packages (id, vendor_id, name, description, guest_capacity, price, included_items_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE price = VALUES(price)`,
        [
          'pkg_royal_palace_premium',
          v.id,
          'Premium Royal Package',
          'Complete access to heritage banquet, lawn, bridal suites, and valet parking.',
          200,
          150000.00,
          JSON.stringify(['Banquet Hall', 'Outdoor Lawn', 'Valet Parking', 'Bridal Suite', 'Basic Ambient Lighting']),
        ]
      );
    }
  }

  // 6. Seed Matrimonial Profiles
  const customers = [
    {
      userId: 'usr_cust_priya',
      email: 'priya.sharma@example.com',
      name: 'Priya Sharma',
      gender: 'FEMALE',
      dob: '2000-05-14',
      height: 163, // 5'4"
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      religion: 'Hindu',
      caste: 'Brahmin',
      subCaste: 'Kashyap',
      motherTongue: 'Hindi',
      education: 'B.Tech in Computer Science',
      college: 'IIT Kanpur',
      profession: 'Senior Software Engineer',
      company: 'Microsoft',
      income: 1800000,
      photo: '/images/priya.jpg',
      about: 'I value family, career, and mindful living. Love reading, Indian classical music, and weekend trekking. Looking for a progressive life partner.',
      diet: 'Vegetarian',
      smoking: 'No',
      drinking: 'No',
      familyType: 'Nuclear',
      familyValues: 'Moderate',
    },
    {
      userId: 'usr_cust_gopal',
      email: 'gopal.yadav@example.com',
      name: 'Gopal Yadav',
      gender: 'MALE',
      dob: '1998-08-20',
      height: 178, // 5'10"
      city: 'Agra',
      state: 'Uttar Pradesh',
      religion: 'Hindu',
      caste: 'Yadav',
      subCaste: 'Ahir',
      motherTongue: 'Hindi',
      education: 'MBA & B.Tech',
      college: 'Delhi University',
      profession: 'Product Manager',
      company: 'Adobe',
      income: 2400000,
      photo: '/images/gopal.jpg',
      about: 'Tech enthusiast, cricket lover, family-oriented. Looking for a partner who believes in mutual respect and growth.',
      diet: 'Vegetarian',
      smoking: 'No',
      drinking: 'No',
      familyType: 'Joint',
      familyValues: 'Moderate',
    },
    {
      userId: 'usr_cust_ananya',
      email: 'ananya.iyer@example.com',
      name: 'Ananya Iyer',
      gender: 'FEMALE',
      dob: '1999-04-12',
      height: 165, // 5'5"
      city: 'Bengaluru',
      state: 'Karnataka',
      religion: 'Hindu',
      caste: 'Brahmin',
      subCaste: 'Iyer',
      motherTongue: 'Tamil',
      education: 'MS Data Science',
      college: 'IISc Bengaluru',
      profession: 'AI Research Scientist',
      company: 'Google AI',
      income: 2800000,
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      about: 'Passionate about artificial intelligence and Carnatic classical violin. Enjoys deep conversations, trail hiking, and cooking.',
      diet: 'Vegetarian',
      smoking: 'No',
      drinking: 'No',
      familyType: 'Nuclear',
      familyValues: 'Moderate',
    },
    {
      userId: 'usr_cust_rohan',
      email: 'rohan.kapoor@example.com',
      name: 'Rohan Kapoor',
      gender: 'MALE',
      dob: '1997-11-28',
      height: 180, // 5'11"
      city: 'Delhi NCR',
      state: 'Delhi',
      religion: 'Hindu',
      caste: 'Khatri',
      subCaste: 'Kapoor',
      motherTongue: 'Punjabi',
      education: 'MBA Finance',
      college: 'FMS Delhi',
      profession: 'Investment Banking Associate',
      company: 'Goldman Sachs',
      income: 3400000,
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
      about: 'Ambitious yet grounded. Believes in balancing strong professional goals with meaningful family time and fitness.',
      diet: 'Eggetarian',
      smoking: 'No',
      drinking: 'Occasionally',
      familyType: 'Nuclear',
      familyValues: 'Liberal',
    },
    {
      userId: 'usr_cust_meera',
      email: 'meera.patel@example.com',
      name: 'Meera Patel',
      gender: 'FEMALE',
      dob: '1999-09-18',
      height: 160, // 5'3"
      city: 'Mumbai',
      state: 'Maharashtra',
      religion: 'Hindu',
      caste: 'Agarwal / Vaishya',
      subCaste: 'Patel',
      motherTongue: 'Gujarati',
      education: 'Chartered Accountant (CA)',
      college: 'ICAI Mumbai',
      profession: 'Senior Financial Auditor',
      company: 'Ernst & Young',
      income: 2200000,
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=80',
      about: 'Warm, thoughtful, and creative. Love Kathak dancing, weekend coastal drives, and experimenting with global baking recipes.',
      diet: 'Vegetarian',
      smoking: 'No',
      drinking: 'No',
      familyType: 'Joint',
      familyValues: 'Traditional',
    },
    {
      userId: 'usr_cust_kabir',
      email: 'kabir.gill@example.com',
      name: 'Kabir Singh Gill',
      gender: 'MALE',
      dob: '1996-03-08',
      height: 185, // 6'1"
      city: 'Chandigarh',
      state: 'Punjab',
      religion: 'Sikh',
      caste: 'Jat',
      subCaste: 'Gill',
      motherTongue: 'Punjabi',
      education: 'M.Tech in Robotics',
      college: 'IIT Kharagpur',
      profession: 'Tech Founder & CTO',
      company: 'AgriTech Automation',
      income: 4200000,
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80',
      about: 'Passionate about building robotics for agricultural efficiency. Teetotaler, avid cyclist, and family-first human.',
      diet: 'Vegetarian',
      smoking: 'No',
      drinking: 'No',
      familyType: 'Nuclear',
      familyValues: 'Moderate',
    },
    {
      userId: 'usr_cust_sneha',
      email: 'dr.sneha.roy@example.com',
      name: 'Dr. Sneha Roy',
      gender: 'FEMALE',
      dob: '1998-02-14',
      height: 162, // 5'4"
      city: 'New Delhi',
      state: 'Delhi',
      religion: 'Hindu',
      caste: 'Kayastha',
      subCaste: 'Roy',
      motherTongue: 'Bengali',
      education: 'MBBS & MD Pediatrics',
      college: 'AIIMS New Delhi',
      profession: 'Pediatric Specialist',
      company: 'Max Healthcare',
      income: 2000000,
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80',
      about: 'Dedicated pediatrician who finds joy in patient care, classical literature, and watercolor painting on lazy Sunday afternoons.',
      diet: 'Non-Vegetarian',
      smoking: 'No',
      drinking: 'No',
      familyType: 'Nuclear',
      familyValues: 'Moderate',
    },
    {
      userId: 'usr_cust_arjun',
      email: 'arjun.saxena@example.com',
      name: 'Arjun Saxena',
      gender: 'MALE',
      dob: '1997-06-25',
      height: 175, // 5'9"
      city: 'Jaipur',
      state: 'Rajasthan',
      religion: 'Hindu',
      caste: 'Kayastha',
      subCaste: 'Saxena',
      motherTongue: 'Hindi',
      education: 'B.Tech & Public Administration',
      college: 'IIT Roorkee',
      profession: 'Civil Services / Administrative Officer',
      company: 'Govt of India',
      income: 1700000,
      photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=700&q=80',
      about: 'Passionate public administrator striving for positive civic impact. Enjoys badminton, Indian history, and heritage travel.',
      diet: 'Vegetarian',
      smoking: 'No',
      drinking: 'No',
      familyType: 'Nuclear',
      familyValues: 'Traditional',
    }
  ];

  for (const c of customers.slice(0, 2)) {
    await db.query(
      `INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
       VALUES (?, ?, ?, ?, ?, 'CUSTOMER', 'ACTIVE', true, true)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [c.userId, c.email, `+9198111000${c.height}`, userPasswordHash, c.name]
    );

    const profileId = `prof_${c.userId}`;
    await db.query(
      `INSERT INTO customer_profiles (
         id, user_id, gender, date_of_birth, height_cm, marital_status, religion, caste, sub_caste,
         mother_tongue, education, college, profession, company, annual_income, state, city,
         about_me, diet, smoking, drinking, family_type, family_values, verification_status, profile_visibility
       ) VALUES (?, ?, ?, ?, ?, 'NEVER_MARRIED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', 'PUBLIC')
       ON DUPLICATE KEY UPDATE
         annual_income = VALUES(annual_income),
         profession = VALUES(profession),
         sub_caste = VALUES(sub_caste),
         college = VALUES(college),
         company = VALUES(company)`,
      [
        profileId, c.userId, c.gender, c.dob, c.height, c.religion, c.caste, c.subCaste || '',
        c.motherTongue || 'Hindi', c.education, c.college || '', c.profession, c.company || '',
        c.income, c.state, c.city, c.about, c.diet || 'Vegetarian', c.smoking || 'No', c.drinking || 'No',
        c.familyType || 'Nuclear', c.familyValues || 'Moderate'
      ]
    );

    await db.query(
      `INSERT INTO profile_photos (id, profile_id, url, is_primary, is_approved)
       VALUES (?, ?, ?, true, true)
       ON DUPLICATE KEY UPDATE url = VALUES(url)`,
      [`photo_${profileId}`, profileId, c.photo]
    );

    await db.query(
      `INSERT INTO partner_preferences (id, profile_id, min_age, max_age, min_height_cm, max_height_cm, preferred_religions, min_income, preferred_locations)
       VALUES (?, ?, 22, 32, 150, 190, 'Hindu, Any', 800000, 'Delhi NCR, Lucknow, Agra, Jaipur, Bengaluru, Mumbai')
       ON DUPLICATE KEY UPDATE min_age = VALUES(min_age)`,
      [`pref_${profileId}`, profileId]
    );
  }

  // 7. Seed System Settings
  const settings = [
    { key: 'platform_commission_rate', value: '10.00', cat: 'FINANCE', desc: 'Default platform commission on vendor bookings (%)' },
    { key: 'min_booking_deposit_percent', value: '25.00', cat: 'FINANCE', desc: 'Minimum advance deposit required to confirm booking (%)' },
    { key: 'matching_algorithm_version', value: '1.2.0', cat: 'MATCHING', desc: 'Active multi-factor matching engine model' },
    { key: 'enable_ai_concierge', value: 'true', cat: 'AI', desc: 'Enable Sagun AI assistant for public and authenticated users' },
  ];
  for (const s of settings) {
    await db.query(
      `INSERT INTO system_settings (id, \`key\`, value, category, description)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [`set_${s.key}`, s.key, s.value, s.cat, s.desc]
    );
  }

  // 8. Seed Sample Bookings
  await db.query(
    `INSERT INTO bookings (
       id, booking_number, customer_id, vendor_id, event_date, guest_count,
       total_amount, commission_rate, commission_amount, vendor_payout_amount, status, notes
     ) VALUES (?, ?, ?, ?, ?, 200, 150000.00, 10.00, 15000.00, 135000.00, 'CONFIRMED', 'Royal Palace Venue Wedding Sangeet')
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [
      'book_demo_01',
      'WWM-2026-8941',
      'prof_usr_cust_gopal',
      'ven_royal_palace',
      '2026-11-12',
    ]
  );

  await db.query(
    `INSERT INTO bookings (
       id, booking_number, customer_id, vendor_id, event_date, guest_count,
       total_amount, commission_rate, commission_amount, vendor_payout_amount, status, notes
     ) VALUES (?, ?, ?, ?, ?, 120, 45000.00, 10.00, 4500.00, 40500.00, 'REQUESTED', 'Royal Clicks Photography pre-wedding')
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [
      'book_demo_02',
      'WWM-2026-8942',
      'prof_usr_cust_priya',
      'ven_royal_clicks',
      '2026-10-18',
    ]
  );

  console.log('Seed data successfully committed to MySQL database!');
}

// Allow standalone execution via `node`
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Initialization failed:', err);
      process.exit(1);
    });
}
