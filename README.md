# STF Scholarship Portal Backend

Detailed documentation is available in:
- [API_GUIDE.md](./API_GUIDE.md) - Common workflows and examples
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design

## Overview
Backend API for the Soipan Tuya Foundation Scholarship Management System. Built with Node.js, Express, TypeScript, and Prisma.

## Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (if running locally without Docker)

### Quick Start (Docker)

1. **Clone and Setup Environment**
   ```bash
   cp .env.example .env
   # Update .env if necessary
   ```

2. **Start Services**
   ```bash
   docker-compose up --build
   ```
   This will:
   - Start PostgreSQL container
   - Run Prisma Migrations
   - Seed the database (Default Admin: `admin@stf.org` / `Admin@2025`)
   - Start API Server on port 3000

3. **Access API**
   - API: `http://localhost:3000/api`
   - Documentation: `http://localhost:3000/api-docs`

## Development

### Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   Ensure PostgreSQL is running, then applied schema:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

3. **Start Dev Server**
   ```bash
   npm run dev
   ```

## Key Features

- **Authentication**: JWT-based auth with Access/Refresh tokens.
- **Role-Based Access**: Role guards (Student, Admin, Board).
- **Application Lifecycle**: Draft → Pending → Under Review → Approved/Rejected.
- **Document Management**: Two-tier system (Profile vs Application docs) with secure streaming.
- **Analytics**: Admin dashboard with disbursement tracking.

## Testing

Run tests (if available):
```bash
npm test
```

## License
Private
