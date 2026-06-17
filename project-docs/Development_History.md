# SyllabusSync – Complete Development Record

This document is a comprehensive log of everything built, debugged, and implemented during the development of **SyllabusSync**, a full‑stack Nigerian CBT exam preparation platform.  
All major phases, code changes, database schemas, folder structures, and technical decisions are captured here.

---

## 1. Project Vision & Core Requirements

**Goal:** Build a mobile‑first, exam‑authentic practice platform for WAEC, NECO, JAMB, GCE, and JUPEB students.  
**Key features:**

- User authentication (JWT)
- Practice sessions with objective (MCQ) and theory (essay) questions
- Instant scoring with WAEC/NECO/JAMB grading
- Gamification (XP, streaks, achievements)
- Performance analytics and leaderboard
- Bookmarks and notifications
- Comprehensive classroom browsing (subjects → topics → subtopics with notes & videos)
- Results history and review cards with explanations

**Tech stack:**

- **Backend:** Node.js, Express, PostgreSQL, JWT, bcrypt, axios
- **Frontend:** Next.js (App Router), Tailwind CSS, React Hooks
- **Database:** PostgreSQL (local, later deployable to Neon/Railway)
- **Version control:** Git, GitHub

---

## 2. Initial Setup & Architecture

### Backend setup

