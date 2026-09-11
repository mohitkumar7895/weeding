# WedWithMe — Database Architecture, Backup & Disaster Recovery Specification

## 1. Database Architecture Overview

WedWithMe utilizes a relational MySQL 8.0+ database engine accessed via high-performance connection pooling (`mysql2/promise`) with ACID transactional consistency, strict foreign key references, and multi-tenant domain partitioning.

### Active Connection Configuration
- **Host**: `DB_HOST` (Default `127.0.0.1` / `localhost`)
- **Port**: `DB_PORT` (Default `3306`)
- **Database**: `DB_NAME` (`wedwithme`)
- **Pool Size**: 20 concurrent connections with keepalive and automatic reconnection.

---

## 2. Relational Entity Schemas (Part 1 + Part 2)

### Core User & Role Management
- `users`: Authentication identities, roles (`SUPER_ADMIN`, `ADMIN`, `SUPPORT`, `FINANCE`, `VENDOR`, `CUSTOMER`), status (`ACTIVE`, `SUSPENDED`), and bcrypt password hashes.
- `roles` & `permissions` & `role_permissions`: Granular RBAC access definitions.
- `audit_logs`: Append-only, tamper-evident administrative action log capturing actor, entity, IP, and changes.

### Matrimonial Module
- `customer_profiles`: Demographic, personal, religion, education, and career details.
- `profile_photos`: Photo URLs with moderation flags.
- `partner_preferences`: Criteria ranges for matchmaking.
- `match_factor_weights`: Versioned multi-factor weights (Age, Religion, Marital Status, Education, Profession, Income, Location, Completeness).
- `match_scores`: Precomputed compatibility percentage cache with granular breakdown JSON.
- `shortlists`: Mutual interest and shortlist registry.

### Vendor & Wedding Marketplace Module
- `categories`: Wedding service taxonomy (Photographers, Venues, Caterers, Decorators, etc.).
- `vendors`: Business entities, location, starting prices, rating aggregation, and verification flags.
- `vendor_onboarding`: 8-state KYC compliance workflow (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `DOCUMENTS_REQUIRED`, `VERIFICATION_PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`).
- `vendor_documents`: Encrypted references to KYC documents (PAN, GST, Business Registration, Bank Passbook, ID proof) with verification status (`PENDING`, `VERIFIED`, `REJECTED`).
- `vendor_services`: Standalone service catalog entries with pricing.
- `vendor_packages` & `vendor_package_items`: Multi-tier wedding packages, inclusions, and optional add-ons with moderation status (`PENDING_REVIEW` -> `APPROVED`).
- `vendor_portfolios`: Wedding showcase images and media assets.
- `vendor_reels`: Short video discovery feed with views and likes metrics.
- `vendor_availability`: Date-wise blocking grid (`is_booked = TRUE/FALSE`) enforcing double-booking prevention.

### Bookings & Financial Architecture
- `bookings`: Complete order records with unique format `WWM-YYYY-XXXXXX`, dates, guest count, and amounts.
- `booking_status_history`: Chronological audit trail of all state transitions (`REQUESTED` -> `CONFIRMED` -> `IN_PROGRESS` -> `COMPLETED` -> `CANCELLED` -> `DISPUTED`).
- `payment_transactions`: Idempotent gateway transaction logs (`TXN_...`).
- `payment_provider_events`: Webhook event ledger preventing replay attacks.
- `commission_rules`: Dynamic tier engine supporting global, category-specific, and vendor-specific rules with min/max caps.
- `commission_records`: Booking-level commission deductions computed server-side.
- `payouts` & `payout_attempts`: Vendor net earnings settlement queue with admin finance approval workflow.
- `refunds`: Policy-calculated customer refunds upon cancellation or dispute resolution.
- `disputes`, `dispute_evidence` & `dispute_messages`: Arbitration complaint filing and evidence management.

### Trust, Privacy & Communications
- `reviews` & `review_reports`: Verified customer reviews restricted strictly to completed bookings.
- `privacy_settings`: Field-level visibility settings for phone, email, income, and photos.
- `user_consents`: Timestamped consent records for Terms of Service, Privacy Policy, and AI Processing.
- `data_export_requests`: GDPR/DPDP-compliant data packaging requests.
- `data_retention_policies`: Automated retention rules by entity.
- `fraud_flags` & `risk_events`: Risk scoring and anomaly detection signals.
- `notifications` & `notification_preferences`: In-app and multi-channel communication dispatch registry.

---

## 3. Automated Backup Architecture

### Schedule & Strategy
- **Frequency**: Automated daily snapshot at 02:00 IST via `scripts/backup-db.js`.
- **Target Format**: Timestamped JSON snapshot archiving table structures and row data.
- **Location**: `backups/` directory (mounted to persistent block storage or offsite S3 bucket in production).
- **Retention**: Configurable 30-day rolling window (`RETENTION_DAYS = 30`). Backups exceeding retention age are purged automatically.

### Running a Manual Backup
```bash
node scripts/backup-db.js
```

---

## 4. Disaster Recovery (DR) Plan

### Key Recovery Metrics
- **Recovery Point Objective (RPO)**: **< 1 Hour** (Maximum allowable data loss window).
- **Recovery Time Objective (RTO)**: **< 15 Minutes** (Maximum time to restore full service).

### Step-by-Step Restoration Procedure
1. **Verify Database Service**: Ensure MySQL 8 service is operational on `3306`.
2. **Execute Restoration Script**:
   ```bash
   node scripts/restore-db.js
   ```
   Or restore a specific point-in-time snapshot:
   ```bash
   node scripts/restore-db.js backups/wedwithme_snapshot_2026-09-11T22-00-00-000Z.json
   ```
3. **Foreign Key Integrity**: The restoration script automatically handles `SET FOREIGN_KEY_CHECKS = 0` during ingestion and restores `SET FOREIGN_KEY_CHECKS = 1` afterwards.
4. **Application Verification**:
   - Verify table counts using sanity queries.
   - Restart the Next.js application server: `npm run dev` or `npm run start`.
   - Perform smoke testing of authentication and booking endpoints.

---

## 5. Security & Sensitive Data Masking Policy
1. **Zero Plaintext Credentials**: Passwords are saved exclusively as salted bcrypt hashes (`BCRYPT_SALT_ROUNDS = 10`).
2. **PII Masking**: Public vendor discovery endpoints omit raw PAN, GST, and bank account numbers.
3. **Escrow Guarantee**: Vendor payouts are marked `PENDING` until the wedding event is fulfilled and transitioned to `COMPLETED`.
