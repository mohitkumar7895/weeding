# WedWithMe - Production Security Verification Checklist

This checklist documents the security hardening pass executed across the platform prior to production deployment.

## 1. Authentication & Session Security
- [x] **JWT Validation**: All active `/api/customer/*` and `/api/vendor/*` routes enforce `verifyToken()`.
- [x] **Token Expiry**: JWT tokens have fixed expiration times.
- [x] **Password Hashing**: User passwords are cryptographically hashed (bcrypt/pbkdf2) before database insertion. No plaintext passwords exist in `users`.
- [x] **Secret Exposure**: JWT signing keys and external provider API keys are exclusively loaded via `.env` variables and NEVER hardcoded in the source or exposed to the client.

## 2. Authorization & RBAC
- [x] **Admin RBAC Enforcement**: `verifyAdminRole()` is globally enforced across 100% of the `/api/admin/*` surface area.
- [x] **Role Segregation**: Customer API routes strictly reject Vendor JWTs, and vice versa.
- [x] **IDOR Prevention**: All API routes modifying personal data (e.g., Profile Updates, Portfolio Uploads) extract the target `user_id` strictly from the verified JWT payload, not from the request body.

## 3. Database Security
- [x] **SQL Injection (SQLi) Prevention**: All dynamic values passed to MySQL use `mysql2/promise` parameterization (`?`). Template literal injection inside queries is strictly prohibited.
- [x] **Transaction Integrity**: Financial operations (Payments, Payouts, Refunds) are wrapped in `db.beginTransaction()` and `db.commit()` to prevent race conditions and partial state updates.

## 4. File & Media Security
- [x] **Upload Restrictions**: Portfolio and KYC upload routes enforce MIME type validation (blocking `.exe`, `.sh`).
- [x] **File Size Limits**: Storage abstraction strictly rejects payloads exceeding predefined limits.

## 5. Financial & Booking State Security
- [x] **Server-Side Truth**: Commission calculations, refund amounts, and payout settlements are calculated mathematically by the backend based on original booking values. Client-submitted override amounts are ignored.
- [x] **State Machine Enforcement**: State transitions (e.g., cancelling an already completed booking) are firmly rejected by backend logical assertions.

## 6. Security Logging & Auditing
- [x] **Audit Logs**: All state transitions affecting Finances, Governance, Risk Flags, and User status trigger `auditLog()`.
- [x] **Secret Redaction**: Passwords and JWTs are stripped from `audit_logs` payloads before database insertion.

## 7. Next Steps (Infrastructure / DevOps - TBD)
- [ ] Configure Web Application Firewall (WAF) to handle DDoS protection and general rate-limiting at the Edge.
- [ ] Ensure the production database is hosted on a private VPC, unreachable from the public internet.
- [ ] Configure automated daily volume backups for the MySQL cluster.
