import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, deleteRecord, makeId } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { saveDraft, loadDraft, clearDraft } from '../lib/formDraft';
import TopBar from '../components/TopBar';
import SectionCard from '../components/SectionCard';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { SystemTypeFields, ComponentTypeFields } from '../components/EquipmentTypeFields';
import NameplateScanButton from '../components/NameplateScanButton';
import { SYSTEM_CATEGORY_LABELS, type SystemCategory, type SystemStatus, type ComponentPosition } from '../types';

interface ComponentDraft {
  key: string; // stable local key, doubles as the saved component's id
  existing: boolean; // already saved in the DB (vs. added this session)
  createdAt: string | null; // preserved from the DB row when editing
  position: ComponentPosition | null;
  componentType: string;
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  refrigerant: string;
  voltage: string;
  phase: string;
  mca: string;
  mocp: string;
}

function blankComponent(): ComponentDraft {
  return {
    key: makeId(), existing: false, createdAt: null, position: null, componentType: '', name: '',
    manufacturer: '', model: '', serial: '', refrigerant: '', voltage: '', phase: '', mca: '', mocp: '',
  };
}

export default function SystemForm() {
  const { id, siteId } = useParams();
  const navigate = useNavigate();
  const editing = useLiveQuery(() => (id ? db.systems.get(id) : undefined), [id]);
  const existingComponents = useLiveQuery(() => (id ? db.components.where('system_id').equals(id).toArray() : []), [id]);
  const siteIdFinal = siteId ?? editing?.site_id;
  const site = useLiveQuery(() => (siteIdFinal ? db.sites.get(siteIdFinal) : undefined), [siteIdFinal]);
  const draftId = `system:${id ?? 'new'}`;
  const draftAppliedRef = useRef(false);
  const componentsLoadedRef = useRef(false);

  const [category, setCategory] = useState<SystemCategory>('split_system');
  const [systemType, setSystemType] = useState('');
  const [configuration, setConfiguration] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [installedDate, setInstalledDate] = useState('');
  const [status, setStatus] = useState<SystemStatus>('active');
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([]);

  useEffect(() => {
    if (!editing || draftAppliedRef.current) return;
    setCategory(editing.category); setSystemType(editing.system_type); setConfiguration(editing.configuration);
    setNickname(editing.nickname ?? ''); setLocation(editing.location_at_site ?? '');
    setInstalledDate(editing.installed_date ?? ''); setStatus(editing.status); setNotes(editing.system_notes ?? '');
  }, [editing]);

  // Load this System's existing components into the editable list once
  // (later reloads shouldn't stomp on in-progress edits/adds).
  useEffect(() => {
    if (!existingComponents || componentsLoadedRef.current || draftAppliedRef.current) return;
    if (existingComponents.length) {
      setComponents(existingComponents.map((c) => ({
        key: c.id, existing: true, createdAt: c.created_at, position: c.position, componentType: c.component_type, name: c.name ?? '',
        manufacturer: c.manufacturer ?? '', model: c.model_number ?? '', serial: c.serial_number ?? '',
        refrigerant: c.refrigerant_type ?? '', voltage: c.voltage ?? '', phase: c.phase ?? '', mca: c.mca ?? '', mocp: c.mocp ?? '',
      })));
    }
    componentsLoadedRef.current = true;
  }, [existingComponents]);

  // Restore any in-progress work left behind if this form was closed
  // (app switched away, browser killed, etc.) before it was saved.
  useEffect(() => {
    let cancelled = false;
    loadDraft(draftId).then((d) => {
      if (cancelled || !d) return;
      if (typeof d.category === 'string') setCategory(d.category as SystemCategory);
      if (typeof d.systemType === 'string') setSystemType(d.systemType);
      if (typeof d.configuration === 'string') setConfiguration(d.configuration);
      if (typeof d.nickname === 'string') setNickname(d.nickname);
      if (typeof d.location === 'string') setLocation(d.location);
      if (typeof d.installedDate === 'string') setInstalledDate(d.installedDate);
      if (typeof d.status === 'string') setStatus(d.status as SystemStatus);
      if (typeof d.notes === 'string') setNotes(d.notes);
      if (Array.isArray(d.components)) setComponents(d.components as ComponentDraft[]);
      draftAppliedRef.current = true;
      componentsLoadedRef.current = true;
    });
    return () => { cancelled = true; };
  }, [draftId]);

  // Fires on leaving any field in the form below (blur bubbles), so each
  // field you tab/click away from is saved immediately — only the field
  // still being typed when the app gets interrupted can be lost.
  function persistDraft() {
    saveDraft(draftId, { category, systemType, configuration, nickname, location, installedDate, status, notes, components });
  }

  function updateComponent(key: string, patch: Partial<ComponentDraft>) {
    setComponents((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  async function removeComponent(c: ComponentDraft) {
    if (c.existing) {
      const ok = window.confirm(`Remove ${c.name || c.componentType || 'this component'}? This cannot be undone.`);
      if (!ok) return;
      await deleteRecord('components', c.key);
    }
    setComponents((cs) => cs.filter((x) => x.key !== c.key));
  }

  async function submit() {
    if (!siteIdFinal) return;
    const ownerId = getOwnerId();
    if (!ownerId) return;
    const now = new Date().toISOString();
    const systemId = editing?.id ?? makeId();
    const systemRec = {
      id: systemId, owner_id: ownerId, site_id: siteIdFinal, category, system_type: systemType.trim(),
      configuration: category === 'split_system' ? configuration : null,
      nickname: nickname || null, location_at_site: location || null, installed_date: installedDate || null,
      system_notes: notes || null, status,
      legacy_manufacturer: editing?.legacy_manufacturer ?? null, legacy_model_number: editing?.legacy_model_number ?? null,
      legacy_serial_number: editing?.legacy_serial_number ?? null, legacy_refrigerant_type: editing?.legacy_refrigerant_type ?? null,
      legacy_voltage: editing?.legacy_voltage ?? null, legacy_phase: editing?.legacy_phase ?? null,
      legacy_mca: editing?.legacy_mca ?? null, legacy_mocp: editing?.legacy_mocp ?? null,
      created_at: editing?.created_at ?? now, updated_at: now,
    };
    await saveRecord('systems', systemRec);

    for (const c of components) {
      await saveRecord('components', {
        id: c.key, owner_id: ownerId, system_id: systemId, position: c.position, component_type: c.componentType.trim(),
        name: c.name || null, manufacturer: c.manufacturer || null, model_number: c.model || null,
        serial_number: c.serial || null, refrigerant_type: c.refrigerant || null, voltage: c.voltage || null,
        phase: c.phase || null, mca: c.mca || null, mocp: c.mocp || null,
        created_at: c.createdAt ?? now, updated_at: now,
      });
    }

    await clearDraft(draftId);
    navigate(`/systems/${systemId}`);
  }

  return (
    <div>
      <TopBar title={editing ? 'Edit System' : 'New System'} back />
      <div className="p-4 space-y-3" onBlur={persistDraft}>
        {site && <div className="text-zinc-500 text-sm -mt-1">At {site.name}</div>}

        <SectionCard title="Identity">
          <Field label="Category">
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value as SystemCategory); setSystemType(''); setConfiguration(null); }}
            >
              {Object.entries(SYSTEM_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <SystemTypeFields
            category={category}
            systemType={systemType}
            configuration={configuration}
            onChange={(next) => { setSystemType(next.systemType); setConfiguration(next.configuration); }}
          />
          <Field label="Nickname / tag" hint='e.g. "Split System #4", "RTU-1", "Walk-in #2"'>
            <TextInput value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </Field>
          <Field label="Location at site"><TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Roof, north side" /></Field>
          <Field label="Installed date"><TextInput type="date" value={installedDate} onChange={(e) => setInstalledDate(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as SystemStatus)}>
              <option value="active">Active</option><option value="replaced">Replaced</option>
              <option value="removed">Removed</option><option value="inactive">Inactive</option>
            </Select>
          </Field>
        </SectionCard>

        <SectionCard title="Notes" defaultOpen={false}>
          <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </SectionCard>

        <div>
          <h2 className="text-white font-bold text-base mb-2">Components ({components.length})</h2>
          <div className="space-y-3">
            {components.map((c, i) => (
              <div key={c.key} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-xs font-semibold">Component {i + 1}</span>
                  <button type="button" onClick={() => removeComponent(c)} className="text-red-400 text-xs font-semibold">Remove</button>
                </div>
                {/* Scan first: the fields below are always there to fill in
                    or correct by hand, so there's no separate "manual entry"
                    choice — scanning just pre-fills whatever it can read. */}
                <NameplateScanButton
                  onExtracted={(extracted) => updateComponent(c.key, {
                    manufacturer: extracted.manufacturer ?? c.manufacturer,
                    model: extracted.model_number ?? c.model,
                    serial: extracted.serial_number ?? c.serial,
                    refrigerant: extracted.refrigerant_type ?? c.refrigerant,
                    voltage: extracted.voltage ?? c.voltage,
                    phase: extracted.phase ?? c.phase,
                    mca: extracted.mca ?? c.mca,
                    mocp: extracted.mocp ?? c.mocp,
                  })}
                />
                <ComponentTypeFields
                  category={category}
                  value={{ position: c.position, componentType: c.componentType }}
                  onChange={(next) => updateComponent(c.key, { position: next.position, componentType: next.componentType })}
                />
                <Field label="Designation / Name" hint='e.g. "Condenser 1"'>
                  <TextInput value={c.name} onChange={(e) => updateComponent(c.key, { name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Brand / Manufacturer"><TextInput value={c.manufacturer} onChange={(e) => updateComponent(c.key, { manufacturer: e.target.value })} /></Field>
                  <Field label="Model #"><TextInput value={c.model} onChange={(e) => updateComponent(c.key, { model: e.target.value })} /></Field>
                </div>
                <Field label="Serial #"><TextInput value={c.serial} onChange={(e) => updateComponent(c.key, { serial: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Refrigerant"><TextInput value={c.refrigerant} onChange={(e) => updateComponent(c.key, { refrigerant: e.target.value })} placeholder="R-410A" /></Field>
                  <Field label="Voltage"><TextInput value={c.voltage} onChange={(e) => updateComponent(c.key, { voltage: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Phase"><TextInput value={c.phase} onChange={(e) => updateComponent(c.key, { phase: e.target.value })} /></Field>
                  <Field label="MCA"><TextInput value={c.mca} onChange={(e) => updateComponent(c.key, { mca: e.target.value })} /></Field>
                </div>
                <Field label="MOCP"><TextInput value={c.mocp} onChange={(e) => updateComponent(c.key, { mocp: e.target.value })} /></Field>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setComponents((cs) => [...cs, blankComponent()])}
            className="w-full mt-2 rounded-lg border border-dashed border-zinc-700 text-blue-400 text-sm font-semibold py-3"
          >
            + Add Another Component
          </button>
        </div>

        <button onClick={submit} className="w-full rounded-xl bg-blue-600 text-white font-bold text-base py-4 mt-2">
          Save System
        </button>
      </div>
    </div>
  );
}
