# WedWithMe - Developer Handoff Guide

Welcome to the WedWithMe platform. This document serves as the architectural overview and developer handoff guide for maintaining and extending the platform.

## 1. Project Architecture

The WedWithMe platform utilizes a unified monorepo approach running on Next.js.
- **Frontend**: Next.js (App Router), React, TailwindCSS.
- **Backend**: Next.js API Routes (`src/app/api/...`) acting as a Node.js REST API.
- **Database**: MySQL. We use `mysql2/promise` for raw, parameterized queries instead of an ORM to maintain strict control over performance and complex joins.

### Key Directories
- `src/app/api/`: The REST API layer. Grouped logically by `admin`, `customer`, `vendor`, and `auth`.
- `src/lib/`: Core backend libraries (Database schemas, Security, RBAC, File handling).
- `src/app/admin/`, `src/app/customer/`, `src/app/vendor/`: The separate frontend portals.
- `scripts/`: Operational scripts for database migration, schema setup, and automated QA.

## 2. Authentication & Authorization (RBAC)

The platform relies on stateless JWT (JSON Web Tokens) stored securely in `httpOnly` cookies.

### Customer & Vendor Auth
- Handled primarily by `src/lib/auth.ts` (or similar JWT utilities).
- Uses standard access boundaries where customers cannot access vendor routes, and vice versa.

### Admin RBAC
- Managed strictly by `src/lib/rbac.ts`.
- Valid roles: `SUPER_ADMIN`, `ADMIN`, `FINANCE`, `SUPPORT`.
- **Enforcement**: Every single endpoint in `src/app/api/admin/*` MUST be wrapped with `verifyAdminRole(req)` or `requireAnyRole(req, ['ROLES'])`.

## 3. Database Management & Migrations

We do not use Prisma or TypeORM. The database is managed via deterministic Node.js schema scripts located in `src/lib/` (e.g., `db-schema.ts`, `db-schema-part2.ts`, `db-schema-finance.ts`).

**To bootstrap a fresh database:**
Run the schema files sequentially using `npx tsx <filename>`. See the `README.md` for the exact sequence.

### Audit Logging
All material administrative actions MUST be logged. The system provides an `auditLog()` utility function in `src/lib/security.ts`. Do not bypass this for any configuration updates, status changes, or financial operations.

## 4. State Machines & Valid Transitions

The platform relies heavily on enum-based state machines. You must enforce these transitions strictly via backend logic.

- **Vendor Approval**: `PENDING` -> `APPROVED` or `REJECTED`.
- **Bookings**: `REQUESTED` -> `CONFIRMED` -> `COMPLETED` (or `CANCELLED`).
- **Payments**: `PENDING` -> `COMPLETED` or `FAILED`.
- **Payouts**: `PENDING` -> `PROCESSING` -> `PAID`.
- **Disputes**: `OPEN` -> `UNDER_REVIEW` -> `RESOLVED_CUSTOMER` / `RESOLVED_VENDOR`.

## 5. Security & Privacy

1. **No Data Mocking**: Do not fabricate analytical, financial, or user data. Use SQL aggregations.
2. **PII Masking**: When building admin views for Customer support, strictly mask PII (e.g., `***@gmail.com`) unless the specific Admin role requires full access.
3. **Passwords & Secrets**: Never log or return passwords, OTPs, or API keys in standard JSON responses. Passwords must be hashed via `bcrypt` (or `crypto` pbkdf2) before entering the DB.

## 6. Error Handling Contract

All REST APIs must adhere to the standardized JSON error contract:
```json
{
  "success": false,
  "error": "Human readable error message"
}
```
HTTP status codes must be semantically correct (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).

## 7. Configuration Placeholders (TBD)
The MVP architecture has placeholder integrations for several external providers. These are documented in the `.env` file and must be implemented before moving to production:
- Payment Gateway (Stripe/Razorpay)
- SMS Provider (Twilio/AWS SNS)
- Email Provider (SendGrid/AWS SES)
- File Storage (AWS S3)

Do not hardcode credentials for these providers in the repository.

---
*Generated during Admin Step 19 — Developer Handoff*
