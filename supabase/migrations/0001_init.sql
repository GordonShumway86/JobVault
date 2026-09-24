-- Service Log: initial schema (Phase 1)
-- Single-owner today; every table carries owner_id so multi-user/org support
-- can be layered on later without a rebuild (owner_id -> org membership).

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type customer_type as enum ('residential','commercial','property_management','contractor','other');

create type equipment_category as enum (
  'split_system','package_unit','rtu','heat_pump','furnace','air_handler',
  'walk_in_cooler','walk_in_freezer','reach_in','ice_machine','exhaust_fan',
  'make_up_air_unit','mini_split','boiler','water_heater','other'
);

create type equipment_status as enum ('active','replaced','removed','inactive');

create type call_type as enum (
  'service_diagnostic','preventive_maintenance','repair','quote_estimate',
  'installation','warranty','callback','refrigeration','other'
);

create type job_status as enum (
  'new','scheduled','en_route','on_site','diagnosing',
  'waiting_on_customer_approval','quote_sent','quote_approved',
  'waiting_on_parts','parts_ordered','return_visit_needed',
  'work_complete','invoice_ready','closed','warranty_callback','cancelled'
);

create type job_priority as enum ('low','normal','high','emergency');

create type photo_category as enum (
  'equipment_nameplate','before_repair','after_repair','failed_part',
  'meter_gauge_reading','wiring_diagram','vendor_quote','parts_receipt',
  'invoice','general_job_photo','internal_only'
);

create type ai_processing_status as enum ('not_processed','processing','completed','failed','reviewed');

create type part_status as enum (
  'needed','priced','quoted','approved','ordered','backordered',
  'ready_for_pickup','received','installed','returned','cancelled'
);

create type quote_status as enum ('draft','sent','approved','declined','expired','superseded');

create type vendor_doc_type as enum ('vendor_quote','receipt','invoice','packing_slip');

create type reading_category as enum ('refrigerant','electrical','airflow','temperature','combustion','general');

create type followup_status as enum ('open','done','cancelled');

create type followup_reason as enum (
  'waiting_on_approval','waiting_on_parts','return_visit','call_customer','vendor_follow_up','other'
);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

create table customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  customer_type customer_type not null default 'residential',
  primary_contact_name text,
  phone text,
  email text,
  billing_address text,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_owner_idx on customers(owner_id);
create index customers_search_idx on customers using gin (
  (setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(primary_contact_name,'')), 'B') ||
   setweight(to_tsvector('simple', coalesce(notes,'')), 'C'))
);

-- ---------------------------------------------------------------------------
-- Sites
-- ---------------------------------------------------------------------------

create table sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  primary_contact_name text,
  contact_phone text,
  site_email text,
  access_instructions text,
  internal_notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_owner_idx on sites(owner_id);
create index sites_customer_idx on sites(customer_id);
create index sites_search_idx on sites using gin (
  (setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(address,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(city,'') || ' ' || coalesce(state,'') || ' ' || coalesce(zip,'')), 'B'))
);

-- ---------------------------------------------------------------------------
-- Equipment
-- ---------------------------------------------------------------------------

create table equipment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  site_id uuid not null references sites(id) on delete cascade,
  category equipment_category not null default 'other',
  nickname text,
  location_at_site text,
  manufacturer text,
  model_number text,
  serial_number text,
  manufacture_date date,
  refrigerant_type text,
  nominal_capacity text,
  voltage text,
  phase text,
  mca text,
  mocp text,
  compressor_model text,
  filter_sizes text,
  belt_sizes text,
  warranty_notes text,
  installed_date date,
  equipment_notes text,
  status equipment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index equipment_owner_idx on equipment(owner_id);