- Created `backend/` with `package.json`, `server.js`, `db/index.js` (PostgreSQL connection).
- Middleware: `auth.js` – JWT verification.
- Environment variables in `.env`: `PORT`, `DB_CONNECTION_STRING`, `JWT_SECRET`.
- Installed dependencies: `express`, `pg`, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`, `axios`.

### Frontend setup

- Created `frontend/` with Next.js (App Router), Tailwind CSS.
- Folder structure: `src/app/` (pages), `src/components/` (reusable UI).
- Installed: `axios`, `react-icons`, `recharts` (for charts later).

### Database schema (initial)

- `users`, `exams`, `exam_years`, `subjects`, `topics`, `subtopics`, `questions`, `answers`, `practice_sessions`, `xp_events`, `achievements`, `user_achievements`, `notifications`, `bookmarks`, `scoring_rules`, `grading_rules`.

---

## 3. Core CBT Engine – Implementation & Debugging

### 3.1 Authentication & User Profile

- Built `/api/auth/register` and `/api/auth/login` endpoints.
- Frontend login/register pages with green gradient and formula background.
- Profile page: view/edit profile, show XP, streak, achievements (SVG icons), logout.

### 3.2 Exam Setup Page (7‑step accordion)

- Steps:
  1. Exam Type (WAEC/SSCE, NECO, JAMB/UTME, GCE, JUPEB)
  2. Mode (Practice, Study, Mock)
  3. Subjects (1‑5, multi‑select)
  4. Sections (Objective / Theory – for SSCE exams)
  5. Topics & Subtopics (combined list with indentation, optional)
  6. Questions & Year (dynamic years per exam – from `exam_years` table)
  7. Duration & Options (timer, shuffle, explanations)
- Summary card updates live.
- Start button creates session, sends `filters` JSON (subjects, topics, subtopics, sections) to backend.

### 3.3 CBT Screen

- Section tabs (Objective / Theory) when both sections exist.
- Separate indexes for each section.
- Question card: question text, options (A‑D) or textarea for theory.
- Flagging, bookmarking (star) – bookmark saves to `bookmarks` table.
- Timer with color urgency (green → orange → red) and pulse when <10%.
- Bottom sheet palette: grid of question numbers, color‑coded by status (answered, current, flagged, unanswered).
- Auto‑save each answer via `/api/cbt/submit-answer`.
- Final submission calls `/api/cbt/submit-session` with all answers.

### 3.4 Results Screen

- Animated score ring (SVG, fills over 1.2s) with WAEC grade.
- Stats: correct, wrong, skipped, time taken.
- XP earned banner.
- Weak areas insight (topics with most wrong answers).
- Filterable review cards (all/correct/wrong) with explanations.
- Bookmark button on each review card (saves to bookmarks).
- Share card (copy link or native share API).
- “Try Again” and “Back to Dashboard” buttons.

### 3.5 Critical Bugs & Fixes

| Problem                                  | Cause                                                  | Fix                                                                                          |
| ---------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Questions not loading (500)              | Broken join on `question_options` (table didn’t exist) | Removed join, used embedded `option_a…option_d`.                                             |
| `exam_body` mismatch                     | DB stored `'WAEC/SSCE'` but queries used `'WAEC'`      | Added mapping fallback and ran SQL updates.                                                  |
| `correct_option` column not found        | Actual column name `correct_answer`                    | Changed all queries to `correct_answer`.                                                     |
| Frontend options not showing             | Expecting `.options` array                             | Built array from `option_a…option_d`.                                                        |
| `Identifier 'examBody' already declared` | Duplicate `const examBody` in same route               | Renamed second to `examName`.                                                                |
| Theory answers not stored                | Missing `theory_answer_text` column                    | Added column to `answers`.                                                                   |
| Theory scoring not working               | No keyword matching                                    | Implemented keyword matching (full score if any keyword found) and stored `theory_feedback`. |
| Subjects not appearing in exam setup     | No exam filter in `/api/subjects`                      | Added exam query parameter and joined via `subjects → topics → subtopics → questions`.       |
| Exam years not dynamic                   | Hardcoded year list                                    | Created `exam_years` table, endpoint `/api/exams/years?exam_id=`.                            |
| Backend crash on `selected_sections`     | Missing comma in destructuring                         | Fixed syntax: added comma after `subtopic_ids`.                                              |

---

## 4. Gamification & User Engagement

### 4.1 XP & Streaks

- `xp_events` table stores `xp_amount` per event.
- XP awarded: 10 per correct objective answer.
- Streak computed from consecutive days with completed sessions.

### 4.2 Achievements

- `achievements` table with `trigger_type` and `trigger_value`.
- `user_achievements` tracks earned achievements.
- `achievementService.js` runs after session completion, checks all triggers, awards new ones.
- Frontend: profile page shows earned/unearned achievements with SVG icons.

### 4.3 Leaderboard

- `/api/leaderboard` with filters (`all`, `week`, `month`, `subject`).
- Podium for top 3, list with rank.
- Current user rank shown separately.

### 4.4 Performance Page

- Overall stats (sessions, questions, accuracy).
- Subject breakdown bar chart.
- Weak topics list.
- Trend chart (last 7 sessions).

### 4.5 Notifications

- `notifications` table.
- Auto‑created when an achievement is earned.
- Frontend: bell icon with unread count, panel with mark‑as‑read.

### 4.6 Bookmarks

- `bookmarks` table (question‑level).
- CBT screen: star button to save/remove.
- `/bookmarks` page: list saved questions, delete, “practice this question”.

---

## 5. Classroom Feature (New Design)

The Classroom provides a subject‑browsing experience with progress tracking, notes, videos, and direct practice.

### 5.1 Database Additions

- `user_progress` – tracks subtopic completion (`is_completed`, `mastery_score`).
- `user_bookmarks` – topic‑level bookmarks.
- `subtopics.notes` (TEXT) and `subtopics.video_urls` (TEXT[]).

### 5.2 Backend Routes (`classroomRoutes.js`)

- `GET /api/classroom/subjects`
- `GET /api/classroom/subjects/:slug/topics` – returns topics with completion counts.
- `GET /api/classroom/topics/:slug/subtopics` – returns subtopics with notes, video URLs, and user progress.
- `POST /api/classroom/user/progress` – mark subtopic as completed.
- `GET /api/classroom/user/progress-summary` – for “Continue Studying”.
- `POST /api/classroom/bookmarks/topic` – bookmark/unbookmark.
- `GET /api/classroom/bookmarks/topic/:topicId` – check bookmark status.

### 5.3 Frontend Pages

#### Classroom page (`/classroom`)

- Search bar, “Continue Studying” section (subjects with progress), all subjects grid (2‑col).
- Each subject card shows topic count.
- Click subject → navigate to `/subjects/[slug]`.

#### Subject page (`/subjects/[slug]`)

- Progress summary, filter tabs (ALL, WAEC, NECO, JAMB, GCE, JUPEB).
- Topic list with 3‑state cards:
  - Not started: `○`, “X subtopics”
  - In progress: `🔄`, “X subtopics · Y done”, progress bar
  - Completed: `✅`, “X subtopics · Done”
- Click topic → `/topics/[topicSlug]`.

#### Topic page (`/topics/[topicSlug]`)

- Horizontal subtopic tabs.
- Active tab shows:
  - **Notes** (rich text from `subtopics.notes` – supports headings, lists, examples, exam tips)
  - **Videos** (up to 3 thumbnails from `video_urls`; tap to open YouTube)
  - Offline state: videos greyed out with message “Connect to internet to watch”.
- **Practice button** → navigates to exam setup with `topicId` and `topicName` pre‑filled.
- **AI button** (placeholder) → will open AI assistant with topic context.
- **Bookmark entire topic** → toggles `user_bookmarks`.

---

## 6. Folder Structures (Final)

### Backend (`/backend`)

```
backend/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
├── db/
│   └── index.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── achievementRoutes.js
│   ├── auth.js
│   ├── bookmarkRoutes.js
│   ├── cbtRoutes.js
│   ├── classroomRoutes.js
│   ├── dashboardRoutes.js
│   ├── examRoutes.js
│   ├── leaderboardRoutes.js
│   ├── notificationRoutes.js
│   ├── performanceRoutes.js
│   ├── subjects.js
│   └── topicRoutes.js
├── services/
│   ├── achievementService.js
│   └── notificationService.js
└── (other config files)
```

### Frontend (`/frontend`)

```
frontend/
├── .env.local
├── .gitignore
├── package.json
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.js
├── public/
│   └── (assets)
├── src/
│   ├── app/
│   │   ├── cbt/
│   │   │   └── [sessionId]/
│   │   │       └── page.js
│   │   ├── classroom/
│   │   │   └── page.js
│   │   ├── dashboard/
│   │   │   ├── page.js
│   │   │   └── dashboard.css
│   │   ├── exam-setup/
│   │   │   └── page.js
│   │   ├── leaderboard/
│   │   │   └── page.js
│   │   ├── login/
│   │   │   └── page.js
│   │   ├── performance/
│   │   │   └── page.js
│   │   ├── profile/
│   │   │   └── page.js
│   │   ├── register/
│   │   │   └── page.js
│   │   ├── results-history/
│   │   │   └── page.js
│   │   ├── subjects/
│   │   │   └── [slug]/
│   │   │       └── page.js
│   │   ├── topics/
│   │   │   └── [topicSlug]/
│   │   │       └── page.js
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   └── layout.js
│   │   └── page.js
│   └── components/
│       ├── AchievementIcon.jsx
│       ├── BottomNav.jsx
│       ├── LoadingSpinner.jsx
│       ├── Navbar.jsx
│       ├── NotificationBell.jsx
│       ├── NotificationPanel.jsx
│       ├── ResultsScreen.css
│       ├── ResultsScreen.jsx
│       ├── SkeletonLoader.jsx
│       ├── StatsCard.jsx
│       └── SubjectCard.jsx
```

---

## 7. Key SQL Scripts (summarised)

### Core tables

```sql
-- Users
CREATE TABLE users (...);

