# WedWithMe APIs

Base: `https://weeding-ly9t.vercel.app/api` or `http://localhost:3000/api`  
Auth cookie: `wwm_auth_token` (`credentials: 'include'`). Guest reels: `x-wwm-guest-id`.  
Escrow pay: 25% of booking total. Login: email OTP.

Machine spec: `GET /api/openapi` and `docs/openapi.json`.

---

## Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/otp/send`
- POST `/api/auth/otp/verify`
- POST `/api/auth/forgot-password/reset`
- GET `/api/auth/me`
- GET `/api/auth/session`
- GET `/api/auth/logout`
- POST `/api/auth/logout`

## System
- GET `/api/health`
- GET `/api/openapi`

## Sagun AI
- POST `/api/ai/chat`
- GET `/api/sagun/sessions`
- POST `/api/sagun/sessions`
- GET `/api/sagun/messages`
- POST `/api/sagun/messages`

## Marketplace
- GET `/api/categories`
- GET `/api/vendors`
- GET `/api/vendors/{id}`
- GET `/api/vendors/{id}/availability`
- POST `/api/vendors/reviews`
- GET `/api/packages/compare`

## Reels
- GET `/api/reels`
- POST `/api/reels` (multipart file, login required)
- GET `/api/reels/stats`
- GET `/api/public/reels`
- GET `/api/reels/{id}/file` **(new — Vercel video stream)**
- POST `/api/reels/{id}/like`
- POST `/api/reels/{id}/save`
- POST `/api/reels/{id}/share`
- GET `/api/reels/{id}/comments`
- POST `/api/reels/{id}/comments`

## Bookings / payments
- GET `/api/bookings`
- POST `/api/bookings`
- GET `/api/bookings/{id}`
- GET `/api/bookings/{id}/history`
- PUT `/api/bookings/{id}/status`
- PATCH `/api/bookings/{id}/status`
- POST `/api/bookings/{id}/pay`
- POST `/api/bookings/{id}/cancel`
- POST `/api/bookings/{id}/reviews`
- GET `/api/bookings/{id}/messages`
- POST `/api/bookings/{id}/messages`
- GET `/api/bookings/{id}/disputes`
- POST `/api/bookings/{id}/disputes`
- POST `/api/bookings/messages/{messageId}/report`
- POST `/api/payments/verify`
- POST `/api/payments/webhook`
- POST `/api/cancellations/execute`

## Customer
- GET `/api/customer/profile`
- PUT `/api/customer/profile`
- GET `/api/customer/profiles/{id}`
- GET `/api/customer/preferences`
- PUT `/api/customer/preferences`
- GET `/api/customer/search`
- GET `/api/customer/shortlist`
- POST `/api/customer/shortlist`
- DELETE `/api/customer/shortlist`
- GET `/api/customer/saved-searches`
- POST `/api/customer/saved-searches`
- PUT `/api/customer/saved-searches/{id}`
- DELETE `/api/customer/saved-searches/{id}`
- GET `/api/customer/blocks`
- POST `/api/customer/blocks`
- DELETE `/api/customer/blocks`
- POST `/api/customer/reports`
- POST `/api/customer/ai-recommendations`
- GET `/api/customer/account/delete`
- POST `/api/customer/account/delete`

## Matrimonial
- GET `/api/matrimonial/matches`
- GET `/api/matrimonial/interests`
- POST `/api/matrimonial/interests`
- PATCH `/api/matrimonial/interests/{id}`
- GET `/api/matrimonial/chat`
- POST `/api/matrimonial/chat`

