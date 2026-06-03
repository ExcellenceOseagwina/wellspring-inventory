# Wellspring University Inventory System Documentation

## 1. Introduction

### 1.1 Purpose

The Wellspring University Inventory System provides a web-based platform for managing university equipment by department. It records item quantity, condition, acquisition date, comments, images, videos, and activity history.

### 1.2 Scope

This document describes the system architecture, installation, configuration, frontend workflow, backend API, Supabase database schema, storage usage, testing approach, deployment notes, and maintenance guidance.

### 1.3 Audience

- Project supervisors and examiners
- Developers maintaining the application
- System administrators deploying the application
- Departmental users who need workflow context

## 2. System Overview

The system is made up of a static HTML/CSS/JavaScript frontend and a Node.js/Express backend. Supabase provides authentication, database storage, and file storage.

```text
Browser
  |
  | Static frontend and fetch requests
  v
Express backend
  |
  | Supabase client
  v
Supabase Auth, Postgres, and Storage
```

### 2.1 Main Components

- `frontend/`: User-facing pages, styles, scripts, and assets.
- `backend/server.js`: Express app, health check, API mounting, and static frontend serving.
- `backend/routes/`: Auth and inventory route definitions.
- `backend/controllers/`: Request handling and business logic.
- `backend/middleware/auth.js`: Supabase token validation.
- `backend/config/supabase.js`: Supabase client and per-request client helper.
- `backend/utils/upload.js`: Multer upload configuration.
- `backend/sql/`: Database migration helper scripts.
- `backend/data/`: Local JSON fallback storage used outside Vercel when department migrations are missing.

### 2.2 Technologies

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Multer
- dotenv
- CORS
- Vercel routing

## 3. Installation and Configuration

### 3.1 Prerequisites

- Node.js and npm
- Supabase project
- Modern web browser
- Internet connection
- Public Supabase Storage bucket named `inventory`

### 3.2 Environment Variables

Create `backend/.env`:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_ANON_KEY` may be used as a fallback, but `SUPABASE_SERVICE_ROLE_KEY` is the intended backend key for this project. It must not be exposed in frontend files.

### 3.3 Local Startup

From the root:

```bash
npm install
npm start
```

From the backend folder:

```bash
cd backend
npm install
npm start
```

Open `http://localhost:5000`. The backend serves `frontend/home.html` at `/`.

## 4. Frontend Design

### 4.1 Pages

- `frontend/home.html`: Landing/home page.
- `frontend/about.html`: Project information.
- `frontend/pages/signup.html`: Account creation.
- `frontend/pages/login.html`: Sign in.
- `frontend/pages/forgot-password.html`: Password reset request.
- `frontend/pages/reset-password.html`: New password submission.
- `frontend/pages/dashboard.html`: Main dashboard, department management, and report.
- `frontend/pages/departments/department.html`: Dynamic department inventory page.
- `frontend/pages/recent-activity.html`: Recent inventory activity.
- `frontend/pages/all-media.html`: Uploaded media gallery.

### 4.2 Frontend Scripts

- `api-base.js`: Chooses the API origin. File-based or non-5000 local pages call `http://localhost:5000`; same-origin deployments call `""`.
- `auth.js`: Signup, login, password reset, logout, password visibility toggles, session handling.
- `dashboard.js`: Dashboard totals, department creation/deletion, report generation, print handling, cross-tab refresh.
- `department.js`: Department item loading, add/edit/delete, uploads, search, media viewer.
- `activity.js`: Recent activity rendering.
- `media.js`: All-media gallery rendering.

### 4.3 Authentication Flow

1. User signs up or logs in through the frontend.
2. Backend calls Supabase Auth.
3. Frontend stores the Supabase access token and user object in `localStorage`.
4. Protected frontend pages check for a token.
5. Protected API requests send `Authorization: Bearer <token>`.
6. `backend/middleware/auth.js` validates the token with Supabase Auth.

## 5. Backend API

