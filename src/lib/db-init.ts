import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

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
      gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
      date_of_birth DATE NOT NULL,
      height_cm INT NOT NULL,
      marital_status VARCHAR(50) DEFAULT 'NEVER_MARRIED',
      religion VARCHAR(50) NOT NULL,
      caste VARCHAR(50),
      sub_caste VARCHAR(50),
      education VARCHAR(100) NOT NULL,
      profession VARCHAR(100) NOT NULL,
      annual_income DECIMAL(12, 2) NOT NULL,
      country VARCHAR(50) DEFAULT 'India',
      state VARCHAR(50) NOT NULL,
      city VARCHAR(50) NOT NULL,
      about_me TEXT,
      family_details TEXT,
      hobbies TEXT,
      verification_status ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'UNVERIFIED',
      profile_visibility ENUM('PUBLIC', 'REGISTERED_ONLY', 'PRIVATE') DEFAULT 'PUBLIC',
      hide_phone BOOLEAN DEFAULT TRUE,
      hide_photos BOOLEAN DEFAULT FALSE,
      hide_income BOOLEAN DEFAULT FALSE,
      profile_score INT DEFAULT 85,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_profiles_filter (gender, marital_status, religion, city)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS profile_photos (
      id VARCHAR(36) PRIMARY KEY,
      profile_id VARCHAR(36) NOT NULL,
      url VARCHAR(255) NOT NULL,
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
      accepted_marital_status VARCHAR(255) DEFAULT 'NEVER_MARRIED',
      preferred_religions VARCHAR(255) DEFAULT 'Hindu',
      preferred_castes VARCHAR(255),
      preferred_educations VARCHAR(255),
      preferred_professions VARCHAR(255),
      min_income DECIMAL(12, 2),
      preferred_locations VARCHAR(255),
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
        'REQUESTED', 'PENDING_VENDOR', 'ACCEPTED', 'REJECTED',
        'PAYMENT_PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
        'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED'
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
  ];

  for (let i = 0; i < tableDefinitions.length; i++) {
    await db.query(tableDefinitions[i]);
  }
  console.log(`Successfully verified ${tableDefinitions.length} tables.`);

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
  const categories = [
    { id: 'cat_photographers', slug: 'photographers', name: 'Photographers', desc: 'Capture Your Special Moments', order: 1 },
    { id: 'cat_caterers', slug: 'caterers', name: 'Caterers', desc: 'Delicious Food for Every Moment', order: 2 },
    { id: 'cat_decorators', slug: 'decorators', name: 'Decorators', desc: 'Turn Dreams into Reality', order: 3 },
    { id: 'cat_venues', slug: 'venues', name: 'Venues', desc: 'Stunning Spaces for Your Big Day', order: 4 },
    { id: 'cat_makeup', slug: 'makeup', name: 'Bridal Makeup', desc: 'Flawless Beauty for Your Big Day', order: 5 },
    { id: 'cat_mehendi', slug: 'mehendi', name: 'Mehendi Artists', desc: 'Intricate & Traditional Henna Designs', order: 6 },
    { id: 'cat_dj', slug: 'dj-music', name: 'DJ & Music', desc: 'Energetic Sound & Entertainment', order: 7 },
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

  for (const v of vendors) {
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
      education: 'B.Tech in Computer Science',
      profession: 'Senior Software Engineer',
      income: 1800000,
      photo: '/images/priya.jpg',
      about: 'I value family, career, and mindful living. Love reading, Indian classical music, and weekend trekking.',
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
      education: 'MBA & B.Tech',
      profession: 'Product Manager',
      income: 2400000,
      photo: '/images/gopal.jpg',
      about: 'Tech enthusiast, cricket lover, family-oriented. Looking for a partner who believes in mutual respect and growth.',
    },
  ];

  for (const c of customers) {
    await db.query(
      `INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
       VALUES (?, ?, ?, ?, ?, 'CUSTOMER', 'ACTIVE', true, true)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [c.userId, c.email, `+9198111000${c.height}`, userPasswordHash, c.name]
    );

    const profileId = `prof_${c.userId}`;
    await db.query(
      `INSERT INTO customer_profiles (
         id, user_id, gender, date_of_birth, height_cm, marital_status, religion, caste,
         education, profession, annual_income, state, city, about_me, verification_status, profile_visibility
       ) VALUES (?, ?, ?, ?, ?, 'NEVER_MARRIED', ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', 'PUBLIC')
       ON DUPLICATE KEY UPDATE annual_income = VALUES(annual_income), profession = VALUES(profession)`,
      [profileId, c.userId, c.gender, c.dob, c.height, c.religion, c.caste, c.education, c.profession, c.income, c.state, c.city, c.about]
    );

    await db.query(
      `INSERT INTO profile_photos (id, profile_id, url, is_primary, is_approved)
       VALUES (?, ?, ?, true, true)
       ON DUPLICATE KEY UPDATE url = VALUES(url)`,
      [`photo_${profileId}`, profileId, c.photo]
    );

    await db.query(
      `INSERT INTO partner_preferences (id, profile_id, min_age, max_age, min_height_cm, max_height_cm, preferred_religions, min_income, preferred_locations)
       VALUES (?, ?, 22, 30, 155, 185, 'Hindu', 1000000, 'Delhi NCR, Lucknow, Agra, Jaipur')
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
