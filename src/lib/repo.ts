import { db, newId, enqueueMutation } from './db';
import { runSync } from './sync';
import { getOwnerId } from '../auth/AuthContext';

// Generic local-first write helper: write to IndexedDB immediately (so the
// UI updates instantly and works offline), queue the change for Supabase,
// then kick a background sync attempt. Every screen's "save" goes through
// one of these instead of talking to Supabase directly.

type TableName =
  | 'customers' | 'sites' | 'equipment' | 'jobs' | 'job_activity' | 'job_attachments'
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

export async function deleteRecord(table: TableName, id: string) {
  await (db as any)[table].delete(id);
  await enqueueMutation({ table, op: 'delete', recordId: id });
  void runSync(getOwnerId());
}

export function makeId() {
  return newId();
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
