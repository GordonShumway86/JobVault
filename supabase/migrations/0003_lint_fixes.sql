-- Fixes two Supabase linter warnings surfaced after 0001/0002 were applied.

-- Pin the trigger function's search_path (avoids a mutable-search-path warning)
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Move pg_trgm out of the public schema, as Supabase's linter recommends
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
