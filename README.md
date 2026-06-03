# Wellspring University Inventory System

A web-based inventory management system for Wellspring University. The app lets authenticated users create departments, record equipment, upload item images or videos, review recent activity, and generate printable inventory reports.

## Tech Stack

- Frontend: HTML, CSS, and JavaScript
- Backend: Node.js and Express
- Authentication: Supabase Auth
- Database: Supabase Postgres
- File storage: Supabase Storage
- Upload handling: Multer
- Deployment config: Vercel

## Project Structure

```text
wellspring-inventory/
  backend/
    config/supabase.js
    controllers/
      authController.js
      inventoryController.js
    data/
      departments.json
      inventory-items.json
    middleware/auth.js
    routes/
      authRoutes.js
      inventoryRoutes.js
    sql/
      add-acquisition-date.sql
      add-departments.sql
      add-inventory-activity.sql
      allow-missing-condition.sql
    utils/upload.js
    .env.example
    package.json
    server.js
  frontend/
    assets/
    css/style.css
    js/
      activity.js
      api-base.js
      auth.js
      dashboard.js
      department.js
      media.js
    pages/
      departments/department.html
      all-media.html
      dashboard.html
      forgot-password.html
      login.html
      recent-activity.html
      reset-password.html
      signup.html
    about.html
    home.html
  README.md
  SYSTEM_DOCUMENTATION.md
  USER_DOCUMENTATION.md
  package.json
  vercel.json
```

## Main Features

- User signup, login, logout, forgot password, and reset password.
- Protected dashboard for authenticated users.
- Dynamic department creation and deletion.
- Department inventory pages generated from department URL parameters.
- Equipment records with name, quantity, condition, acquisition date, comments, image, and video.
- Equipment edit and delete actions.
- Search within a department by item name, quantity, condition, acquisition date, or comments.
- Dashboard totals by equipment quantity, department, and condition.
- Recent activity history for added, edited, and deleted records.
- All media gallery for uploaded item images and videos.
- Printable report with summary, department totals, item details, and recent activity.
- Backend static file serving, API health check, and Vercel routing.

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The backend can fall back to `SUPABASE_ANON_KEY`, but the service role key is recommended for this project setup. Keep service role keys only in backend environment files or hosting environment variables.

## Supabase Setup

Create a Supabase project and a public storage bucket named `inventory`.

Create the inventory table:

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

Then run the helper migrations in Supabase SQL Editor:

```sql
-- Allows departments to be managed dynamically.
-- File: backend/sql/add-departments.sql

-- Adds the acquisition date field if the table was created earlier.
-- File: backend/sql/add-acquisition-date.sql

-- Adds permanent add/edit/delete history.
-- File: backend/sql/add-inventory-activity.sql

-- Adds the missing condition to older condition constraints.
-- File: backend/sql/allow-missing-condition.sql
```

For convenience, each migration is stored in the `backend/sql/` folder and can be copied directly into the Supabase SQL Editor.

## Run Locally

Install dependencies:

```bash
npm install
cd backend
npm install
```

Start from the repository root:

```bash
npm start
```

Or start from the backend folder:

```bash
cd backend
npm start
```

Open:

```text
http://localhost:5000
```

The backend serves the frontend files and exposes the API on the same origin. If the frontend is opened directly from the file system, it calls `http://localhost:5000` as the API origin.

## API Overview

Public endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api` | API welcome message |
| GET | `/api/health` | Health check |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/forgot-password` | Send reset link |
| POST | `/api/auth/reset-password` | Update password |

Protected inventory endpoints require:

```text
Authorization: Bearer <supabase-access-token>
```

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/inventory/dashboard` | Dashboard totals and department list |
| GET | `/api/inventory/report` | Printable report data |
| GET | `/api/inventory/activity` | Recent activity |
| GET | `/api/inventory/media` | Items with image or video uploads |
| GET | `/api/inventory/departments` | List departments |
| POST | `/api/inventory/departments` | Create department |
| DELETE | `/api/inventory/departments/:slug` | Delete empty department |
| GET | `/api/inventory/department/:dept` | List one department's equipment |
| POST | `/api/inventory/items` | Create equipment |
| PUT | `/api/inventory/items/:id` | Update equipment |
| DELETE | `/api/inventory/items/:id` | Delete equipment |
| POST | `/api/inventory/upload` | Upload image or video |

## Deployment Notes

`vercel.json` routes `/api/*` to `backend/server.js` and serves the static frontend from `frontend/`. In production, add the Supabase environment variables to the hosting platform and confirm the `inventory` bucket and SQL migrations are available.

When `VERCEL=1`, local JSON fallback files are not used. Department and fallback item data are stored through Supabase-backed storage paths when a migration is missing, but the recommended production setup is to run all SQL migrations.

## Documentation

- User guide: `USER_DOCUMENTATION.md`
- System documentation: `SYSTEM_DOCUMENTATION.md`
