import Dexie, { type Table } from 'dexie';
import type {
  Customer, Site, System, Component, Job, JobActivity, JobAttachment,
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

export interface FormDraft {
  id: string; // e.g. "customer:new" or "customer:<id>"
  data: Record<string, unknown>;
  updated_at: number;
}

class ServiceLogDB extends Dexie {
  customers!: Table<Customer, string>;
  sites!: Table<Site, string>;
  systems!: Table<System, string>;
  components!: Table<Component, string>;
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
  form_drafts!: Table<FormDraft, string>;

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
    // v2: per-field draft autosave, so an in-progress form (customer, site,
    // equipment, job) survives the app being backgrounded/switched away from
    // mid-entry — see formDraft.ts.
    this.version(2).stores({
      form_drafts: 'id, updated_at',
    });
    // v3: flat `equipment` -> hierarchical `systems` + `components` (see
    // supabase/migrations/0007_systems_components.sql for the server-side
    // half of this). Every existing local `equipment` row becomes a System
    // with zero components, using the same category/system_type mapping as
    // the SQL migration so a device that's been offline for a while (and
    // still has old cached `equipment` rows) converts the same way a fresh
    // pull from Supabase would.
    this.version(3).stores({
      systems: 'id, site_id, status, updated_at',
      components: 'id, system_id, updated_at',
      equipment: null,
      jobs: 'id, job_number, customer_id, site_id, system_id, status, created_at, updated_at',
      job_attachments: 'id, job_id, system_id, category, created_at',
      parts: 'id, job_id, system_id, status, updated_at',
      diagnostic_readings: 'id, job_id, system_id, created_at',
    }).upgrade(async (tx) => {
      const oldEquipment = await tx.table('equipment').toArray();
      if (oldEquipment.length) {
        await tx.table('systems').bulkAdd(oldEquipment.map(mapLegacyEquipmentToSystem));
      }
      for (const table of ['jobs', 'job_attachments', 'parts', 'diagnostic_readings']) {
        await tx.table(table).toCollection().modify((record: any) => {
          record.system_id = record.equipment_id ?? null;
          delete record.equipment_id;
        });
      }
    });
  }
}

const LEGACY_CATEGORY_TO_SYSTEM_CATEGORY: Record<string, string> = {
  split_system: 'split_system', heat_pump: 'split_system', furnace: 'split_system', air_handler: 'split_system',
  package_unit: 'packaged_unit', rtu: 'packaged_unit',
  walk_in_cooler: 'commercial_refrigeration', walk_in_freezer: 'commercial_refrigeration', reach_in: 'commercial_refrigeration',
  mini_split: 'ductless_vrf',
  boiler: 'hydronics_plant', water_heater: 'hydronics_plant', make_up_air_unit: 'hydronics_plant',
};

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  split_system: 'Split System', package_unit: 'Package Unit', rtu: 'RTU', heat_pump: 'Heat Pump',
  furnace: 'Furnace', air_handler: 'Air Handler', walk_in_cooler: 'Walk-In Cooler', walk_in_freezer: 'Walk-In Freezer',
  reach_in: 'Reach-In', ice_machine: 'Ice Machine', exhaust_fan: 'Exhaust Fan', make_up_air_unit: 'Make-Up Air Unit',
  mini_split: 'Mini-Split', boiler: 'Boiler', water_heater: 'Water Heater', other: 'Other',
};

// Mirrors the `case`/`coalesce` logic in supabase/migrations/0007_systems_
// components.sql exactly, so a local upgrade and a fresh server pull always
// produce the same System for the same old equipment row.
export function mapLegacyEquipmentToSystem(e: any) {
  const positionPrefix = e.unit_position === 'outdoor' ? 'Outdoor Unit — ' : e.unit_position === 'indoor' ? 'Indoor Unit — ' : '';
  const typeBase = (e.subtype && e.subtype.trim()) || LEGACY_CATEGORY_LABELS[e.category] || 'Other';
  return {
    id: e.id, owner_id: e.owner_id, site_id: e.site_id,
    category: LEGACY_CATEGORY_TO_SYSTEM_CATEGORY[e.category] ?? 'other',
    system_type: `${positionPrefix}${typeBase}`.trim(),
    configuration: null,
    nickname: e.nickname ?? null, location_at_site: e.location_at_site ?? null,
    installed_date: e.installed_date ?? null, system_notes: e.equipment_notes ?? null,
    status: e.status ?? 'active',
    legacy_manufacturer: e.manufacturer ?? null, legacy_model_number: e.model_number ?? null,
    legacy_serial_number: e.serial_number ?? null, legacy_refrigerant_type: e.refrigerant_type ?? null,
    legacy_voltage: e.voltage ?? null, legacy_phase: e.phase ?? null, legacy_mca: e.mca ?? null, legacy_mocp: e.mocp ?? null,
    created_at: e.created_at, updated_at: e.updated_at,
  };
}

export const db = new ServiceLogDB();

export function newId(): string {
  return crypto.randomUUID();
}

export async function enqueueMutation(m: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'>) {
  await db.mutation_queue.add({ ...m, createdAt: Date.now(), attempts: 0 });
}
