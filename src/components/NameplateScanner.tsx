import { useRef, useState } from 'react';
import { db } from '../lib/db';
import { saveRecord, makeId, logActivity } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { extractNameplateFields, type NameplateExtraction } from '../lib/nameplateOcr';
import { loadImage, preprocessImage, runOcr, StaleChunkImportError, type CropRect } from '../lib/ocr';
import type { Component } from '../types';
import { Field, TextInput, Select } from './Field';
import ImageCropper from './ImageCropper';

type Stage = 'idle' | 'cropping' | 'processing' | 'review' | 'saving';

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

function fieldsFromComponent(c: Component): NameplateExtraction {
  return {
    manufacturer: c.manufacturer, model_number: c.model_number, serial_number: c.serial_number,
    refrigerant_type: c.refrigerant_type, voltage: c.voltage, phase: c.phase, mca: c.mca, mocp: c.mocp,
  };
}

// Scans a nameplate photo for one specific Component of the System this job
// is tied to (a System has no nameplate of its own — see types/index.ts) —
// if the System has more than one Component, the tech picks which one this
// photo is for before scanning.
export default function NameplateScanner({
  jobId,
  systemId,
  components,
  onSaved,
}: {
  jobId: string;
  systemId: string;
  components: Component[];
  onSaved?: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [componentId, setComponentId] = useState(components[0]?.id ?? '');
  const [stage, setStage] = useState<Stage>('idle');
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingImg, setPendingImg] = useState<HTMLImageElement | null>(null);
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [fields, setFields] = useState<NameplateExtraction | null>(null);

  const selected = components.find((c) => c.id === componentId) ?? components[0];

  function reset() {
    setStage('idle'); setError(null); setFile(null); setPreviewUrl(null); setPendingImg(null); setRawText(''); setShowRaw(false); setFields(null);
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked || !selected) return;
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setError(null);
    try {
      setPendingImg(await loadImage(picked));
      setStage('cropping');
    } catch {
      setError('Could not load that photo.');
    }
  }

  async function runOcrOnCrop(crop?: CropRect) {
    const img = pendingImg;
    if (!img || !selected) return;
    setStage('processing');
    setStatusText('Loading OCR engine…');
    try {
      const canvas = preprocessImage(img, 180, crop);
      setStatusText('Reading nameplate…');
      const text = await runOcr(canvas, 'label');
      setRawText(text);
      const extracted = extractNameplateFields(text);
      const current = fieldsFromComponent(selected);
      setFields({
        manufacturer: extracted.manufacturer ?? current.manufacturer,
        model_number: extracted.model_number ?? current.model_number,
        serial_number: extracted.serial_number ?? current.serial_number,
        refrigerant_type: extracted.refrigerant_type ?? current.refrigerant_type,
        voltage: extracted.voltage ?? current.voltage,
        phase: extracted.phase ?? current.phase,
        mca: extracted.mca ?? current.mca,
        mocp: extracted.mocp ?? current.mocp,
      });
      setStage('review');
    } catch (err) {
      if (err instanceof StaleChunkImportError) {
        setStatusText('Update found — reloading…');
        window.location.reload();
        return;
      }
      setFields(fieldsFromComponent(selected));
      setError(err instanceof Error ? err.message : 'Could not read the photo. You can still fill in the fields by hand.');
      setStage('review');
    } finally {
      URL.revokeObjectURL(img.src);
      setPendingImg(null);
    }
  }

  async function acceptAndSave() {
    const ownerId = getOwnerId();
    if (!ownerId || !file || !fields || !selected) return;
    setStage('saving');
    const attachmentId = makeId();
    await db.pending_blobs.put({ id: attachmentId, blob: file, fileName: file.name });
    await saveRecord('job_attachments', {
      id: attachmentId, owner_id: ownerId, job_id: jobId, system_id: systemId,
      storage_path: `pending/${attachmentId}`, thumbnail_path: null, file_type: file.type,
      category: 'equipment_nameplate', caption: selected.name || selected.component_type || null, captured_at: new Date().toISOString(),
      internal_only: false, ai_extracted_text: rawText || null, ai_extracted_data: fields,
      ai_status: 'reviewed', original_file_name: file.name, created_at: new Date().toISOString(),
    });
    await saveRecord('components', {
      ...selected,
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
    await logActivity(jobId, 'photo', `Nameplate scanned — ${selected.name || selected.component_type || 'component'} specs reviewed and saved.`);
    onSaved?.();
    reset();
  }

  if (!selected) return null;

  return (
    <div className="space-y-3">
      {components.length > 1 && stage === 'idle' && (
        <Field label="Which component?">
          <Select value={componentId} onChange={(e) => setComponentId(e.target.value)}>
            {components.map((c) => <option key={c.id} value={c.id}>{c.name || c.component_type || 'Component'}</option>)}
          </Select>
        </Field>
      )}

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

      {previewUrl && stage !== 'cropping' && <img src={previewUrl} alt="nameplate" className="w-full max-h-56 object-contain rounded-lg bg-black" />}

      {stage === 'cropping' && pendingImg && (
        <ImageCropper imageUrl={pendingImg.src} onConfirm={runOcrOnCrop} onSkip={() => runOcrOnCrop(undefined)} />
      )}

      {stage === 'processing' && (
        <div className="text-zinc-400 text-sm text-center py-3">{statusText}</div>
      )}

      {(stage === 'review' || stage === 'saving') && fields && (
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
                  onChange={(e) => setFields((f) => (f ? { ...f, [key]: e.target.value } : f))}
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
