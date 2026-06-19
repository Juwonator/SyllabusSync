# ADMIN_PANEL_ARCHITECTURE_V2.md

# 1. Executive Summary

This document revises the original Admin Panel Architecture based on the DeepSeek review findings.

The architecture remains aligned with the original goals:

- Secure administration of SyllabusSync
- Role and permission-based access control
- Scalable content management
- Secure user administration
- Production-ready operational controls

The following critical improvements have been introduced:

- Mandatory MFA for admin accounts
- CSRF protection
- Permission-based authorization
- Immediate token revocation support
- Refresh token rotation
- Queue-based CSV processing
- Dashboard caching
- Full-text search
- Validation middleware
- Account lockout mechanisms
- API versioning
- Question approval workflow
- Integration testing requirements

The architecture remains compatible with the existing Node.js, Express, PostgreSQL, JWT, and Next.js stack.

---

# 2. Architecture Changes

## 2.1 Authentication Model Upgrade

Previous:

- JWT + Role-Based Access

New:

- JWT + MFA + Permission-Based Authorization

Authentication Flow:

1. Username/password validation
2. MFA challenge
3. JWT issuance
4. Refresh token issuance
5. Session registration

---

## 2.2 Authorization Upgrade

Previous:

```text
Role → Route Access
```

New:

```text
Role
 ↓
Permissions
 ↓
Middleware
 ↓
Route Access
```

Permissions become the primary authorization mechanism.

Roles become permission containers.

---

## 2.3 New Permission Architecture

Example:

Question Manager

- question.read
- question.create
- question.update

Content Manager

- subject.manage
- topic.manage
- subtopic.manage

User Manager

- user.read
- user.update
- user.deactivate

Super Admin

- -

---

## 2.4 Admin Session Architecture

Every admin session is tracked.

Session data:

- User ID
- Device
- Browser
- IP
- Created At
- Last Activity
- Revoked Status

Supports:

- Force logout
- Session revocation
- Security monitoring

---

# 3. Updated Database Design

## 3.1 Users Table

Add:

```sql
role
mfa_enabled
last_password_change
failed_login_attempts
locked_until
```

---

## 3.2 Permissions Table

```sql
permissions
-----------
id
name
description
```

---

## 3.3 Roles Table

```sql
roles
-----------
id
name
```

---

## 3.4 Role Permissions

```sql
role_permissions
----------------
role_id
permission_id
```

---

## 3.5 User Sessions

```sql
user_sessions
-------------
id
user_id
refresh_token_hash
device_fingerprint
ip_address
created_at
last_activity
is_revoked
```

---

## 3.6 MFA Tables

```sql
user_mfa
--------
user_id
totp_secret
enabled
```

```sql
recovery_codes
--------------
id
user_id
code_hash
used
```

---

## 3.7 Audit Log

```sql
admin_audit_logs
----------------
id
admin_id
action
resource_type
resource_id
before_state
after_state
ip_address
created_at
```

Partitioned monthly.

---

## 3.8 Required Indexes

Users:

```sql
(role)
(is_active)
(role,is_active)
```

Questions:

```sql
(exam_body)
(subject_id)
(topic_id)
(status)
(year)
```

Audit Logs:

```sql
(admin_id)
(created_at)
(resource_type)
```

---

## 3.9 Search Indexes

Question search uses PostgreSQL Full-Text Search.

Generated TSVECTOR column:

```text
question_text
explanation
keywords
```

GIN index required.

---

# 4. Updated Security Model

## 4.1 MFA Requirements

Mandatory for all admin accounts.

Supported:

- TOTP authenticator apps
- Recovery codes

Examples:

- Google Authenticator
- Microsoft Authenticator
- Authy

---

## 4.2 MFA Enrollment Flow

Admin Login

↓

MFA Not Enabled

↓

Generate Secret

↓

Display QR Code

↓

Verify TOTP

↓

Generate Recovery Codes

↓

Enable MFA

---

## 4.3 MFA Verification Flow

Login

↓

Password Valid

↓

Enter TOTP

↓

Issue Tokens

↓

Access Granted

---

## 4.4 CSRF Protection

All state-changing admin endpoints require:

```text
X-CSRF-Token
```

Token generated per authenticated session.

Validation performed before route execution.

Applies to:

- POST
- PUT
- PATCH
- DELETE

JWT verifies identity.

CSRF token verifies request origin.

Both are required.

---

## 4.5 Session Regeneration

On every successful login:

- New access token
- New refresh token
- New session identifier

Old unauthenticated session invalidated.

---

## 4.6 Refresh Token Rotation

Every refresh:

- Issue new refresh token
- Revoke old refresh token

Prevents replay attacks.

---

