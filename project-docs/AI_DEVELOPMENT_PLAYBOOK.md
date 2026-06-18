# SyllabusSync AI Development Playbook

## Purpose

This document serves as the master continuity document for the SyllabusSync project.

It enables any future ChatGPT, Claude, DeepSeek, Antigravity IDE, or human developer session to immediately understand:

- The project vision
- Current architecture
- Development history
- AI-assisted workflow
- Documentation structure
- Git workflow
- Development roadmap
- Deployment strategy

This document should be continuously updated throughout the project lifecycle.

---

# Project Overview

## Product Name

SyllabusSync

## Vision

SyllabusSync is a Nigerian exam preparation platform designed for:

- WAEC
- NECO
- JAMB
- GCE
- JUPEB

The platform provides:

- Authentic CBT practice
- Theory and objective questions
- Classroom learning system
- Progress tracking
- Analytics
- Gamification
- AI-assisted learning

---

# Current Technology Stack

## Frontend

- Next.js (App Router)
- React
- Tailwind CSS

## Backend

- Node.js
- Express.js

## Database

- PostgreSQL
- pgAdmin 4

## Authentication

- JWT
- bcrypt

## Version Control

- Git
- GitHub

---

# Current Repository Structure

backend/

frontend/

project-docs/

---

# Current Documentation Structure

project-docs/

- ADMIN_PANEL_SPEC.md
- ARCHITECTURE.md
- BUGS.md
- CHANGELOG.md
- DEVELOPMENT_HISTORY.md
- PRD.md
- ROADMAP.md
- TASKS.md

Future additions:

- ADMIN_PANEL_REVIEW.md
- ADMIN_AUTH_PLAN.md
- ADMIN_AUTH_ARCHITECTURE.md
- AI_DEVELOPMENT_PLAYBOOK.md

---

# Development History

A comprehensive development record already exists in:

DEVELOPMENT_HISTORY.md

It contains:

- Project vision
- Database schemas
- Backend routes
- Frontend pages
- CBT engine
- Gamification
- Leaderboard
- Classroom system
- Debugging history
- Deployment plans

This document remains the source of truth for project history.

---

# Current Project Status

Completed:

- Authentication
- Profile system
- CBT engine
- Practice sessions
- Results screen
- XP system
- Streaks
- Achievements
- Notifications
- Bookmarks
- Performance analytics
- Leaderboard
- Classroom backend
- Classroom frontend design

Pending:

- Admin Panel
- Real question import
- CSV import system
- AI tutor
- Deployment
- Mobile application

---

# Git Workflow

Never develop directly on main.

Use:

main

develop

feature branches

Example:

main
└── develop
├── feature/admin-auth
├── feature/question-management
├── feature/csv-import
├── feature/ai-tutor

Workflow:

feature branch
→ develop
→ main

---

# GitHub Project Workflow

Columns:

- Backlog
- To Do
- In Progress
- Testing
- Done

Task movement:

Backlog
→ To Do
→ In Progress
→ Testing
→ Done

Never start coding without a task card.

---

# AI Agent Workflow

This project uses multiple AI systems.

Each AI has a specific responsibility.

---

## ChatGPT

Role:

- Project manager
- Architect reviewer
- Planner
- Documentation advisor
- Development strategist

Use ChatGPT for:

- Architecture reviews
- Planning
- Roadmaps
- Development sequencing
- AI prompt generation
- Code review guidance

Do not use ChatGPT as the primary code generator.

---

## Claude

Role:

Senior Architect

Use Claude for:

- System architecture
- Product design
- Database design
- API design
- Security planning
- Feature specifications
- Admin panel specifications

Claude should produce:

- Specifications
- Plans
- Documentation

Before coding any feature:

Ask Claude to design it first.

Save outputs inside project-docs.

Examples:

- ADMIN_PANEL_SPEC.md
- ADMIN_AUTH_ARCHITECTURE.md

---

## DeepSeek

Role:

Principal Reviewer

Use DeepSeek after Claude.

DeepSeek reviews:

- Security risks
- Scalability risks
- Database concerns
- Missing requirements
- Architectural weaknesses

Workflow:

Claude designs
→ DeepSeek reviews
→ Human approves
→ Antigravity builds

Never skip DeepSeek review.

---

## Antigravity IDE

Role:

Implementation Engineer

Use Antigravity only after:

1. Claude design
2. DeepSeek review

Antigravity responsibilities:

- Generate code
- Create routes
- Create components
- Create migrations
- Implement features

Do not ask Antigravity to:

- Design architecture
- Define product requirements

Those belong to Claude.

---

# Development Process For Every New Feature

Step 1

Create GitHub card.

---

Step 2

Create feature branch.

Example:

feature/admin-auth

---

Step 3

Ask Claude:

Design this feature.

---

Step 4

Save specification.

---

Step 5

Ask DeepSeek:

Review this specification.

---

Step 6

Save review.

---

Step 7

Approve architecture.

---

Step 8

Use Antigravity:

Implement the approved design.

---

Step 9

Test.

---

Step 10

Merge into develop.

---

Step 11

Merge into main.

---

# Current Sprint

Admin Authentication

Tasks:

- Design architecture
- Review architecture
- Add role column to users table
- Create admin user
- Create admin middleware
- Create admin login route
- Create protected admin routes
- Test authentication
- Merge to develop

---

# Admin Panel Roadmap

Version 1

- Admin Authentication
- Admin Dashboard
- Question Management
- Subject Management
- Topic Management
- Subtopic Management
- CSV Import

Version 2

- User Management
- Analytics
- Audit Logs
- Multiple Roles
- Teacher Portal

---

# Deployment Roadmap

Backend:

- Railway or Render

Frontend:

- Vercel

Database:

- Neon PostgreSQL

Domain:

- Custom domain

Monitoring:

- Logging
- Error tracking

---

# AI Tutor Roadmap

Future integration:

Claude API

Features:

- Ask AI
- Topic explanations
- Question explanations
- Study guidance

This is not part of the current sprint.

---

# Rule For Future Conversations

Whenever continuing this project in another AI session:

1. Upload or paste this document.
2. Upload DEVELOPMENT_HISTORY.md.
3. Upload relevant specification documents.
4. Continue from the current sprint.
5. Follow the workflow:

Claude
→ DeepSeek
→ Antigravity
→ Testing
→ Git Merge

Do not skip stages.

This workflow remains active until SyllabusSync is deployed and launched.
