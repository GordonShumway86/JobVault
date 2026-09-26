import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import PhotoThumb from '../components/PhotoThumb';
import { SYSTEM_CATEGORY_LABELS } from '../types';

const POSITION_LABELS = { outdoor: 'Outdoor', indoor: 'Indoor' };

export default function SystemDetail() {
  const { id } = useParams();
  const system = useLiveQuery(() => (id ? db.systems.get(id) : undefined), [id]);
  const components = useLiveQuery(() => (id ? db.components.where('system_id').equals(id).toArray() : []), [id]) ?? [];
  const jobs = useLiveQuery(() => (id ? db.jobs.where('system_id').equals(id).reverse().sortBy('updated_at') : []), [id]) ?? [];
  const photos = useLiveQuery(() => (id ? db.job_attachments.where('system_id').equals(id).toArray() : []), [id]) ?? [];

  if (!system) return <div><TopBar title="System" back /><div className="p-6 text-zinc-500 text-sm">Loading…</div></div>;

  const legacySpecs: [string, string | null][] = [
    ['Manufacturer', system.legacy_manufacturer], ['Model #', system.legacy_model_number],
    ['Serial #', system.legacy_serial_number], ['Manufacture date', system.legacy_manufacture_date],
    ['Refrigerant', system.legacy_refrigerant_type], ['Nominal capacity', system.legacy_nominal_capacity],
    ['Voltage', system.legacy_voltage], ['Phase', system.legacy_phase],
    ['MCA', system.legacy_mca], ['MOCP', system.legacy_mocp],
    ['Compressor model', system.legacy_compressor_model], ['Filter sizes', system.legacy_filter_sizes],
    ['Belt sizes', system.legacy_belt_sizes], ['Warranty notes', system.legacy_warranty_notes],
  ];
  const legacySpecsFilled = legacySpecs.filter(([, v]) => v);

  return (
    <div>
      <TopBar title={system.nickname || SYSTEM_CATEGORY_LABELS[system.category]} back right={
        <Link to={`/systems/${system.id}/edit`} className="text-blue-400 text-sm font-semibold">Edit</Link>
      } />
      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-zinc-500 text-xs font-semibold mb-2">
            {SYSTEM_CATEGORY_LABELS[system.category]}
            {system.system_type && ` · ${system.system_type}`}
            {system.configuration && ` · ${system.configuration}`}
            {system.location_at_site && ` · ${system.location_at_site}`}
          </div>
          {legacySpecsFilled.length > 0 && (
            <div className="grid grid-cols-2 gap-y-2 gap-x-3 pb-3 mb-3 border-b border-zinc-800">
              {legacySpecsFilled.map(([label, value]) => (
                <div key={label}>
                  <div className="text-zinc-500 text-[11px]">{label}</div>
                  <div className="text-white text-sm">{value}</div>
                </div>
              ))}
            </div>
          )}
          {system.installed_date && <div className="text-zinc-400 text-xs">Installed {system.installed_date}</div>}
          {system.system_notes && <div className="text-zinc-400 text-sm mt-2">{system.system_notes}</div>}
        </div>

        <Link to="/jobs/new" className="block text-center rounded-lg bg-blue-600 text-white text-sm font-semibold py-3">+ New Call for this System</Link>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-bold text-base">Components ({components.length})</h2>
            <Link to={`/systems/${system.id}/edit`} className="text-blue-400 text-xs font-semibold">+ Add Component</Link>
          </div>
          <div className="space-y-2.5">
            {components.length === 0 && <div className="text-zinc-500 text-sm">No components on record yet.</div>}
            {components.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="text-white font-semibold text-sm">
                  {c.name || c.component_type || 'Component'}
                </div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  {c.position && `${POSITION_LABELS[c.position]} · `}{c.component_type}
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 mt-2 text-xs">
                  {c.manufacturer && <div><span className="text-zinc-500">Mfr </span><span className="text-zinc-300">{c.manufacturer}</span></div>}
                  {c.model_number && <div><span className="text-zinc-500">Model </span><span className="text-zinc-300">{c.model_number}</span></div>}
                  {c.serial_number && <div><span className="text-zinc-500">Serial </span><span className="text-zinc-300">{c.serial_number}</span></div>}
                  {c.refrigerant_type && <div><span className="text-zinc-500">Refrig. </span><span className="text-zinc-300">{c.refrigerant_type}</span></div>}
                  {c.voltage && <div><span className="text-zinc-500">Volts </span><span className="text-zinc-300">{c.voltage}</span></div>}
                  {c.phase && <div><span className="text-zinc-500">Phase </span><span className="text-zinc-300">{c.phase}</span></div>}
                  {c.mca && <div><span className="text-zinc-500">MCA </span><span className="text-zinc-300">{c.mca}</span></div>}
                  {c.mocp && <div><span className="text-zinc-500">MOCP </span><span className="text-zinc-300">{c.mocp}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {photos.length > 0 && (
          <div>
            <h2 className="text-white font-bold text-base mb-2">Photos</h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => <PhotoThumb key={p.id} attachment={p} />)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-white font-bold text-base mb-2">Service History</h2>
          <div className="space-y-2.5">
            {jobs.length === 0 && <div className="text-zinc-500 text-sm">No service history yet.</div>}
            {jobs.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{j.job_number}</span>
                  <StatusBadge status={j.status} />
                </div>
                {j.diagnosis && <div className="text-zinc-500 text-xs mt-1 truncate">{j.diagnosis}</div>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
