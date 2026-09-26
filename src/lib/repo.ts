import { db, newId, enqueueMutation } from './db';
import { runSync } from './sync';
import { getOwnerId } from '../auth/AuthContext';

// Generic local-first write helper: write to IndexedDB immediately (so the
// UI updates instantly and works offline), queue the change for Supabase,
// then kick a background sync attempt. Every screen's "save" goes through
// one of these instead of talking to Supabase directly.

type TableName =
  | 'customers' | 'sites' | 'systems' | 'components' | 'jobs' | 'job_activity' | 'job_attachments'
  | 'parts' | 'quotes' | 'quote_line_items' | 'vendor_documents'
  | 'diagnostic_readings' | 'follow_up_tasks' | 'user_settings';

export async function saveRecord<T extends Record<string, unknown>>(
  table: TableName,
  record: T,
): Promise<T> {
  const recordId = (record.id ?? record.owner_id) as string;
  await (db as any)[table].put(record);
  await enqueueMutation({ table, op: 'upsert', recordId, payload: record });
  void runSync(getOwnerId());
  return record;
}

export async function deleteRecord(table: TableName, id: string, opts?: { skipSync?: boolean }) {
  await (db as any)[table].delete(id);
  await enqueueMutation({ table, op: 'delete', recordId: id });
  if (!opts?.skipSync) void runSync(getOwnerId());
}

export function makeId() {
  return newId();
}

// Drops any not-yet-synced queued mutation for records that are about to
// be deleted out from under them locally — otherwise a still-pending photo
// upload or edit for a child row could keep retrying forever against a
// parent that no longer exists once the cascade's remote delete lands.
async function purgeQueuedMutations(table: TableName, ids: string[]) {
  if (!ids.length) return;
  const idSet = new Set(ids);
  const matches = await db.mutation_queue.where('table').equals(table).toArray();
  await Promise.all(
    matches.filter((m) => idSet.has(m.recordId) && m.id !== undefined).map((m) => db.mutation_queue.delete(m.id!)),
  );
}

// Deletes a job and everything under it. All of job_activity,
// job_attachments, parts, quotes (+ their line items), vendor_documents,
// diagnostic_readings, and follow_up_tasks reference jobs(id) with
// `on delete cascade` in Postgres, so once the job row itself is deleted
// remotely, the server cleans those up automatically. IndexedDB has no
// real foreign keys though, so the local copies are deleted directly here
// (no separate remote delete needed for them — only the job itself).
export async function deleteJobCascade(jobId: string, opts?: { skipSync?: boolean }) {
  const [activity, attachments, parts, quotes, vendorDocs, readings, followUps] = await Promise.all([
    db.job_activity.where('job_id').equals(jobId).toArray(),
    db.job_attachments.where('job_id').equals(jobId).toArray(),
    db.parts.where('job_id').equals(jobId).toArray(),
    db.quotes.where('job_id').equals(jobId).toArray(),
    db.vendor_documents.where('job_id').equals(jobId).toArray(),
    db.diagnostic_readings.where('job_id').equals(jobId).toArray(),
    db.follow_up_tasks.where('job_id').equals(jobId).toArray(),
  ]);
  const quoteIds = quotes.map((q) => q.id);
  const lineItems = quoteIds.length ? await db.quote_line_items.where('quote_id').anyOf(quoteIds).toArray() : [];

  await Promise.all([
    ...activity.map((r) => db.job_activity.delete(r.id)),
    ...attachments.map((r) => db.job_attachments.delete(r.id)),
    ...attachments.map((r) => db.pending_blobs.delete(r.id)),
    ...parts.map((r) => db.parts.delete(r.id)),
    ...lineItems.map((r) => db.quote_line_items.delete(r.id)),
    ...quotes.map((r) => db.quotes.delete(r.id)),
    ...vendorDocs.map((r) => db.vendor_documents.delete(r.id)),
    ...readings.map((r) => db.diagnostic_readings.delete(r.id)),
    ...followUps.map((r) => db.follow_up_tasks.delete(r.id)),
  ]);
  await Promise.all([
    purgeQueuedMutations('job_activity', activity.map((r) => r.id)),
    purgeQueuedMutations('job_attachments', attachments.map((r) => r.id)),
    purgeQueuedMutations('parts', parts.map((r) => r.id)),
    purgeQueuedMutations('quote_line_items', lineItems.map((r) => r.id)),
    purgeQueuedMutations('quotes', quotes.map((r) => r.id)),
    purgeQueuedMutations('vendor_documents', vendorDocs.map((r) => r.id)),
    purgeQueuedMutations('diagnostic_readings', readings.map((r) => r.id)),
    purgeQueuedMutations('follow_up_tasks', followUps.map((r) => r.id)),
  ]);

  await deleteRecord('jobs', jobId, opts);
}

// Deletes a customer and everything under it — every site, every piece of
// equipment at those sites, every call ever made for this customer, and
// everything attached to those calls. Jobs are deleted first (and enqueued
// for a real remote delete each) because Postgres's jobs.customer_id/
// site_id are `on delete restrict` — the customer delete would otherwise
// be rejected by the server while any job still references it. Sites and
// equipment aren't enqueued individually; they cascade automatically on
// the server once the customer row is deleted at the end, so they're only
// removed locally here (avoids 20-30 redundant delete calls for a big
// account).
export async function deleteCustomerCascade(customerId: string) {
  const jobs = await db.jobs.where('customer_id').equals(customerId).toArray();
  for (const job of jobs) {
    await deleteJobCascade(job.id, { skipSync: true });
  }

  const sites = await db.sites.where('customer_id').equals(customerId).toArray();
  for (const site of sites) {
    const systems = await db.systems.where('site_id').equals(site.id).toArray();
    const systemIds = systems.map((s) => s.id);
    const components = systemIds.length ? await db.components.where('system_id').anyOf(systemIds).toArray() : [];
    await Promise.all(components.map((c) => db.components.delete(c.id)));
    await purgeQueuedMutations('components', components.map((c) => c.id));
    await Promise.all(systems.map((s) => db.systems.delete(s.id)));
    await purgeQueuedMutations('systems', systemIds);
    await db.sites.delete(site.id);
  }
  await purgeQueuedMutations('sites', sites.map((s) => s.id));

  await deleteRecord('customers', customerId);
}

export async function logActivity(jobId: string, kind: string, body?: string, meta?: Record<string, unknown>) {
  const ownerId = getOwnerId();
  if (!ownerId) return;
  await saveRecord('job_activity', {
    id: makeId(),
    owner_id: ownerId,
    job_id: jobId,
    kind,
    body: body ?? null,
    meta: meta ?? null,
    created_at: new Date().toISOString(),
  });
}
