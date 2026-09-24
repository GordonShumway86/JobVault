import Dexie, { type Table } from 'dexie';
import type {
  Customer, Site, Equipment, Job, JobActivity, JobAttachment,
  Part, Quote, QuoteLineItem, VendorDocument, DiagnosticReading, FollowUpTask, UserSettings,
} from '../types';

// Local-first cache + outbox. Every screen reads from here (via
// dexie-react-hooks) so the app works fully offline; a background sync loop
// (see sync.ts) pushes queued writes to Supabase and pulls fresh rows down
// whenever the device has a connection.

export interface QueuedMutation {
  id?: number;
  table: string;
  op: 'upsert' | 'delete';
  recordId: string;
  payload?: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface PendingBlob {
  id: string; // matches job_attachments.id
  blob: Blob;
  fileName: string;
}

class ServiceLogDB extends Dexie {
  customers!: Table<Customer, string>;
  sites!: Table<Site, string>;
  equipment!: Table<Equipment, string>;
  jobs!: Table<Job, string>;
  job_activity!: Table<JobActivity, string>;
  job_attachments!: Table<JobAttachment, string>;
  parts!: Table<Part, string>;
  quotes!: Table<Quote, string>;
  quote_line_items!: Table<QuoteLineItem, string>;
  vendor_documents!: Table<VendorDocument, string>;
  diagnostic_readings!: Table<DiagnosticReading, string>;
  follow_up_tasks!: Table<FollowUpTask, string>;
  user_settings!: Table<UserSettings, string>;
  mutation_queue!: Table<QueuedMutation, number>;
  pending_blobs!: Table<PendingBlob, string>;

  constructor() {
    super('service-log');
    this.version(1).stores({
      customers: 'id, name, archived, updated_at',
      sites: 'id, customer_id, archived, updated_at',
      equipment: 'id, site_id, status, updated_at',
      jobs: 'id, job_number, customer_id, site_id, equipment_id, status, created_at, updated_at',
      job_activity: 'id, job_id, created_at',
      job_attachments: 'id, job_id, equipment_id, category, created_at',
      parts: 'id, job_id, equipment_id, status, updated_at',
      quotes: 'id, job_id, status, updated_at',
      quote_line_items: 'id, quote_id, sort_order',
      vendor_documents: 'id, job_id, created_at',
      diagnostic_readings: 'id, job_id, equipment_id, created_at',
      follow_up_tasks: 'id, job_id, status, due_date',
      user_settings: 'owner_id',
      mutation_queue: '++id, table, recordId, createdAt',
      pending_blobs: 'id',
    });
  }
}

export const db = new ServiceLogDB();

export function newId(): string {
  return crypto.randomUUID();
}

export async function enqueueMutation(m: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'>) {
  await db.mutation_queue.add({ ...m, createdAt: Date.now(), attempts: 0 });
}
