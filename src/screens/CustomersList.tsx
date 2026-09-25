import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import TopBar from '../components/TopBar';

export default function CustomersList() {
  const [q, setQ] = useState('');
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) ?? [];
  const sites = useLiveQuery(() => db.sites.toArray(), []) ?? [];

  const list = customers.filter((c) => !c.archived && (!q.trim() || c.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <TopBar title="Customers" right={
        <div className="flex items-center gap-3">
          <Link to="/customers/scan" className="text-blue-400 text-sm font-semibold">Scan Ticket</Link>
          <Link to="/customers/new" className="text-blue-400 text-sm font-semibold">+ New</Link>
        </div>
      } />
      <div className="px-4 py-3 border-b border-zinc-800">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers…"
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-white text-base placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="p-4 space-y-2.5">
        {list.length === 0 && <div className="text-zinc-500 text-sm py-10 text-center">No customers yet.</div>}
        {list.map((c) => {
          const siteCount = sites.filter((s) => s.customer_id === c.id && !s.archived).length;
          return (
            <Link key={c.id} to={`/customers/${c.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 active:bg-zinc-900">
              <div className="text-white font-semibold text-sm">{c.name}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{siteCount} site{siteCount === 1 ? '' : 's'}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
