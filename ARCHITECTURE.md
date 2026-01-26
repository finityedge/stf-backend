# System Architecture

## Overview
The STF Scholarship Management System uses a layered architecture pattern implemented with Node.js, Express, TypeScript, and Prisma ORM.

## Logical Layers

### 1. Presentation Layer (Routes/Controllers)
- **Routes**: Define API endpoints and apply middleware (Authentication, RBAC, Validation).
- **Controllers**: Handle HTTP requests/responses, validate inputs, and orchestrate service calls.

### 2. Service Layer (Business Logic)
- **StudentService**: Manages student profiles, draft applications, and submission logic.
- **AdminService**: Handles application review, bulk operations, and analytics.
- **AuthService**: Manages registration, login, token generation, and password resets.
- **FileService**: Handles secure file storage, retrieval, and access control.

### 3. Data Access Layer (Prisma ORM)
- Type-safe database queries against PostgreSQL.
- Database migrations management.
- Seeding utilities.

## Data Model

### Three-Tier Document Model
1. **ProfileDocument**: Reusable documents linked to a user account (e.g., National ID, KCSE Cert).
2. **ApplicationDocument**: Documents specific to one application instance (e.g., this year's Fee Structure).
3. **ApplicationProfileDocumentLink**: Bridge table linking reusable profile documents to specific applications.

### Application Lifecycle State Machine
`DRAFT` → `PENDING` → `UNDER_REVIEW` → `APPROVED` → `DISBURSED`
         ↓                ↓
         `REJECTED` ←-----'

- **DRAFT**: Editable by student.
- **PENDING**: Submitted, awaiting admin review. Snapshot created.
- **UNDER_REVIEW**: Admin is actively processing.
- **APPROVED**: Board has approved.
- **DISBURSED**: Funds released.
- **REJECTED**: Application declined.

## Security Architecture

### Authentication
- **JWT Access Token**: Short-lived (1h) for API access.
- **JWT Refresh Token**: Long-lived (7d) for obtaining new access tokens.
- **Password**: Bcrypt hashed (12 rounds).

### Authorization (RBAC)
- **Student**: Access own profile and applications.
- **Admin**: Full access to all data.
- **Board**: Read-only access to ready applications (via specific endpoints).

### File Security
- Files stored outside web root.
- Served via streaming API endpoints.
- Access control checks owner (Student) or Role (Admin/Board) before streaming.

## Infrastructure

- **Docker**: Containerized application and database.
- **PostgreSQL**: Relational database storage.
- **Volumes**: Persistent storage for DB data and File uploads.
