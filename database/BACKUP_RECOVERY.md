# 🏥 Abay General HMS — Database Backup & Recovery Plan
**Database Provider:** Neon PostgreSQL (Serverless Cloud Database)

---

## 1. Automated Backups & PITR (Point-in-Time Recovery)

Neon automatically performs continuous backup and physical storage replication.
- **Backup Retention:** 14 days (default for Neon Pro/Scale plans).
- **Granularity:** Physical page-level WAL (Write-Ahead Logging) storage allows PITR restoration down to the exact second.
- **Recovery Point Objective (RPO):** Less than 1 minute.
- **Recovery Time Objective (RTO):** Less than 5 minutes (via instant storage branching).

---

## 2. Instant Branch-based PITR Recovery (Disaster Recovery)

If a destructive query, data corruption, or server incident occurs, recovery is achieved instantly using Neon's **instant branching** feature. This creates a fully isolated copy of the database at a specific timestamp without any copy overhead.

### Step-by-Step Restoration Procedure:

1. **Identify the Target Timestamp**
   Determine the exact timestamp (UTC) right before the corruption occurred (e.g., `2026-08-17T11:45:00Z`).

2. **Create a Recovered Branch**
   Run the following Neon CLI command (or perform via the Neon Console UI):
   ```bash
   neon branches create \
     --name recovered-opd-db \
     --parent main \
     --as-of "2026-08-17T11:45:00Z"
   ```

3. **Obtain Connection String for the Recovered Branch**
   ```bash
   neon connection-string recovered-opd-db
   ```

4. **Swap Connection String in Backend Deployment**
   Update the `DATABASE_URL` environment variable in the application's configuration:
   ```env
   DATABASE_URL="postgresql://neondb_owner:...@ep-holy-darkness-ayqlwnn2-pooler.us-east-2.neon.tech/neondb?sslmode=require"
   ```

5. **Restart Server**
   Restart the backend API processes to route traffic to the restored branch.

---

## 3. Manual Logical Backups (pg_dump / pg_restore)

As a secondary layer of protection, logical backups should be run daily to an offsite secure storage bucket (e.g., AWS S3).

### Backup script (`npm run db:backup`):
```bash
pg_dump --no-owner --no-privileges --clean --if-exists -d "$DATABASE_URL" -F c -f abay_hms_backup.dump
```

### Restore script (`npm run db:restore`):
```bash
pg_restore --no-owner --no-privileges -d "$DATABASE_URL" -c abay_hms_backup.dump
```

---

## 4. Verification Checklist & Drills

1. **Verify Live Connection:** Run `npm run db:migrate` on the recovered branch to ensure full schema integrity and connection suitability.
2. **Monthly Branching Drill:** Clone the `main` branch into a `staging-branch` to verify backup snapshot usability.
3. **Data Completeness Check:** Query the `audit_logs` table on the recovered branch to confirm the exact final transaction before the restore point.
