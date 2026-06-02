# Wellspring University Inventory System

A simple inventory management system for Wellspring University using HTML, CSS, JavaScript, Node.js, Express.js, and Supabase.

## Directory Structure

```text
wellspring-inventory/
.vercel/
  project.json
  backend/
    config/
      supabase.js
    middleware/
      auth.js
    routes/
      authRoutes.js
      inventoryRoutes.js
    .env
    .env.example
    package.json
    server.js
  frontend/
    assets/
    css/
      style.css
    js/
      auth.js
      activity.js
      dashboard.js
      department.js
    pages/
      departments/
        accounting.html
        bio-chemistry.html
        biological-science.html
        computing.html
        mass-communication.html
        nursing.html
        public-health.html
      dashboard.html
      forgot-password.html
      login.html
      recent-activity.html
      signup.html
    home.html
  README.md
```

## Supabase Setup

Create a Supabase project, then create a public storage bucket named `inventory`.

Run this SQL in the Supabase SQL editor:

```sql
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  department text not null check (
    department in (
      'computing',
      'nursing',
      'accounting',
      'public-health',
      'mass-communication',
      'bio-chemistry',
      'biological-science'
    )
  ),
  name text not null,
  quantity integer not null default 1 check (quantity >= 1),
  condition text not null check (
    condition in ('good', 'outdated', 'for_repair', 'for_replacement', 'missing')
  ),
  image_url text,
  video_url text,
  comments text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

If you already created the table before adding quantity, run:

```sql
alter table inventory_items
add column if not exists quantity integer not null default 1 check (quantity >= 1);
```

If your existing `condition` check constraint does not include missing items, update it in Supabase:

```sql
alter table inventory_items drop constraint if exists inventory_items_condition_check;

alter table inventory_items
add constraint inventory_items_condition_check
check (condition in ('good', 'outdated', 'for_repair', 'for_replacement', 'missing'));
```

You can also run the same fix from `backend/sql/allow-missing-condition.sql`.

To keep a permanent recent activity history, including deleted item details, run:

```sql
create table if not exists inventory_activity (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,
  action text not null check (action in ('added', 'edited', 'deleted')),
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_activity_created_at_idx
on inventory_activity (created_at desc);

create index if not exists inventory_activity_item_id_idx
on inventory_activity (item_id);
```

You can also run this from `backend/sql/add-inventory-activity.sql`.

For a class project, the backend uses the Supabase service role key and protects routes with the logged-in user's access token. Keep the service role key only in `backend/.env`.

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Run The Project

Install backend dependencies if needed:

```bash
cd backend
npm install
```

Start the API:

```bash
npm start
```

Open the frontend by launching `frontend/home.html` in your browser. The frontend expects the API at `http://localhost:5000`.

## Main Features

- Sign up, sign in, and forgot password pages.
- Main dashboard with total equipment, number of departments, outdated equipment, equipment for repair, equipment for replacement, missing equipment, and good equipment.
- Recent activity page showing added, edited, and deleted inventory records.
- All media page for viewing uploaded equipment images and videos.
- Departments can be created.
- Add equipment per department with item name, quantity, condition, image, video, and comments.
- Edit and delete equipment records per department.
- Printable reports include current inventory and recent activity history.
