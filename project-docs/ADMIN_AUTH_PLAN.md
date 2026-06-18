# Admin Authentication Plan

## Goal

Allow administrators to securely access the SyllabusSync Admin Panel.

---

## Features

### Admin Login

- Email
- Password
- JWT Authentication

### Admin Authorization

Only users with role = admin can access admin routes.

### Protected Routes

Examples:

- /api/admin/dashboard
- /api/admin/questions
- /api/admin/subjects
- /api/admin/topics

---

## Database Changes

### Users Table

Add:

role VARCHAR(20) DEFAULT 'student'

Possible values:

- student
- admin

---

## Routes

POST /api/admin/auth/login

GET /api/admin/auth/me

POST /api/admin/auth/logout

---

## Middleware

adminAuth.js

Checks:

- JWT exists
- JWT valid
- User role = admin

Return 403 if unauthorized.
