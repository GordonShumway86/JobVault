import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../lib/db';
import type { Job, JobStatus } from '../types';
import { CALL_TYPE_LABELS, JOB_STATUS_LABELS } from '../types';
import StatusBadge from '../components/StatusBadge';
import TopBar from '../components/TopBar';
import { formatDistanceToNow, parseISO } from 'date-fns';

const QUICK_FILTERS: Record<string, (j: Job) => boolean> = {
  today: (j) => !!j.scheduled_at && new Date(j.scheduled_at).toDateString() === new Date().toDateString(),
  approval: (j) => j.status === 'waiting_on_customer_approval' || j.status === 'quote_sent',
  parts: (j) => j.status === 'waiting_on_parts' || j.status === 'parts_ordered',
  return: (j) => j.return_visit_required,
};

export default function JobsList() {
  const [params] = useSearchParams();
  const quickFilter = params.get('filter');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [callType, setCallType] = useState('');

  const jobs = useLiveQuery(() => db.jobs.orderBy('updated_at').reverse().toArray(), []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const sites = useLiveQuery(() => db.sites.toArray(), []);
  const equipment = useLiveQuery(() => db.equipment.toArray(), []);

  const customerMap = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c])), [customers]);
  const siteMap = useMemo(() => new Map((sites ?? []).map((s) => [s.id, s])), [sites]);
  const equipmentMap = useMemo(() => new Map((equipment ?? []).map((e) => [e.id, e])), [equipment]);

  let list = jobs ?? [];
  if (quickFilter && QUICK_FILTERS[quickFilter]) list = list.filter(QUICK_FILTERS[quickFilter]);
  if (status) list = list.filter((j) => j.status === status);
  if (callType) list = list.filter((j) => j.call_type === callType);
  if (q.trim()) {
    const needle = q.toLowerCase();
    list = list.filter((j) => {
      const c = customerMap.get(j.customer_id);
      const s = siteMap.get(j.site_id);
      const e = j.equipment_id ? equipmentMap.get(j.equipment_id) : undefined;
      const haystack = [
        j.job_number, j.work_order_number, j.dispatch_number, c?.name, s?.name, s?.address, s?.city, s?.state,
        e?.model_number, e?.serial_number, j.reason_for_call, j.technician_notes, j.diagnosis, j.work_performed,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }

  return (
    <div>
      <TopBar title="Jobs" />
      <div className="px-4 py-3 space-y-2.5 border-b border-zinc-800">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search job #, customer, address, model, serial…"
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-white text-base placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus | '')}
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-white text-sm shrink-0"
          >
            <option value="">All statuses</option>
            {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-white text-sm shrink-0"
          >
            <option value="">All call types</option>
            {Object.entries(CALL_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        {list.length === 0 && <div className="text-zinc-500 text-sm py-10 text-center">No jobs match.</div>}
        {list.map((job) => {
          const c = customerMap.get(job.customer_id);
          const s = siteMap.get(job.site_id);
          const e = job.equipment_id ? equipmentMap.get(job.equipment_id) : undefined;
          return (
            <Link key={job.id} to={`/jobs/${job.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 active:bg-zinc-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{c?.name ?? 'Unknown customer'}</div>
                  <div className="text-zinc-500 text-xs truncate">
                    {s?.name}{s?.city ? ` — ${s.city}${s.state ? `, ${s.state}` : ''}` : ''}{e ? ` · ${e.nickname || e.model_number || ''}` : ''}
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-zinc-500 text-xs font-mono">{job.job_number}</span>
                <span className="text-zinc-500 text-xs">{CALL_TYPE_LABELS[job.call_type]} · {formatDistanceToNow(parseISO(job.updated_at), { addSuffix: true })}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
