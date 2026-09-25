import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, makeId } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { saveDraft, loadDraft, clearDraft } from '../lib/formDraft';
import TopBar from '../components/TopBar';
import { Field, TextInput, TextArea } from '../components/Field';

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = useLiveQuery(() => (id ? db.customers.get(id) : undefined), [id]);
  const draftId = `customer:${id ?? 'new'}`;
  const draftAppliedRef = useRef(false);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editing || draftAppliedRef.current) return;
    setName(editing.name); setContact(editing.primary_contact_name ?? '');
    setAddress(editing.billing_address ?? ''); setNotes(editing.notes ?? '');
  }, [editing]);

  // Restore any in-progress work left behind if this form was closed
  // (app switched away, browser killed, etc.) before it was saved.
  useEffect(() => {
    let cancelled = false;
    loadDraft(draftId).then((d) => {
      if (cancelled || !d) return;
      if (typeof d.name === 'string') setName(d.name);
      if (typeof d.contact === 'string') setContact(d.contact);
      if (typeof d.address === 'string') setAddress(d.address);
      if (typeof d.notes === 'string') setNotes(d.notes);
      draftAppliedRef.current = true;
    });
    return () => { cancelled = true; };
  }, [draftId]);

  // Fires on leaving any field in the form below (blur bubbles), so each
  // field you tab/click away from is saved immediately — only the field
  // still being typed when the app gets interrupted can be lost.
  function persistDraft() {
    saveDraft(draftId, { name, contact, address, notes });
  }

  async function submit() {
    if (!name.trim()) return;
    const ownerId = getOwnerId();
    if (!ownerId) return;
    const now = new Date().toISOString();
    const rec = {
      id: editing?.id ?? makeId(), owner_id: ownerId, name: name.trim(), customer_type: 'commercial' as const,
      primary_contact_name: contact || null, phone: null, email: null,
      billing_address: address || null, notes: notes || null, archived: editing?.archived ?? false,
      created_at: editing?.created_at ?? now, updated_at: now,
    };
    await saveRecord('customers', rec);
    await clearDraft(draftId);
    navigate(`/customers/${rec.id}`);
  }

  return (
    <div>
      <TopBar title={editing ? 'Edit Customer' : 'New Customer'} back />
      <div className="p-4 space-y-3" onBlur={persistDraft}>
        <Field label="Customer Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
            className="text-xl font-bold py-4"
          />
        </Field>
        <Field label="Primary contact"><TextInput value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="Address"><TextArea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Notes"><TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <button onClick={submit} disabled={!name.trim()} className="w-full rounded-xl bg-blue-600 disabled:opacity-40 text-white font-bold text-base py-4 mt-2">
          Save Customer
        </button>
      </div>
    </div>
  );
}
