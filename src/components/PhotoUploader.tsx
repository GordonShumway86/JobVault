import { useRef, useState } from 'react';
import { db } from '../lib/db';
import { saveRecord, makeId, logActivity } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import { PHOTO_CATEGORY_LABELS, type PhotoCategory } from '../types';

const CATEGORIES = Object.entries(PHOTO_CATEGORY_LABELS) as [PhotoCategory, string][];

export default function PhotoUploader({
  jobId,
  equipmentId,
  onAdded,
}: {
  jobId: string;
  equipmentId?: string | null;
  onAdded?: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [category, setCategory] = useState<PhotoCategory>('general_job_photo');
  const [internalOnly, setInternalOnly] = useState(false);
  const [caption, setCaption] = useState('');

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = '';
  }

  async function confirmSave() {
    if (!pendingFile) return;
    const ownerId = getOwnerId();
    if (!ownerId) return;
    const id = makeId();
    await db.pending_blobs.put({ id, blob: pendingFile, fileName: pendingFile.name });
    await saveRecord('job_attachments', {
      id,
      owner_id: ownerId,
      job_id: jobId,
      equipment_id: equipmentId ?? null,
      storage_path: `pending/${id}`, // replaced with real path once uploaded
      thumbnail_path: null,
      file_type: pendingFile.type,
      category,
      caption: caption || null,
      captured_at: new Date().toISOString(),
      internal_only: internalOnly,
      ai_extracted_text: null,
      ai_extracted_data: null,
      ai_status: 'not_processed',
      original_file_name: pendingFile.name,
      created_at: new Date().toISOString(),
    });
    await logActivity(jobId, 'photo', `Photo added (${PHOTO_CATEGORY_LABELS[category]}).`);
    setPendingFile(null);
    setCaption('');
    setCategory('general_job_photo');
    setInternalOnly(false);
    onAdded?.();
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          className="flex-1 rounded-lg bg-zinc-800 active:bg-zinc-700 text-white text-sm font-semibold py-3 flex items-center justify-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
          </svg>
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
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePicked} />
      <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />

      {pendingFile && (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2.5">
          <img src={URL.createObjectURL(pendingFile)} alt="preview" className="w-full max-h-56 object-contain rounded-lg bg-black" />
          <div>
            <span className="block text-xs font-medium text-zinc-400 mb-1">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PhotoCategory)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2.5 text-white text-sm"
            >
              {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2.5 text-white text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={internalOnly} onChange={(e) => setInternalOnly(e.target.checked)} className="w-4 h-4" />
            Internal only (never shown to customer)
          </label>
          <div className="flex gap-2">
            <button onClick={() => setPendingFile(null)} className="flex-1 rounded-lg bg-zinc-800 text-white text-sm font-semibold py-2.5">Cancel</button>
            <button onClick={confirmSave} className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-semibold py-2.5">Save Photo</button>
          </div>
        </div>
      )}
    </div>
  );
}
