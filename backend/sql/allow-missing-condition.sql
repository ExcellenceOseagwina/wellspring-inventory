alter table inventory_items drop constraint if exists inventory_items_condition_check;

alter table inventory_items
add constraint inventory_items_condition_check
check (condition in ('good', 'outdated', 'for_repair', 'for_replacement', 'missing'));
