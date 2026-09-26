-- Replaces the flat `equipment` table with a hierarchical Parent System ->
-- Component(s) model. A System is the top-level unit at a site ("Walk-in
-- Cooler," "Split System #4," "Packaged RTU #2"); a Component is a physical
-- part of a System with its own nameplate ("Condensing Unit #1,"
-- "Evaporator Coil," "VAV Box #3"). One System has many Components.
--
-- Migration decisions, spelled out since this touches data that must not be
-- lost or orphaned:
--
-- 1. Every existing `equipment` row becomes a System with zero components
--    (Ed's explicit instruction — no component is auto-created for it).
--    ALL of its old data fields (manufacturer/model/serial/manufacture_date/
--    refrigerant_type/nominal_capacity/voltage/phase/mca/mocp/
--    compressor_model/filter_sizes/belt_sizes/warranty_notes) have nowhere
--    else to go once the row has no component, so every one of them is
--    preserved as its own `legacy_*` column on `systems`, populated only by
--    this migration and never written to by the app's current
--    System-creation UI. None of the 14 old data columns are dropped
--    without a legacy_* home — verified against the full column list in
--    0001_init.sql's `create table equipment`.
-- 2. `equipment.category` (16 old values: split_system, package_unit, rtu,
--    heat_pump, furnace, air_handler, walk_in_cooler, walk_in_freezer,
--    reach_in, ice_machine, exhaust_fan, make_up_air_unit, mini_split,
--    boiler, water_heater, other) doesn't map one-to-one onto the new
--    5-category + "other" taxonomy (commercial_refrigeration, split_system,
--    packaged_unit, ductless_vrf, hydronics_plant, other). Rather than lose
--    the original distinction, every migrated row's `system_type` is set to
--    its old subtype (if it had one) or its old category's label, so the
--    real detail survives as free text even where the bucket it lands in
--    (`category`) is only an approximate best fit. See the `case` below for
--    the exact mapping.
-- 3. `equipment.unit_position` (outdoor/indoor) meant something different
--    under the old model — one "equipment" row WAS one physical unit, not a
--    whole system. That's folded into the migrated row's `system_type` as a
--    prefix ("Outdoor Unit — ...") rather than dropped, so the information
--    isn't silently lost even though the new System/Component split means
--    it's no longer structurally represented the same way.
-- 4. `jobs.equipment_id`, `job_attachments.equipment_id`, `parts.equipment_id`,
--    and `diagnostic_readings.equipment_id` are renamed to `system_id` and
--    repointed at `systems(id)`. IDs are preserved across the equipment ->
--    systems copy (`insert ... select id, ...`), so every existing
--    reference keeps resolving to the same row under its new name — no
--    reference is orphaned.
-- 5. The old `equipment` table (and its now-unused `equipment_category`
--    enum) are dropped at the end of this same migration, once the copy and
--    the FK repoints above are done — confirmed via a full codebase search
--    that nothing else queries `equipment` directly before writing this.

-- ---------------------------------------------------------------------------
-- systems
-- ---------------------------------------------------------------------------

create table systems (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  site_id uuid not null references sites(id) on delete cascade,
  category text not null default 'other'
    check (category in ('commercial_refrigeration','split_system','packaged_unit','ductless_vrf','hydronics_plant','other')),
  system_type text not null default '',
  configuration text,
  nickname text,
  location_at_site text,
  installed_date date,
  system_notes text,
  status equipment_status not null default 'active',
  -- Legacy nameplate fields — see decision #1 above. Null for every System
  -- created by the current app; populated only for rows migrated below.
  legacy_manufacturer text,
  legacy_model_number text,
  legacy_serial_number text,
  legacy_manufacture_date date,
  legacy_refrigerant_type text,
  legacy_nominal_capacity text,
  legacy_voltage text,
  legacy_phase text,
  legacy_mca text,
  legacy_mocp text,
  legacy_compressor_model text,
  legacy_filter_sizes text,
  legacy_belt_sizes text,
  legacy_warranty_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index systems_owner_idx on systems(owner_id);
create index systems_site_idx on systems(site_id);
create index systems_search_idx on systems using gin (
  (setweight(to_tsvector('simple', coalesce(nickname,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(system_type,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(legacy_manufacturer,'')), 'B') ||
   setweight(to_tsvector('simple', coalesce(legacy_model_number,'')), 'B') ||
   setweight(to_tsvector('simple', coalesce(legacy_serial_number,'')), 'B'))
);

insert into systems (
  id, owner_id, site_id, category, system_type, configuration, nickname, location_at_site,
  installed_date, system_notes, status,
  legacy_manufacturer, legacy_model_number, legacy_serial_number, legacy_manufacture_date,
  legacy_refrigerant_type, legacy_nominal_capacity, legacy_voltage, legacy_phase, legacy_mca, legacy_mocp,
  legacy_compressor_model, legacy_filter_sizes, legacy_belt_sizes, legacy_warranty_notes,
  created_at, updated_at
)
select
  e.id, e.owner_id, e.site_id,
  case e.category
    when 'split_system' then 'split_system'
    when 'heat_pump' then 'split_system'
    when 'furnace' then 'split_system'
    when 'air_handler' then 'split_system'
    when 'package_unit' then 'packaged_unit'
    when 'rtu' then 'packaged_unit'
    when 'walk_in_cooler' then 'commercial_refrigeration'
    when 'walk_in_freezer' then 'commercial_refrigeration'
    when 'reach_in' then 'commercial_refrigeration'
    when 'mini_split' then 'ductless_vrf'
    when 'boiler' then 'hydronics_plant'
    when 'water_heater' then 'hydronics_plant'
    when 'make_up_air_unit' then 'hydronics_plant'
    else 'other'
  end,
  trim(
    (case when e.unit_position = 'outdoor' then 'Outdoor Unit — ' when e.unit_position = 'indoor' then 'Indoor Unit — ' else '' end)
    || coalesce(nullif(e.subtype, ''), (case e.category
      when 'split_system' then 'Split System'
      when 'package_unit' then 'Package Unit'
      when 'rtu' then 'RTU'
      when 'heat_pump' then 'Heat Pump'
      when 'furnace' then 'Furnace'
      when 'air_handler' then 'Air Handler'
      when 'walk_in_cooler' then 'Walk-In Cooler'
      when 'walk_in_freezer' then 'Walk-In Freezer'
      when 'reach_in' then 'Reach-In'
      when 'ice_machine' then 'Ice Machine'
      when 'exhaust_fan' then 'Exhaust Fan'
      when 'make_up_air_unit' then 'Make-Up Air Unit'
      when 'mini_split' then 'Mini-Split'
      when 'boiler' then 'Boiler'
      when 'water_heater' then 'Water Heater'
      else 'Other'
    end))
  ),
  null, e.nickname, e.location_at_site, e.installed_date, e.equipment_notes, e.status,
  e.manufacturer, e.model_number, e.serial_number, e.manufacture_date,
  e.refrigerant_type, e.nominal_capacity, e.voltage, e.phase, e.mca, e.mocp,
  e.compressor_model, e.filter_sizes, e.belt_sizes, e.warranty_notes,
  e.created_at, e.updated_at
from equipment e;

-- ---------------------------------------------------------------------------
-- components
-- ---------------------------------------------------------------------------

create table components (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  system_id uuid not null references systems(id) on delete cascade,
  position text check (position in ('outdoor','indoor')),
  component_type text not null default '',
  name text,
  manufacturer text,
  model_number text,
  serial_number text,
  refrigerant_type text,
  voltage text,
  phase text,
  mca text,
  mocp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index components_owner_idx on components(owner_id);
create index components_system_idx on components(system_id);
create index components_search_idx on components using gin (
  (setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(manufacturer,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(model_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(serial_number,'')), 'A'))
);
create index components_model_trgm_idx on components using gin (model_number gin_trgm_ops);
create index components_serial_trgm_idx on components using gin (serial_number gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Repoint jobs / job_attachments / parts / diagnostic_readings at systems
-- ---------------------------------------------------------------------------

alter table jobs add column system_id uuid references systems(id) on delete set null;
update jobs set system_id = equipment_id where equipment_id is not null;
alter table jobs drop column equipment_id;
create index jobs_system_idx on jobs(system_id);

alter table job_attachments add column system_id uuid references systems(id) on delete set null;
update job_attachments set system_id = equipment_id where equipment_id is not null;
alter table job_attachments drop column equipment_id;
create index job_attachments_system_idx on job_attachments(system_id);

alter table parts add column system_id uuid references systems(id) on delete set null;
update parts set system_id = equipment_id where equipment_id is not null;
alter table parts drop column equipment_id;

alter table diagnostic_readings add column system_id uuid references systems(id) on delete set null;
update diagnostic_readings set system_id = equipment_id where equipment_id is not null;
alter table diagnostic_readings drop column equipment_id;
create index diagnostic_readings_system_idx on diagnostic_readings(system_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger systems_updated_at before update on systems for each row execute function set_updated_at();
create trigger components_updated_at before update on components for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — same owner-scoped pattern as every other table
-- ---------------------------------------------------------------------------

alter table systems enable row level security;
alter table components enable row level security;

create policy owner_all on systems for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy owner_all on components for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Drop the old equipment table — confirmed nothing else in the codebase
-- queries it directly as of this migration.
-- ---------------------------------------------------------------------------

drop table equipment;
drop type if exists equipment_category;
