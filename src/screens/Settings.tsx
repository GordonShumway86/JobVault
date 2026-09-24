import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { saveRecord } from '../lib/repo';
import { getOwnerId, useAuth } from '../auth/AuthContext';
import TopBar from '../components/TopBar';
import SectionCard from '../components/SectionCard';
import { Field, TextArea, TextInput } from '../components/Field';

export default function Settings() {
  const { user } = useAuth();
  const settings = useLiveQuery(() => (user ? db.user_settings.get(user.id) : undefined), [user?.id]);

  const [laborRate, setLaborRate] = useState('');
  const [tripCharge, setTripCharge] = useState('');
  const [markup, setMarkup] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [terms, setTerms] = useState('');
  const [warranty, setWarranty] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setLaborRate(settings.default_labor_rate?.toString() ?? '');
    setTripCharge(settings.default_trip_charge?.toString() ?? '');
    setMarkup(settings.default_markup_percent?.toString() ?? '');
    setTaxRate(settings.default_tax_rate?.toString() ?? '');
    setTerms(settings.quote_terms ?? '');
    setWarranty(settings.warranty_language ?? '');
  }, [settings]);

  async function submit() {
    const ownerId = getOwnerId();
    if (!ownerId) return;
    await saveRecord('user_settings', {
      owner_id: ownerId,
      default_labor_rate: laborRate ? Number(laborRate) : null,
      default_trip_charge: tripCharge ? Number(tripCharge) : null,
      default_markup_percent: markup ? Number(markup) : null,
      default_tax_rate: taxRate ? Number(taxRate) : null,
      quote_terms: terms || null,
      warranty_language: warranty || null,
      custom_call_types: settings?.custom_call_types ?? null,
      custom_equipment_types: settings?.custom_equipment_types ?? null,
      custom_photo_categories: settings?.custom_photo_categories ?? null,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <TopBar title="Settings" back />
      <div className="p-4 space-y-3">
        <SectionCard title="Pricing Defaults" subtitle="Used to pre-fill new quotes">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Labor rate ($/hr)"><TextInput inputMode="decimal" value={laborRate} onChange={(e) => setLaborRate(e.target.value)} /></Field>
            <Field label="Trip / service charge ($)"><TextInput inputMode="decimal" value={tripCharge} onChange={(e) => setTripCharge(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parts markup (%)"><TextInput inputMode="decimal" value={markup} onChange={(e) => setMarkup(e.target.value)} /></Field>
            <Field label="Tax rate (%)"><TextInput inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Quote Language">
          <Field label="Standard terms"><TextArea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} /></Field>
          <Field label="Warranty language"><TextArea rows={3} value={warranty} onChange={(e) => setWarranty(e.target.value)} /></Field>
        </SectionCard>

        <button onClick={submit} className="w-full rounded-xl bg-blue-600 text-white font-bold text-base py-4 mt-2">
          {saved ? 'Saved ✓' : 'Save Settings'}
        </button>

        <div className="text-zinc-600 text-xs text-center pt-4">
          Custom call types / equipment types / photo categories, data export, and team settings arrive in a later phase.
        </div>
      </div>
    </div>
  );
}
