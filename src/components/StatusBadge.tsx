import { JOB_STATUS_COLORS, JOB_STATUS_LABELS, type JobStatus } from '../types';

const COLOR_CLASSES: Record<string, string> = {
  slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  zinc: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
};

// Color-coded but the text label always renders too, so status is never
// conveyed by color alone (dirty hands, bright sun, colorblind users).
export default function StatusBadge({ status }: { status: JobStatus }) {
  const color = COLOR_CLASSES[JOB_STATUS_COLORS[status]] ?? COLOR_CLASSES.slate;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${color}`}>
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
