import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function TopBar({ title, back = false, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3.5 flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+0.875rem)]">
      {back && (
        <button onClick={() => navigate(-1)} className="text-zinc-400 -ml-1 p-1" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <h1 className="text-lg font-bold text-white flex-1 truncate">{title}</h1>
      {right}
    </div>
  );
}
