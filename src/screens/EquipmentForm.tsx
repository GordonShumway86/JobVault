import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, makeId } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { saveDraft, loadDraft, clearDraft } from '../lib/formDraft';
import TopBar from '../components/TopBar';
import SectionCard from '../components/SectionCard';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { EQUIPMENT_CATEGORY_LABELS, type EquipmentCategory, type EquipmentStatus } from '../types';

export default function EquipmentForm() {
  const { id, siteId } = useParams();
  const navigate = useNavigate();
  const editing = useLiveQuery(() => (id ? db.equipment.get(id) : undefined), [id]);
  const siteIdFinal = siteId ?? editing?.site_id;
  const site = useLiveQuery(() => (siteIdFinal ? db.sites.get(siteIdFinal) : undefined), [siteIdFinal]);
  const draftId = `equipment:${id ?? 'new'}`;
  const draftAppliedRef = useRef(false);

  const [category, setCategory] = useState<EquipmentCategory>('split_system');
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [refrigerant, setRefrigerant] = useState('');
  const [capacity, setCapacity] = useState('');
  const [voltage, setVoltage] = useState('');
  const [phase, setPhase] = useState('');
  const [mca, setMca] = useState('');
  const [mocp, setMocp] = useState('');
  const [installedDate, setInstalledDate] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editing || draftAppliedRef.current) return;
    setCategory(editing.category); setNickname(editing.nickname ?? ''); setLocation(editing.location_at_site ?? '');
    setManufacturer(editing.manufacturer ?? ''); setModel(editing.model_number ?? ''); setSerial(editing.serial_number ?? '');
    setRefrigerant(editing.refrigerant_type ?? ''); setCapacity(editing.nominal_capacity ?? ''); setVoltage(editing.voltage ?? '');
    setPhase(editing.phase ?? ''); setMca(editing.mca ?? ''); setMocp(editing.mocp ?? '');
    setInstalledDate(editing.installed_date ?? ''); setStatus(editing.status); setNotes(editing.equipment_notes ?? '');
  }, [editing]);

  // Restore any in-progress work left behind if this form was closed
  // (app switched away, browser killed, etc.) before it was saved.
  useEffect(() => {
    let cancelled = false;
    loadDraft(draftId).then((d) => {
      if (cancelled || !d) return;
      if (typeof d.category === 'string') setCategory(d.category as EquipmentCategory);
      if (typeof d.nickname === 'string') setNickname(d.nickname);
      if (typeof d.location === 'string') setLocation(d.location);
      if (typeof d.manufacturer === 'string') setManufacturer(d.manufacturer);
      if (typeof d.model === 'string') setModel(d.model);
      if (typeof d.serial === 'string') setSerial(d.serial);
      if (typeof d.refrigerant === 'string') setRefrigerant(d.refrigerant);
      if (typeof d.capacity === 'string') setCapacity(d.capacity);
      if (typeof d.voltage === 'string') setVoltage(d.voltage);
      if (typeof d.phase === 'string') setPhase(d.phase);
      if (typeof d.mca === 'string') setMca(d.mca);
      if (typeof d.mocp === 'string') setMocp(d.mocp);
      if (typeof d.installedDate === 'string') setInstalledDate(d.installedDate);
      if (typeof d.status === 'string') setStatus(d.status as EquipmentStatus);
      if (typeof d.notes === 'string') setNotes(d.notes);
      draftAppliedRef.current = true;
    });
    return () => { cancelled = true; };
  }, [draftId]);

  // Fires on leaving any field in the form below (blur bubbles), so each
  // field you tab/click away from is saved immediately — only the field
  // still being typed when the app gets interrupted can be lost.
  function persistDraft() {
    saveDraft(draftId, {
      category, nickname, location, manufacturer, model, serial, refrigerant,
      capacity, voltage, phase, mca, mocp, installedDate, status, notes,
    });
  }

  async function submit() {
    if (!siteIdFinal) return;
    const ownerId = getOwnerId();
    if (!ownerId) return;
    const now = new Date().toISOString();
    const rec = {
      id: editing?.id ?? makeId(), owner_id: ownerId, site_id: siteIdFinal, category,
      nickname: nickname || null, location_at_site: location || null, manufacturer: manufacturer || null,
      model_number: model || null, serial_number: serial || null, manufacture_date: null,
      refrigerant_type: refrigerant || null, nominal_capacity: capacity || null, voltage: voltage || null,
      phase: phase || null, mca: mca || null, mocp: mocp || null, compressor_model: null, filter_sizes: null,
      belt_sizes: null, warranty_notes: null, installed_date: installedDate || null, equipment_notes: notes || null,
      status, created_at: editing?.created_at ?? now, updated_at: now,
    };
    await saveRecord('equipment', rec);
    await clearDraft(draftId);
    navigate(`/equipment/${rec.id}`);
  }

  return (
    <div>
      <TopBar title={editing ? 'Edit Equipment' : 'New Equipment'} back />
      <div className="p-4 space-y-3" onBlur={persistDraft}>
        {site && <div className="text-zinc-500 text-sm -mt-1">At {site.name}</div>}
        <SectionCard title="Identity">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as EquipmentCategory)}>
              {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Nickname / tag" hint="e.g. RTU-1, Walk-in #2"><TextInput value={nickname} onChange={(e) => setNickname(e.target.value)} /></Field>
          <Field label="Location at site"><TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Roof, north side" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Manufacturer"><TextInput value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} /></Field>
            <Field label="Model #"><TextInput value={model} onChange={(e) => setModel(e.target.value)} /></Field>
          </div>
          <Field label="Serial #"><TextInput value={serial} onChange={(e) => setSerial(e.target.value)} /></Field>
        </SectionCard>

        <SectionCard title="Specifications" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Refrigerant"><TextInput value={refrigerant} onChange={(e) => setRefrigerant(e.target.value)} placeholder="R-410A" /></Field>
            <Field label="Capacity"><TextInput value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="5 ton" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Voltage"><TextInput value={voltage} onChange={(e) => setVoltage(e.target.value)} /></Field>
            <Field label="Phase"><TextInput value={phase} onChange={(e) => setPhase(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="MCA"><TextInput value={mca} onChange={(e) => setMca(e.target.value)} /></Field>
            <Field label="MOCP"><TextInput value={mocp} onChange={(e) => setMocp(e.target.value)} /></Field>
          </div>
          <Field label="Installed date"><TextInput type="date" value={installedDate} onChange={(e) => setInstalledDate(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as EquipmentStatus)}>
              <option value="active">Active</option><option value="replaced">Replaced</option>
              <option value="removed">Removed</option><option value="inactive">Inactive</option>
            </Select>
          </Field>
        </SectionCard>

        <SectionCard title="Notes" defaultOpen={false}>
          <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </SectionCard>

        <button onClick={submit} className="w-full rounded-xl bg-blue-600 text-white font-bold text-base py-4 mt-2">
          Save Equipment
        </button>
      </div>
    </div>
  );
}
