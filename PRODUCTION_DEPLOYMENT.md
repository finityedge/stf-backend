# STF Portal — Production Deployment Guide

> **Date**: 19 February 2026  
> **Stack**: Node.js 20 + PostgreSQL 16 + Caddy 2 (Auto-HTTPS)  
> **Container Runtime**: Docker + Docker Compose

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [First-Time Deployment](#3-first-time-deployment)
4. [Deploying Updates (Code Changes)](#4-deploying-updates-code-changes)
5. [Database Operations](#5-database-operations)
6. [Monitoring & Logs](#6-monitoring--logs)
7. [Common Operations](#7-common-operations)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

Before deploying, ensure your server (e.g. Azure VM, DigitalOcean Droplet, etc.) has:

- **Docker** ≥ 24.x — `docker --version`
- **Docker Compose** ≥ 2.x — `docker compose version`
- **Git** — `git --version`
- **A domain name** pointing to your server's public IP (for automatic HTTPS via Caddy)
- **Ports 80 and 443** open in your firewall/security group

---

## 2. Environment Variables

Create a `.env` file in the project root on the server. **Never commit this file to Git.**

```bash
# ==================== DATABASE ====================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_db_password_here
POSTGRES_DB=stf_portal

# ==================== JWT ====================
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ==================== ENCRYPTION ====================
ENCRYPTION_KEY=your_32_char_encryption_key_here

# ==================== DOMAIN & CORS ====================
DOMAIN_NAME=api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# ==================== APP ====================
NODE_ENV=production
PORT=3000
```

### Generating Secrets

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate JWT_REFRESH_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY (32 chars)
openssl rand -hex 16
```

---

## 3. First-Time Deployment

Run these commands on your **production server**:

### Step 1 — Clone the repo

```bash
git clone https://github.com/your-org/STF-Portal-Backend.git
cd STF-Portal-Backend
```

### Step 2 — Create the .env file

```bash
nano .env
# Paste the environment variables from Section 2, then save (Ctrl+X, Y, Enter)
```

### Step 3 — Build and start all services

```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

This will:
- Pull `postgres:16-alpine` and `caddy:2-alpine` images
- Build the Node.js app from `Dockerfile.prod` (multi-stage build)
- Start all 3 services: **postgres → app → caddy**
- The app container auto-runs `npx prisma migrate deploy` before starting

### Step 4 — Verify everything is running

```bash
# Check all containers are healthy
docker compose -f docker-compose.prod.yml ps

# Check app logs
docker compose -f docker-compose.prod.yml logs app

# Test the health endpoint
curl https://your-domain.com/health
```

Expected output:
```json
{ "status": "ok" }
```

### Step 5 — Seed initial data (first time only)

```bash
docker compose -f docker-compose.prod.yml exec app npx ts-node prisma/seed.ts
```

This seeds:
- Default admin user
- Kenyan counties, sub-counties, and wards
- Initial institutions reference data

### Step 6 — Verify Swagger docs

Open in your browser:
```
https://your-domain.com/api-docs
```

---

## 4. Deploying Updates (Code Changes)

When you push new code (e.g. after Phase 3 changes, schema updates, etc.):

### Quick Deploy (recommended)

```bash
# Pull latest code
cd STF-Portal-Backend
git pull origin main

# Rebuild ONLY the app container (DB and Caddy stay running)
docker compose -f docker-compose.prod.yml build --no-cache app

# Restart the app container (zero-downtime for DB)
docker compose -f docker-compose.prod.yml up -d app
```

### Full Rebuild (if dependencies or Dockerfile changed)

```bash
# Pull latest code
git pull origin main

# Stop everything
docker compose -f docker-compose.prod.yml down

# Rebuild all services
docker compose -f docker-compose.prod.yml build --no-cache

# Start everything
docker compose -f docker-compose.prod.yml up -d
```

> ⚠️ **Warning**: `docker compose down` stops the database too, but data is preserved in the `postgres_prod_data` Docker volume. However, if you run `docker compose down -v`, the **volumes are deleted** and you will **lose all data**.

### Verify the deployment

```bash
# Watch the app logs during startup
docker compose -f docker-compose.prod.yml logs -f app

# You should see:
# ✔ Prisma Migrate deploy completed
# 🚀 Server running on port 3000
```

---

## 5. Database Operations

### Apply migrations (automatic on startup)

Migrations run automatically when the app container starts (see `command` in `docker-compose.prod.yml`). If you need to run them manually:

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Push schema changes (no migration file, useful for prototyping)

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma db push
```

> ⚠️ Not recommended for production — use `migrate deploy` instead.

### Run the seed script

```bash
docker compose -f docker-compose.prod.yml exec app npx ts-node prisma/seed.ts
```

### Open Prisma Studio (database explorer) — for debugging only

```bash
# Forward port 5555 from the container to your server
docker compose -f docker-compose.prod.yml exec -p 5555:5555 app npx prisma studio
```

Then access via `http://your-server-ip:5555` (make sure port 5555 is open temporarily).

### Direct database access via psql

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d stf_portal
```

Common queries:
```sql
-- Check total applications
SELECT status, COUNT(*) FROM applications GROUP BY status;

-- Check active application period
SELECT * FROM application_periods WHERE is_active = true;

-- Check recent users
SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;
```

### Database backup

```bash
# Create a backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres stf_portal > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat backup_20260219_120000.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres stf_portal
```

---

## 6. Monitoring & Logs

### View logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# App only (most useful)
docker compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 app

# Database logs
docker compose -f docker-compose.prod.yml logs -f postgres

# Caddy (web server / HTTPS) logs
docker compose -f docker-compose.prod.yml logs -f caddy
```

### Check container health

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                    STATUS              PORTS
stf-portal-app-prod     Up (healthy)        3000/tcp
stf-portal-db-prod      Up (healthy)        5432/tcp
stf-portal-web-prod     Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Check disk usage

```bash
# Docker disk usage
docker system df

# Volume sizes
docker volume ls
```

---

## 7. Common Operations

### Restart a specific service

```bash
docker compose -f docker-compose.prod.yml restart app
docker compose -f docker-compose.prod.yml restart caddy
docker compose -f docker-compose.prod.yml restart postgres
```

### Stop all services (preserves data)

```bash
docker compose -f docker-compose.prod.yml down
```

### Start all services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Enter a container shell (for debugging)

```bash
# App container
docker compose -f docker-compose.prod.yml exec app sh

# Database container
docker compose -f docker-compose.prod.yml exec postgres sh
```

### Clean up unused Docker resources

```bash
# Remove unused images and build cache
docker system prune -f

# Remove unused images only
docker image prune -f
```

### Update Caddy configuration

If you modify the `Caddyfile`:

```bash
docker compose -f docker-compose.prod.yml restart caddy
```

### Check HTTPS certificate

Caddy handles HTTPS automatically. To verify:

```bash
curl -vI https://your-domain.com 2>&1 | grep -i "SSL certificate\|subject\|expire"
```

---

## 8. Troubleshooting

### App won't start

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs app

# Common issues:
# 1. Missing .env variables → check .env file exists
# 2. Database not ready → postgres health check failing
# 3. Migration error → check prisma/migrations folder
```

### Database connection refused

```bash
# Check if postgres is running
docker compose -f docker-compose.prod.yml ps postgres

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres

# Test connection from app container
docker compose -f docker-compose.prod.yml exec app sh -c 'nc -z postgres 5432 && echo "OK" || echo "FAIL"'
```

### HTTPS not working

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Common issues:
# 1. Domain not pointing to server → check DNS with: dig your-domain.com
# 2. Ports 80/443 blocked → check firewall rules
# 3. Caddy rate limited → wait and retry (Let's Encrypt has rate limits)
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -af
docker volume prune -f  # ⚠️ BE CAREFUL: this removes unused volumes!
```

### Reset everything (nuclear option — DESTROYS ALL DATA)

```bash
# ⚠️ THIS DELETES ALL DATA INCLUDING THE DATABASE
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Re-seed after reset
docker compose -f docker-compose.prod.yml exec app npx ts-node prisma/seed.ts
```

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| **Deploy updates** | `git pull && docker compose -f docker-compose.prod.yml build --no-cache app && docker compose -f docker-compose.prod.yml up -d app` |
| **View app logs** | `docker compose -f docker-compose.prod.yml logs -f app` |
| **Run migrations** | `docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy` |
| **Seed database** | `docker compose -f docker-compose.prod.yml exec app npx ts-node prisma/seed.ts` |
| **DB shell** | `docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d stf_portal` |
| **Backup DB** | `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres stf_portal > backup.sql` |
| **Restart app** | `docker compose -f docker-compose.prod.yml restart app` |
| **Check status** | `docker compose -f docker-compose.prod.yml ps` |
| **Stop all** | `docker compose -f docker-compose.prod.yml down` |
| **Start all** | `docker compose -f docker-compose.prod.yml up -d` |
