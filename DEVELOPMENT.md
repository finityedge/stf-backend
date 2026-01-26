# Development Environment Setup

This guide explains how to run the application in development mode using Docker.

## Quick Start (Development)

The development setup uses `npm install` instead of `npm ci`, so you don't need to generate `package-lock.json` first.

### 1. Start Development Environment

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Or use the npm script:

```bash
npm run docker:dev:up
```

### 2. Access the Application

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

### 3. View Logs

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

Or:

```bash
npm run docker:dev:logs
```

### 4. Stop Development Environment

```bash
docker-compose -f docker-compose.dev.yml down
```

Or:

```bash
npm run docker:dev:down
```

## Development Features

### Hot Reload

The development setup includes:
- **Source code mounting**: Changes to `src/` files automatically reload the server
- **Nodemon**: Watches for file changes and restarts the server
- **Prisma schema mounting**: Changes to Prisma schema are reflected immediately

### Database Access

The PostgreSQL database is exposed on port `5432`. You can connect using:

```
Host: localhost
Port: 5432
Database: stf_portal
Username: postgres
Password: postgres
```

### Prisma Studio

To access Prisma Studio for database management:

```bash
docker-compose -f docker-compose.dev.yml exec app npx prisma studio
```

Then visit: http://localhost:5555

## Test Credentials

After the database is seeded, you can use:

- **Admin**: `admin@stf-portal.org` / `Admin@123`
- **Student**: `john.doe@example.com` / `Student@123`

## Differences from Production

| Feature | Development | Production |
|---------|-------------|------------|
| Dockerfile | `Dockerfile.dev` | `Dockerfile` |
| npm command | `npm install` | `npm ci` |
| Source mounting | Yes (hot reload) | No |
| Build | No TypeScript compilation | Multi-stage build |
| Log level | `debug` | `info` |
| Node modules | Mounted as volume | Copied into image |

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is already in use:

```bash
# Stop all containers
docker-compose -f docker-compose.dev.yml down

# Or change ports in docker-compose.dev.yml
```

### Database Connection Issues

If the app can't connect to the database:

```bash
# Check if PostgreSQL is healthy
docker-compose -f docker-compose.dev.yml ps

# Restart the database
docker-compose -f docker-compose.dev.yml restart postgres
```

### Clear Everything and Start Fresh

```bash
# Stop and remove containers, networks, and volumes
docker-compose -f docker-compose.dev.yml down -v

# Rebuild and start
docker-compose -f docker-compose.dev.yml up --build
```

## Production Build

When you're ready for production, use the production Dockerfile:

```bash
# First, generate package-lock.json locally
npm install

# Then build production image
docker-compose up --build
```
