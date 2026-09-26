-- Equipment classification detail: a "category" alone (e.g. "Split System")
-- doesn't say enough to look up parts/specs correctly. Adds:
-- - unit_position: for split systems only, which physical unit this record
--   is (they have separate nameplates/model/serial for outdoor vs indoor).
-- - subtype: a more specific type within the category (e.g. "Heat Pump
--   Condenser" for an outdoor split-system unit, "Gas/Electric" for a
--   package unit) — free text, not an enum, so "Other" can hold anything
--   not in the app's preset list without a migration every time.

alter table equipment add column unit_position text check (unit_position in ('outdoor', 'indoor'));
alter table equipment add column subtype text;

drop index if exists equipment_search_idx;
create index equipment_search_idx on equipment using gin (
  (setweight(to_tsvector('simple', coalesce(manufacturer,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(model_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(serial_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(nickname,'')), 'B') ||
   setweight(to_tsvector('simple', coalesce(subtype,'')), 'B'))
);
