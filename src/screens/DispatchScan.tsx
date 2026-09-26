import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveRecord, makeId } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { extractDispatchFields, type DispatchExtraction } from '../lib/dispatchOcr';
import { loadImage, preprocessImage, runOcr, StaleChunkImportError } from '../lib/ocr';
import TopBar from '../components/TopBar';
import { Field, TextInput, TextArea } from '../components/Field';

type Stage = 'idle' | 'processing' | 'review' | 'saving';

// Scans a photographed dispatch ticket / work order (the kind an office
// sends over showing store name, address, and the task) and pulls out
// enough to create the Customer and Site without retyping it all by hand.
// Same house pattern as the nameplate scanner: OCR client-side, extract
// with regex, always review/edit before anything gets saved.
export default function DispatchScan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnToJob = params.get('returnTo') === 'job';

  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [fields, setFields] = useState<DispatchExtraction>({
    customerName: null, siteName: null, address: null, city: null, state: null,
    zip: null, workOrderNumber: null, dispatchNumber: null, reasonForCall: null, contactName: null,
  });

  function reset() {
    setStage('idle'); setError(null); setPreviewUrl(null); setRawText(''); setShowRaw(false);
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setPreviewUrl(URL.createObjectURL(picked));
    setError(null);
    setStage('processing');
    setStatusText('Loading OCR engine…');
    try {
      const img = await loadImage(picked);
      const canvas = preprocessImage(img, 150);
      setStatusText('Reading ticket…');
      const text = await runOcr(canvas);
      setRawText(text);
      setFields(extractDispatchFields(text));
      setStage('review');
    } catch (err) {
      if (err instanceof StaleChunkImportError) {
        setStatusText('Update found — reloading…');
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not read the photo. You can still fill in the fields by hand.');
      setStage('review');
    }
  }

  function update<K extends keyof DispatchExtraction>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value || null }));
  }

  const hasAddress = Boolean(fields.address || fields.city || fields.state || fields.zip);
  const canSave = Boolean(fields.customerName?.trim());

  async function acceptAndSave() {
    const ownerId = getOwnerId();
    if (!ownerId || !fields.customerName?.trim()) return;
    setStage('saving');
    const now = new Date().toISOString();

    const customer = {
      id: makeId(), owner_id: ownerId, name: fields.customerName.trim(), customer_type: 'commercial' as const,
      primary_contact_name: fields.contactName || null, phone: null, email: null,
      billing_address: null, notes: null, archived: false, created_at: now, updated_at: now,
    };
    await saveRecord('customers', customer);

    let siteId: string | null = null;
    if (hasAddress) {
      const site = {
        id: makeId(), owner_id: ownerId, customer_id: customer.id, name: fields.siteName?.trim() || 'Main Site',
        address: fields.address || null, city: fields.city || null, state: fields.state || null, zip: fields.zip || null,
        primary_contact_name: fields.contactName || null, contact_phone: null, site_email: null,
        access_instructions: null, internal_notes: null, archived: false, created_at: now, updated_at: now,
      };
      await saveRecord('sites', site);
      siteId = site.id;
    }

    if (returnToJob) {
      navigate('/jobs/new', {
        state: {
          customerId: customer.id, siteId: siteId ?? undefined,
          workOrderNumber: fields.workOrderNumber ?? undefined, dispatchNumber: fields.dispatchNumber ?? undefined,
          reasonForCall: fields.reasonForCall ?? undefined,
        },
      });
    } else {
      navigate(siteId ? `/sites/${siteId}` : `/customers/${customer.id}`);
    }
  }

  return (
    <div>
      <TopBar title="Scan Dispatch Ticket" back />
      <div className="p-4 space-y-3">
        {stage === 'idle' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="flex-1 rounded-lg bg-zinc-800 active:bg-zinc-700 text-white text-sm font-semibold py-3"
            >
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => libraryInput.current?.click()}
              className="flex-1 rounded-lg bg-zinc-800 active:bg-zinc-700 text-white text-sm font-semibold py-3"
            >
              Choose from Library
            </button>
          </div>
        )}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePicked} />
        <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />

        {previewUrl && <img src={previewUrl} alt="dispatch ticket" className="w-full max-h-56 object-contain rounded-lg bg-black" />}

        {stage === 'processing' && (
          <div className="text-zinc-400 text-sm text-center py-3">{statusText}</div>
        )}

        {(stage === 'review' || stage === 'saving') && (
          <>
            <div className="text-amber-200 text-xs bg-amber-950/40 border border-amber-900/40 rounded-lg p-2.5">
              AI extraction may be inaccurate — review and correct every field below before saving.
            </div>
            {error && <div className="text-red-400 text-xs">{error}</div>}

            <Field label="Customer Name">
              <TextInput value={fields.customerName ?? ''} onChange={(e) => update('customerName', e.target.value)} className="text-lg font-bold py-4" placeholder="Company name" />
            </Field>
            <Field label="Site name" hint="Leave blank to just call it &quot;Main Site&quot;">
              <TextInput value={fields.siteName ?? ''} onChange={(e) => update('siteName', e.target.value)} placeholder="e.g. Liquor Barn #948" />
            </Field>
            <Field label="Address"><TextInput value={fields.address ?? ''} onChange={(e) => update('address', e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City"><TextInput value={fields.city ?? ''} onChange={(e) => update('city', e.target.value)} /></Field>
              <Field label="State"><TextInput value={fields.state ?? ''} onChange={(e) => update('state', e.target.value)} /></Field>
              <Field label="ZIP"><TextInput value={fields.zip ?? ''} onChange={(e) => update('zip', e.target.value)} /></Field>
            </div>
            <Field label="Site contact"><TextInput value={fields.contactName ?? ''} onChange={(e) => update('contactName', e.target.value)} /></Field>

            {returnToJob && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="PO #"><TextInput value={fields.workOrderNumber ?? ''} onChange={(e) => update('workOrderNumber', e.target.value)} /></Field>
                  <Field label="Dispatch #"><TextInput value={fields.dispatchNumber ?? ''} onChange={(e) => update('dispatchNumber', e.target.value)} /></Field>
                </div>
                <Field label="Reason for call"><TextArea rows={2} value={fields.reasonForCall ?? ''} onChange={(e) => update('reasonForCall', e.target.value)} /></Field>
              </>
            )}

            {rawText && (
              <div>
                <button type="button" onClick={() => setShowRaw((v) => !v)} className="text-blue-400 text-xs font-medium">
                  {showRaw ? 'Hide' : 'Show'} raw scanned text
                </button>
                {showRaw && (
                  <pre className="mt-2 text-[11px] text-zinc-400 bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {rawText}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={reset} disabled={stage === 'saving'} className="flex-1 rounded-lg bg-zinc-800 text-white text-sm font-semibold py-2.5 disabled:opacity-40">
                Retake
              </button>
              <button onClick={acceptAndSave} disabled={stage === 'saving' || !canSave} className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-semibold py-2.5 disabled:opacity-40">
                {stage === 'saving' ? 'Saving…' : returnToJob ? 'Create & Continue to Call' : 'Create Customer' + (hasAddress ? ' & Site' : '')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
