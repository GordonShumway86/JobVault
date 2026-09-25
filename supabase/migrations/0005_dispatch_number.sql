-- Add a dispatch/ticket number to jobs, separate from work_order_number
-- (now shown to the user as "PO #"). Dispatch tickets often carry both a
-- distinct PO# and a Dispatch# - captured separately so neither overwrites
-- the other.

alter table jobs add column dispatch_number text;

drop index if exists jobs_search_idx;
create index jobs_search_idx on jobs using gin (
  (setweight(to_tsvector('simple', coalesce(job_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(work_order_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(dispatch_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(reason_for_call,'')), 'B') ||
   setweight(to_tsvector('simple', coalesce(technician_notes,'')), 'C') ||
   setweight(to_tsvector('simple', coalesce(diagnosis,'')), 'C') ||
   setweight(to_tsvector('simple', coalesce(work_performed,'')), 'C'))
);
