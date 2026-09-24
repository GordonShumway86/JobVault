import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import type { Job } from '../types';
import StatusBadge from '../components/StatusBadge';
import { formatDistanceToNow, isToday, parseISO } from 'date-fns';

const OPEN_STATUSES: Job['status'][] = [
  'new', 'scheduled', 'en_route', 'on_site', 'diagnosing',
  'waiting_on_customer_approval', 'quote_sent', 'quote_approved',
  'waiting_on_parts', 'parts_ordered', 'return_visit_needed', 'warranty_callback',
];

export default function Dashboard() {
  const [q, setQ] = useState('');
  const jobs = useLiveQuery(() => db.jobs.toArray(), []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const sites = useLiveQuery(() => db.sites.toArray(), []);

  const customerMap = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c])), [customers]);
  const siteMap = useMemo(() => new Map((sites ?? []).map((s) => [s.id, s])), [sites]);

  const all = jobs ?? [];
  const today = all.filter((j) => j.scheduled_at && isToday(parseISO(j.scheduled_at)));
  const waitingApproval = all.filter((j) => j.status === 'waiting_on_customer_approval' || j.status === 'quote_sent');
  const waitingParts = all.filter((j) => j.status === 'waiting_on_parts' || j.status === 'parts_ordered');
  const returnDue = all.filter((j) => j.return_visit_required && j.status !== 'closed' && j.status !== 'cancelled');
  const recentlyCompleted = all
    .filter((j) => j.status === 'work_complete' || j.status === 'closed' || j.status === 'invoice_ready')
    .sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at))
    .slice(0, 5);
  const open = all
    .filter((j) => OPEN_STATUSES.includes(j.status))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const filtered = q.trim()
    ? open.filter((j) => {
        const c = customerMap.get(j.customer_id);
        const s = siteMap.get(j.site_id);
        const haystack = `${j.job_number} ${c?.name ?? ''} ${s?.name ?? ''} ${s?.address ?? ''} ${j.customer_complaint ?? ''}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      })
    : open;

  return (
    <div>
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 pt-[calc(env(safe-area-inset-top)+0.875rem)] pb-3.5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-bold text-white">Service Log</div>
            <div className="text-zinc-500 text-sm">Today's board</div>
          </div>
          <Link
            to="/jobs/new"
            className="rounded-full bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm px-5 py-3 shadow-lg shadow-blue-900/40"
          >
            + New Call
          </Link>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jobs, customers, addresses…"
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-white text-base placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        <CountCard label="Today's Calls" count={today.length} color="blue" to="/jobs?filter=today" />
        <CountCard label="Waiting on Approval" count={waitingApproval.length} color="amber" to="/jobs?filter=approval" />
        <CountCard label="Waiting on Parts" count={waitingParts.length} color="orange" to="/jobs?filter=parts" />
        <CountCard label="Return Visits Due" count={returnDue.length} color="red" to="/jobs?filter=return" />
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold text-base">Open Jobs</h2>
          <Link to="/jobs" className="text-blue-400 text-sm font-medium">See all</Link>
        </div>
        <div className="space-y-2.5">
          {filtered.length === 0 && (
            <div className="text-zinc-500 text-sm py-8 text-center border border-dashed border-zinc-800 rounded-xl">
              No open jobs. Tap "New Call" to log one.
            </div>
          )}
          {filtered.slice(0, 20).map((job) => (
            <JobCard key={job.id} job={job} customerName={customerMap.get(job.customer_id)?.name} siteName={siteMap.get(job.site_id)?.name} />
          ))}
        </div>
      </div>

      {recentlyCompleted.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-white font-bold text-base mb-2">Recently Completed</h2>
          <div className="space-y-2.5">
            {recentlyCompleted.map((job) => (
              <JobCard key={job.id} job={job} customerName={customerMap.get(job.customer_id)?.name} siteName={siteMap.get(job.site_id)?.name} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CountCard({ label, count, color, to }: { label: string; count: number; color: string; to: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400', amber: 'text-amber-400', orange: 'text-orange-400', red: 'text-red-400',
  };
  return (
    <Link to={to} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className={`text-3xl font-extrabold ${colorMap[color]}`}>{count}</div>
      <div className="text-zinc-400 text-xs font-medium mt-0.5">{label}</div>
    </Link>
  );
}

function JobCard({ job, customerName, siteName }: { job: Job; customerName?: string; siteName?: string }) {
  return (
    <Link to={`/jobs/${job.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 active:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-white font-semibold text-sm truncate">{customerName ?? 'Unknown customer'}</div>
          <div className="text-zinc-500 text-xs truncate">{siteName ?? '—'}</div>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-zinc-500 text-xs font-mono">{job.job_number}</span>
        <span className="text-zinc-500 text-xs">{formatDistanceToNow(parseISO(job.updated_at), { addSuffix: true })}</span>
      </div>
    </Link>
  );
}
