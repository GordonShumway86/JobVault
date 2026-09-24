import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, makeId, logActivity } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { generateJobNumber } from '../lib/jobNumber';
import TopBar from '../components/TopBar';
import SectionCard from '../components/SectionCard';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import {
  CALL_TYPE_LABELS, CUSTOMER_TYPE_LABELS, EQUIPMENT_CATEGORY_LABELS,
  type CallType, type CustomerType, type EquipmentCategory, type JobPriority,
} from '../types';

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = useLiveQuery(() => (id ? db.jobs.get(id) : undefined), [id]);

  const allCustomers = useLiveQuery(() => db.customers.toArray(), []) ?? [];
  const customers = useMemo(() => allCustomers.filter((c) => !c.archived), [allCustomers]);
  const allSites = useLiveQuery(() => db.sites.toArray(), []) ?? [];
  const allEquipment = useLiveQuery(() => db.equipment.toArray(), []) ?? [];

  const [customerId, setCustomerId] = useState(editing?.customer_id ?? '');
  const [siteId, setSiteId] = useState(editing?.site_id ?? '');
  const [equipmentId, setEquipmentId] = useState(editing?.equipment_id ?? '');
  const [callType, setCallType] = useState<CallType>(editing?.call_type ?? 'service_diagnostic');
  const [priority, setPriority] = useState<JobPriority>(editing?.priority ?? 'normal');
  const [scheduledAt, setScheduledAt] = useState(editing?.scheduled_at?.slice(0, 16) ?? '');
  const [workOrderNumber, setWorkOrderNumber] = useState(editing?.work_order_number ?? '');
  const [reasonForCall, setReasonForCall] = useState(editing?.reason_for_call ?? '');

  // Inline "create new" mini-forms
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerType, setNewCustomerType] = useState<CustomerType>('residential');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');

  const [showNewEquipment, setShowNewEquipment] = useState(false);
  const [newEqCategory, setNewEqCategory] = useState<EquipmentCategory>('split_system');
  const [newEqManufacturer, setNewEqManufacturer] = useState('');
  const [newEqModel, setNewEqModel] = useState('');
  const [newEqSerial, setNewEqSerial] = useState('');

  const [saving, setSaving] = useState(false);

  const sitesForCustomer = useMemo(() => allSites.filter((s) => s.customer_id === customerId), [allSites, customerId]);
  const equipmentForSite = useMemo(() => allEquipment.filter((e) => e.site_id === siteId), [allEquipment, siteId]);

  async function ensureCustomer(): Promise<string> {
    if (customerId) return customerId;
    const ownerId = getOwnerId()!;
    const rec = {
      id: makeId(), owner_id: ownerId, name: newCustomerName.trim(), customer_type: newCustomerType,
      primary_contact_name: null, phone: newCustomerPhone || null, email: null, billing_address: null,
      notes: null, archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    await saveRecord('customers', rec);
    return rec.id;
  }

  async function ensureSite(custId: string): Promise<string> {
    if (siteId) return siteId;
    const ownerId = getOwnerId()!;
    const rec = {
      id: makeId(), owner_id: ownerId, customer_id: custId, name: newSiteName.trim() || 'Main Site',
      address: newSiteAddress || null, city: null, state: null, zip: null, primary_contact_name: null,
      contact_phone: null, site_email: null, access_instructions: null, internal_notes: null,
      archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    await saveRecord('sites', rec);
    return rec.id;
  }

  async function ensureEquipment(siteIdVal: string): Promise<string | null> {
    if (equipmentId) return equipmentId;
    if (!showNewEquipment || !newEqModel.trim()) return null;
    const ownerId = getOwnerId()!;
    const rec = {
      id: makeId(), owner_id: ownerId, site_id: siteIdVal, category: newEqCategory, nickname: null,
      location_at_site: null, manufacturer: newEqManufacturer || null, model_number: newEqModel || null,
      serial_number: newEqSerial || null, manufacture_date: null, refrigerant_type: null, nominal_capacity: null,
      voltage: null, phase: null, mca: null, mocp: null, compressor_model: null, filter_sizes: null,
      belt_sizes: null, warranty_notes: null, installed_date: null, equipment_notes: null, status: 'active' as const,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    await saveRecord('equipment', rec);
    return rec.id;
  }

  async function submit() {
    if (!customerId && !newCustomerName.trim()) return;
    setSaving(true);
    try {
      const ownerId = getOwnerId()!;
      const custId = await ensureCustomer();
      const siteIdFinal = await ensureSite(custId);
      const eqId = await ensureEquipment(siteIdFinal);

      if (editing) {
        const updated = {
          ...editing, customer_id: custId, site_id: siteIdFinal, equipment_id: eqId,
          call_type: callType, priority, scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          work_order_number: workOrderNumber || null, reason_for_call: reasonForCall || null,
          updated_at: new Date().toISOString(),
        };
        await saveRecord('jobs', updated);
        await logActivity(editing.id, 'note', 'Job details updated.');
        navigate(`/jobs/${editing.id}`);
      } else {
        const now = new Date().toISOString();
        const job = {
          id: makeId(), owner_id: ownerId, job_number: generateJobNumber(), work_order_number: workOrderNumber || null,
          customer_id: custId, site_id: siteIdFinal, equipment_id: eqId, call_type: callType, status: 'new' as const,
          priority, scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, arrived_at: null, departed_at: null,
          reason_for_call: reasonForCall || null, technician_notes: null, diagnosis: null, work_performed: null,
          recommendations: null, follow_up_instructions: null, internal_notes: null, customer_visible_notes: null,
          next_follow_up_date: null, return_visit_required: false, completed_at: null, created_at: now, updated_at: now,
        };
        await saveRecord('jobs', job);
        await logActivity(job.id, 'created', `Call created (${CALL_TYPE_LABELS[callType]}).`);
        navigate(`/jobs/${job.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const canSave = (customerId || newCustomerName.trim()) && (siteId || newSiteName.trim() || showNewSite || sitesForCustomer.length === 0);

  return (
    <div>
      <TopBar title={editing ? 'Edit Job' : 'New Call'} back />
      <div className="p-4 space-y-3">
        <SectionCard title="Customer & Site" subtitle="Who and where">
          <Field label="Customer">
            <Select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setSiteId(''); setEquipmentId(''); setShowNewCustomer(false); }}>
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {!customerId && (
            <button type="button" onClick={() => setShowNewCustomer((v) => !v)} className="text-blue-400 text-sm font-medium">
              {showNewCustomer ? '− Cancel new customer' : '+ New customer'}
            </button>
          )}
          {!customerId && showNewCustomer && (
            <div className="space-y-2.5 rounded-lg border border-zinc-800 p-3 bg-zinc-950/40">
              <Field label="Business / customer name"><TextInput value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Acme Property Group" /></Field>
              <Field label="Type">
                <Select value={newCustomerType} onChange={(e) => setNewCustomerType(e.target.value as CustomerType)}>
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Phone"><TextInput value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} type="tel" /></Field>
            </div>
          )}

          {(customerId || newCustomerName.trim()) && (
            <>
              {customerId && (
                <Field label="Site">
                  <Select value={siteId} onChange={(e) => { setSiteId(e.target.value); setEquipmentId(''); }}>
                    <option value="">Select site…</option>
                    {sitesForCustomer.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.address ? ` — ${s.address}` : ''}{s.city ? `, ${s.city}` : ''}{s.state ? `, ${s.state}` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {(!siteId) && (
                <button type="button" onClick={() => setShowNewSite((v) => !v)} className="text-blue-400 text-sm font-medium">
                  {showNewSite ? '− Cancel new site' : '+ New site'}
                </button>
              )}
              {!siteId && showNewSite && (
                <div className="space-y-2.5 rounded-lg border border-zinc-800 p-3 bg-zinc-950/40">
                  <Field label="Site name"><TextInput value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} placeholder="Main location" /></Field>
                  <Field label="Address"><TextInput value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} placeholder="123 Main St, City, ST" /></Field>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {(siteId || showNewSite) && (
          <SectionCard title="Equipment" subtitle="Optional — tie this call to a unit">
            {siteId && (
              <Field label="Equipment">
                <Select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
                  <option value="">None / not equipment-specific</option>
                  {equipmentForSite.map((e) => (
                    <option key={e.id} value={e.id}>{e.nickname || `${e.manufacturer ?? ''} ${e.model_number ?? ''}`.trim() || EQUIPMENT_CATEGORY_LABELS[e.category]}</option>
                  ))}
                </Select>
              </Field>
            )}
            {!equipmentId && (
              <button type="button" onClick={() => setShowNewEquipment((v) => !v)} className="text-blue-400 text-sm font-medium">
                {showNewEquipment ? '− Cancel new equipment' : '+ New equipment'}
              </button>
            )}
            {!equipmentId && showNewEquipment && (
              <div className="space-y-2.5 rounded-lg border border-zinc-800 p-3 bg-zinc-950/40">
                <Field label="Category">
                  <Select value={newEqCategory} onChange={(e) => setNewEqCategory(e.target.value as EquipmentCategory)}>
                    {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Manufacturer"><TextInput value={newEqManufacturer} onChange={(e) => setNewEqManufacturer(e.target.value)} /></Field>
                  <Field label="Model #"><TextInput value={newEqModel} onChange={(e) => setNewEqModel(e.target.value)} /></Field>
                </div>
                <Field label="Serial #"><TextInput value={newEqSerial} onChange={(e) => setNewEqSerial(e.target.value)} /></Field>
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard title="Call Details">
          <Field label="Call type">
            <Select value={callType} onChange={(e) => setCallType(e.target.value as CallType)}>
              {Object.entries(CALL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Priority">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as JobPriority)}>
                <option value="low">Low</option><option value="normal">Normal</option>
                <option value="high">High</option><option value="emergency">Emergency</option>
              </Select>
            </Field>
            <Field label="Scheduled"><TextInput type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></Field>
          </div>
          <Field label="Work order #" hint="Customer/property manager's PO or work order reference">
            <TextInput value={workOrderNumber} onChange={(e) => setWorkOrderNumber(e.target.value)} placeholder="e.g. WO-4471829" />
          </Field>
        </SectionCard>

        <SectionCard title="Reason for Call">
          <TextArea rows={4} value={reasonForCall} onChange={(e) => setReasonForCall(e.target.value)} placeholder="What's the issue? (type or paste dictated text)" />
        </SectionCard>

        <button
          disabled={!canSave || saving}
          onClick={submit}
          className="w-full rounded-xl bg-blue-600 active:bg-blue-700 disabled:opacity-40 text-white font-bold text-base py-4 mt-2"
        >
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Call'}
        </button>
      </div>
    </div>
  );
}
