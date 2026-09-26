import { useRef, useState } from 'react';
import { loadImage, preprocessImage, runOcr } from '../lib/ocr';
import { isStaleChunkError } from '../lib/staleChunk';
import { extractNameplateFields, type NameplateExtraction } from '../lib/nameplateOcr';

// A lighter-weight nameplate scan than NameplateScanner.tsx: no job/photo
// attachment involved (there's no job yet while an Equipment record is
// first being created from a Site), it just runs the same OCR + extraction
// and hands the guesses back to whatever form is already on screen — the
// form's own fields ARE the review step, so there's no separate review
// screen here.
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
  const [scanned, setScanned] = useState(false);

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setError(null);
    setBusy(true);
    setStatusText('Loading OCR engine…');
    try {
      const img = await loadImage(picked);
      const canvas = preprocessImage(img, 180);
      setStatusText('Reading nameplate…');
      const text = await runOcr(canvas);
      onExtracted(extractNameplateFields(text));
      setStatusText('Scanned — review the fields below.');
      setScanned(true);
    } catch (err) {
      if (isStaleChunkError(err)) {
        setStatusText('Update found — reloading…');
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not read the photo. You can still fill in the fields by hand.');
      setScanned(false);
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
      {scanned && !busy && (
        <div className="text-amber-200 text-[11px]">
          AI extraction may be inaccurate — review and correct every field below before saving.
        </div>
      )}
    </div>
  );
}
