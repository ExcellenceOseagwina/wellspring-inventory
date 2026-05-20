alter table inventory_items
add column if not exists acquisition_date date;

notify pgrst, 'reload schema';
