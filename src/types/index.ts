// Mirrors supabase/migrations/0001_init.sql. Keep in sync by hand — Phase 1
// has no codegen pipeline yet.

export type CustomerType = 'residential' | 'commercial' | 'property_management' | 'contractor' | 'other';

export type EquipmentCategory =
  | 'split_system' | 'package_unit' | 'rtu' | 'heat_pump' | 'furnace' | 'air_handler'
  | 'walk_in_cooler' | 'walk_in_freezer' | 'reach_in' | 'ice_machine' | 'exhaust_fan'
  | 'make_up_air_unit' | 'mini_split' | 'boiler' | 'water_heater' | 'other';

export type EquipmentStatus = 'active' | 'replaced' | 'removed' | 'inactive';

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

export type UnitPosition = 'outdoor' | 'indoor';

export interface Equipment {
  id: string;
  owner_id: string;
  site_id: string;
  category: EquipmentCategory;
  unit_position: UnitPosition | null;
  subtype: string | null;
  nickname: string | null;
  location_at_site: string | null;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  manufacture_date: string | null;
  refrigerant_type: string | null;
  nominal_capacity: string | null;
  voltage: string | null;
  phase: string | null;
  mca: string | null;
  mocp: string | null;
  compressor_model: string | null;
  filter_sizes: string | null;
  belt_sizes: string | null;
  warranty_notes: string | null;
  installed_date: string | null;
  equipment_notes: string | null;
  status: EquipmentStatus;
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
  equipment_id: string | null;
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
  equipment_id: string | null;
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
  equipment_id: string | null;
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
  equipment_id: string | null;
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

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  split_system: 'Split System',
  package_unit: 'Package Unit',
  rtu: 'RTU',
  heat_pump: 'Heat Pump',
  furnace: 'Furnace',
  air_handler: 'Air Handler',
  walk_in_cooler: 'Walk-In Cooler',
  walk_in_freezer: 'Walk-In Freezer',
  reach_in: 'Reach-In',
  ice_machine: 'Ice Machine',
  exhaust_fan: 'Exhaust Fan',
  make_up_air_unit: 'Make-Up Air Unit',
  mini_split: 'Mini-Split',
  boiler: 'Boiler',
  water_heater: 'Water Heater',
  other: 'Other',
};

// Split systems have two physical units, each with its own nameplate — the
// subtype choices genuinely differ depending on which one this record is.
export const SPLIT_SYSTEM_SUBTYPES: Record<UnitPosition, string[]> = {
  outdoor: [
    'Air Conditioner Condenser',
    'Heat Pump Condenser',
    'Dual Fuel Condenser (paired with gas furnace)',
    'Refrigeration Condensing Unit',
  ],
  indoor: [
    'Gas Furnace',
    'Electric Furnace',
    'Oil Furnace',
    'Air Handler (Electric Heat Strip)',
    'Air Handler (Cooling Only, No Heat)',
    'Air Handler (Hydronic Coil)',
    'Evaporator Coil',
  ],
};

// A more specific type within a category — e.g. "Package Unit" alone
// doesn't say gas/electric vs. heat pump vs. straight cool. `split_system`
// isn't here since it's handled separately (see SPLIT_SYSTEM_SUBTYPES);
// `other` has no preset list. Free text (an "Other" option in the UI) is
// always available for anything not listed here.
export const EQUIPMENT_SUBTYPE_OPTIONS: Partial<Record<EquipmentCategory, string[]>> = {
  package_unit: [
    'Gas/Electric (Gas Heat, Electric Cool)',
    'Heat Pump (Electric Heat & Cool)',
    'Straight Cool (No Heat)',
    'All Electric (Electric Heat Strip)',
    'Dual Fuel (Gas Heat + Heat Pump)',
  ],
  rtu: [
    'Gas/Electric (Gas Heat, Electric Cool)',
    'Heat Pump (Electric Heat & Cool)',
    'Straight Cool (No Heat)',
    'All Electric (Electric Heat Strip)',
    'Dual Fuel (Gas Heat + Heat Pump)',
  ],
  heat_pump: [
    'Air-Source Split System',
    'Air-Source Package Unit',
    'Ductless Mini-Split',
    'Geothermal / Water-Source',
  ],
  furnace: [
    'Gas (Natural Gas)',
    'Gas (Propane/LP)',
    'Electric',
    'Oil',
  ],
  air_handler: [
    'Electric Heat Strip',
    'Cooling Only (No Heat)',
    'Hydronic Coil (Hot Water Heat)',
  ],
  walk_in_cooler: [
    'Self-Contained',
    'Remote Condensing Unit',
    'Multiplex / Rack System',
  ],
  walk_in_freezer: [
    'Self-Contained',
    'Remote Condensing Unit',
    'Multiplex / Rack System',
  ],
  reach_in: [
    'Reach-In Cooler',
    'Reach-In Freezer',
    'Dual-Temp (Cooler/Freezer)',
    'Prep Table / Sandwich Unit',
    'Glass Door Merchandiser',
  ],
  ice_machine: [
    'Modular Ice Head (Remote Bin)',
    'Self-Contained Undercounter',
    'Ice/Water Dispenser',
    'Flake Ice Machine',
    'Cube Ice Machine',
  ],
  exhaust_fan: [
    'Roof Exhaust Fan — Belt-Drive (Upblast)',
    'Roof Exhaust Fan — Direct-Drive (Upblast)',
    'Downblast Exhaust Fan',
    'Inline Duct Fan',
    'Wall-Mounted Exhaust Fan',
  ],
  make_up_air_unit: [
    'Heated — Gas-Fired Direct',
    'Heated — Gas-Fired Indirect',
    'Heated — Electric',
    'Unheated / Ventilation Only',
    'Heated & Cooled (Conditioned)',
  ],
  mini_split: [
    'Single-Zone',
    'Multi-Zone',
    'Wall-Mounted Head',
    'Ceiling Cassette',
    'Ducted Concealed Unit',
  ],
  boiler: [
    'Gas-Fired (Standard/Atmospheric)',
    'Gas-Fired (High-Efficiency Condensing)',
    'Electric',
    'Combi (Heat + Domestic Hot Water)',
  ],
  water_heater: [
    'Gas (Tank)',
    'Electric (Tank)',
    'Tankless — Gas',
    'Tankless — Electric',
    'Hybrid Heat Pump',
  ],
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
