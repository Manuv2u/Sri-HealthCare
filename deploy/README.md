# Sri Diagnostics — Deployment Guide

Production deployment on **Oracle Cloud Always Free Ubuntu VM** using Docker + PostgreSQL-on-host.

---

## Architecture

```
OCI VM (Ubuntu 22.04)
├── PostgreSQL 15         ← runs directly on VM (no Docker)
├── Docker
│   ├── backend           ← FastAPI  — port 8080
│   └── frontend          ← Angular/nginx — port 80
└── Cron jobs             ← backup, archive, cleanup
```

The backend container reaches the VM's PostgreSQL using the `host.docker.internal` hostname (mapped to the Docker bridge gateway via `extra_hosts`).

---

## Prerequisites

### On your local machine

- Docker Desktop (or Docker Engine) — to build images
- `rsync` and `ssh` — standard on macOS/Linux; Windows users need WSL or Git Bash
- Your OCI private key file (e.g. `~/.ssh/oci_key`)

### On OCI Console (one-time)

In **Networking → Virtual Cloud Networks → Your VCN → Security Lists**, add ingress rules:

| Source CIDR | Protocol | Port | Description |
|---|---|---|---|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP (frontend) |
| 0.0.0.0/0 | TCP | 443 | HTTPS (future) |
| 0.0.0.0/0 | TCP | 8080 | Backend API |

---

## First-Time Setup

### Step 1 — Bootstrap the server

```bash
# Upload and run the setup script
scp -i ~/.ssh/oci_key deploy/setup-server.sh ubuntu@<YOUR_VM_IP>:~/
ssh -i ~/.ssh/oci_key ubuntu@<YOUR_VM_IP> 'bash ~/setup-server.sh'
```

This installs Docker, PostgreSQL 15, creates the database and user, sets up directories, configures the firewall, and installs cron jobs. **Takes ~5 minutes on first run.**

At the end, the script prints the generated DB password. The full `.env` is also saved to `/opt/sri-diagnostics/.env`.

### Step 2 — Copy the generated `.env` back locally

```bash
scp -i ~/.ssh/oci_key ubuntu@<YOUR_VM_IP>:/opt/sri-diagnostics/.env deploy/.env.production
```

Review it and fill in any remaining placeholders (SMTP, SMS, payment keys).

### Step 3 — Create your local deploy config

```bash
cp deploy/.deploy.conf.example deploy/.deploy.conf
# Edit it with your VM's IP and SSH key path
```

`deploy/.deploy.conf`:
```bash
VM_HOST=<YOUR_VM_IP>
VM_USER=ubuntu
VM_KEY=~/.ssh/oci_key
DEPLOY_DIR=/opt/sri-diagnostics
```

### Step 4 — First deploy

```bash
./deploy.sh
```

That's it. The script builds images, uploads them, deploys, and shows the URLs.

---

## Ongoing Deployment

After any code change, from your local machine:

```bash
./deploy.sh
```

### Flags

| Flag | Effect |
|---|---|
| `./deploy.sh` | Full build + deploy |
| `./deploy.sh --skip-build` | Upload and deploy existing local images (no rebuild) |
| `./deploy.sh --no-rollback` | Don't auto-rollback if health check fails |

---

## Directory Layout (on VM)

```
/opt/sri-diagnostics/
├── docker-compose.yml      ← uploaded by deploy.sh
├── .env                    ← production secrets
├── file_storage/           ← uploaded reports (persists across deploys)
├── backups/                ← daily DB backups  sri_diagnostics_YYYY-MM-DD.sql.gz
├── logs/                   ← container logs
│   ├── backend.log
│   ├── frontend.log
│   └── archive/            ← zipped log archives  logs_YYYY-MM-DD.zip
├── releases/               ← image tarballs (last 3 kept)
│   └── 20260120_143022/
│       ├── sri-backend.tar.gz
│       └── sri-frontend.tar.gz
└── scripts/
    ├── backup-db.sh
    ├── archive-logs.sh
    ├── cleanup.sh
    ├── health-check.sh
    └── rollback.sh
```

---

## Manual Operations

### SSH into the server

```bash
ssh -i ~/.ssh/oci_key ubuntu@<VM_IP>
```

### View live container logs

```bash
docker logs -f sri-healthcare-backend-1
docker logs -f sri-healthcare-frontend-1
```

### Run health check

