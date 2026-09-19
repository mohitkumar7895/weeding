# WedWithMe - MySQL Disaster Recovery & Restore Runbook

This document outlines the standard operating procedure for executing a MySQL database restoration for the WedWithMe platform in the event of catastrophic data loss.

> [!WARNING]
> **Data Loss Warning**
> Restoring a database from a backup will overwrite the current live database state. All user registrations, bookings, and payments processed *after* the backup was taken will be irrevocably lost. Ensure all stakeholders are notified before executing a production restore.

## 1. Prerequisites
- **MySQL CLI**: Must be installed on the machine executing the restore.
- **Admin Access**: Super Admin or DevOps clearance to access the destination storage (e.g., S3).
- **Target Host**: The IP/URI of the MySQL server you are restoring to.

## 2. Acquiring the Backup
Backups are routed to the Destination Reference configured in the Admin **Backup & Reliability** dashboard.

1. Locate the targeted `backup_records` entry in the Admin Panel to identify the exact `destination_reference` (e.g., `s3://wedwithme-backups/prod/db_backup_2026-09-18.sql`).
2. Download the `.sql` binary to your local secure operational environment.
   ```bash
   # Example AWS CLI retrieval
   aws s3 cp s3://wedwithme-backups/prod/db_backup_2026-09-18.sql ./restore.sql
   ```

## 3. Restoration Procedure

1. **Verify Database Connection**
   Ensure you can connect to the target database host.
   ```bash
   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p
   ```

2. **Execute the Restore Command**
   Pipe the backup SQL file into the `wedwithme` database.
   ```bash
   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p wedwithme < ./restore.sql
   ```

3. **Verify Integrity**
   Log into the database and check core tables to ensure data populated correctly.
   ```sql
   USE wedwithme;
   SELECT count(*) FROM users;
   SELECT count(*) FROM customer_profiles;
   ```

## 4. Post-Restore Validation
After the database is restored:
1. Restart the Next.js Node server to clear any stale cache or connection pools.
2. Log into the WedWithMe Admin Panel.
3. Check the **System Health** module on the Backup & Reliability page to ensure the database latency and status are `HEALTHY`.
4. **Log the Restore Test**: Navigate to Backup & Reliability and log a new "Restore Test" record, marking it as `PASSED`, appending any operational notes for compliance auditing.

## 5. Rollback Considerations
If the restore fails mid-execution:
- Drop the corrupted database schema (`DROP DATABASE wedwithme; CREATE DATABASE wedwithme;`).
- Re-attempt the restore using an older, verified `SUCCESS` backup binary.
