-- Rename customer_complaint -> reason_for_call (clearer for a tech filling
-- this out fast), and add a work order number per job (customer/property
-- manager PO or WO reference, e.g. what Dollar General issues per site).

alter table jobs rename column customer_complaint to reason_for_call;
alter table jobs add column work_order_number text;

drop index if exists jobs_search_idx;
create index jobs_search_idx on jobs using gin (
  (setweight(to_tsvector('simple', coalesce(job_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(work_order_number,'')), 'A') ||
   setweight(to_tsvector('simple', coalesce(reason_for_call,'')), 'B') ||
   setweight(to_tsvector('simple', coalesce(technician_notes,'')), 'C') ||
   setweight(to_tsvector('simple', coalesce(diagnosis,'')), 'C') ||
   setweight(to_tsvector('simple', coalesce(work_performed,'')), 'C'))
);

create index jobs_work_order_trgm_idx on jobs using gin (work_order_number extensions.gin_trgm_ops);