### 5.1 Public Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api` | API welcome message |
| GET | `/api/health` | Returns `{ "status": "ok" }` |
| GET | `/api/inventory` | Inventory API endpoint list |
| POST | `/api/auth/signup` | Creates a Supabase Auth user |
| POST | `/api/auth/login` | Signs in a user |
| POST | `/api/auth/forgot-password` | Sends a password reset email |
| POST | `/api/auth/reset-password` | Updates password from reset token |

### 5.2 Protected Inventory Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/inventory/dashboard` | Returns quantity totals, condition totals, and department list |
| GET | `/api/inventory/report` | Returns printable report data |
| GET | `/api/inventory/activity` | Returns recent add/edit/delete activity |
| GET | `/api/inventory/media` | Returns items with image or video URLs |
| GET | `/api/inventory/departments` | Lists departments |
| POST | `/api/inventory/departments` | Creates a department |
| DELETE | `/api/inventory/departments/:slug` | Deletes an empty department |
| GET | `/api/inventory/department/:dept` | Lists equipment for one department |
| POST | `/api/inventory/items` | Creates equipment |
| PUT | `/api/inventory/items/:id` | Updates equipment |
| DELETE | `/api/inventory/items/:id` | Deletes equipment |
| POST | `/api/inventory/upload` | Uploads one media file |

### 5.3 Example Requests

Signup:

```json
{
  "full_name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

Create department:

```json
{
  "name": "Computer Science"
}
```

Create item:

```json
{
  "department": "computer-science",
  "name": "Laptop",
  "quantity": 2,
  "condition": "good",
  "acquisition_date": "2026-05-18",
  "comments": "Used in laboratory",
  "image_url": "https://example.com/image.jpg",
  "video_url": null
}
```

Dashboard response:

```json
{
  "total": 20,
  "departments": 3,
  "departmentList": [
    { "slug": "computer-science", "name": "Computer Science" }
  ],
  "departmentTotals": {
    "computer-science": 8
  },
  "good": 10,
  "outdated": 3,
  "repair": 2,
  "replacement": 4,
  "missing": 1
}
```

Error response:

```json
{
  "error": "Invalid or expired token"
}
```

## 6. Database Schema

### 6.1 `inventory_items`

```sql
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  name text not null,
  quantity integer not null default 1 check (quantity >= 1),
  condition text not null check (
    condition in ('good', 'outdated', 'for_repair', 'for_replacement', 'missing')
  ),
  acquisition_date date,
  image_url text,
  video_url text,
  comments text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

Valid condition values:

- `good`
- `outdated`
- `for_repair`
- `for_replacement`
- `missing`

### 6.2 `departments`

Created by `backend/sql/add-departments.sql`:

