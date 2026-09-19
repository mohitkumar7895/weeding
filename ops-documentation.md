# WedWithMe - Operational Runbook (Backup, Restore & Reliability)

This document provides essential instructions for managing the reliability foundation of the WedWithMe platform, specifically covering database backups, restoration verification, and health monitoring.

## 1. Environment Configuration
The backup and restore scripts rely on environment variables to operate securely. 
Ensure the following variables are available in the operational environment:

```bash
# Database Connections
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=wedwithme
DB_PORT=3306

# Backup Storage Abstraction
BACKUP_STORAGE_PROVIDER=local  # Options: 'local', 's3' (planned)
BACKUP_LOCAL_PATH=./backups    # Used when provider is 'local'
BACKUP_RETENTION_DAYS=30       # Auto-purges files older than 30 days
```
*Note: Never commit actual passwords to version control.*

## 2. Backup Procedure
Backups use an abstracted storage layer (`scripts/backupStorage.js`) to decouple logical database dumping from physical storage mechanisms.

**To trigger a manual backup:**
```bash
node scripts/backup-db.js
```

**Cron Scheduling Strategy:**
It is recommended to run this script as a daily cron job. 
Example cron entry (runs at 02:00 AM server time daily):
```
0 2 * * * cd /path/to/wedwithme && node scripts/backup-db.js >> /var/log/wedwithme-backup.log 2>&1
```

## 3. Restore & Verification Procedure
The restore script (`scripts/restore-db.js`) has been hardened with integrity checks. It will not silently report success if the database is missing critical tables after restore.

**To restore from the latest available backup:**
```bash
node scripts/restore-db.js
```

**To restore from a specific snapshot:**
```bash
node scripts/restore-db.js ./backups/wedwithme_snapshot_2026-10-01T02-00-00.json
```

### Restore Integrity Rules:
1. **Critical Table Check**: The script automatically verifies that `users`, `vendors`, `bookings`, and `payment_transactions` exist post-restore.
2. **Sanity Data Check**: It ensures the `users` table is not empty (if the backup contained users).

## 4. Health & Readiness Monitoring
A dedicated health endpoint is available to check application liveness and database readiness.

- **Endpoint**: `GET /api/health`
- **Success (200 OK)**: Indicates the Node.js server is running AND the MySQL connection pool successfully executed a `SELECT 1` ping.
- **Failure (503 Service Unavailable)**: Indicates the database is unreachable. Internal connection errors are suppressed for security, but the 503 code allows Load Balancers (like AWS ALB or Nginx) to automatically pull the unhealthy node out of rotation.

## 5. Failure Recovery Steps
1. **Database Connection Errors**: If `/api/health` returns `503`, verify the `DB_HOST` networking rules.
2. **Restore Failures**: If a restore fails mid-process, the script attempts to re-enable `FOREIGN_KEY_CHECKS`. If data is corrupt, completely drop and recreate the target database, then re-run the restore script.