```bash
/opt/sri-diagnostics/scripts/health-check.sh
```

### Manual rollback

If a deployment is broken, revert to the previous images:

```bash
/opt/sri-diagnostics/scripts/rollback.sh
```

Or remotely, without SSH-ing in:

```bash
ssh -i ~/.ssh/oci_key ubuntu@<VM_IP> '/opt/sri-diagnostics/scripts/rollback.sh'
```

### Manual DB backup

```bash
/opt/sri-diagnostics/scripts/backup-db.sh
```

### Restore a backup

```bash
# List available backups
ls -lh /opt/sri-diagnostics/backups/

# Restore (replaces existing data)
source /opt/sri-diagnostics/.env
PGPASSWORD="$DB_PASSWORD" gunzip -c /opt/sri-diagnostics/backups/sri_diagnostics_2026-01-20.sql.gz \
  | psql -h localhost -U "$DB_USER" "$DB_NAME"
```

---

## Scheduled Jobs (Cron)

| Time | Script | Purpose |
|---|---|---|
| 02:00 daily | `backup-db.sh` | PostgreSQL dump → gzipped SQL, 7-day retention |
| 03:00 daily | `archive-logs.sh` | Zip container logs, 7-day retention |
| 04:00 daily | `cleanup.sh` | Prune Docker images, old releases, temp files |

Cron output is logged to:
- `/opt/sri-diagnostics/logs/backup.log`
- `/opt/sri-diagnostics/logs/archive.log`
- `/opt/sri-diagnostics/logs/cleanup.log`

---

## Application URLs

| Service | URL |
|---|---|
| Frontend | `http://<VM_IP>` |
| Backend API | `http://<VM_IP>:8080` |
| API Docs (Swagger) | `http://<VM_IP>:8080/docs` |
| API Docs (ReDoc) | `http://<VM_IP>:8080/redoc` |

---

## Adding a Domain & HTTPS (Future)

When you're ready to add a domain:

1. Point your DNS A records: `app.yourdomain.com` and `api.yourdomain.com` → `<VM_IP>`

2. On the VM, install nginx and certbot:
   ```bash
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   ```

3. Copy and configure the nginx template:
   ```bash
   sudo cp /opt/sri-diagnostics/scripts/../nginx/nginx.prod.conf \
           /etc/nginx/sites-available/sri-diagnostics
   sudo sed -i 's/DOMAIN.com/yourdomain.com/g' /etc/nginx/sites-available/sri-diagnostics
   sudo ln -sf /etc/nginx/sites-available/sri-diagnostics \
               /etc/nginx/sites-enabled/sri-diagnostics
   ```

4. Get SSL certificates:
   ```bash
   sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
   ```

5. Update `docker-compose.prod.yml` ports to bind on loopback only:
   ```yaml
   frontend: ports: ["127.0.0.1:4200:4200"]
   backend:  ports: ["127.0.0.1:8080:8000"]
   ```

6. Certbot auto-renewal is set up automatically. Verify with:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## Troubleshooting

### Backend won't start

```bash
docker logs sri-healthcare-backend-1 --tail 50
```

Most common causes:
- **Database connection refused** — check PostgreSQL is running: `systemctl status postgresql`
- **Alembic migration failed** — check migration logs, possibly run `alembic upgrade head` manually
- **Missing env var** — verify `/opt/sri-diagnostics/.env` has all required keys

### Frontend shows blank page

```bash
curl -v http://localhost:80
docker logs sri-healthcare-frontend-1
```

### PostgreSQL connection from backend

Test the connection the backend would use:

```bash
source /opt/sri-diagnostics/.env
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" "$DB_NAME" -c "SELECT version();"
```

### Out of disk space

```bash
df -h
docker system df
/opt/sri-diagnostics/scripts/cleanup.sh
```

### Port not accessible from outside

Verify both the OCI security list (console) AND UFW allow the port:

```bash
sudo ufw status
```

---

## Security Notes

- `deploy/.deploy.conf` and `deploy/.env.production` are gitignored — never commit them
- PostgreSQL listens only on localhost — no external access
- fail2ban blocks brute-force SSH attempts after 5 failures
- UFW blocks all ports except 22, 80, 443, 8080
- OCI security lists add a second layer of network filtering
- Rotate `JWT_SECRET` by updating `.env` and redeploying; existing sessions will be invalidated
