# STF Portal — Frontend Integration Guide

> **Date**: 19 February 2026  
> **Scope**: Phase 1 + Phase 2 + Phase 3 API Changes  
> **Backend version**: Post Phase 3 — Notifications, Application Periods, Scoring & Analytics

This document summarises all backend API changes from Phase 1, Phase 2, and Phase 3. Use it to update frontend forms, types, and API calls accordingly.

---

## Table of Contents

1. [Phase 1 — New Endpoint: Portal Configuration](#1-phase-1--new-endpoint-portal-configuration)
2. [Phase 2 — New Enums](#2-phase-2--new-enums)
3. [Phase 2 — Enhanced Profile Fields (16 new fields)](#3-phase-2--enhanced-profile-fields-16-new-fields)
4. [Phase 2 — Enhanced Application Fields (9 new fields)](#4-phase-2--enhanced-application-fields-9-new-fields)
5. [Phase 2 — Institution Reference Endpoint](#5-phase-2--institution-reference-endpoint)
6. [Phase 2 — Profile Completeness Changes](#6-phase-2--profile-completeness-changes)
7. [Updated Education Levels](#7-updated-education-levels)
8. [Full API Payload Reference](#8-full-api-payload-reference)
9. [Migration Notes for Frontend](#9-migration-notes-for-frontend)
10. [Phase 3 — Application Periods](#10-phase-3--application-periods)
11. [Phase 3 — Application-Period Linkage (How Applications Are Created)](#11-phase-3--application-period-linkage)
12. [Phase 3 — In-App Notifications](#12-phase-3--in-app-notifications)
13. [Phase 3 — Application Scoring (Admin)](#13-phase-3--application-scoring-admin)
14. [Phase 3 — Enhanced Analytics (Admin)](#14-phase-3--enhanced-analytics-admin)
15. [Phase 3 — Structured Admin Notes](#15-phase-3--structured-admin-notes)

---

## 1. Phase 1 — New Endpoint: Portal Configuration

### `GET /api/config/current`

**Auth**: None (public endpoint)

Returns dynamic portal settings. **This is now powered by the active Application Period** in the database, with environment variables as fallback.
Use this instead of hardcoding academic year, deadlines, etc.

**Response:**
```json
{
  "success": true,
  "data": {
    "academicYear": "2025/26",
    "applicationDeadline": "2025-09-30T23:59:59.000Z",
    "applicationWindowOpen": true,
    "foundationName": "Soipan Tuya Foundation",
    "contactEmail": "info@soipantuyafoundation.org",
    "contactPhone": "+254 700 000 000",
    "maxFileSize": 5242880,
    "allowedFileTypes": ["application/pdf", "image/jpeg", "image/png"]
  }
}
```

**Frontend action items:**
- Replace any hardcoded `academicYear` with this endpoint's response
- Use `applicationWindowOpen` to show/hide the "Apply Now" button
- Use `maxFileSize` and `allowedFileTypes` for client-side upload validation
- Display `applicationDeadline` as a countdown or formatted date

---

## 2. Phase 2 — New Enums

The following enums have been added. Use these exact values in dropdowns/select inputs.

### `WhoLivesWith`
```
BOTH_PARENTS
SINGLE_MOTHER
SINGLE_FATHER
GUARDIAN
GRANDPARENT
ORPHANAGE
SELF
OTHER
```
> When `OTHER` is selected, show a text input for `whoLivesWithOther`.

### `HouseholdIncomeRange`
```
BELOW_5K
FROM_5K_TO_15K
FROM_15K_TO_30K
ABOVE_30K
```

Suggested display labels:

| Value | Display Label |
|-------|--------------|
| `BELOW_5K` | Below KES 5,000 |
| `FROM_5K_TO_15K` | KES 5,000 – 15,000 |
| `FROM_15K_TO_30K` | KES 15,000 – 30,000 |
| `ABOVE_30K` | Above KES 30,000 |

### `OrphanStatus`
```
BOTH_PARENTS_ALIVE
SINGLE_ORPHAN
DOUBLE_ORPHAN
```

### `EducationLevel` (updated)
```
HIGH_SCHOOL
UNIVERSITY
COLLEGE       ← NEW
TVET          ← NEW
```

---

## 3. Phase 2 — Enhanced Profile Fields (16 new fields)

These fields are sent with `POST /api/student/profile` (create) and `PUT /api/student/profile` (update).

All new fields are **optional** at create time, but **4 are now required for profile completeness** (see [Section 6](#6-phase-2--profile-completeness-changes)).

### Contact Information

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `phoneNumber` | `string` | max 20 chars | Student's own phone |
| `emergencyContactName` | `string` | max 100 chars | |
| `emergencyContactPhone` | `string` | max 20 chars | |

### Family & Guardian

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `whoLivesWith` | `WhoLivesWith` enum | See enum values above | **Changed from free-text to enum** |
| `whoLivesWithOther` | `string` | max 200 chars | Only relevant when `whoLivesWith` = `OTHER` |
| `guardianName` | `string` | max 100 chars | |
| `guardianPhone` | `string` | max 20 chars | |
| `guardianOccupation` | `string` | max 200 chars | |
| `householdIncomeRange` | `HouseholdIncomeRange` enum | See enum values | |
| `numberOfDependents` | `integer` | 0–50 | People dependent on household |
| `numberOfSiblings` | `integer` | 0–30 | |
| `siblingsInSchool` | `integer` | 0–30 | |

### Vulnerability & Background

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `orphanStatus` | `OrphanStatus` enum | See enum values | |
| `disabilityStatus` | `boolean` | default `false` | If `true`, show `disabilityType` input |
| `disabilityType` | `string` | max 200 chars | Only relevant when `disabilityStatus` = `true` |
| `kcseGrade` | `string` | max 10 chars | e.g. "A", "B+", "C" |
| `previousScholarship` | `boolean` | default `false` | If `true`, show `previousScholarshipDetails` |
| `previousScholarshipDetails` | `string` | max 500 chars | |

### Institution Reference (autocomplete)

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `institutionId` | `string (UUID)` | Optional UUID | Link to a verified institution from the reference table |

---

## 4. Phase 2 — Enhanced Application Fields (9 new fields)

These fields are sent with `POST /api/student/applications` (create draft) and `PUT /api/student/applications/:id` (update draft).

All new fields are **optional**.

### Academic Performance

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `gpa` | `string` | max 10 chars | e.g. "3.5", "B+" |
| `expectedGraduationDate` | `string` (ISO date) | Valid date format | e.g. "2026-12-15" |

### Financial Details

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `totalAnnualFeeAmount` | `number` | Positive decimal | Total annual fees in KES |
| `remainingSemesters` | `integer` | 1–20 | |

### Other Scholarships

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `appliedToOtherScholarships` | `boolean` | default `false` | If `true`, show `otherScholarshipsDetails` |
| `otherScholarshipsDetails` | `string` | max 500 chars | |

### Personal Development (long-form text)

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `communityInvolvement` | `string` | max 2000 chars | Describe community service/involvement |
| `careerAspirations` | `string` | max 2000 chars | Future career goals |
| `givingBackPlan` | `string` | max 2000 chars | How they plan to give back to community |

---

## 5. Phase 2 — Institution Reference Endpoint

### `GET /api/reference/institutions`

**Auth**: None (public)

Search for institutions by name and type. Useful for an autocomplete/type-ahead input when the student enters their institution.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | `string` | No | Search query (case-insensitive, partial match) |
| `type` | `string` | No | Filter by education level: `UNIVERSITY`, `HIGH_SCHOOL`, `COLLEGE`, `TVET` |

**Example request:**
```
GET /api/reference/institutions?q=nairobi&type=UNIVERSITY
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "name": "University of Nairobi",
      "type": "UNIVERSITY",
      "county": "Nairobi",
      "isVerified": true
    }
  ]
}
```

**Frontend action items:**
- Add an autocomplete/search input for institution selection
- When user selects an institution, set both `institutionName` (text) and `institutionId` (UUID) in the profile form
- Filter by the selected `institutionType` (education level) for better results
- Allow users to type a custom institution name if theirs isn't in the list (leave `institutionId` as `null`)

---

## 6. Phase 2 — Profile Completeness Changes

The profile completeness check now includes **4 additional required fields**. Profiles missing these fields will be marked as `isComplete: false`.

### Required fields for complete profile:

| # | Field | Was Required Before? |
|---|-------|---------------------|
| 1 | `fullName` | ✅ Yes |
| 2 | `dateOfBirth` | ✅ Yes |
| 3 | `gender` | ✅ Yes |
| 4 | `countyId` | ✅ Yes |
| 5 | `subCountyId` | ✅ Yes |
| 6 | `wardId` | ✅ Yes |
| 7 | `institutionName` | ✅ Yes |
| 8 | `institutionType` | ✅ Yes |
| 9 | `programmeOrCourse` | ✅ Yes |
| 10 | `admissionYear` | ✅ Yes |
| 11 | `phoneNumber` | ⭐ **NEW** |
| 12 | `emergencyContactName` | ⭐ **NEW** |
| 13 | `emergencyContactPhone` | ⭐ **NEW** |
| 14 | `whoLivesWith` | ⭐ **NEW** |

> **Impact**: Existing profiles that were previously "complete" may now show as incomplete until the student fills in the 4 new required fields. The frontend should guide users to complete these fields.

**Frontend action items:**
- Add these 4 fields to the profile form (ideally in a "Contact & Family" section)
- Show a prompt/banner for students whose profile became incomplete
- Update the profile completeness progress bar to reflect 14 fields

---

## 7. Updated Education Levels

Two new education levels were added:

```
HIGH_SCHOOL    (existing)
UNIVERSITY     (existing)
COLLEGE        (new)
TVET           (new)
```

Available via `GET /api/reference/education-levels`:
```json
{
  "success": true,
  "data": ["HIGH_SCHOOL", "UNIVERSITY", "COLLEGE", "TVET"]
}
```

**Frontend action items:**
- Update any education level dropdown to include `COLLEGE` and `TVET`
- Use display labels like "College" and "TVET (Technical & Vocational)"

---

## 8. Full API Payload Reference

### Create Profile — `POST /api/student/profile`

```typescript
{
  // Required
  fullName: string,
  dateOfBirth: string,           // ISO format: "2000-01-15"
  gender: "MALE" | "FEMALE" | "OTHER",
  countyId: string,              // UUID
  subCountyId: string,           // UUID
  wardId: string,                // UUID
  institutionName: string,
  institutionType: "HIGH_SCHOOL" | "UNIVERSITY" | "COLLEGE" | "TVET",
  programmeOrCourse: string,
  admissionYear: number,

  // Optional
  nationalIdNumber?: string,
  passportNumber?: string,
  currentResidence?: string,
  institutionId?: string,        // UUID — from institution search

  // NEW — Contact
  phoneNumber?: string,
  emergencyContactName?: string,
  emergencyContactPhone?: string,

  // NEW — Family & Guardian
  whoLivesWith?: "BOTH_PARENTS" | "SINGLE_MOTHER" | "SINGLE_FATHER" | "GUARDIAN" | "GRANDPARENT" | "ORPHANAGE" | "SELF" | "OTHER",
  whoLivesWithOther?: string,
  guardianName?: string,
  guardianPhone?: string,
  guardianOccupation?: string,
  householdIncomeRange?: "BELOW_5K" | "FROM_5K_TO_15K" | "FROM_15K_TO_30K" | "ABOVE_30K",
  numberOfDependents?: number,
  numberOfSiblings?: number,
  siblingsInSchool?: number,

  // NEW — Vulnerability & Background
  orphanStatus?: "BOTH_PARENTS_ALIVE" | "SINGLE_ORPHAN" | "DOUBLE_ORPHAN",
  disabilityStatus?: boolean,
  disabilityType?: string,
  kcseGrade?: string,
  previousScholarship?: boolean,
  previousScholarshipDetails?: string,
}
```

### Create Application Draft — `POST /api/student/applications`

```typescript
{
  // Required (existing)
  outstandingFeesBalance: number,
  hardshipNarrative: string,       // 50–120 words
  currentYearOfStudy: string,
  modeOfSponsorship: string[],

  // Optional (existing)
  howSupportingEducation?: string[],
  currentFeeSituation?: string,
  isFeesAffectingStudies?: boolean,
  hasBeenSentHome?: boolean,
  hasMissedExamsOrClasses?: boolean,
  difficultiesFaced?: string[],
  goalForAcademicYear?: string,
  referralSource?: string,

  // NEW — Phase 2
  gpa?: string,
  expectedGraduationDate?: string, // ISO date
  totalAnnualFeeAmount?: number,
  remainingSemesters?: number,
  appliedToOtherScholarships?: boolean,
  otherScholarshipsDetails?: string,
  communityInvolvement?: string,   // max 2000 chars
  careerAspirations?: string,      // max 2000 chars
  givingBackPlan?: string,         // max 2000 chars
}
```

> **Phase 3 note:** The `applicationPeriodId` is **NOT** part of the request payload. The backend automatically links the draft to the currently active application period. See [Section 11](#11-phase-3--application-period-linkage) for details.

---

## 9. Migration Notes for Frontend

### Breaking Changes

| Change | Impact |
|--------|--------|
| `whoLivesWith` is now an **enum** | Was previously free-text `string`. Must use exact enum values. Old free-text values will not work. |
| Profile completeness requires **4 new fields** | Profiles that were "100% complete" may now be incomplete. |
| `EducationLevel` has 2 new values | Existing dropdowns need `COLLEGE` and `TVET` options. |

### Non-Breaking Changes (additive)

- All 16 new profile fields are optional at API level
- All 9 new application fields are optional
- New `GET /api/config/current` endpoint (no existing behaviour changed)
- New `GET /api/reference/institutions` endpoint (additive)

### Suggested Frontend Form Layout

**Profile form — suggested sections:**

1. **Personal Information** — `fullName`, `dateOfBirth`, `gender`, `nationalIdNumber`, `passportNumber`
2. **Contact** — `phoneNumber`, `emergencyContactName`, `emergencyContactPhone`
3. **Location** — `countyId`, `subCountyId`, `wardId`, `currentResidence`
4. **Institution** — `institutionName` (with autocomplete), `institutionType`, `programmeOrCourse`, `admissionYear`, `kcseGrade`
5. **Family & Guardian** — `whoLivesWith`, `guardianName`, `guardianPhone`, `guardianOccupation`, `numberOfSiblings`, `siblingsInSchool`, `numberOfDependents`
6. **Financial** — `householdIncomeRange`
7. **Vulnerability** — `orphanStatus`, `disabilityStatus`, `disabilityType`, `previousScholarship`, `previousScholarshipDetails`

**Application form — suggested additional section:**

8. **Academic Performance** — `gpa`, `expectedGraduationDate`, `remainingSemesters`
9. **Financial Details** — `totalAnnualFeeAmount`, `appliedToOtherScholarships`, `otherScholarshipsDetails`
10. **Personal Statement** — `communityInvolvement`, `careerAspirations`, `givingBackPlan`

### Conditional Field Display Logic

```
If whoLivesWith === "OTHER"       → show whoLivesWithOther text input
If disabilityStatus === true      → show disabilityType text input
If previousScholarship === true   → show previousScholarshipDetails text input
If appliedToOtherScholarships === true → show otherScholarshipsDetails text input
```

---

## 10. Phase 3 — Application Periods

Application periods define the time windows during which students can submit applications. Only **one period can be active at a time**.

### Admin Endpoints (require `admin` role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/application-periods` | List all periods |
| `POST` | `/api/admin/application-periods` | Create a new period |
| `PUT` | `/api/admin/application-periods/:id` | Update a period |
| `DELETE` | `/api/admin/application-periods/:id` | Delete a period |
| `PUT` | `/api/admin/application-periods/:id/activate` | Activate a period (deactivates all others) |

### Create Period Payload — `POST /api/admin/application-periods`

```json
{
  "title": "2025/26 Bursary Application Window",
  "academicYear": "2025/26",
  "startDate": "2026-01-15T00:00:00Z",
  "endDate": "2026-03-31T23:59:59Z",
  "description": "Application window for the 2025/26 academic year"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | `string` | ✅ | 3–100 characters |
| `academicYear` | `string` | ✅ | Format: `YYYY/YY` (e.g. `2025/26`) |
| `startDate` | `string` (ISO datetime) | ✅ | Must be before `endDate` |
| `endDate` | `string` (ISO datetime) | ✅ | Must be after `startDate` |
| `description` | `string` | ❌ | Max 500 characters |

### Frontend action items:
- Build an admin "Application Periods" management page
- Show a list of all periods with active/inactive badge
- Provide create/edit forms with date pickers for start and end dates
- Add an "Activate" button that calls `PUT /:id/activate`
- Warn admins that activating a period deactivates all others

---

## 11. Phase 3 — Application-Period Linkage

**Key concept:** Students do NOT manually select which period they're applying for. The backend automatically links each new application to the currently active period.

### How the flow works:

```
1. Admin creates & activates a period
      POST /api/admin/application-periods   → create
      PUT  /api/admin/application-periods/:id/activate  → activate

2. Student checks eligibility
      GET /api/student/applications/eligibility
      → If no active period or outside date range:
        { "canApply": false, "reason": "The application window is currently closed." }
      → If eligible:
        { "canApply": true, "reason": "You are eligible to submit a new application." }

3. Student creates a draft
      POST /api/student/applications/draft
      → Backend auto-attaches the active period's ID as `applicationPeriodId`
      → Response includes: { "applicationPeriodId": "uuid-of-active-period", ... }

4. Student submits the draft
      POST /api/student/applications/:id/submit
```

### The draft payload does NOT include `applicationPeriodId`:

```json
{
  "outstandingFeesBalance": 45000,
  "hardshipNarrative": "Due to loss of both parents...",
  "currentYearOfStudy": "Year 2",
  "modeOfSponsorship": ["SELF"],
  "howSupportingEducation": ["PART_TIME_WORK"],
  "difficultiesFaced": ["FINANCIAL", "FAMILY"],
  "goalForAcademicYear": "Complete Year 2 and maintain GPA",
  "gpa": "3.2",
  "totalAnnualFeeAmount": 120000,
  "remainingSemesters": 4
}
```

The response will include the auto-assigned period:

```json
{
  "success": true,
  "data": {
    "id": "app-uuid",
    "applicationNumber": "STF-2026-001",
    "applicationPeriodId": "period-uuid",
    "status": "DRAFT",
    "outstandingFeesBalance": 45000,
    "...": "..."
  }
}
```

### Frontend action items:
- **Before showing the application form**, call `GET /api/student/applications/eligibility`
- If `canApply` is `false`, show the `reason` message and hide the form
- If the window is closed, show a message like: *"Applications are not currently being accepted. Please check back later."*
- Display the current period info from `GET /api/config/current` (academic year, deadline countdown)
- The `applicationPeriodId` is read-only — display it if needed but never send it in requests

---

## 12. Phase 3 — In-App Notifications

Students receive automatic notifications for status changes, deadline reminders, and welcome messages.

### Student Endpoints (require authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | Get paginated notifications |
| `GET` | `/api/notifications/unread-count` | Get unread count (for badge) |
| `PUT` | `/api/notifications/:id/read` | Mark one notification as read |
| `PUT` | `/api/notifications/read-all` | Mark all as read |

### `GET /api/notifications` — Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `integer` | 1 | Page number |
| `limit` | `integer` | 20 | Items per page |
| `unreadOnly` | `boolean` | false | Only return unread notifications |

### Notification Response Shape

```json
{
  "success": true,
  "data": [
    {
      "id": "notification-uuid",
      "type": "STATUS_CHANGE",
      "title": "Application STF-2026-001 Updated",
      "message": "Your application status has been changed to APPROVED.",
      "isRead": false,
      "metadata": { "applicationId": "app-uuid", "newStatus": "APPROVED" },
      "createdAt": "2026-02-19T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### Notification Types

| Type | When it fires |
|------|---------------|
| `STATUS_CHANGE` | Admin updates application status |
| `DEADLINE_REMINDER` | Approaching application deadline |
| `APPLICATION_RECEIVED` | Application successfully submitted |
| `WELCOME` | New user registration |
| `GENERAL` | General announcements |

### Frontend action items:
- Add a **notification bell** icon in the header
- Show unread count badge using `GET /api/notifications/unread-count`
- Build a notification dropdown/panel that loads from `GET /api/notifications`
- Clicking a notification calls `PUT /api/notifications/:id/read`
- Add a "Mark all as read" button that calls `PUT /api/notifications/read-all`
- Poll `unread-count` periodically (e.g. every 60 seconds) or use it on page load

---

## 13. Phase 3 — Application Scoring (Admin)

Admins can score applications on 4 criteria, each rated 1–5.

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/applications/:id/scores` | Submit a score |
| `GET` | `/api/admin/applications/:id/scores` | Get all scores for an application |
| `GET` | `/api/admin/scoring-rubric` | Get scoring criteria definitions |

### Score Payload — `POST /api/admin/applications/:id/scores`

```json
{
  "financialNeed": 4,
  "academicMerit": 3,
  "communityImpact": 5,
  "vulnerability": 4,
  "comments": "Strong applicant with demonstrated need."
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `financialNeed` | `integer` | ✅ | 1–5 |
| `academicMerit` | `integer` | ✅ | 1–5 |
| `communityImpact` | `integer` | ✅ | 1–5 |
| `vulnerability` | `integer` | ✅ | 1–5 |
| `comments` | `string` | ❌ | Optional reviewer notes |

### Get Scores Response

```json
{
  "success": true,
  "data": {
    "scores": [
      {
        "id": "score-uuid",
        "financialNeed": 4,
        "academicMerit": 3,
        "communityImpact": 5,
        "vulnerability": 4,
        "overallScore": 4.0,
        "comments": "Strong applicant",
        "reviewer": { "id": "admin-uuid", "email": "admin@example.com" }
      }
    ],
    "averageScore": 4.0
  }
}
```

### Frontend action items:
- Add a scoring panel to the application detail view (admin side)
- Display 4 sliders or star ratings (1–5) for each criterion
- Show existing scores from other reviewers below
- Display the average score prominently
- Fetch rubric definitions from `GET /api/admin/scoring-rubric` for tooltips/descriptions

---

## 14. Phase 3 — Enhanced Analytics (Admin)

Four new analytics endpoints for the admin dashboard.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/analytics/gender` | Gender breakdown with approval rates |
| `GET` | `/api/admin/analytics/funnel` | Application status funnel |
| `GET` | `/api/admin/analytics/time-to-decision` | Processing time statistics |
| `GET` | `/api/admin/analytics/demographics` | Full demographic breakdown |

### Example Responses

**Gender** — `GET /api/admin/analytics/gender`
```json
{ "data": [{ "gender": "FEMALE", "count": 120, "approved": 45, "rejected": 30 }] }
```

**Funnel** — `GET /api/admin/analytics/funnel`
```json
{ "data": [{ "status": "PENDING", "count": 50 }, { "status": "APPROVED", "count": 30 }] }
```

**Time-to-Decision** — `GET /api/admin/analytics/time-to-decision`
```json
{ "data": { "averageDays": 12.5, "minDays": 2, "maxDays": 45, "totalDecided": 80 } }
```

**Demographics** — `GET /api/admin/analytics/demographics`
```json
{ "data": { "byCounty": [...], "byEducationLevel": [...], "byOrphanStatus": [...], "byIncomeRange": [...] } }
```

### Frontend action items:
- Build an admin analytics dashboard with charts for each metric
- Use a bar chart for gender breakdown and funnel
- Display time-to-decision as summary cards (avg, min, max)
- Use pie/doughnut charts for demographics breakdowns

---

## 15. Phase 3 — Structured Admin Notes

The `POST /api/admin/notes` endpoint now supports a `section` field for categorising review notes.

### Updated Payload

```json
{
  "applicationId": "app-uuid",
  "noteText": "Strong financial need documented.",
  "isPrivate": true,
  "section": "financial"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `section` | `string` | ❌ | `financial`, `academic`, `vulnerability`, `general` |

### Frontend action items:
- Add a "Section" dropdown when creating admin notes
- Group notes by section in the application review view
- Use colour-coded labels for each section type

---

## Questions?

Refer to the Swagger documentation at `/api-docs` for the full interactive API spec.
