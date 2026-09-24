import { supabase, isSupabaseConfigured } from './supabase';
import { db } from './db';

// All the tables that follow the simple "row mirrors Supabase row 1:1"
// pattern. job_attachments is handled separately because creating one also
// means uploading a blob to Storage.
const SYNCED_TABLES = [
  'customers', 'sites', 'equipment', 'jobs', 'job_activity',
  'parts', 'quotes', 'quote_line_items', 'vendor_documents',
  'diagnostic_readings', 'follow_up_tasks', 'user_settings',
] as const;

let syncing = false;
let listeners: Array<() => void> = [];

export function onSyncStateChange(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}
function notify() { listeners.forEach((l) => l()); }

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

export async function pushQueue() {
  if (!isSupabaseConfigured || !isOnline()) return;
  const items = await db.mutation_queue.orderBy('createdAt').toArray();
  for (const item of items) {
    try {
      if (item.table === 'job_attachments') {
        await pushAttachment(item.recordId);
      } else if (item.op === 'delete') {
        await supabase.from(item.table).delete().eq('id', item.recordId);
      } else if (item.payload) {
        await supabase.from(item.table).upsert(item.payload);
      }
      if (item.id !== undefined) await db.mutation_queue.delete(item.id);
    } catch (err) {
      if (item.id !== undefined) {
        await db.mutation_queue.update(item.id, {
          attempts: item.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        });
      }
      // stop on first failure to preserve write order; retry next sync pass
      break;
    }
  }
  notify();
}

async function pushAttachment(attachmentId: string) {
  const record = await db.job_attachments.get(attachmentId);
  if (!record) return;
  const pending = await db.pending_blobs.get(attachmentId);

  if (pending) {
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) throw new Error('Not signed in');
    const path = `${ownerId}/${record.job_id}/${attachmentId}-${pending.fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from('job-attachments')
      .upload(path, pending.blob, { upsert: true, contentType: pending.blob.type });
    if (uploadErr) throw uploadErr;
    record.storage_path = path;
    await db.job_attachments.put(record);
  }

  const { error } = await supabase.from('job_attachments').upsert(record);
  if (error) throw error;
  if (pending) await db.pending_blobs.delete(attachmentId);
}

export async function pullAll(ownerId: string) {
  if (!isSupabaseConfigured || !isOnline()) return;
  for (const table of SYNCED_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('owner_id', ownerId);
    if (error || !data) continue;
    await (db as any)[table].bulkPut(data);
  }
  const { data: attachments } = await supabase.from('job_attachments').select('*').eq('owner_id', ownerId);
  if (attachments) await db.job_attachments.bulkPut(attachments);
  notify();
}

export async function runSync(ownerId: string | null) {
  if (syncing || !isOnline() || !isSupabaseConfigured) return;
  syncing = true;
  try {
    await pushQueue();
    if (ownerId) await pullAll(ownerId);
  } finally {
    syncing = false;
  }
}

export function startBackgroundSync(getOwnerId: () => string | null) {
  const trigger = () => void runSync(getOwnerId());
  window.addEventListener('online', trigger);
  const interval = setInterval(trigger, 30_000);
  trigger();
  return () => {
    window.removeEventListener('online', trigger);
    clearInterval(interval);
  };
}

export async function pendingMutationCount() {
  return db.mutation_queue.count();
}
