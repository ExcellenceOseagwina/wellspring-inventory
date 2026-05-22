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
