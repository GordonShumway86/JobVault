import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import TopBar from '../components/TopBar';
import StatusBadge from '../components/StatusBadge';
import PhotoThumb from '../components/PhotoThumb';
import { EQUIPMENT_CATEGORY_LABELS } from '../types';

export default function EquipmentDetail() {
  const { id } = useParams();
  const equipment = useLiveQuery(() => (id ? db.equipment.get(id) : undefined), [id]);
  const jobs = useLiveQuery(() => (id ? db.jobs.where('equipment_id').equals(id).reverse().sortBy('updated_at') : []), [id]) ?? [];
  const photos = useLiveQuery(() => (id ? db.job_attachments.where('equipment_id').equals(id).toArray() : []), [id]) ?? [];

  if (!equipment) return <div><TopBar title="Equipment" back /><div className="p-6 text-zinc-500 text-sm">Loading…</div></div>;

  const specs: [string, string | null][] = [
    ['Manufacturer', equipment.manufacturer], ['Model #', equipment.model_number], ['Serial #', equipment.serial_number],
    ['Refrigerant', equipment.refrigerant_type], ['Capacity', equipment.nominal_capacity],
    ['Voltage', equipment.voltage], ['Phase', equipment.phase], ['MCA', equipment.mca], ['MOCP', equipment.mocp],
    ['Installed', equipment.installed_date],
  ];

  return (
    <div>
      <TopBar title={equipment.nickname || EQUIPMENT_CATEGORY_LABELS[equipment.category]} back right={
        <Link to={`/equipment/${equipment.id}/edit`} className="text-blue-400 text-sm font-semibold">Edit</Link>
      } />
      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-zinc-500 text-xs font-semibold mb-2">{EQUIPMENT_CATEGORY_LABELS[equipment.category]} · {equipment.location_at_site}</div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            {specs.filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <div className="text-zinc-500 text-[11px]">{label}</div>
                <div className="text-white text-sm">{value}</div>
              </div>
            ))}
          </div>
          {equipment.equipment_notes && <div className="text-zinc-400 text-sm mt-3 pt-3 border-t border-zinc-800">{equipment.equipment_notes}</div>}
        </div>

        <Link to="/jobs/new" className="block text-center rounded-lg bg-blue-600 text-white text-sm font-semibold py-3">+ New Call for this Equipment</Link>

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