## 4.7 Immediate Token Revocation

Trigger events:

- Password change
- Role change
- Account disable
- Force logout

All active sessions revoked.

---

## 4.8 Account Lockout

Admin accounts:

- 5 failed attempts
- Lock for 30 minutes

Email notification generated.

---

## 4.9 Audit Logging

Log:

- Reads
- Writes
- Failed access attempts
- Permission denials

---

# 5. Updated API Design

Versioning introduced.

```text
/api/v1/admin/*
```

Examples:

```text
GET    /api/v1/admin/questions
POST   /api/v1/admin/questions
PUT    /api/v1/admin/questions/:id
DELETE /api/v1/admin/questions/:id
```

---

## 5.1 Bulk Operations

Supported:

```text
POST /api/v1/admin/questions/bulk-delete

POST /api/v1/admin/questions/bulk-status

POST /api/v1/admin/users/bulk-deactivate
```

---

## 5.2 Validation Layer

Request Flow:

```text
Request
 ↓
Validation Middleware
 ↓
Auth Middleware
 ↓
Permission Middleware
 ↓
Controller
```

Validation performed using schema definitions.

Reject invalid requests before business logic.

---

## 5.3 Error Handling

Standard format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request"
  }
}
```

No internal stack traces exposed.

---

# 6. Updated Permission Model

## 6.1 Permission Middleware

Example:

```text
requirePermission("question.create")
```

Checks:

- User active
- Session valid
- Permission exists

---

## 6.2 Permission Categories

Questions

```text
question.read
question.create
question.update
question.delete
question.publish
```

Subjects

```text
subject.read
subject.manage
```

Topics

```text
topic.read
topic.manage
```

Users

```text
user.read
user.update
user.deactivate
```

System

```text
analytics.read
audit.read
settings.manage
```

---

## 6.3 Question Approval Workflow

Statuses:

```text
Draft
Review
Published
Archived
```

Flow:

Creator

↓

Review

↓

Approver

↓

Published

Publishing permission separated from editing permission.

---

# 7. Updated Infrastructure Requirements

## 7.1 Queue-Based CSV Processing

Replace in-process imports.

Technology:

```text
BullMQ
Redis
```

Architecture:

```text
Upload
 ↓
Validation
 ↓
Queue Job
 ↓
Worker
 ↓
Database
```

---

## 7.2 Worker Responsibilities

Workers:

- Parse CSV
- Validate records
- Detect duplicates
- Import batches
- Generate reports

Worker isolated from API server.

---

## 7.3 Dashboard Caching

Cache:

- User counts
- Question counts
- Session counts
- Analytics summaries

TTL:

```text
5 minutes
```

---

## 7.4 Cache Invalidation

Invalidate on:

- New question
- User update
- Bulk import
- Subject changes

---

## 7.5 Data Retention Policy

Audit Logs:

```text
2 years
```

Import Jobs:

```text
90 days
```

Archived automatically.

---

## 7.6 Integration Testing Strategy

Required:

Authentication:

- Login
- MFA
- Revocation

Authorization:

- Permission checks

Admin APIs:

- CRUD operations

CSV Import:

- Validation
- Duplicate detection

Security:

- CSRF
- Lockout
- Session revocation

---

# 8. Migration Impact

## Existing System Impact

Minimal.

Changes required:

### Users Table

Add:

- role
- mfa_enabled
- failed_login_attempts
- locked_until
- last_password_change

### New Tables

- permissions
- roles
- role_permissions
- user_sessions
- user_mfa
- recovery_codes
- admin_audit_logs

### Infrastructure Additions

- Redis
- BullMQ Workers

### Backend Additions

- Permission Middleware
- Validation Middleware
- MFA Service
- Audit Service
- Cache Service

### Frontend Additions

- MFA Enrollment Screens
- MFA Verification Screens
- Session Management UI
- Admin Dashboard

---

# 9. Final Recommendation

Architecture Status:

APPROVED FOR IMPLEMENTATION

Conditions:

1. MFA must be implemented before production deployment.
2. Permission-based authorization must replace role-only enforcement.
3. CSV processing must use Redis-backed queues.
4. Full-text search must be included in Version 1.
5. CSRF protection must be enabled for all state-changing admin endpoints.
6. Integration tests must be completed before merge to main.

Recommended Implementation Order:

Sprint A:

- Roles
- Permissions
- Admin Authentication
- MFA
- Session Management

Sprint B:

- Admin Dashboard
- Audit Logging
- User Management

Sprint C:

- Question Management
- Approval Workflow
- Search

Sprint D:

- CSV Import
- Analytics
- Bulk Operations

This architecture is considered production-ready for the SyllabusSync Admin Platform and addresses all blocking concerns identified during review.
