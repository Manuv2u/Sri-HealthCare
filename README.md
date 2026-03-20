## Hi there 👋

<!--
**Sri-HealthCare/Sri-HealthCare** is a ✨ _special_ ✨ repository because its `README.md` (this file) appears on your GitHub profile.

Here are some ideas to get you started:

- 🔭 I’m currently working on ...
- 🌱 I’m currently learning ...
- 👯 I’m looking to collaborate on ...
- 🤔 I’m looking for help with ...
- 💬 Ask me about ...
- 📫 How to reach me: ...
- 😄 Pronouns: ...
- ⚡ Fun fact: ...
-->

## Database Recovery

This section describes how to restore the SRI Diagnostic Laboratory database from a backup file. The expected **Recovery Time Objective (RTO) is 4 hours**.

### Backup Location

Daily backups are stored as gzip-compressed SQL dumps:

- **Local storage:** `<FILE_STORAGE_PATH>/backups/backup_YYYYMMDD_HHMMSS.sql.gz`
- **S3 storage:** `s3://<AWS_S3_BUCKET>/backups/backup_YYYYMMDD_HHMMSS.sql.gz`

### Step-by-Step Restore Instructions

**1. Identify the backup file to restore**

```bash
# List available backups (most recent first)
ls -lt /app/file_storage/backups/backup_*.sql.gz | head -10

# Or from S3
aws s3 ls s3://<bucket>/backups/ --recursive | sort -r | head -10
```

**2. Download the backup (S3 only)**

```bash
aws s3 cp s3://<bucket>/backups/backup_YYYYMMDD_HHMMSS.sql.gz /tmp/restore.sql.gz
```

**3. Decompress the backup**

```bash
gunzip -c /app/file_storage/backups/backup_YYYYMMDD_HHMMSS.sql.gz > /tmp/restore.sql
# Or from the downloaded S3 file:
gunzip -c /tmp/restore.sql.gz > /tmp/restore.sql
```

**4. Create a fresh target database (if restoring to a new instance)**

```bash
psql postgresql://sri:sri_secret@localhost:5432/postgres \
  -c "CREATE DATABASE sri_lab;"
```

**5. Restore the dump**

```bash
psql postgresql://sri:sri_secret@localhost:5432/sri_lab \
  -f /tmp/restore.sql
```

**6. Run Alembic migrations to apply any schema changes newer than the backup**

```bash
cd backend
alembic upgrade head
```

**7. Restart the application**

```bash
# local
ENV_FILE=.env.local docker compose up --build

# staging
ENV_FILE=.env.staging docker compose up --build

# production
ENV_FILE=.env.production docker compose up -d --build
```

### Verifying the Restore

After restoring, confirm the database is healthy:

```bash
# Check key tables exist and have data
psql postgresql://sri:sri_secret@localhost:5432/sri_lab -c "
SELECT
  (SELECT COUNT(*) FROM users)    AS users,
  (SELECT COUNT(*) FROM bookings) AS bookings,
  (SELECT COUNT(*) FROM payments) AS payments,
  (SELECT COUNT(*) FROM tests)    AS tests,
  (SELECT COUNT(*) FROM packages) AS packages;
"

# Hit the health endpoint
curl http://localhost:8000/api/v1/health
```

A successful restore will show non-zero row counts for the key tables and a `200 OK` response from the health endpoint.

### Automated Monthly Restore Validation

The system runs an automated restore validation job on the 1st of every month at 03:00 UTC. It:

1. Restores the most recent backup to a temporary database (`sri_restore_validation_<timestamp>`)
2. Verifies all key tables (`users`, `bookings`, `payments`, `tests`, `packages`) exist
3. Compares row counts between production and the restored database
4. Logs the result (`pass`/`fail`), row counts, and duration
5. Notifies the admin by email on failure
6. Drops the temporary database

Check the application logs for entries prefixed with `restore_validation_result:` to review past validation outcomes.



git remote set-url origin git@github.com:Sri-HealthCare/Sri-HealthCare.git


git push origin main



docker exec sri-healthcare-backend-1 python -m app.scripts.seed_tests --reset