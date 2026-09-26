// Mirrors supabase/migrations/0001_init.sql. Keep in sync by hand — Phase 1
// has no codegen pipeline yet.

export type CustomerType = 'residential' | 'commercial' | 'property_management' | 'contractor' | 'other';

export type SystemCategory =
  | 'commercial_refrigeration' | 'split_system' | 'packaged_unit' | 'ductless_vrf' | 'hydronics_plant' | 'other';

export type SystemStatus = 'active' | 'replaced' | 'removed' | 'inactive';

export type ComponentPosition = 'outdoor' | 'indoor';

export type CallType =
  | 'service_diagnostic' | 'preventive_maintenance' | 'repair' | 'quote_estimate'
  | 'installation' | 'warranty' | 'callback' | 'refrigeration' | 'other';

export type JobStatus =
  | 'new' | 'scheduled' | 'en_route' | 'on_site' | 'diagnosing'
  | 'waiting_on_customer_approval' | 'quote_sent' | 'quote_approved'
  | 'waiting_on_parts' | 'parts_ordered' | 'return_visit_needed'
  | 'work_complete' | 'invoice_ready' | 'closed' | 'warranty_callback' | 'cancelled';

export type JobPriority = 'low' | 'normal' | 'high' | 'emergency';

export type PhotoCategory =
  | 'equipment_nameplate' | 'before_repair' | 'after_repair' | 'failed_part'
  | 'meter_gauge_reading' | 'wiring_diagram' | 'vendor_quote' | 'parts_receipt'
  | 'invoice' | 'general_job_photo' | 'internal_only';

export type AiProcessingStatus = 'not_processed' | 'processing' | 'completed' | 'failed' | 'reviewed';

export type PartStatus =
  | 'needed' | 'priced' | 'quoted' | 'approved' | 'ordered' | 'backordered'
  | 'ready_for_pickup' | 'received' | 'installed' | 'returned' | 'cancelled';

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'expired' | 'superseded';

export type VendorDocType = 'vendor_quote' | 'receipt' | 'invoice' | 'packing_slip';

export type ReadingCategory = 'refrigerant' | 'electrical' | 'airflow' | 'temperature' | 'combustion' | 'general';

export type FollowupStatus = 'open' | 'done' | 'cancelled';

export type FollowupReason =
  | 'waiting_on_approval' | 'waiting_on_parts' | 'return_visit' | 'call_customer' | 'vendor_follow_up' | 'other';