create index equipment_site_idx on equipment(site_id);
create index equipment_search_idx on equipment using gin (
  (setweight(to_tsvector('simple', coalesce(manufacturer,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(model_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(serial_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(nickname,'')), 'B'))
);
create index equipment_model_trgm_idx on equipment using gin (model_number gin_trgm_ops);
create index equipment_serial_trgm_idx on equipment using gin (serial_number gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------

create sequence job_number_seq start 1000;

create table jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_number text not null unique default ('SL-' || nextval('job_number_seq')::text),
  customer_id uuid not null references customers(id) on delete restrict,
  site_id uuid not null references sites(id) on delete restrict,
  equipment_id uuid references equipment(id) on delete set null,
  call_type call_type not null default 'service_diagnostic',
  status job_status not null default 'new',
  priority job_priority not null default 'normal',
  scheduled_at timestamptz,
  arrived_at timestamptz,
  departed_at timestamptz,
  customer_complaint text,
  technician_notes text,
  diagnosis text,
  work_performed text,
  recommendations text,
  follow_up_instructions text,
  internal_notes text,
  customer_visible_notes text,
  next_follow_up_date date,
  return_visit_required boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_owner_idx on jobs(owner_id);
create index jobs_customer_idx on jobs(customer_id);
create index jobs_site_idx on jobs(site_id);
create index jobs_equipment_idx on jobs(equipment_id);
create index jobs_status_idx on jobs(status);
create index jobs_search_idx on jobs using gin (
  (setweight(to_tsvector('simple', coalesce(job_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(customer_complaint,'')), 'B') ||
   setweight(to_tsvector('simple', coalesce(technician_notes,'')), 'C') ||
   setweight(to_tsvector('simple', coalesce(diagnosis,'')), 'C') ||
   setweight(to_tsvector('simple', coalesce(work_performed,'')), 'C'))
);

-- ---------------------------------------------------------------------------
-- Job activity (audit-friendly timeline: status changes + major events)
-- ---------------------------------------------------------------------------

create table job_activity (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  kind text not null, -- 'created','note','status_change','photo','reading','part','quote','followup','completed'
  body text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index job_activity_job_idx on job_activity(job_id, created_at);

-- ---------------------------------------------------------------------------
-- Job photos / attachments
-- ---------------------------------------------------------------------------

create table job_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete set null,
  storage_path text not null,
  thumbnail_path text,
  file_type text,
  category photo_category not null default 'general_job_photo',
  caption text,
  captured_at timestamptz not null default now(),
  internal_only boolean not null default false,
  ai_extracted_text text,
  ai_extracted_data jsonb,
  ai_status ai_processing_status not null default 'not_processed',
  original_file_name text,
  created_at timestamptz not null default now()
);

create index job_attachments_job_idx on job_attachments(job_id);
create index job_attachments_equipment_idx on job_attachments(equipment_id);

-- ---------------------------------------------------------------------------
-- Parts
-- ---------------------------------------------------------------------------

create table parts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete set null,
  manufacturer text,
  part_number text,
  description text,
  quantity numeric not null default 1,
  unit_cost numeric,
  freight_cost numeric,
  sell_price numeric,
  vendor text,
  vendor_quote_ref text,
  status part_status not null default 'needed',
  ordered_at date,
  received_at date,
  installed_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index parts_job_idx on parts(job_id);
create index parts_number_trgm_idx on parts using gin (part_number gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------

create sequence quote_number_seq start 1000;

create table quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  quote_number text not null unique default ('Q-' || nextval('quote_number_seq')::text),
  status quote_status not null default 'draft',
  quote_date date not null default current_date,
  expiration_date date,
  title text,
  description text,
  internal_notes text,
  labor_hours numeric,
  labor_rate numeric,
  service_charge numeric,
  parts_subtotal numeric not null default 0,
  freight numeric not null default 0,
  tax numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  terms text,
  warranty_language text,
  approval_name text,
  approved_at timestamptz,
  signature_data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_job_idx on quotes(job_id);

create table quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  part_id uuid references parts(id) on delete set null,
  description text not null,
  is_optional_choice boolean not null default false,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  internal_unit_cost numeric,
  sort_order int not null default 0
);

create index quote_line_items_quote_idx on quote_line_items(quote_id);

-- ---------------------------------------------------------------------------
-- Vendor quotes / receipts / invoices
-- ---------------------------------------------------------------------------

create table vendor_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  vendor text,
  document_type vendor_doc_type not null default 'vendor_quote',
  attachment_id uuid references job_attachments(id) on delete set null,
  extracted_vendor_name text,
  extracted_quote_number text,
  extracted_date date,
  extracted_total numeric,
  raw_ocr_text text,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create index vendor_documents_job_idx on vendor_documents(job_id);

-- ---------------------------------------------------------------------------
-- Diagnostic readings
-- ---------------------------------------------------------------------------

create table diagnostic_readings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete set null,
  category reading_category not null default 'general',
  refrigerant text,
  suction_pressure numeric,
  liquid_pressure numeric,
  suction_saturation_temp numeric,
  liquid_saturation_temp numeric,
  suction_line_temp numeric,
  liquid_line_temp numeric,
  superheat numeric,
  subcooling numeric,
  indoor_dry_bulb numeric,
  outdoor_dry_bulb numeric,
  return_air_temp numeric,
  supply_air_temp numeric,
  voltage_readings jsonb,
  amp_readings jsonb,
  static_pressure numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index diagnostic_readings_job_idx on diagnostic_readings(job_id);
create index diagnostic_readings_equipment_idx on diagnostic_readings(equipment_id);

-- ---------------------------------------------------------------------------
-- Follow-up tasks
-- ---------------------------------------------------------------------------

create table follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  job_id uuid not null references jobs(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status followup_status not null default 'open',
  reason followup_reason not null default 'other',
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index follow_up_tasks_job_idx on follow_up_tasks(job_id);
create index follow_up_tasks_status_idx on follow_up_tasks(status, due_date);

-- ---------------------------------------------------------------------------
-- User settings (labor rate, trip charge, terms, custom lists)
-- ---------------------------------------------------------------------------

create table user_settings (
  owner_id uuid primary key references auth.users(id) default auth.uid(),
  default_labor_rate numeric,
  default_trip_charge numeric,
  default_markup_percent numeric,
  default_tax_rate numeric,
  quote_terms text,
  warranty_language text,
  custom_call_types text[],
  custom_equipment_types text[],
  custom_photo_categories text[],
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger customers_updated_at before update on customers for each row execute function set_updated_at();
create trigger sites_updated_at before update on sites for each row execute function set_updated_at();
create trigger equipment_updated_at before update on equipment for each row execute function set_updated_at();
create trigger jobs_updated_at before update on jobs for each row execute function set_updated_at();
create trigger parts_updated_at before update on parts for each row execute function set_updated_at();
create trigger quotes_updated_at before update on quotes for each row execute function set_updated_at();
create trigger follow_up_tasks_updated_at before update on follow_up_tasks for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: single owner today, but scoped by owner_id so the
-- policy shape survives a future org/team model (swap owner_id check for a
-- membership check without touching the tables).
-- ---------------------------------------------------------------------------

alter table customers enable row level security;
alter table sites enable row level security;
alter table equipment enable row level security;
alter table jobs enable row level security;
alter table job_activity enable row level security;
alter table job_attachments enable row level security;
alter table parts enable row level security;
alter table quotes enable row level security;
alter table quote_line_items enable row level security;
alter table vendor_documents enable row level security;
alter table diagnostic_readings enable row level security;
alter table follow_up_tasks enable row level security;
alter table user_settings enable row level security;

create policy owner_all on customers for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on sites for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on equipment for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on jobs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on job_activity for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on job_attachments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on parts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on quotes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on quote_line_items for all using (
  exists (select 1 from quotes q where q.id = quote_id and q.owner_id = auth.uid())
) with check (
  exists (select 1 from quotes q where q.id = quote_id and q.owner_id = auth.uid())
);
create policy owner_all on vendor_documents for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on diagnostic_readings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on follow_up_tasks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on user_settings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
