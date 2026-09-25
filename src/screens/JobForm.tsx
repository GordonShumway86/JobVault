import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, makeId, logActivity } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { generateJobNumber } from '../lib/jobNumber';
import { saveDraft, loadDraft, clearDraft } from '../lib/formDraft';
import TopBar from '../components/TopBar';
import SectionCard from '../components/SectionCard';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import {
  CALL_TYPE_LABELS, EQUIPMENT_CATEGORY_LABELS,
  type CallType, type EquipmentCategory, type JobPriority,
} from '../types';

interface DispatchNavState {
  customerId?: string;
  siteId?: string;
  workOrderNumber?: string;
  dispatchNumber?: string;
  reasonForCall?: string;
}

export default function JobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Set when arriving here from "Scan Dispatch Ticket" — prefills who/where
  // and the work order # / reason so nothing has to be retyped.
  const navState = location.state as DispatchNavState | null;
  const editing = useLiveQuery(() => (id ? db.jobs.get(id) : undefined), [id]);
  const draftId = `job:${id ?? 'new'}`;

  const allCustomers = useLiveQuery(() => db.customers.toArray(), []) ?? [];
  const customers = useMemo(() => allCustomers.filter((c) => !c.archived), [allCustomers]);
  const allSites = useLiveQuery(() => db.sites.toArray(), []) ?? [];
  const allEquipment = useLiveQuery(() => db.equipment.toArray(), []) ?? [];

  const [customerId, setCustomerId] = useState(editing?.customer_id ?? navState?.customerId ?? '');
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [siteId, setSiteId] = useState(editing?.site_id ?? navState?.siteId ?? '');
  const [equipmentId, setEquipmentId] = useState(editing?.equipment_id ?? '');
  const [callType, setCallType] = useState<CallType>(editing?.call_type ?? 'service_diagnostic');
  const [priority, setPriority] = useState<JobPriority>(editing?.priority ?? 'normal');
  const [scheduledAt, setScheduledAt] = useState(editing?.scheduled_at?.slice(0, 16) ?? '');
  const [workOrderNumber, setWorkOrderNumber] = useState(editing?.work_order_number ?? navState?.workOrderNumber ?? '');
  const [dispatchNumber, setDispatchNumber] = useState(editing?.dispatch_number ?? navState?.dispatchNumber ?? '');
  const [reasonForCall, setReasonForCall] = useState(editing?.reason_for_call ?? navState?.reasonForCall ?? '');

  // Inline "create new" mini-forms
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');

  const [showNewEquipment, setShowNewEquipment] = useState(false);
  const [newEqCategory, setNewEqCategory] = useState<EquipmentCategory>('split_system');
  const [newEqManufacturer, setNewEqManufacturer] = useState('');
  const [newEqModel, setNewEqModel] = useState('');
  const [newEqSerial, setNewEqSerial] = useState('');

  const [saving, setSaving] = useState(false);

  // Keep the search box showing the selected customer's name whenever a
  // customer is actually selected (from a click, a draft restore, or
  // editing an existing job).
  useEffect(() => {
    if (!customerId) return;
    const c = customers.find((c) => c.id === customerId);
    if (c) setCustomerQuery(c.name);
  }, [customerId, customers]);

  // Live, case-insensitive, partial-match narrowing as the customer name is
  // typed — settles down to the one exact match once the full name is typed.
  const customerMatches = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase();
    if (!needle) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [customers, customerQuery]);

  // Restore any in-progress work left behind if this form was closed
  // (app switched away, browser killed, etc.) before it was saved.
  useEffect(() => {
    let cancelled = false;
    loadDraft(draftId).then((d) => {
      if (cancelled || !d) return;
      if (typeof d.customerId === 'string') setCustomerId(d.customerId);
      if (typeof d.customerQuery === 'string') setCustomerQuery(d.customerQuery);
      if (typeof d.siteId === 'string') setSiteId(d.siteId);
      if (typeof d.equipmentId === 'string') setEquipmentId(d.equipmentId);
      if (typeof d.callType === 'string') setCallType(d.callType as CallType);
      if (typeof d.priority === 'string') setPriority(d.priority as JobPriority);
      if (typeof d.scheduledAt === 'string') setScheduledAt(d.scheduledAt);
      if (typeof d.workOrderNumber === 'string') setWorkOrderNumber(d.workOrderNumber);
      if (typeof d.dispatchNumber === 'string') setDispatchNumber(d.dispatchNumber);
      if (typeof d.reasonForCall === 'string') setReasonForCall(d.reasonForCall);
      if (typeof d.showNewCustomer === 'boolean') setShowNewCustomer(d.showNewCustomer);
      if (typeof d.newCustomerName === 'string') setNewCustomerName(d.newCustomerName);
      if (typeof d.showNewSite === 'boolean') setShowNewSite(d.showNewSite);
      if (typeof d.newSiteName === 'string') setNewSiteName(d.newSiteName);
      if (typeof d.newSiteAddress === 'string') setNewSiteAddress(d.newSiteAddress);
      if (typeof d.showNewEquipment === 'boolean') setShowNewEquipment(d.showNewEquipment);
      if (typeof d.newEqCategory === 'string') setNewEqCategory(d.newEqCategory as EquipmentCategory);
      if (typeof d.newEqManufacturer === 'string') setNewEqManufacturer(d.newEqManufacturer);
      if (typeof d.newEqModel === 'string') setNewEqModel(d.newEqModel);
      if (typeof d.newEqSerial === 'string') setNewEqSerial(d.newEqSerial);
    });
    return () => { cancelled = true; };
  }, [draftId]);

  // Fires on leaving any field in the form below (blur bubbles), so each
  // field you tab/click away from is saved immediately — only the field
  // still being typed when the app gets interrupted can be lost.
  function persistDraft() {
    saveDraft(draftId, {
      customerId, customerQuery, siteId, equipmentId, callType, priority, scheduledAt, workOrderNumber, dispatchNumber, reasonForCall,
      showNewCustomer, newCustomerName,
      showNewSite, newSiteName, newSiteAddress,
      showNewEquipment, newEqCategory, newEqManufacturer, newEqModel, newEqSerial,
    });
  }

  const sitesForCustomer = useMemo(() => allSites.filter((s) => s.customer_id === customerId), [allSites, customerId]);
  const equipmentForSite = useMemo(() => allEquipment.filter((e) => e.site_id === siteId), [allEquipment, siteId]);

  async function ensureCustomer(): Promise<string> {
    if (customerId) return customerId;
    const ownerId = getOwnerId()!;
    const rec = {
      id: makeId(), owner_id: ownerId, name: newCustomerName.trim(), customer_type: 'commercial' as const,
      primary_contact_name: null, phone: null, email: null, billing_address: null,
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
          work_order_number: workOrderNumber || null, dispatch_number: dispatchNumber || null, reason_for_call: reasonForCall || null,
          updated_at: new Date().toISOString(),
        };
        await saveRecord('jobs', updated);
        await logActivity(editing.id, 'note', 'Job details updated.');
        await clearDraft(draftId);
        navigate(`/jobs/${editing.id}`);
      } else {
        const now = new Date().toISOString();
        const job = {
          id: makeId(), owner_id: ownerId, job_number: generateJobNumber(), work_order_number: workOrderNumber || null,
          dispatch_number: dispatchNumber || null,
          customer_id: custId, site_id: siteIdFinal, equipment_id: eqId, call_type: callType, status: 'new' as const,
          priority, scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, arrived_at: null, departed_at: null,
          reason_for_call: reasonForCall || null, technician_notes: null, diagnosis: null, work_performed: null,
          recommendations: null, follow_up_instructions: null, internal_notes: null, customer_visible_notes: null,
          next_follow_up_date: null, return_visit_required: false, completed_at: null, created_at: now, updated_at: now,
        };
        await saveRecord('jobs', job);
        await logActivity(job.id, 'created', `Call created (${CALL_TYPE_LABELS[callType]}).`);
        await clearDraft(draftId);
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
      <div className="p-4 space-y-3" onBlur={persistDraft}>
        <SectionCard title="Customer & Site" subtitle="Who and where">
          <div className="relative">
            <Field label="Customer">
              <TextInput
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setCustomerId('');
                  setSiteId(''); setEquipmentId(''); setShowNewCustomer(false);
                  setShowCustomerSuggestions(true);
                }}
                onFocus={() => setShowCustomerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
                placeholder="Start typing a customer name…"
              />
            </Field>
            {showCustomerSuggestions && !customerId && customerQuery.trim() && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-zinc-700 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden shadow-xl">
                {customerMatches.length === 0 ? (
                  <div className="px-3.5 py-2.5 text-zinc-500 text-sm">No match — add as new customer below</div>
                ) : (
                  customerMatches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerQuery(c.name);
                        setShowCustomerSuggestions(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-white text-sm active:bg-zinc-800"
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {!customerId && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setShowNewCustomer((v) => !v); if (!showNewCustomer) setNewCustomerName((n) => n || customerQuery); }}
                className="text-blue-400 text-sm font-medium"
              >
                {showNewCustomer ? '− Cancel new customer' : '+ New customer'}
              </button>
              <Link to="/customers/scan?returnTo=job" className="text-blue-400 text-sm font-medium">
                Scan a ticket instead
              </Link>
            </div>
          )}
          {!customerId && showNewCustomer && (
            <div className="space-y-2.5 rounded-lg border border-zinc-800 p-3 bg-zinc-950/40">
              <Field label="Customer name"><TextInput value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Acme Property Group" /></Field>
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
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="PO #" hint="Customer/property manager's PO reference">
              <TextInput value={workOrderNumber} onChange={(e) => setWorkOrderNumber(e.target.value)} placeholder="e.g. 1894132-01" />
            </Field>
            <Field label="Dispatch #"><TextInput value={dispatchNumber} onChange={(e) => setDispatchNumber(e.target.value)} placeholder="e.g. 153264" /></Field>
          </div>
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
