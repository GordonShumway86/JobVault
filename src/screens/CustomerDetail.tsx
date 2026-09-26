import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { deleteCustomerCascade } from '../lib/repo';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = useLiveQuery(() => (id ? db.customers.get(id) : undefined), [id]);
  const sites = useLiveQuery(() => (id ? db.sites.where('customer_id').equals(id).toArray() : []), [id]) ?? [];
  const jobs = useLiveQuery(() => (id ? db.jobs.where('customer_id').equals(id).reverse().sortBy('updated_at') : []), [id]) ?? [];
  const siteIds = useMemo(() => sites.map((s) => s.id), [sites]);
  const systemsCount = useLiveQuery(
    () => (siteIds.length ? db.systems.where('site_id').anyOf(siteIds).count() : 0),
    [siteIds],
  ) ?? 0;

  if (!customer) return <div><TopBar title="Customer" back /><div className="p-6 text-zinc-500 text-sm">Loading…</div></div>;

  const openJobs = jobs.filter((j) => !['closed', 'cancelled'].includes(j.status));

  async function deleteThisCustomer() {
    if (!customer) return;
    const ok = window.confirm(
      `Delete ${customer.name} completely? This permanently removes ${sites.length} site${sites.length === 1 ? '' : 's'}, `
      + `${systemsCount} system${systemsCount === 1 ? '' : 's'}, and ${jobs.length} call${jobs.length === 1 ? '' : 's'} `
      + `(with all their photos, notes, parts, and quotes). This cannot be undone.`,
    );
    if (!ok) return;
    await deleteCustomerCascade(customer.id);
    navigate('/customers');
  }

  return (
    <div>
      <TopBar title={customer.name} back right={
        <Link to={`/customers/${customer.id}/edit`} className="text-blue-400 text-sm font-semibold">Edit</Link>
      } />
      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1.5">
          {customer.primary_contact_name && <div className="text-white text-sm">{customer.primary_contact_name}</div>}
          {customer.billing_address && <div className="text-zinc-500 text-xs mt-1">{customer.billing_address}</div>}
          <div className="flex gap-3 text-xs text-zinc-500 pt-2">
            <span>{openJobs.length} open job{openJobs.length === 1 ? '' : 's'}</span>
            <span>{sites.length} site{sites.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={`/customers/${customer.id}/sites/new`} className="flex-1 text-center rounded-lg bg-zinc-800 text-white text-sm font-semibold py-3">+ Add Site</Link>
          <Link to="/jobs/new" className="flex-1 text-center rounded-lg bg-blue-600 text-white text-sm font-semibold py-3">+ New Call</Link>
        </div>

        <div>
          <h2 className="text-white font-bold text-base mb-2">Sites</h2>
          <div className="space-y-2.5">
            {sites.length === 0 && <div className="text-zinc-500 text-sm">No sites yet.</div>}
            {sites.map((s) => (
              <Link key={s.id} to={`/sites/${s.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="text-white font-semibold text-sm">{s.name}</div>
                <div className="text-zinc-500 text-xs mt-0.5">{s.address}{s.city ? `, ${s.city}` : ''}{s.state ? `, ${s.state}` : ''}</div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-white font-bold text-base mb-2">Job History</h2>
          <div className="space-y-2.5">
            {jobs.length === 0 && <div className="text-zinc-500 text-sm">No jobs yet.</div>}
            {jobs.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{j.job_number}</span>
                  <StatusBadge status={j.status} />
                </div>
                {j.reason_for_call && <div className="text-zinc-500 text-xs mt-1 truncate">{j.reason_for_call}</div>}
              </Link>
            ))}
          </div>
        </div>

        <button
          onClick={deleteThisCustomer}
          className="w-full rounded-xl border border-red-900/50 text-red-400 text-sm font-semibold py-3 mt-2"
        >
          Delete Customer
        </button>
      </div>
    </div>
  );
}
