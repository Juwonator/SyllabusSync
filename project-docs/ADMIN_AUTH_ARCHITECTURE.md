# SyllabusSync — Admin Panel Architecture Specification

**Version:** 1.0  
**Sprint:** Admin Authentication + Admin Panel Foundation  
**Prepared by:** Senior Architect  
**Status:** Ready for DeepSeek Review

---

## Table of Contents

1. [Overview & Guiding Principles](#1-overview--guiding-principles)
2. [Admin Authentication Architecture](#2-admin-authentication-architecture)
3. [Role System Design](#3-role-system-design)
4. [Database Changes](#4-database-changes)
5. [Admin Route Structure](#5-admin-route-structure)
6. [Backend API Structure](#6-backend-api-structure)
7. [Frontend Page Structure](#7-frontend-page-structure)
8. [Admin Dashboard Layout](#8-admin-dashboard-layout)
9. [Question Management Workflow](#9-question-management-workflow)
10. [Subject / Topic / Subtopic Management Workflow](#10-subject--topic--subtopic-management-workflow)
11. [User Management Workflow](#11-user-management-workflow)
12. [CSV Import Architecture](#12-csv-import-architecture)
13. [Security Considerations](#13-security-considerations)
14. [Permission Matrix](#14-permission-matrix)
15. [Scalability Considerations](#15-scalability-considerations)
16. [Recommended Folder Structure](#16-recommended-folder-structure)

---

## 1. Overview & Guiding Principles

### 1.1 Scope

This document specifies the architecture for the SyllabusSync Admin Panel, covering authentication, authorization, database schema changes, API design, frontend structure, and workflows. It is scoped to the current sprint and builds cleanly on the existing platform.

### 1.2 Approved Architectural Decisions

The following decisions are already ratified and are treated as constraints — not options — throughout this specification:

| #   | Decision                                                       |
| --- | -------------------------------------------------------------- |
| 1   | Single authentication system (no separate admin login service) |
| 2   | Role-based authorization (RBAC)                                |
| 3   | Role stored as a column on the `users` table                   |
| 4   | Admin panel lives inside the existing Next.js application      |
| 5   | Admin routes live under the `/admin/*` namespace               |

### 1.3 Guiding Principles

**Least Privilege.** Every role receives only the permissions it needs. No permission is granted by default.

**Defence in Depth.** Authorization is enforced at three independent layers: middleware, route guard, and database row-level logic. Passing one layer is not sufficient.

**Single Source of Truth.** Roles and permissions are defined once, in a central config. UI components, API middleware, and database policies all derive from that config.

**Auditability.** Every write operation made through the admin panel is logged with actor identity, timestamp, and before/after state.

**Non-Regression.** Database changes use additive migrations only during this sprint. No existing column is renamed or dropped.

---

## 2. Admin Authentication Architecture

### 2.1 Approach

The existing JWT authentication system is extended — not replaced. A single login endpoint handles all users. Role information is embedded in the JWT payload. The client and server both inspect the role claim to make access decisions.

### 2.2 JWT Payload Extension

The existing token payload is extended with two new fields:

```
{
  sub:        <user_id>,
  email:      <email>,
  role:       "student" | "admin" | "super_admin",
  iat:        <issued_at>,
  exp:        <expiry>
}
```

No other changes to the token signing algorithm or secret management are required at this stage.

### 2.3 Authentication Flow (Admin)

```
1. Admin navigates to /admin (or any /admin/* route)
2. Next.js middleware checks for a valid JWT in the Authorization header / httpOnly cookie
3. If no token → redirect to /login?redirect=/admin/dashboard
4. If token present → decode and inspect the `role` claim
5. If role is NOT "admin" or "super_admin" → redirect to /403
6. If role is valid → allow the request to proceed to the admin route
```

The `/login` page is shared. After credential verification, the server returns a JWT with the correct role. The client stores the token and redirects based on the role claim: admins go to `/admin/dashboard`, students go to `/dashboard`.

### 2.4 Token Refresh

No change to existing refresh logic. The role claim is re-embedded on every token refresh, so a role change takes effect on the user's next refresh cycle (typically within 15 minutes for short-lived tokens) or immediately on forced logout.

### 2.5 Forced Role Invalidation

When an admin downgrades a user's role, the system should:

1. Update the role in the database immediately
2. Optionally add the user's `user_id` to a short-lived Redis blocklist (if Redis is available), or
3. Accept the eventual consistency window until the JWT expires

For the current sprint, option 3 (accept the window) is acceptable. Redis blocklist can be added in a hardening sprint.

---

## 3. Role System Design

### 3.1 Role Enumeration

Three roles are defined for this sprint:

| Role          | Description                                                                             |
| ------------- | --------------------------------------------------------------------------------------- |
| `student`     | Default role assigned at registration. Access to CBT, results, classroom, achievements. |
| `admin`       | Elevated role. Access to all admin panel features except role management.               |
| `super_admin` | Full access, including ability to promote/demote other users and manage admin accounts. |

### 3.2 Role Assignment Rules

- All new registrations receive the `student` role automatically.
- The `admin` role is assigned manually by a `super_admin` through the User Management panel.
- The `super_admin` role is assigned only via a direct database operation (seeded during deployment). It cannot be granted through the UI.
- A `super_admin` cannot demote another `super_admin` through the UI.

### 3.3 Role Hierarchy

```
super_admin
    └── admin
            └── student
```

Each higher role inherits all permissions of roles below it.

### 3.4 Permission Tokens

Permissions are named string tokens checked by middleware and used to build the permission matrix. Each is a `resource:action` pair:

```
questions:read
questions:create
questions:update
questions:delete
subjects:read
subjects:create
subjects:update
subjects:delete
topics:read
topics:create
topics:update
topics:delete
subtopics:read
subtopics:create
subtopics:update
subtopics:delete
users:read
users:update
users:promote          ← super_admin only
import:csv
analytics:read
exams:take
results:read
classroom:access
achievements:read
```

---

## 4. Database Changes

### 4.1 Migration Strategy

All changes are additive. The migration runs as a single versioned migration file applied before deployment.

### 4.2 Changes to the `users` Table

Add a `role` column with a PostgreSQL enum type:

```
-- Create enum type
CREATE TYPE user_role AS ENUM ('student', 'admin', 'super_admin');

-- Add column with safe default
ALTER TABLE users
  ADD COLUMN role user_role NOT NULL DEFAULT 'student';

-- Backfill: existing users remain 'student'
-- (default handles this automatically)

-- Seed initial super_admin (done separately via env-driven seed script)
```

### 4.3 New Table: `admin_audit_log`

Every admin write action is recorded here. This table is append-only — no updates or deletes.

| Column          | Type                 | Notes                                     |
| --------------- | -------------------- | ----------------------------------------- |
| `id`            | UUID (PK)            | Auto-generated                            |
| `actor_id`      | UUID (FK → users.id) | Who performed the action                  |
| `action`        | VARCHAR(100)         | e.g. `questions.create`, `users.promote`  |
| `resource_type` | VARCHAR(50)          | e.g. `question`, `user`                   |
| `resource_id`   | UUID                 | The affected record's ID                  |
| `before_state`  | JSONB                | Snapshot before change (null for creates) |
| `after_state`   | JSONB                | Snapshot after change (null for deletes)  |
| `ip_address`    | INET                 | Request origin IP                         |
| `created_at`    | TIMESTAMPTZ          | Default NOW()                             |

Index: `(actor_id, created_at DESC)` for actor-scoped audit queries.  
Index: `(resource_type, resource_id)` for record-scoped audit trails.

### 4.4 New Table: `csv_import_jobs`

Tracks the state of asynchronous CSV import operations.

| Column            | Type                 | Notes                                          |
| ----------------- | -------------------- | ---------------------------------------------- |
| `id`              | UUID (PK)            | Auto-generated                                 |
| `actor_id`        | UUID (FK → users.id) | Admin who triggered the import                 |
| `filename`        | VARCHAR(255)         | Original filename                              |
| `status`          | ENUM                 | `pending`, `processing`, `completed`, `failed` |
| `total_rows`      | INT                  | Total rows in the CSV                          |
| `processed_rows`  | INT                  | Rows processed so far                          |
| `successful_rows` | INT                  | Rows imported without error                    |
| `failed_rows`     | INT                  | Rows that failed validation                    |
| `error_log`       | JSONB                | Array of `{row, field, message}` objects       |
| `created_at`      | TIMESTAMPTZ          | When the job was created                       |
| `completed_at`    | TIMESTAMPTZ          | When the job finished (null if pending)        |

### 4.5 No Other Table Changes

The questions, subjects, topics, subtopics, and achievements tables are not structurally changed in this sprint. The admin panel reads and writes to them through the existing schema.

---

## 5. Admin Route Structure

### 5.1 Next.js App Router Pages

All admin routes are protected by a shared layout that enforces role authentication before rendering any child page.

```
/admin                          → Redirect to /admin/dashboard
/admin/dashboard                → Admin home with summary widgets
/admin/questions                → Question list with filters and search
/admin/questions/new            → Create question form
/admin/questions/[id]           → Edit question form
/admin/subjects                 → Subject list
/admin/subjects/new             → Create subject form
/admin/subjects/[id]            → Edit subject form
/admin/topics                   → Topic list (filterable by subject)
/admin/topics/new               → Create topic form
/admin/topics/[id]              → Edit topic form
/admin/subtopics                → Subtopic list (filterable by topic)
/admin/subtopics/new            → Create subtopic form
/admin/subtopics/[id]           → Edit subtopic form
/admin/users                    → User list with search and filters
/admin/users/[id]               → User detail + role management
/admin/import                   → CSV import tool
/admin/import/[jobId]           → Import job status page
```

### 5.2 Route Protection Mechanism

A single `middleware.ts` file at the Next.js root intercepts all `/admin/*` requests:

```
Request to /admin/*
  → Extract JWT from cookie or Authorization header
  → If missing → redirect /login?redirect=<requested_path>
  → Decode JWT
  → If role NOT IN ['admin', 'super_admin'] → redirect /403
  → Allow request
```

This runs on the Edge runtime. It is the outermost gate and must remain lightweight — no database calls.

### 5.3 Shared Admin Layout

All admin pages inherit from a single `app/admin/layout.tsx`. This layout:

- Renders the persistent sidebar navigation
- Renders the top header bar (user identity, logout)
- Performs a secondary role check on the client (belt-and-suspenders)
- Provides a shared toast/notification context
- Wraps content in an error boundary

---

## 6. Backend API Structure

### 6.1 API Namespace

All admin API routes live under `/api/admin/`. All routes in this namespace require:

1. A valid JWT (authentication)
2. Role claim of `admin` or `super_admin` (authorization)

These two checks are applied by a shared `requireAdmin` middleware that runs before any admin route handler.

### 6.2 Admin API Endpoints

#### Authentication (no change to existing endpoints)

```
POST   /api/auth/login              ← Existing; now returns role in response
POST   /api/auth/refresh            ← Existing; re-embeds role in new token
```

#### Questions

```
GET    /api/admin/questions              List with pagination, filters, search
GET    /api/admin/questions/:id          Get single question with full detail
POST   /api/admin/questions              Create question (obj or theory)
PUT    /api/admin/questions/:id          Full update of question
PATCH  /api/admin/questions/:id          Partial update (e.g. status only)
DELETE /api/admin/questions/:id          Soft delete
```

#### Subjects

```
GET    /api/admin/subjects               List all subjects
GET    /api/admin/subjects/:id           Get subject with topic count
POST   /api/admin/subjects               Create subject
PUT    /api/admin/subjects/:id           Update subject
DELETE /api/admin/subjects/:id           Soft delete (only if no dependent questions)
```

#### Topics

```
GET    /api/admin/topics                 List topics (filter by subject_id supported)
GET    /api/admin/topics/:id             Get topic with subtopic count
POST   /api/admin/topics                 Create topic
PUT    /api/admin/topics/:id             Update topic
DELETE /api/admin/topics/:id             Soft delete
```

#### Subtopics

```
GET    /api/admin/subtopics              List subtopics (filter by topic_id supported)
GET    /api/admin/subtopics/:id          Get subtopic detail
POST   /api/admin/subtopics              Create subtopic
PUT    /api/admin/subtopics/:id          Update subtopic
DELETE /api/admin/subtopics/:id          Soft delete
```

#### Users

```
GET    /api/admin/users                  List users with search, filter by role
GET    /api/admin/users/:id              User detail with activity summary
PATCH  /api/admin/users/:id              Update user (name, email, status)
PATCH  /api/admin/users/:id/role         Promote/demote role ← super_admin only
DELETE /api/admin/users/:id              Deactivate account (soft delete)
```

#### CSV Import

```
POST   /api/admin/import/upload          Upload CSV file → returns jobId
GET    /api/admin/import/jobs            List all import jobs for current admin
GET    /api/admin/import/jobs/:jobId     Get job status and error log
GET    /api/admin/import/template        Download blank CSV template
```

#### Analytics

```
GET    /api/admin/analytics/overview     Platform-level summary stats
GET    /api/admin/analytics/questions    Question difficulty and attempt stats
GET    /api/admin/analytics/users        User growth and engagement trends
```

#### Audit Log

```
GET    /api/admin/audit-log              Paginated audit log (super_admin only)
GET    /api/admin/audit-log/:resourceType/:resourceId  History for a specific record
```

### 6.3 API Response Envelope

All admin API responses follow a consistent shape:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 320
  },
  "message": "Optional human-readable message"
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Question text is required",
    "fields": { "question_text": "Required" }
  }
}
```

### 6.4 Middleware Stack for Admin Routes

```
Express Router: /api/admin/*
  → verifyJWT            (validate token, attach user to req)
  → requireAdmin         (check role is admin or super_admin)
  → requireSuperAdmin    (applied selectively to role change endpoints)
  → auditLogger          (wraps response to write audit log on success)
  → [route handler]
```

---

## 7. Frontend Page Structure

### 7.1 Questions Page (`/admin/questions`)

**List View Components:**

- Search bar (by keyword, question text)
- Filter panel: exam type (WAEC/NECO/JAMB/GCE/JUPEB), subject, topic, question type (objective/theory), year
- Sortable data table: ID, question preview, subject, type, exam, year, created_at, status
- Bulk action bar (appears when rows are selected): bulk delete, bulk status change
- Pagination controls
- "Add Question" primary CTA button

**Create/Edit Form Components:**

- Question type selector (Objective / Theory) — determines which sub-form renders
- Exam type multi-select (a question can appear in multiple exams)
- Subject selector → dynamically loads Topic selector → dynamically loads Subtopic selector
- Year selector
- Rich text area for question body (supports LaTeX for equations)
- For Objective: option inputs (A, B, C, D, E), correct answer radio
- For Theory: mark scheme / model answer textarea
- Explanation textarea (shown after exam)
- Status toggle (draft / published)
- Save as Draft and Publish buttons

### 7.2 Subjects Page (`/admin/subjects`)

- Table: name, exam associations, topic count, created_at, actions
- Inline add form (simple: name, exam type associations)
- Edit modal or inline editing
- Delete with dependency warning (if topics/questions exist under it)

### 7.3 Topics Page (`/admin/topics`)

- Subject filter dropdown (required or optional)
- Table: name, parent subject, subtopic count, created_at, actions
- Create/edit form: name, subject (required)

### 7.4 Subtopics Page (`/admin/subtopics`)

- Subject + Topic filter chain
- Table: name, parent topic, created_at, actions
- Create/edit form: name, topic (required)

### 7.5 Users Page (`/admin/users`)

- Search by name or email
- Filter by role (student / admin / super_admin)
- Filter by status (active / deactivated)
- Table: avatar, name, email, role badge, streak, XP, join date, status, actions
- User detail page: profile info, activity stats (exams taken, avg score), role control (super_admin only), account status toggle, audit history

### 7.6 Import Page (`/admin/import`)

- Download template button with format instructions
- Drag-and-drop file upload zone (CSV only, max size labelled)
- Pre-upload validation summary (column headers check before submitting)
- Job status card: shows progress bar, counts (total / success / failed)
- Error table: row number, field, error message, raw row data
- Re-import failed rows option (downloads a corrected CSV pre-filled with failed rows)

### 7.7 Dashboard Page (`/admin/dashboard`)

See Section 8.

---

## 8. Admin Dashboard Layout

### 8.1 Layout Anatomy

```
┌─────────────────────────────────────────────────────┐
│  TOP HEADER                                         │
│  [SyllabusSync Logo]        [Admin Name]  [Logout]  │
├──────────────┬──────────────────────────────────────┤
│  SIDEBAR     │  MAIN CONTENT AREA                   │
│              │                                      │
│  Dashboard   │  ┌────────┐ ┌────────┐ ┌────────┐  │
│  Questions   │  │ STAT   │ │ STAT   │ │ STAT   │  │
│  Subjects    │  │ CARD   │ │ CARD   │ │ CARD   │  │
│  Topics      │  └────────┘ └────────┘ └────────┘  │
│  Subtopics   │                                      │
│  Users       │  ┌──────────────────┐ ┌──────────┐  │
│  Import      │  │  CHART/GRAPH     │ │ RECENT   │  │
│              │  │                  │ │ ACTIVITY │  │
│  ──────────  │  └──────────────────┘ └──────────┘  │
│  Audit Log   │                                      │
│  (su only)   │  ┌──────────────────────────────┐   │
│              │  │  RECENT IMPORTS / JOBS        │   │
│              │  └──────────────────────────────┘   │
└──────────────┴──────────────────────────────────────┘
```

### 8.2 Summary Stat Cards (top row)

Each card shows current value + 7-day delta:

- Total Questions (published vs draft breakdown)
- Total Users (+ new this week)
- Active Students today
- Exams Taken this week

### 8.3 Charts / Graphs

- Line chart: User registrations over the past 30 days
- Bar chart: Exams taken by subject (top 5 subjects)

### 8.4 Recent Activity Feed

- Last 10 admin actions (from audit log): who did what and when
- Clickable — links to the relevant resource

### 8.5 Quick Action Buttons

- Add Question
- Import CSV
- View Users

---

## 9. Question Management Workflow

### 9.1 Create Objective Question

```
Admin → /admin/questions/new
  → Selects type: Objective
  → Selects exam(s): e.g. WAEC, JAMB
  → Selects subject → topic cascades → subtopic cascades
  → Enters question text
  → Enters options A–E
  → Selects correct answer
  → Enters explanation (optional)
  → Selects year
  → Clicks "Save as Draft" or "Publish"

API call: POST /api/admin/questions
Backend:
  1. Validate all required fields
  2. Verify subject/topic/subtopic IDs exist
  3. Insert into questions table with status = 'draft' or 'published'
  4. Write to admin_audit_log
  5. Return created question
```

### 9.2 Create Theory Question

```
Same flow as objective, but:
  → No options A–E
  → Has "Mark Scheme / Model Answer" textarea
  → Has "Marks Available" number input
```

### 9.3 Edit Question

```
Admin → /admin/questions → clicks question row → /admin/questions/:id
  → Form pre-populated from GET /api/admin/questions/:id
  → Admin modifies fields
  → Clicks "Update"

API call: PUT /api/admin/questions/:id
Backend:
  1. Fetch existing question (404 if not found)
  2. Validate updated fields
  3. Compare before/after state
  4. Update database
  5. Write audit log (before_state and after_state captured)
  6. Return updated question
```

### 9.4 Delete Question

Soft delete only. A `deleted_at` timestamp is set; the row is not removed. Deleted questions are excluded from all student-facing queries via a `WHERE deleted_at IS NULL` condition that must be applied at the ORM/query layer consistently.

The admin list view shows deleted questions when a "Show Deleted" filter is toggled.

### 9.5 Question Status Lifecycle

```
draft → published → archived
            ↑           ↓
            └───────────┘ (re-publish from archived)
```

Students only see `published` questions. Draft and archived questions are invisible to the CBT engine.

---

## 10. Subject / Topic / Subtopic Management Workflow

### 10.1 Hierarchy

```
Subject (e.g. "Mathematics")
  └── Topic (e.g. "Algebra")
        └── Subtopic (e.g. "Quadratic Equations")
```

A subject can belong to multiple exam types. Topics belong to exactly one subject. Subtopics belong to exactly one topic.

### 10.2 Create Subject

```
Admin → /admin/subjects → "Add Subject"
  → Name input
  → Exam type checkboxes (WAEC, NECO, JAMB, GCE, JUPEB)
  → Save

API: POST /api/admin/subjects
Validation: name is unique (case-insensitive), at least one exam type selected
```

### 10.3 Create Topic

```
Admin → /admin/topics → "Add Topic"
  → Name input
  → Subject dropdown (required)
  → Save

API: POST /api/admin/topics
Validation: (name, subject_id) pair must be unique
```

### 10.4 Create Subtopic

```
Admin → /admin/subtopics → "Add Subtopic"
  → Subject dropdown → Topic dropdown (cascading, filtered by subject)
  → Subtopic name input
  → Save

API: POST /api/admin/subtopics
Validation: (name, topic_id) pair must be unique
```

### 10.5 Delete Constraints

Before deleting any item in the hierarchy, the backend checks for dependents:

- Subject delete: blocked if any topics exist under it. Admin must reassign or delete topics first.
- Topic delete: blocked if any subtopics or questions reference it.
- Subtopic delete: blocked if any questions reference it.

The API returns a `409 Conflict` with a count of blocking dependencies and their types.

---

## 11. User Management Workflow

### 11.1 User List

The admin sees a paginated, searchable list of all users. Default sort: newest first. Columns: name, email, role badge, XP, exam streak, join date, status (active/deactivated).

### 11.2 View User Detail

`GET /api/admin/users/:id` returns the user's profile plus a computed activity summary:

- Total exams taken
- Average score
- Most active subject
- Last login date
- All earned achievements
- Active classroom memberships

### 11.3 Edit User

Admins can edit: display name, email. They cannot edit XP, streaks, or achievements directly (those are computed by the system).

### 11.4 Role Management (super_admin only)

The role control section on the user detail page is conditionally rendered only when the requesting user's JWT contains `role: "super_admin"`. The backend also independently enforces this with `requireSuperAdmin` middleware.

Workflow:

```
super_admin → /admin/users/:id → Role dropdown → "Promote to Admin" / "Revoke Admin"
API: PATCH /api/admin/users/:id/role
  Body: { role: "admin" | "student" }
  Constraint: cannot change own role; cannot change another super_admin's role
```

### 11.5 Deactivate / Reactivate Account

Deactivation sets an `is_active: false` flag. Deactivated users cannot log in (JWT validation checks this flag during login). Reactivation sets it back to `true`. This is not a delete — all data is preserved.

---

## 12. CSV Import Architecture

### 12.1 CSV Format Specification

The CSV template has the following columns (in order):

| Column            | Required    | Values                                                                |
| ----------------- | ----------- | --------------------------------------------------------------------- |
| `question_type`   | Yes         | `objective` or `theory`                                               |
| `exam_type`       | Yes         | `WAEC`, `NECO`, `JAMB`, `GCE`, `JUPEB` (comma-separated for multiple) |
| `subject`         | Yes         | Exact subject name as in database                                     |
| `topic`           | Yes         | Exact topic name as in database                                       |
| `subtopic`        | No          | Exact subtopic name (empty string if none)                            |
| `year`            | Yes         | 4-digit year e.g. `2022`                                              |
| `question_text`   | Yes         | Plain text or markdown                                                |
| `option_a`        | Conditional | Required if objective                                                 |
| `option_b`        | Conditional | Required if objective                                                 |
| `option_c`        | Conditional | Required if objective                                                 |
| `option_d`        | Conditional | Required if objective                                                 |
| `option_e`        | No          | Optional 5th option                                                   |
| `correct_answer`  | Conditional | `A`–`E`, required if objective                                        |
| `mark_scheme`     | Conditional | Required if theory                                                    |
| `marks_available` | Conditional | Integer, required if theory                                           |
| `explanation`     | No          | Shown after exam                                                      |

### 12.2 Import Flow

```
Phase 1 — Upload
  Admin → drag/drop CSV → POST /api/admin/import/upload
  Backend:
    - Validates file is CSV, under size limit (e.g. 5MB)
    - Streams file to temporary server storage (or in-memory buffer)
    - Creates a csv_import_jobs record with status = 'pending'
    - Returns { jobId } immediately (202 Accepted)

Phase 2 — Processing (async, runs in background worker)
  - Row-by-row parsing begins
  - Per-row validation:
      → Required fields present
      → question_type is valid enum value
      → subject/topic/subtopic names resolve to DB IDs
      → correct_answer is valid for objective questions
      → No duplicate question detected (hash check on question_text + exam_type + year)
  - Valid rows → inserted into questions table (status = 'draft')
  - Failed rows → appended to error_log in the job record
  - processed_rows counter incremented after each row
  - On completion: status = 'completed' or 'failed' (failed if 0 successful rows)
  - Job record updated with final counts and completed_at

Phase 3 — Status Polling
  Admin → GET /api/admin/import/jobs/:jobId (polling every 3 seconds)
  Returns current status, progress counts, error log
  Frontend renders progress bar and error table in real-time

Phase 4 — Error Resolution
  Admin downloads pre-filled error CSV (failed rows only, with error column prepended)
  Admin corrects data and re-imports
```

### 12.3 Duplicate Detection

A SHA-256 hash is computed from `(question_text + exam_type + year)` and stored on the question row. On import, each row's hash is checked against existing records before insertion. Duplicates are flagged in the error log with code `DUPLICATE_QUESTION`.

### 12.4 Processing Model

For the current scale, the CSV processor runs as an in-process background job (e.g. using a simple async queue or Node.js worker thread). When volume grows, this is the natural seam to extract into a job queue (Bull/BullMQ + Redis).

---

## 13. Security Considerations

### 13.1 Authentication Hardening

- JWT secret must be stored as an environment variable, never committed to source control
- Tokens must be short-lived (recommended: 15 minutes access, 7 days refresh)
- Admin JWTs should have a shorter expiry than student JWTs (recommended: 5 minutes access for admin sessions)
- `httpOnly` cookies should be preferred over `localStorage` for token storage to prevent XSS theft

### 13.2 Authorization

- Authorization is enforced at THREE independent layers: Next.js middleware (edge), Express middleware (API), and query-level (only fetching rows the actor is allowed to see)
- Never trust the client-side role display — it is for UX only. All security decisions are made server-side
- The `requireSuperAdmin` middleware must be applied at the route level, not inferred from UI visibility

### 13.3 Input Validation

- All API inputs validated with a schema validation library (e.g. Zod or Joi) before any database interaction
- CSV rows validated row-by-row before any batch insert begins
- Question text must be sanitized to prevent stored XSS if rendered as HTML
- File uploads: content-type must be verified server-side (not just by extension); file contents inspected for CSV structure

### 13.4 SQL Injection Prevention

- All database queries must use parameterized queries or ORM-generated queries
- No string concatenation into SQL strings anywhere in the admin routes
- Bulk inserts from CSV must also use parameterized batch insert, not string-built queries

### 13.5 Rate Limiting

- Login endpoint: max 10 attempts per IP per 15 minutes
- Admin API write endpoints: max 200 requests per admin user per minute
- CSV upload endpoint: max 5 uploads per admin per hour

### 13.6 Audit Log Integrity

- The `admin_audit_log` table must not have an `UPDATE` or `DELETE` permission granted to the application database user
- Application credentials should only hold `INSERT` and `SELECT` on that table
- This ensures the log cannot be tampered with even if application code is compromised

### 13.7 CORS

- Admin API routes must only accept requests from the application's own origin
- The Express CORS configuration should not use wildcard `*` for `/api/admin/*` routes

---

## 14. Permission Matrix

| Action               | student | admin | super_admin |
| -------------------- | :-----: | :---: | :---------: |
| Take CBT Exams       |    ✓    |   ✓   |      ✓      |
| View Own Results     |    ✓    |   ✓   |      ✓      |
| Use Classroom        |    ✓    |   ✓   |      ✓      |
| Earn Achievements    |    ✓    |   ✓   |      ✓      |
| View Leaderboard     |    ✓    |   ✓   |      ✓      |
| Access /admin/\*     |    ✗    |   ✓   |      ✓      |
| Read Questions       |    ✗    |   ✓   |      ✓      |
| Create Questions     |    ✗    |   ✓   |      ✓      |
| Update Questions     |    ✗    |   ✓   |      ✓      |
| Delete Questions     |    ✗    |   ✓   |      ✓      |
| Manage Subjects      |    ✗    |   ✓   |      ✓      |
| Manage Topics        |    ✗    |   ✓   |      ✓      |
| Manage Subtopics     |    ✗    |   ✓   |      ✓      |
| View Users           |    ✗    |   ✓   |      ✓      |
| Edit User Profiles   |    ✗    |   ✓   |      ✓      |
| Deactivate Users     |    ✗    |   ✓   |      ✓      |
| Promote/Demote Roles |    ✗    |   ✗   |      ✓      |
| Import CSV           |    ✗    |   ✓   |      ✓      |
| View Analytics       |    ✗    |   ✓   |      ✓      |
| View Audit Log       |    ✗    |   ✗   |      ✓      |
| Create super_admin   |    ✗    |   ✗   | ✗ (DB only) |

---

## 15. Scalability Considerations

### 15.1 Current Scale Assumptions

- Users: up to ~50,000 students
- Questions: up to ~100,000 questions
- Concurrent admin sessions: typically 1–5

The current architecture is appropriate for this scale with no immediate changes needed.

### 15.2 Database

- Add a `deleted_at` index on the `questions` table to ensure soft-delete filters are fast at scale
- Add composite index `(subject_id, topic_id, exam_type, status)` on questions for filtered list queries in the admin panel
- The `admin_audit_log` table should be partitioned by `created_at` month once it exceeds ~1M rows (not needed now but the table design supports it)

### 15.3 CSV Import

The current in-process async approach handles files up to approximately 5,000 rows comfortably. When imports exceed this regularly:

- Extract the processor into a BullMQ job queue backed by Redis
- The API immediately queues the job and returns; the worker processes it independently
- The polling mechanism requires no change

### 15.4 Admin Panel API

Admin API traffic is low-frequency and write-heavy — it does not require caching. Student-facing CBT API is the high-traffic surface and is not affected by admin changes.

### 15.5 Role Changes at Scale

If the platform grows to thousands of admin users (unlikely but possible), the JWT blocklist approach should be implemented using Redis with a TTL equal to the access token expiry. For the current scale, the eventual-consistency approach (role takes effect on next token refresh) is acceptable.

### 15.6 Question Search

At 100,000+ questions, the keyword search on question text should use PostgreSQL full-text search (`tsvector`/`tsquery`) rather than `ILIKE '%term%'`. A `tsvector` column on the questions table should be added as a generated column once the question bank grows beyond ~20,000 rows.

---

## 16. Recommended Folder Structure

The structure below is additive — it shows only new folders and files introduced by this sprint, placed within the existing project layout.

```
syllabussync/
│
├── app/                                 ← Next.js App Router
│   ├── (student)/                       ← Existing student routes
│   │   └── ...
│   ├── admin/                           ← NEW: Admin section
│   │   ├── layout.tsx                   ← Shared admin shell (sidebar, header, auth guard)
│   │   ├── page.tsx                     ← Redirects to /admin/dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── questions/
│   │   │   ├── page.tsx                 ← Question list
│   │   │   ├── new/
│   │   │   │   └── page.tsx             ← Create form
│   │   │   └── [id]/
│   │   │       └── page.tsx             ← Edit form
│   │   ├── subjects/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── topics/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── subtopics/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── import/
│   │       ├── page.tsx
│   │       └── [jobId]/
│   │           └── page.tsx
│   └── ...
│
├── middleware.ts                        ← NEW/MODIFIED: Admin route protection
│
├── components/
│   ├── admin/                           ← NEW: Admin-only components
│   │   ├── layout/
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   └── AdminShell.tsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── DashboardCharts.tsx
│   │   ├── questions/
│   │   │   ├── QuestionTable.tsx
│   │   │   ├── QuestionFilters.tsx
│   │   │   ├── ObjectiveForm.tsx
│   │   │   └── TheoryForm.tsx
│   │   ├── taxonomy/
│   │   │   ├── SubjectTable.tsx
│   │   │   ├── TopicTable.tsx
│   │   │   └── SubtopicTable.tsx
│   │   ├── users/
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserDetail.tsx
│   │   │   └── RoleControl.tsx
│   │   └── import/
│   │       ├── CsvDropzone.tsx
│   │       ├── ImportJobStatus.tsx
│   │       └── ImportErrorTable.tsx
│   └── ...                             ← Existing shared components
│
├── lib/
│   ├── auth/
│   │   ├── jwt.ts                      ← MODIFIED: include role in payload
│   │   └── roles.ts                    ← NEW: role enum and permission map
│   └── ...
│
├── hooks/
│   ├── useAdminUser.ts                 ← NEW: hook for current admin identity
│   └── ...
│
└── backend/                            ← Express.js backend
    ├── src/
    │   ├── routes/
    │   │   ├── auth/                   ← MODIFIED: login returns role
    │   │   │   └── ...
    │   │   └── admin/                  ← NEW: all admin API routes
    │   │       ├── index.ts            ← Mounts all admin sub-routers
    │   │       ├── questions.routes.ts
    │   │       ├── subjects.routes.ts
    │   │       ├── topics.routes.ts
    │   │       ├── subtopics.routes.ts
    │   │       ├── users.routes.ts
    │   │       ├── import.routes.ts
    │   │       └── analytics.routes.ts
    │   ├── middleware/
    │   │   ├── requireAdmin.ts         ← NEW
    │   │   ├── requireSuperAdmin.ts    ← NEW
    │   │   └── auditLogger.ts          ← NEW
    │   ├── controllers/
    │   │   └── admin/                  ← NEW
    │   │       ├── questions.controller.ts
    │   │       ├── subjects.controller.ts
    │   │       ├── topics.controller.ts
    │   │       ├── subtopics.controller.ts
    │   │       ├── users.controller.ts
    │   │       ├── import.controller.ts
    │   │       └── analytics.controller.ts
    │   ├── services/
    │   │   └── admin/                  ← NEW
    │   │       ├── csvImport.service.ts
    │   │       └── auditLog.service.ts
    │   └── validators/
    │       └── admin/                  ← NEW
    │           ├── question.schema.ts
    │           ├── subject.schema.ts
    │           ├── topic.schema.ts
    │           ├── subtopic.schema.ts
    │           ├── user.schema.ts
    │           └── import.schema.ts
    └── migrations/
        └── 0XXX_admin_sprint.sql       ← NEW: single migration file for this sprint
```

---

## Appendix A: Migration File Summary

The single migration for this sprint (`0XXX_admin_sprint.sql`) contains:

1. `CREATE TYPE user_role AS ENUM ('student', 'admin', 'super_admin')`
2. `ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'student'`
3. `CREATE TABLE admin_audit_log (...)` with all columns and indexes
4. `CREATE TABLE csv_import_jobs (...)` with all columns
5. Index on `questions(subject_id, topic_id, status)` for admin list performance
6. Index on `questions(deleted_at)` for soft-delete filtering

This migration is non-destructive and fully reversible.

---

## Appendix B: Key Technical Contracts

### B.1 Role Claim Contract

Any code that reads the role from a JWT must use the field name `role` (lowercase). Both frontend and backend must agree on this field name. It must be set by the backend — the frontend must never generate or modify it.

### B.2 Admin Audit Contract

Any admin controller that performs a write operation (create, update, delete, role change) must call `auditLog.service.ts` before returning a success response. Silent writes (writes with no audit entry) are not permitted.

### B.3 Soft Delete Contract

Any query that returns data to students or to count statistics must include `WHERE deleted_at IS NULL`. This filter should be enforced at the service/ORM layer, not in individual route handlers, to prevent it from being accidentally omitted.

---

_End of Architecture Specification — SyllabusSync Admin Panel v1.0_
