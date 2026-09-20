# WedWithMe restore procedure

1. Take a MySQL dump from Hostinger / current production.
2. Store the dump in your backup destination (local folder or S3).
3. To restore: create the database, then import the dump.
4. Confirm `users`, `vendors`, and `bookings` tables have data.
5. Log the restore drill from Admin → Backup & Reliability.

This runbook is informational. Always test restores on a staging database first.