export interface Customer {
  id: string;
  owner_id: string;
  name: string;
  customer_type: CustomerType;
  primary_contact_name: string | null;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  owner_id: string;
  customer_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  primary_contact_name: string | null;
  contact_phone: string | null;
  site_email: string | null;
  access_instructions: string | null;
  internal_notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// A System is the top-level unit at a site (e.g. "Walk-in Cooler," "Split
// System #4," "Packaged RTU #2"). It has no nameplate of its own — that
// detail lives on its Components (see below) — but keeps a handful of
// legacy nameplate-shaped columns purely so rows migrated from the old flat
// `equipment` table (supabase/migrations/0007_systems_components.sql) don't
// lose data: those columns are populated only for migrated rows and are
// never written to by the current System-creation UI.
export interface System {
  id: string;
  owner_id: string;
  site_id: string;
  category: SystemCategory;
  system_type: string;
  configuration: string | null; // split systems only: Single-stage/Multi-stage/Dual-Fuel/Twinned
  nickname: string | null;
  location_at_site: string | null;
  installed_date: string | null;
  system_notes: string | null;
  status: SystemStatus;
  // Legacy nameplate fields, populated only by the 0007 migration for rows
  // converted from the old `equipment` table (which had no components) —
  // left null for every System created going forward.
  legacy_manufacturer: string | null;
  legacy_model_number: string | null;
  legacy_serial_number: string | null;
  legacy_refrigerant_type: string | null;
  legacy_voltage: string | null;
  legacy_phase: string | null;
  legacy_mca: string | null;
  legacy_mocp: string | null;
  created_at: string;
  updated_at: string;
}

// A Component is a physical part of a System with its own nameplate (e.g.
// "Condensing Unit #1," "Evaporator Coil," "Furnace," "VAV Box #3"). A
// System can have any number of them, added one at a time via "Add Another
// Component" on the System form.
export interface Component {
  id: string;
  owner_id: string;
  system_id: string;
  position: ComponentPosition | null; // split systems / ductless-VRF only
  component_type: string;
  name: string | null;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  refrigerant_type: string | null;
  voltage: string | null;
  phase: string | null;
  mca: string | null;
  mocp: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  owner_id: string;
  job_number: string;
  work_order_number: string | null;
  dispatch_number: string | null;
  customer_id: string;
  site_id: string;
  system_id: string | null;
  call_type: CallType;
  status: JobStatus;
  priority: JobPriority;
  scheduled_at: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  reason_for_call: string | null;
  technician_notes: string | null;
  diagnosis: string | null;
  work_performed: string | null;
  recommendations: string | null;
  follow_up_instructions: string | null;
  internal_notes: string | null;
  customer_visible_notes: string | null;
  next_follow_up_date: string | null;
  return_visit_required: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobActivity {
  id: string;
  owner_id: string;
  job_id: string;
  kind: string;
  body: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface JobAttachment {
  id: string;
  owner_id: string;
  job_id: string;
  system_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  file_type: string | null;
  category: PhotoCategory;
  caption: string | null;
  captured_at: string;
  internal_only: boolean;
  ai_extracted_text: string | null;
  ai_extracted_data: Record<string, unknown> | null;
  ai_status: AiProcessingStatus;
  original_file_name: string | null;
  created_at: string;
}

export interface Part {
  id: string;
  owner_id: string;
  job_id: string;
  system_id: string | null;
  manufacturer: string | null;
  part_number: string | null;
  description: string | null;
  quantity: number;
  unit_cost: number | null;
  freight_cost: number | null;
  sell_price: number | null;
  vendor: string | null;
  vendor_quote_ref: string | null;
  status: PartStatus;
  ordered_at: string | null;
  received_at: string | null;
  installed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  owner_id: string;
  job_id: string;
  quote_number: string;
  status: QuoteStatus;
  quote_date: string;
  expiration_date: string | null;
  title: string | null;
  description: string | null;
  internal_notes: string | null;
  labor_hours: number | null;
  labor_rate: number | null;
  service_charge: number | null;
  parts_subtotal: number;
  freight: number;
  tax: number;
  discount: number;
  total: number;
  terms: string | null;
  warranty_language: string | null;
  approval_name: string | null;
  approved_at: string | null;
  signature_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  part_id: string | null;
  description: string;
  is_optional_choice: boolean;
  quantity: number;
  unit_price: number;
  internal_unit_cost: number | null;
  sort_order: number;
}

export interface VendorDocument {
  id: string;
  owner_id: string;
  job_id: string;
  vendor: string | null;
  document_type: VendorDocType;
  attachment_id: string | null;
  extracted_vendor_name: string | null;
  extracted_quote_number: string | null;
  extracted_date: string | null;
  extracted_total: number | null;
  raw_ocr_text: string | null;
  reviewed: boolean;
  created_at: string;
}

export interface DiagnosticReading {
  id: string;
  owner_id: string;
  job_id: string;
  system_id: string | null;
  category: ReadingCategory;
  refrigerant: string | null;
  suction_pressure: number | null;
  liquid_pressure: number | null;
  suction_saturation_temp: number | null;
  liquid_saturation_temp: number | null;
  suction_line_temp: number | null;
  liquid_line_temp: number | null;
  superheat: number | null;
  subcooling: number | null;
  indoor_dry_bulb: number | null;
  outdoor_dry_bulb: number | null;
  return_air_temp: number | null;
  supply_air_temp: number | null;
  voltage_readings: Record<string, number> | null;
  amp_readings: Record<string, number> | null;
  static_pressure: number | null;
  notes: string | null;
  created_at: string;
}

export interface FollowUpTask {
  id: string;
  owner_id: string;
  job_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: FollowupStatus;
  reason: FollowupReason;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  owner_id: string;
  default_labor_rate: number | null;
  default_trip_charge: number | null;
  default_markup_percent: number | null;
  default_tax_rate: number | null;
  quote_terms: string | null;
  warranty_language: string | null;
  custom_call_types: string[] | null;
  custom_equipment_types: string[] | null;
  custom_photo_categories: string[] | null;
  updated_at: string;
}

// -- Display labels ----------------------------------------------------------

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  new: 'New',
  scheduled: 'Scheduled',
  en_route: 'En Route',
  on_site: 'On Site',
  diagnosing: 'Diagnosing',
  waiting_on_customer_approval: 'Waiting on Approval',
  quote_sent: 'Quote Sent',
  quote_approved: 'Quote Approved',
  waiting_on_parts: 'Waiting on Parts',
  parts_ordered: 'Parts Ordered',
  return_visit_needed: 'Return Visit Needed',
  work_complete: 'Work Complete',
  invoice_ready: 'Invoice Ready',
  closed: 'Closed',
  warranty_callback: 'Warranty/Callback',
  cancelled: 'Cancelled',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  new: 'slate',
  scheduled: 'blue',
  en_route: 'blue',
  on_site: 'blue',
  diagnosing: 'amber',
  waiting_on_customer_approval: 'amber',
  quote_sent: 'amber',
  quote_approved: 'emerald',
  waiting_on_parts: 'orange',
  parts_ordered: 'orange',
  return_visit_needed: 'orange',
  work_complete: 'emerald',
  invoice_ready: 'emerald',
  closed: 'zinc',
  warranty_callback: 'red',
  cancelled: 'zinc',
};

export const CALL_TYPE_LABELS: Record<CallType, string> = {
  service_diagnostic: 'Service / Diagnostic',
  preventive_maintenance: 'Preventive Maintenance',
  repair: 'Repair',
  quote_estimate: 'Quote / Estimate',
  installation: 'Installation',
  warranty: 'Warranty',
  callback: 'Callback',
  refrigeration: 'Refrigeration',
  other: 'Other',
};

export const SYSTEM_CATEGORY_LABELS: Record<SystemCategory, string> = {
  commercial_refrigeration: 'Commercial Refrigeration',
  split_system: 'Split System',
  packaged_unit: 'Packaged Unit / RTU',
  ductless_vrf: 'Ductless / VRF',
  hydronics_plant: 'Hydronics / Plant',
  other: 'Other',
};

// The System Type dropdown's preset options per category — "Other (type
// below)" is always appended in the UI on top of these, so nothing Ed runs
// into in the field is ever a dead end. `other` has no preset list.
export const SYSTEM_TYPE_OPTIONS: Record<SystemCategory, string[]> = {
  commercial_refrigeration: [
    'Walk-in Cooler',
    'Walk-in Freezer',
    'Reach-in Cooler',
    'Reach-in Freezer',
  ],
  split_system: ['Split System'],
  packaged_unit: [
    'Packaged RTU',
    'Packaged Gas/Electric',
    'Packaged Heat Pump',
    'Packaged Dual-Fuel',
  ],
  ductless_vrf: ['Mini-Split', 'VRF/VRV System'],
  hydronics_plant: [
    'Chiller (Air-Cooled)',
    'Chiller (Water-Cooled)',
    'Boiler (Gas)',
    'Boiler (Electric)',
    'Boiler (Oil)',
    'Air Handler (AHU)',
    'Makeup Air Unit (MAU)',
  ],
  other: [],
};

// Split systems only — a second classification alongside System Type,
// describing how the indoor/outdoor units are staged/paired.
export const SPLIT_SYSTEM_CONFIGURATIONS = ['Single-stage', 'Multi-stage', 'Dual-Fuel', 'Twinned'];

// The Component Type choices a System's category allows, grouped by
// position for the categories where indoor/outdoor units have genuinely
// different component types (each with its own nameplate). A category not
// listed here (or listed with `positioned: false`) doesn't ask for a
// position at all — the Component Type list applies regardless of where the
// part physically sits. `other` has no preset list. As with System Type,
// "Other (type below)" is always appended in the UI.
export interface ComponentTypeConfig {
  positioned: boolean;
  types: string[]; // used when !positioned
  outdoorTypes: string[]; // used when positioned
  indoorTypes: string[]; // used when positioned
}

export const COMPONENT_TYPE_OPTIONS: Record<SystemCategory, ComponentTypeConfig> = {
  commercial_refrigeration: {
    positioned: false,
    types: ['Condensing Unit', 'Evaporator/Unit Cooler', 'Self-Contained Package'],
    outdoorTypes: [], indoorTypes: [],
  },
  split_system: {
    positioned: true,
    types: [],
    outdoorTypes: ['Air Conditioner Condenser', 'Heat Pump Condenser'],
    indoorTypes: ['Gas Furnace', 'Electric Air Handler', 'Hydronic Air Handler', 'Water-Source Heat Pump', 'Evaporator Coil'],
  },
  packaged_unit: {
    positioned: false,
    types: ['VAV Box', 'CAV Box', 'Bypass Damper'],
    outdoorTypes: [], indoorTypes: [],
  },
  ductless_vrf: {
    positioned: true,
    types: [],
    outdoorTypes: ['VRF Heat Recovery Condenser', 'Heat Pump Condenser'],
    indoorTypes: ['Wall Mount', 'Ceiling Cassette', 'Ducted Concealed', 'Floor Mount', 'BC Controller/Branch Selector'],
  },
  hydronics_plant: {
    positioned: false,
    types: ['Circulator Pump', 'Expansion Tank', 'Fluid Cooler', 'Cooling Tower'],
    outdoorTypes: [], indoorTypes: [],
  },
  other: { positioned: false, types: [], outdoorTypes: [], indoorTypes: [] },
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  property_management: 'Property Management',
  contractor: 'Contractor',
  other: 'Other',
};

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  equipment_nameplate: 'Equipment / Nameplate',
  before_repair: 'Before Repair',
  after_repair: 'After Repair',
  failed_part: 'Failed Part',
  meter_gauge_reading: 'Meter / Gauge Reading',
  wiring_diagram: 'Wiring Diagram',
  vendor_quote: 'Vendor Quote',
  parts_receipt: 'Parts Receipt',
  invoice: 'Invoice',
  general_job_photo: 'General Job Photo',
  internal_only: 'Internal Only',
};

export const PART_STATUS_LABELS: Record<PartStatus, string> = {
  needed: 'Needed',
  priced: 'Priced',
  quoted: 'Quoted',
  approved: 'Approved',
  ordered: 'Ordered',
  backordered: 'Backordered',
  ready_for_pickup: 'Ready for Pickup',
  received: 'Received',
  installed: 'Installed',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

export const FOLLOWUP_REASON_LABELS: Record<FollowupReason, string> = {
  waiting_on_approval: 'Waiting on Approval',
  waiting_on_parts: 'Waiting on Parts',
  return_visit: 'Return Visit',
  call_customer: 'Call Customer',
  vendor_follow_up: 'Vendor Follow-Up',
  other: 'Other',
};