```sql
create table if not exists departments (
  slug text primary key,
  name text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

The same migration drops older fixed department check constraints from `inventory_items`, allowing users to create departments dynamically.

### 6.3 `inventory_activity`

Created by `backend/sql/add-inventory-activity.sql`:

```sql
create table if not exists inventory_activity (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,
  action text not null check (action in ('added', 'edited', 'deleted')),
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

Activity stores a JSON snapshot so deleted item details remain visible in recent activity and reports.

### 6.4 Storage

Supabase Storage bucket:

```text
inventory
```

Typical object paths:

- `images/<timestamp>-<filename>`
- `videos/<timestamp>-<filename>`
- `app-data/departments.json`
- `app-data/inventory-items.json`

The `app-data` paths are fallback storage paths used in hosted environments when the department migration is missing. Running all SQL migrations is the preferred setup.

## 7. Business Rules

- Users must be authenticated to access inventory endpoints.
- Department names are normalized and converted to slugs.
- Department names must be unique.
- Departments with equipment records cannot be deleted.
- Equipment quantity must be an integer greater than or equal to `1`.
- Equipment condition must match one of the supported condition values.
- Acquisition date is optional, but if supplied it must be a valid date.
- Uploaded files are stored in the public `inventory` bucket.
- Dashboard and reports count equipment quantities, not just row counts.

## 8. Fallback Behavior

The backend supports fallback storage for departments and items when older Supabase schemas are missing the dynamic departments migration.

- Outside Vercel, fallback data is read from `backend/data/departments.json` and `backend/data/inventory-items.json`.
- On Vercel, fallback data is stored as JSON files in the Supabase `inventory` bucket.
- This fallback is intended to keep demonstrations working. Production systems should run `backend/sql/add-departments.sql`.

## 9. Testing

### 9.1 Manual Test Plan

Test the following workflows:

- Signup and login.
- Forgot password and reset password.
- Unauthenticated users are redirected or rejected.
- Dashboard totals load.
- Department creation works.
- Duplicate departments are rejected.
- Empty departments can be deleted.
- Departments with equipment cannot be deleted.
- Equipment can be added, edited, searched, and deleted.
- Image and video upload works.
- Recent activity records added, edited, and deleted actions.
- All Media displays uploaded files.
- Report generation and printing works.

### 9.2 Current Test Automation

No automated test suite is currently configured. The backend package includes the default placeholder `npm test` script, which exits with an error.

## 10. Deployment

### 10.1 Vercel

`vercel.json` configures:

- `/api/(.*)` to `backend/server.js`
- `/assets/(.*)` to `frontend/assets`
- `/css/(.*)` to `frontend/css`
- `/js/(.*)` to `frontend/js`
- `/pages/(.*)` to `frontend/pages`
- `/about.html` and `/home.html` static routes
- `/` to `frontend/home.html`

### 10.2 Deployment Checklist

1. Create or confirm the Supabase project.
2. Create the public `inventory` storage bucket.
3. Create `inventory_items`.
4. Run all SQL helper scripts in `backend/sql/`.
5. Set production environment variables.
6. Deploy the backend and frontend.
7. Test auth, departments, equipment CRUD, uploads, activity, media, and reports.

## 11. Known Limitations

- Fine-grained roles such as administrator, staff, and viewer are not implemented.
- The app depends on Supabase availability.
- The service role key must be protected carefully.
- Automated tests are not yet implemented.
- Fallback JSON storage is for compatibility and demonstrations, not a replacement for database migrations.

## 12. Maintenance

### 12.1 Common Issues

| Issue | Cause | Resolution |
| --- | --- | --- |
| Backend fails to start | Missing Supabase environment variables | Add `SUPABASE_URL` and a Supabase key |
| Login fails | Invalid credentials or unconfirmed email | Check credentials and Supabase Auth settings |
| Upload fails | Missing storage bucket | Create public bucket `inventory` |
| Department creation stores fallback data | Missing `departments` table or old constraint | Run `backend/sql/add-departments.sql` |
| Missing condition fails | Old condition constraint | Run `backend/sql/allow-missing-condition.sql` |
| Acquisition date fails | Missing column or schema cache | Run `backend/sql/add-acquisition-date.sql` and restart backend |
| Activity is incomplete | Missing activity table | Run `backend/sql/add-inventory-activity.sql` |

### 12.2 Change Log

| Version | Date | Description |
| --- | --- | --- |
| 1.0.0 | 2026-05-18 | Initial documented version |
| 1.1.0 | 2026-06-03 | Updated documentation for dynamic departments, media gallery, activity snapshots, backend static serving, health check, Vercel routing, and migration workflow |

## Glossary

| Term | Meaning |
| --- | --- |
| API | Application Programming Interface used by the frontend to communicate with the backend |
| Backend | Server-side application code |
| Frontend | Browser-facing application files |
| Supabase | Platform used for authentication, database, and storage |
| Bearer token | Access token sent in the Authorization header |
| Inventory item | A recorded equipment entry |
| Department | Unit that owns equipment records |
| Slug | URL-friendly identifier for a department |
| Storage bucket | Supabase container for uploaded files |
