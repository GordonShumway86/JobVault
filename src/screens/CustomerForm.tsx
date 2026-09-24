import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, makeId } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import TopBar from '../components/TopBar';
import { Field, TextInput, TextArea, Select } from '../components/Field';
import { CUSTOMER_TYPE_LABELS, type CustomerType } from '../types';

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = useLiveQuery(() => (id ? db.customers.get(id) : undefined), [id]);

  const [name, setName] = useState('');
  const [type, setType] = useState<CustomerType>('residential');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editing) return;
    setName(editing.name); setType(editing.customer_type); setContact(editing.primary_contact_name ?? '');
    setPhone(editing.phone ?? ''); setEmail(editing.email ?? ''); setBillingAddress(editing.billing_address ?? '');
    setNotes(editing.notes ?? '');
  }, [editing]);

  async function submit() {
    if (!name.trim()) return;
    const ownerId = getOwnerId();
    if (!ownerId) return;
    const now = new Date().toISOString();
    const rec = {
      id: editing?.id ?? makeId(), owner_id: ownerId, name: name.trim(), customer_type: type,
      primary_contact_name: contact || null, phone: phone || null, email: email || null,
      billing_address: billingAddress || null, notes: notes || null, archived: editing?.archived ?? false,
      created_at: editing?.created_at ?? now, updated_at: now,
    };
    await saveRecord('customers', rec);
    navigate(`/customers/${rec.id}`);
  }

  return (
    <div>
      <TopBar title={editing ? 'Edit Customer' : 'New Customer'} back />
      <div className="p-4 space-y-3">
        <Field label="Business / customer name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Primary contact"><TextInput value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <Field label="Billing address"><TextArea rows={2} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} /></Field>
        <Field label="Notes"><TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <button onClick={submit} disabled={!name.trim()} className="w-full rounded-xl bg-blue-600 disabled:opacity-40 text-white font-bold text-base py-4 mt-2">
          Save Customer
        </button>
      </div>
    </div>
  );
}
