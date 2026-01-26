# STF Scholarship Portal API Guide

This guide provides common workflows and usage examples for the Scholarship Management System API.

**Base URL**: `http://localhost:3000/api`

---

## 1. Authentication Workflow

### Step 1: Register Account
**POST** `/auth/register`

Accepts email, phone, password, and consent version.
```json
{
  "email": "student@example.com",
  "phone": "0712345678",
  "password": "Password123!",
  "consentVersion": "1.0"
}
```

### Step 2: Login
**POST** `/auth/login`

Returns access and refresh tokens.
```json
{
  "email": "student@example.com",
  "password": "Password123!"
}
```

### Step 3: Use Token
Add header to all subsequent requests:
`Authorization: Bearer <access_token>`

---

## 2. Student Application Workflow

### Step 1: Complete Profile
**POST** `/student/profile`

Profile creation is required before applying.
```json
{
  "fullName": "Jane Doe",
  "dateOfBirth": "2003-05-15",
  "gender": "FEMALE",
  "nationalIdNumber": "12345678",
  "countyId": "uuid-from-db",
  "subCountyId": "uuid-from-db",
  "wardId": "uuid-from-db",
  "institutionName": "University of Nairobi",
  "institutionType": "UNIVERSITY",
  "programmeOrCourse": "Computer Science",
  "admissionYear": 2023
}
```

### Step 2: Check Eligibility
**GET** `/student/applications/eligibility`

Returns `canApply: true/false` and reasons.

### Step 3: Create Draft
**POST** `/student/applications/draft`

Starts a new application.
```json
{
  "outstandingFeesBalance": 50000,
  "hardshipNarrative": "I come from a single parent home...",
  "currentYearOfStudy": "2",
  "modeOfSponsorship": ["SELF", "PARENT"]
}
```

### Step 4: Upload Required Documents
**POST** `/student/applications/{id}/documents`
- `documentType`: `FEE_STRUCTURE`
- `file`: (Multipart file)

### Step 5: Submit Application
**POST** `/student/applications/{id}/submit`

Transitions status from `DRAFT` to `PENDING`. Creates data snapshot.

---

## 3. Admin Workflow

### Step 1: List Pending Applications
**GET** `/admin/applications?status=PENDING&page=1&limit=20`

### Step 2: Review Application
**GET** `/admin/applications/{id}`

Includes profile, documents, and history.

### Step 3: Update Status
**PUT** `/admin/applications/{id}/status`

```json
{
  "status": "APPROVED",
  "notes": "Meets all criteria"
}
```

### Step 4: Bulk Update (Board Meeting)
**POST** `/admin/applications/bulk-update`

```json
{
  "applicationIds": ["uuid-1", "uuid-2"],
  "newStatus": "APPROVED",
  "note": "Approved during Feb 2026 board meeting"
}
```

### Step 5: Analytics
**GET** `/admin/analytics/summary`
**GET** `/admin/analytics/by-county` 

---

## 4. File Management

### Profile Documents
Reusable documents (ID, Passport).
- Upload: `POST /student/profile/documents`
- List: `GET /student/profile/documents`

### Application Documents
Application-specific evidence (Fee Structure, Balance Statement).
- Upload: `POST /student/applications/{id}/documents`
- List: `GET /student/applications/{id}/documents`

---

## 5. Error Handling

Standard error format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid Kenyan National ID format"
  },
  "timestamp": "2026-01-26T10:00:00.000Z"
}
```
