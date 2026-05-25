create table if not exists departments (
  slug text primary key,
  name text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'inventory_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%department%'
  loop
    execute format(
      'alter table inventory_items drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

create index if not exists departments_name_idx
on departments (name);