## Vendor
- GET `/api/vendor/profile`
- PUT `/api/vendor/profile`
- GET `/api/vendor/onboarding`
- PUT `/api/vendor/onboarding`
- GET `/api/vendor/services`
- POST `/api/vendor/services`
- PUT `/api/vendor/services`
- DELETE `/api/vendor/services`
- GET `/api/vendor/packages`
- POST `/api/vendor/packages`
- PUT `/api/vendor/packages`
- DELETE `/api/vendor/packages`
- GET `/api/vendor/add-ons`
- POST `/api/vendor/add-ons`
- PUT `/api/vendor/add-ons`
- DELETE `/api/vendor/add-ons`
- GET `/api/vendor/portfolio`
- POST `/api/vendor/portfolio`
- PUT `/api/vendor/portfolio`
- DELETE `/api/vendor/portfolio`
- GET `/api/vendor/documents`
- POST `/api/vendor/documents`
- GET `/api/vendor/availability`
- POST `/api/vendor/availability`
- DELETE `/api/vendor/availability`
- POST `/api/vendor/availability/lock`
- DELETE `/api/vendor/availability/lock`
- GET `/api/vendor/reels`
- POST `/api/vendor/reels`
- GET `/api/vendor/analytics`
- GET `/api/vendor/performance`
- GET `/api/vendor/earnings`

## Messages / notify / disputes / privacy
- GET `/api/messages`
- POST `/api/messages`
- GET `/api/notifications`
- PUT `/api/notifications`
- PATCH `/api/notifications/{id}`
- GET `/api/notifications/preferences`
- PUT `/api/notifications/preferences`
- GET `/api/disputes`
- POST `/api/disputes`
- POST `/api/disputes/{id}/evidence`
- POST `/api/reviews/report`
- GET `/api/privacy/consent`
- POST `/api/privacy/consent`
- GET `/api/privacy/settings`
- PUT `/api/privacy/settings`
- GET `/api/privacy/export`
- POST `/api/privacy/delete-account`

## Admin — core
- GET `/api/admin/me`
- GET `/api/admin/health`
- GET `/api/admin/stats`
- GET `/api/admin/run-migration`
- GET `/api/admin/audit-logs`
- GET `/api/admin/users`
- PUT `/api/admin/users/{id}`
- GET `/api/admin/roles`
- PUT `/api/admin/roles`
- GET `/api/admin/customers`
- GET `/api/admin/customers/{id}`
- PUT `/api/admin/customers/{id}`
- GET `/api/admin/customers/export`
- GET `/api/admin/vendors`
- GET `/api/admin/vendors/{id}`
- GET `/api/admin/vendors/export`
- GET `/api/admin/vendors/{id}/profile`
- PUT `/api/admin/vendors/{id}/profile`
- PUT `/api/admin/vendors/{id}/approve`
- PUT `/api/admin/vendors/{id}/moderation`
- PUT `/api/admin/vendors/{id}/badge`
- GET `/api/admin/vendors/{id}/availability`
- PUT `/api/admin/vendors/{id}/documents/{doc_id}`
- GET `/api/admin/onboarding/{id}`
- PUT `/api/admin/onboarding/{id}`
- PUT `/api/admin/packages/{id}`
- PUT `/api/admin/services/{id}`
- GET `/api/admin/portfolio/{id}`
- PUT `/api/admin/portfolio/{id}`
- GET `/api/admin/reels`
- PUT `/api/admin/reels/{id}`
- GET `/api/admin/reviews`
- PUT `/api/admin/reviews`
- GET `/api/admin/weights`
- PUT `/api/admin/weights`
- GET `/api/admin/support/summary`
- GET `/api/admin/support/bookings`

