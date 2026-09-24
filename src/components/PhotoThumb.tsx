import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { JobAttachment } from '../types';
import { PHOTO_CATEGORY_LABELS } from '../types';

export default function PhotoThumb({ attachment, onClick }: { attachment: JobAttachment; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const pending = await db.pending_blobs.get(attachment.id);
      if (pending) {
        objectUrl = URL.createObjectURL(pending.blob);
        if (!cancelled) setUrl(objectUrl);
        return;
      }
      if (isSupabaseConfigured && navigator.onLine) {
        const { data } = await supabase.storage.from('job-attachments').createSignedUrl(attachment.storage_path, 3600);
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, attachment.storage_path]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 block w-full"
    >
      {url ? (
        <img src={url} alt={attachment.caption ?? ''} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">…</div>
      )}
      <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-white px-1.5 py-1 truncate">
        {PHOTO_CATEGORY_LABELS[attachment.category]}
      </span>
      {attachment.internal_only && (
        <span className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">INTERNAL</span>
      )}
    </button>
  );
}
