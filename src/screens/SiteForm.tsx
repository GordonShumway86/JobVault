import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, makeId } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { saveDraft, loadDraft, clearDraft } from '../lib/formDraft';
import TopBar from '../components/TopBar';
import { Field, TextInput, TextArea } from '../components/Field';

export default function SiteForm() {
  const { id, customerId } = useParams();
  const navigate = useNavigate();
  const editing = useLiveQuery(() => (id ? db.sites.get(id) : undefined), [id]);
  const custId = customerId ?? editing?.customer_id;
  const customer = useLiveQuery(() => (custId ? db.customers.get(custId) : undefined), [custId]);
  const draftId = `site:${id ?? 'new'}`;
  const draftAppliedRef = useRef(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [contact, setContact] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [access, setAccess] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (!editing || draftAppliedRef.current) return;
    setName(editing.name); setAddress(editing.address ?? ''); setCity(editing.city ?? '');
    setState(editing.state ?? ''); setZip(editing.zip ?? ''); setContact(editing.primary_contact_name ?? '');
    setContactPhone(editing.contact_phone ?? ''); setAccess(editing.access_instructions ?? '');
    setInternalNotes(editing.internal_notes ?? '');
  }, [editing]);

  // Restore any in-progress work left behind if this form was closed
  // (app switched away, browser killed, etc.) before it was saved.
  useEffect(() => {
    let cancelled = false;
    loadDraft(draftId).then((d) => {
      if (cancelled || !d) return;
      if (typeof d.name === 'string') setName(d.name);
      if (typeof d.address === 'string') setAddress(d.address);
      if (typeof d.city === 'string') setCity(d.city);
      if (typeof d.state === 'string') setState(d.state);
      if (typeof d.zip === 'string') setZip(d.zip);
      if (typeof d.contact === 'string') setContact(d.contact);
      if (typeof d.contactPhone === 'string') setContactPhone(d.contactPhone);
      if (typeof d.access === 'string') setAccess(d.access);
      if (typeof d.internalNotes === 'string') setInternalNotes(d.internalNotes);
      draftAppliedRef.current = true;
    });
    return () => { cancelled = true; };
  }, [draftId]);

  // Fires on leaving any field in the form below (blur bubbles), so each
  // field you tab/click away from is saved immediately — only the field
  // still being typed when the app gets interrupted can be lost.
  function persistDraft() {
    saveDraft(draftId, { name, address, city, state, zip, contact, contactPhone, access, internalNotes });
  }

  async function submit() {
    if (!name.trim() || !custId) return;
    const ownerId = getOwnerId();
    if (!ownerId) return;
    const now = new Date().toISOString();
    const rec = {
      id: editing?.id ?? makeId(), owner_id: ownerId, customer_id: custId, name: name.trim(),
      address: address || null, city: city || null, state: state || null, zip: zip || null,
      primary_contact_name: contact || null, contact_phone: contactPhone || null, site_email: null,
      access_instructions: access || null, internal_notes: internalNotes || null,
      archived: editing?.archived ?? false, created_at: editing?.created_at ?? now, updated_at: now,
    };
    await saveRecord('sites', rec);
    await clearDraft(draftId);
    navigate(`/sites/${rec.id}`);
  }

  return (
    <div>
      <TopBar title={editing ? 'Edit Site' : 'New Site'} back />
      <div className="p-4 space-y-3" onBlur={persistDraft}>
        {customer && <div className="text-zinc-500 text-sm -mt-1">For {customer.name}</div>}
        <Field label="Site name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Main location" /></Field>
        <Field label="Address"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City"><TextInput value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="State"><TextInput value={state} onChange={(e) => setState(e.target.value)} /></Field>
          <Field label="ZIP"><TextInput value={zip} onChange={(e) => setZip(e.target.value)} /></Field>
        </div>
        <Field label="Site contact"><TextInput value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="Contact phone"><TextInput type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
        <Field label="Access instructions" hint="Gate codes, roof access, parking, hours"><TextArea rows={3} value={access} onChange={(e) => setAccess(e.target.value)} /></Field>
        <Field label="Internal notes"><TextArea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} /></Field>
        <button onClick={submit} disabled={!name.trim()} className="w-full rounded-xl bg-blue-600 disabled:opacity-40 text-white font-bold text-base py-4 mt-2">
          Save Site
        </button>
      </div>
    </div>
  );
}
