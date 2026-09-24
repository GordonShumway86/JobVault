-- Sample data for local development. Run after creating your first user
-- (via Supabase Studio > Authentication) and replace the UUID below with
-- that user's id (Authentication > Users > copy UID).
--
--   psql "$DATABASE_URL" -v owner='00000000-0000-0000-0000-000000000000' -f supabase/seed.sql

\set owner :owner

insert into user_settings (owner_id, default_labor_rate, default_trip_charge, default_markup_percent, default_tax_rate, quote_terms, warranty_language)
values (:'owner', 125, 89, 35, 7.25,
  'Quote valid for 30 days. 50% deposit required for jobs over $1500. Payment due upon completion.',
  '90-day labor warranty on all repairs. Manufacturer warranty applies to new parts where applicable.')
on conflict (owner_id) do nothing;

with c as (
  insert into customers (owner_id, name, customer_type, primary_contact_name, phone, email, billing_address)
  values (:'owner', 'Riverside Plaza LLC', 'property_management', 'Dana Whitfield', '555-201-4477', 'dana@riversideplaza.example', '400 Riverside Dr, Springfield, IL 62701')
  returning id
),
s as (
  insert into sites (owner_id, customer_id, name, address, city, state, zip, primary_contact_name, contact_phone, access_instructions)
  select :'owner', c.id, 'Riverside Plaza - Building A', '410 Riverside Dr', 'Springfield', 'IL', '62701', 'Maintenance Office', '555-201-4480', 'Roof access via stairwell C, key in lockbox 1234. Check in at front desk.'
  from c
  returning id
),
e as (
  insert into equipment (owner_id, site_id, category, nickname, location_at_site, manufacturer, model_number, serial_number, refrigerant_type, nominal_capacity, voltage, phase, installed_date, status)
  select :'owner', s.id, 'rtu', 'RTU-1', 'Roof, north side', 'Trane', 'YSC120F3RHA1000AA', 'X4F123456', 'R-410A', '10 ton', '460', '3', '2018-06-01', 'active'
  from s
  returning id
)
insert into jobs (owner_id, customer_id, site_id, equipment_id, call_type, status, priority, scheduled_at, reason_for_call)
select :'owner', c.id, s.id, e.id, 'service_diagnostic', 'new', 'normal', now() + interval '1 day', 'Tenants on 3rd floor reporting warm air from vents since yesterday.'
from c, s, e;