## Admin — finance
- GET `/api/admin/finance/payments`
- GET `/api/admin/finance/payments/{id}`
- PUT `/api/admin/finance/payments/{id}/reconcile`
- GET `/api/admin/finance/payouts`
- GET `/api/admin/finance/payouts/{id}`
- PUT `/api/admin/finance/payouts/{id}/status`
- POST `/api/admin/finance/payouts/generate`
- GET `/api/admin/finance/payouts/migrate`
- GET `/api/admin/finance/refunds`
- GET `/api/admin/finance/refunds/{id}`
- PUT `/api/admin/finance/refunds/{id}/status`
- POST `/api/admin/finance/refunds/generate`
- POST `/api/admin/finance/refunds/migrate`
- GET `/api/admin/finance/commissions/rules`
- POST `/api/admin/finance/commissions/rules`
- PUT `/api/admin/finance/commissions/rules/{id}`
- GET `/api/admin/finance/commissions/records`
- POST `/api/admin/finance/commissions/calculate`
- GET `/api/admin/commission-rules`
- POST `/api/admin/commission-rules`
- PUT `/api/admin/commission-rules`
- GET `/api/admin/payouts`
- PUT `/api/admin/payouts`
- POST `/api/admin/payouts/process`
- GET `/api/admin/invoices`
- POST `/api/admin/invoices`
- GET `/api/admin/invoices/{id}`
- PATCH `/api/admin/invoices/{id}`
- GET `/api/admin/receipts`
- POST `/api/admin/receipts`
- GET `/api/admin/reconciliations`
- GET `/api/admin/reconciliations/{id}`
- PATCH `/api/admin/reconciliations/{id}`
- POST `/api/admin/reconciliations/run`
- GET `/api/admin/reports/financial/summary`
- GET `/api/admin/reports/financial/transactions`
- GET `/api/admin/reports/financial/export`

## Admin — marketplace / analytics / ops
- GET `/api/admin/marketplace/categories`
- POST `/api/admin/marketplace/categories`
- PUT `/api/admin/marketplace/categories/{id}`
- GET `/api/admin/marketplace/configuration`
- PUT `/api/admin/marketplace/configuration`
- PUT `/api/admin/marketplace/vendors/{id}/promotion`
- GET `/api/admin/analytics`
- GET `/api/admin/analytics/overview`
- GET `/api/admin/analytics/customers`
- GET `/api/admin/analytics/vendors`
- GET `/api/admin/analytics/financials`
- GET `/api/admin/analytics/performance`
- GET `/api/admin/reports`
- PUT `/api/admin/reports`
- GET `/api/admin/disputes`
- GET `/api/admin/disputes/{id}`
- PATCH `/api/admin/disputes/{id}`
- GET `/api/admin/disputes/{id}/evidence`
- POST `/api/admin/disputes/{id}/evidence`
- POST `/api/admin/disputes/{id}/resolve`
- GET `/api/admin/cancellations/rules`
- POST `/api/admin/cancellations/rules`
- PUT `/api/admin/cancellations/rules/{id}`
- GET `/api/admin/cancellations/records`
- GET `/api/admin/fraud`
- PUT `/api/admin/fraud`
- GET `/api/admin/fraud/flags`
- GET `/api/admin/fraud/flags/{id}`
- PATCH `/api/admin/fraud/flags/{id}`
- GET `/api/admin/fraud/duplicates`
- GET `/api/admin/fraud/duplicates/{id}`
- PATCH `/api/admin/fraud/duplicates/{id}`
- GET `/api/admin/governance/config`
- PATCH `/api/admin/governance/config/{key}`
- GET `/api/admin/governance/roles`
- PATCH `/api/admin/governance/roles/{id}/permissions`
- GET `/api/admin/governance/users`
- POST `/api/admin/governance/users`
- PATCH `/api/admin/governance/users/{id}`
- GET `/api/admin/security/config`
- PATCH `/api/admin/security/config`
- GET `/api/admin/security/status`
- GET `/api/admin/security/logs`
- GET `/api/admin/notifications/config`
- PATCH `/api/admin/notifications/config`
- GET `/api/admin/notifications/logs`
- POST `/api/admin/notifications/logs/{id}/retry`
- GET `/api/admin/notifications/templates`
- POST `/api/admin/notifications/templates`
- PATCH `/api/admin/notifications/templates/{id}`
- POST `/api/admin/notifications/whatsapp/retry`
- GET `/api/admin/backups/config`
- PATCH `/api/admin/backups/config`
- GET `/api/admin/backups/records`
- GET `/api/admin/backups/restore-tests`
- POST `/api/admin/backups/restore-tests`
- GET `/api/admin/infrastructure/backups/logs`
- GET `/api/admin/infrastructure/backups/restore-tests`
- POST `/api/admin/infrastructure/backups/restore-tests`
- PATCH `/api/admin/infrastructure/backups/restore-tests/{id}`
