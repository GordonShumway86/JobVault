import { useRef, useState } from 'react';
import { loadImage, preprocessImage, runOcr, StaleChunkImportError } from '../lib/ocr';
import { extractNameplateFields, type NameplateExtraction } from '../lib/nameplateOcr';

const FIELD_LABELS: Record<keyof NameplateExtraction, string> = {
  manufacturer: 'manufacturer', model_number: 'model #', serial_number: 'serial #',
  refrigerant_type: 'refrigerant', voltage: 'voltage', phase: 'phase', mca: 'MCA', mocp: 'MOCP',
};

// A lighter-weight nameplate scan than NameplateScanner.tsx: no job/photo
// attachment involved (there's no job yet while a System/Component is
// first being created from a Site), it just runs the same OCR + extraction
// and hands the guesses back to whatever form is already on screen — the
// form's own fields ARE the review step, so there's no separate review
// screen here. Used once per Component on the System form.
export default function NameplateScanButton({
  onExtracted,
}: {
  onExtracted: (fields: NameplateExtraction) => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [foundCount, setFoundCount] = useState<number | null>(null);

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setError(null);
    setBusy(true);
    setFoundCount(null);
    setStatusText('Loading OCR engine…');
    try {
      const img = await loadImage(picked);
      const canvas = preprocessImage(img, 180);
      setStatusText('Reading nameplate…');
      const text = await runOcr(canvas);
      setRawText(text);
      const extracted = extractNameplateFields(text);
      onExtracted(extracted);
      const found = Object.values(extracted).filter(Boolean).length;
      setFoundCount(found);
      setStatusText(
        found > 0
          ? `Scanned — filled in ${found} of ${Object.keys(FIELD_LABELS).length} field(s). Review below.`
          : "Scanned, but couldn't confidently read any fields from this photo — fill them in by hand, or check \"Show raw scanned text\" below to see what it read.",
      );
    } catch (err) {
      if (err instanceof StaleChunkImportError) {
        setStatusText('Update found — reloading…');
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not read the photo. You can still fill in the fields by hand.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          disabled={busy}
          className="flex-1 rounded-lg bg-zinc-800 active:bg-zinc-700 text-white text-sm font-semibold py-3 disabled:opacity-40"
        >
          {busy ? 'Scanning…' : 'Scan Nameplate — Take Photo'}
        </button>
        <button
          type="button"
          onClick={() => libraryInput.current?.click()}
          disabled={busy}
          className="flex-1 rounded-lg bg-zinc-800 active:bg-zinc-700 text-white text-sm font-semibold py-3 disabled:opacity-40"
        >
          Choose from Library
        </button>
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePicked} />
      <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />
      {statusText && !error && <div className="text-zinc-400 text-xs">{statusText}</div>}
      {error && <div className="text-red-400 text-xs">{error}</div>}
      {foundCount !== null && foundCount > 0 && !busy && (
        <div className="text-amber-200 text-[11px]">
          AI extraction may be inaccurate — review and correct every field below before saving.
        </div>
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
    </div>
  );
}
