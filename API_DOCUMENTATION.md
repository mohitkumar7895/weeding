# WedWithMe - API Documentation

This document describes the REST API architecture, authentication mechanisms, common error handling, and the available endpoints for the WedWithMe platform.

---

## 🔐 Authentication & Authorization
The platform relies on secure, HTTP-only cookies for session management. 
- **Mechanism**: JSON Web Tokens (JWT) stored in a cookie named `wwm_auth_token`.
- **Usage**: You do *not* need to manually send a Bearer token in the `Authorization` header. The browser automatically includes the `wwm_auth_token` cookie with every request to the backend.
- **Expiry**: Tokens are configured to expire after 7 days (`maxAge: 60 * 60 * 24 * 7`).
- **Authorization**: Protected APIs enforce role-based access control (RBAC). A user must have the appropriate `role` (e.g., `CUSTOMER`, `VENDOR`, `ADMIN`) to access specific namespaces.

---

## 🚫 Standard Error Responses
All API routes return a consistent JSON structure when an error occurs.
```json
{
  "success": false,
  "message": "Human readable error message",
  "issues": [] // Optional array of Zod validation errors
}
```

### Common HTTP Status Codes
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing, invalid, or expired `wwm_auth_token` cookie.
- `403 Forbidden`: User is authenticated but lacks the required role or ownership of the resource.
- `404 Not Found`: The requested resource (e.g., booking ID, user profile) does not exist.
- `429 Too Many Requests`: Rate limit exceeded (e.g., more than 5 logins per minute).
- `500/503 Internal Error`: Server encountered an unexpected failure or the database is unreachable. Internal stack traces are intentionally scrubbed from the response body for security.

---

## 📦 API Modules

Below is the directory of endpoints implemented in the system, grouped by functional area.

### 1. Authentication & Identity (`/api/auth/*`)
Manages user lifecycle and session generation.
- `POST /api/auth/register`: Registers a new `CUSTOMER` or `VENDOR`. Requires email, password, name. Enforces rate limits (3/5min).
- `POST /api/auth/login`: Authenticates a user and sets the `wwm_auth_token` cookie. Enforces rate limits (5/1min).
- `POST /api/auth/logout`: Clears the session cookie.
- `GET /api/auth/me`: Retrieves the currently authenticated user's profile and active roles.
- `POST /api/auth/otp/send` & `/api/auth/otp/verify`: Sends and verifies One-Time Passwords for account recovery.

### 2. Customer Platform (`/api/customer/*`)
Endpoints reserved for users with the `CUSTOMER` role.
- `GET / POST /api/customer/profile`: Read or update the customer's personal details and matchmaking profile.
- `GET / POST /api/customer/preferences`: Manage partner preferences (age, religion, height, location).
- `POST /api/customer/search`: Search for matches or vendors based on active preferences.
- `POST /api/customer/shortlist`: Add or remove a vendor/profile from the customer's shortlist.
- `GET /api/customer/saved-searches`: Retrieve saved filter configurations.

### 3. Vendor Platform (`/api/vendor/*`)
Endpoints reserved for users with the `VENDOR` role.
- `GET / POST /api/vendor/profile`: Manage the public-facing business profile.
- `POST /api/vendor/documents`: Upload KYC documents (`PAN`, `GST`, `ID_PROOF`). Requires `multipart/form-data`.
- `GET / POST /api/vendor/services` & `/api/vendor/packages`: Manage the vendor's service catalog and pricing tiers.
- `GET / POST /api/vendor/portfolio`: Upload media and portfolio artifacts to showcase previous work.
- `GET / POST /api/vendor/availability`: Manage calendar locks and blocked dates to prevent double-booking.
- `GET /api/vendor/earnings` & `/api/vendor/analytics`: Read-only endpoints for financial metrics and profile views.

### 4. Bookings & Payments (`/api/bookings/*` & `/api/payments/*`)
The transactional core of the platform.
- `POST /api/bookings`: Create a new booking request. (Requires `CUSTOMER` role).
- `GET /api/bookings/[id]`: Retrieve full booking details.
- `POST /api/bookings/[id]/status`: Update a booking status (e.g., Vendor accepting/rejecting a request).
- `POST /api/payments/verify`: Verifies a payment callback against the database state and the payment provider. Only updates status to `CONFIRMED` if mathematically sound and authorized.

**Booking Lifecycle States:**
1. `PENDING`: Initial state after creation.
2. `ACCEPTED`: Vendor has agreed to the booking terms.
3. `PAYMENT_PENDING`: Awaiting customer payment via Escrow.
4. `CONFIRMED`: Payment verified and escrow funded.
5. `COMPLETED`: Service rendered successfully.
6. `CANCELLED`: Aborted by either party.

### 5. Communication & Reviews
- `GET / POST /api/messages`: Fetch or send direct chat messages between matched customers and vendors.
- `POST /api/bookings/[id]/reviews`: Submit a rating and written review after a booking reaches `COMPLETED` status.
- `GET / POST /api/notifications`: Retrieve in-app alerts (e.g., booking status changes, payment successes).

### 6. Administrative Operations (`/api/admin/*`)
Highly restricted endpoints accessible only to the `ADMIN` role.
- `GET /api/admin/users` & `/api/admin/vendors`: Enumerate and manage platform accounts.
- `POST /api/admin/vendors/[id]/approve`: Finalize a vendor's KYC process, transitioning them to `ACTIVE`.
- `GET / POST /api/admin/payouts/process`: Reconcile escrow accounts and release funds to vendors for completed bookings.
- `GET /api/admin/reports` & `/api/admin/disputes`: Resolve customer complaints or transaction disputes.
- `GET /api/admin/audit-logs`: Query the immutable ledger of material business actions (e.g., payment changes, account suspensions).

### 7. AI & Discovery
- `POST /api/ai/chat`: Generative AI endpoint for the Booking Assistant.
- `GET /api/public/reels` & `/api/vendor/reels`: Endpoints powering the short-form video discovery feed.

---

## 🔒 Privacy & Security Context
- **Data Exposure**: Customer contact details (phone/email) are strictly obfuscated based on `privacy_settings` (e.g., `MATCHED_ONLY` or `PRIVATE`). The API layer enforces these rules before serializing responses.
- **Data Integrity**: Financial changes (Payments, Bookings) enforce Strict DB transactions to guarantee state synchrony. Partial rollbacks are supported.

## 🛠 Usage Examples

### Example: Fetching Current User
**Request:**
```http
GET /api/auth/me HTTP/1.1
Host: localhost:3000
Cookie: wwm_auth_token=eyJhbG...
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_12345",
    "name": "Jane Doe",
    "role": "CUSTOMER",
    "email": "jane@example.com"
  }
}
```

### Example: Attempting Action Without Role
**Request:**
```http
POST /api/vendor/packages HTTP/1.1
Host: localhost:3000
Cookie: wwm_auth_token=eyJhbG... 
// Note: User token belongs to a CUSTOMER
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Vendor authorization required"
}
```