-- Exams & Exam Years
CREATE TABLE exams (...);
CREATE TABLE exam_years (...);

-- Subjects, Topics, Subtopics
CREATE TABLE subjects (...);
CREATE TABLE topics (...);
CREATE TABLE subtopics (...);

-- Questions
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  exam_body VARCHAR(20),
  year INTEGER,
  subject_id INTEGER REFERENCES subjects(id),
  subtopic_id INTEGER REFERENCES subtopics(id),
  question_text TEXT,
  option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT,
  correct_answer CHAR(1),
  explanation TEXT,
  is_theory BOOLEAN DEFAULT FALSE,
  max_score INTEGER DEFAULT 1,
  keywords TEXT[],
  model_answer TEXT,
  ...
);

-- Answers
CREATE TABLE answers (...);

-- Practice Sessions
CREATE TABLE practice_sessions (...);

-- XP, Achievements, Notifications, Bookmarks
CREATE TABLE xp_events (...);
CREATE TABLE achievements (...);
CREATE TABLE user_achievements (...);
CREATE TABLE notifications (...);
CREATE TABLE bookmarks (...);

-- Scoring & Grading Rules
CREATE TABLE scoring_rules (...);
CREATE TABLE grading_rules (...);

-- Classroom
CREATE TABLE user_progress (...);
CREATE TABLE user_bookmarks (...);
```

### Sample seed data

- Inserted all 20 subjects (Mathematics, English, Physics, Chemistry, Biology, etc.).
- Added topics and subtopics for each.
- Inserted placeholder objective and theory questions for all exam bodies (WAEC, NECO, JAMB, GCE, JUPEB).

---

## 8. Deployment & Version Control

- Git initialised locally.
- Created GitHub repository (`Juwonator/SyllabusSync`).
- Pushed entire project (backend + frontend) to GitHub.
- Plans to deploy:
  - Backend: Render / Railway (or cloud VM)
  - Frontend: Vercel / Netlify
  - Database: Neon (PostgreSQL cloud) or Supabase

---

## 9. Current Status (as of June 2026)

- All core CBT features are fully functional.
- Results screen complete.
- Gamification, performance, leaderboard, bookmarks, notifications all working.
- Classroom pages (Classroom, Subject, Topic) have been designed and backend routes are ready; frontend code provided but not yet fully tested.
- The app is ready for final integration, real past‑question import, and deployment.

---

## 10. Future Enhancements

- Import real WAEC/NECO/JAMB past questions (CSV/JSON).
- AI chat integration (Claude API) for the “Ask AI” button.
- Offline caching for notes and videos (PWA).
- Mobile app (React Native) version.
- Admin panel for managing questions, subjects, and users.

---

_This document serves as the complete record of the SyllabusSync development journey._  
_All code, decisions, and debugging steps are captured here for future reference._
