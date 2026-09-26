import { useRef, useState } from 'react';
import { db } from '../lib/db';
import { saveRecord, makeId, logActivity } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { extractNameplateFields, type NameplateExtraction } from '../lib/nameplateOcr';
import { isStaleChunkError } from '../lib/staleChunk';
import { loadImage, preprocessImage, runOcr } from '../lib/ocr';
import type { Equipment } from '../types';
import { Field, TextInput } from './Field';

type Stage = 'idle' | 'processing' | 'review' | 'saving';

const FIELD_LABELS: Record<keyof NameplateExtraction, string> = {
  manufacturer: 'Manufacturer',
  model_number: 'Model #',
  serial_number: 'Serial #',
  refrigerant_type: 'Refrigerant',
  voltage: 'Voltage',
  phase: 'Phase',
  mca: 'MCA',
  mocp: 'MOCP',
};

export default function NameplateScanner({
  jobId,
  equipment,
  onSaved,
}: {
  jobId: string;
  equipment: Equipment;
  onSaved?: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [fields, setFields] = useState<NameplateExtraction>({
    manufacturer: equipment.manufacturer, model_number: equipment.model_number,
    serial_number: equipment.serial_number, refrigerant_type: equipment.refrigerant_type,
    voltage: equipment.voltage, phase: equipment.phase, mca: equipment.mca, mocp: equipment.mocp,
  });

  function reset() {
    setStage('idle'); setError(null); setFile(null); setPreviewUrl(null); setRawText(''); setShowRaw(false);
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setError(null);
    setStage('processing');
    setStatusText('Loading OCR engine…');
    try {
      const img = await loadImage(picked);
      const canvas = preprocessImage(img, 180);
      setStatusText('Reading nameplate…');
      const text = await runOcr(canvas);
      setRawText(text);
      const extracted = extractNameplateFields(text);
      setFields({
        manufacturer: extracted.manufacturer ?? equipment.manufacturer,
        model_number: extracted.model_number ?? equipment.model_number,
        serial_number: extracted.serial_number ?? equipment.serial_number,
        refrigerant_type: extracted.refrigerant_type ?? equipment.refrigerant_type,
        voltage: extracted.voltage ?? equipment.voltage,
        phase: extracted.phase ?? equipment.phase,
        mca: extracted.mca ?? equipment.mca,
        mocp: extracted.mocp ?? equipment.mocp,
      });
      setStage('review');
    } catch (err) {
      if (isStaleChunkError(err)) {
        setStatusText('Update found — reloading…');
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not read the photo. You can still fill in the fields by hand.');
      setStage('review');
    }
  }

  async function acceptAndSave() {
    const ownerId = getOwnerId();
    if (!ownerId || !file) return;
    setStage('saving');
    const attachmentId = makeId();
    await db.pending_blobs.put({ id: attachmentId, blob: file, fileName: file.name });
    await saveRecord('job_attachments', {
      id: attachmentId, owner_id: ownerId, job_id: jobId, equipment_id: equipment.id,
      storage_path: `pending/${attachmentId}`, thumbnail_path: null, file_type: file.type,
      category: 'equipment_nameplate', caption: null, captured_at: new Date().toISOString(),
      internal_only: false, ai_extracted_text: rawText || null, ai_extracted_data: fields,
      ai_status: 'reviewed', original_file_name: file.name, created_at: new Date().toISOString(),
    });
    await saveRecord('equipment', {
      ...equipment,
      manufacturer: fields.manufacturer || null,
      model_number: fields.model_number || null,
      serial_number: fields.serial_number || null,
      refrigerant_type: fields.refrigerant_type || null,
      voltage: fields.voltage || null,
      phase: fields.phase || null,
      mca: fields.mca || null,
      mocp: fields.mocp || null,
      updated_at: new Date().toISOString(),
    });
    await logActivity(jobId, 'photo', 'Nameplate scanned — equipment specs reviewed and saved.');
    onSaved?.();
    reset();
  }

  if (stage === 'idle') {
    return (
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
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePicked} />
        <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {previewUrl && <img src={previewUrl} alt="nameplate" className="w-full max-h-56 object-contain rounded-lg bg-black" />}

      {stage === 'processing' && (
        <div className="text-zinc-400 text-sm text-center py-3">{statusText}</div>
      )}

      {(stage === 'review' || stage === 'saving') && (
        <>
          <div className="text-amber-200 text-xs bg-amber-950/40 border border-amber-900/40 rounded-lg p-2.5">
            AI extraction may be inaccurate — review and correct every field below before saving.
          </div>
          {error && <div className="text-red-400 text-xs">{error}</div>}
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(FIELD_LABELS) as (keyof NameplateExtraction)[]).map((key) => (
              <Field key={key} label={FIELD_LABELS[key]}>
                <TextInput
                  value={fields[key] ?? ''}
                  onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
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
              Cancel
            </button>
            <button onClick={acceptAndSave} disabled={stage === 'saving'} className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-semibold py-2.5 disabled:opacity-40">
              {stage === 'saving' ? 'Saving…' : 'Accept and Save'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
