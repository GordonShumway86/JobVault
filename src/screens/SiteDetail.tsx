import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import { SYSTEM_CATEGORY_LABELS } from '../types';

export default function SiteDetail() {
  const { id } = useParams();
  const site = useLiveQuery(() => (id ? db.sites.get(id) : undefined), [id]);
  const systems = useLiveQuery(() => (id ? db.systems.where('site_id').equals(id).toArray() : []), [id]) ?? [];
  const jobs = useLiveQuery(() => (id ? db.jobs.where('site_id').equals(id).reverse().sortBy('updated_at') : []), [id]) ?? [];

  if (!site) return <div><TopBar title="Site" back /><div className="p-6 text-zinc-500 text-sm">Loading…</div></div>;

  const openJobs = jobs.filter((j) => !['closed', 'cancelled'].includes(j.status));

  return (
    <div>
      <TopBar title={site.name} back right={
        <Link to={`/sites/${site.id}/edit`} className="text-blue-400 text-sm font-semibold">Edit</Link>
      } />
      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1.5">
          <div className="text-white text-sm">{site.address}</div>
          <div className="text-zinc-500 text-xs">{[site.city, site.state, site.zip].filter(Boolean).join(', ')}</div>
          {site.primary_contact_name && <div className="text-zinc-300 text-sm pt-1">{site.primary_contact_name} · {site.contact_phone}</div>}
          {site.access_instructions && (
            <div className="mt-2 text-sm text-amber-200 bg-amber-950/40 border border-amber-900/40 rounded-lg p-2.5">
              {site.access_instructions}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Link to={`/sites/${site.id}/systems/new`} className="flex-1 text-center rounded-lg bg-zinc-800 text-white text-sm font-semibold py-3">+ Add System</Link>
          <Link to="/jobs/new" className="flex-1 text-center rounded-lg bg-blue-600 text-white text-sm font-semibold py-3">+ New Call</Link>
        </div>

        <div>
          <h2 className="text-white font-bold text-base mb-2">Systems</h2>
          <div className="space-y-2.5">
            {systems.length === 0 && <div className="text-zinc-500 text-sm">No systems on record.</div>}
            {systems.map((s) => (
              <Link key={s.id} to={`/systems/${s.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="text-white font-semibold text-sm">{s.nickname || s.system_type || SYSTEM_CATEGORY_LABELS[s.category]}</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  {SYSTEM_CATEGORY_LABELS[s.category]}
                  {s.system_type && ` · ${s.system_type}`}
                  {s.configuration && ` · ${s.configuration}`}
                  {s.location_at_site && ` · ${s.location_at_site}`}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-white font-bold text-base mb-2">Jobs ({openJobs.length} open)</h2>
          <div className="space-y-2.5">
            {jobs.length === 0 && <div className="text-zinc-500 text-sm">No jobs yet.</div>}
            {jobs.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{j.job_number}</span>
                  <StatusBadge status={j.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
