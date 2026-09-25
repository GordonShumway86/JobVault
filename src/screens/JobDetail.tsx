import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { saveRecord, makeId, logActivity, deleteJobCascade } from '../lib/repo';
import { getOwnerId } from '../auth/AuthContext';
import TopBar from '../components/TopBar';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import PhotoUploader from '../components/PhotoUploader';
import PhotoThumb from '../components/PhotoThumb';
import NameplateScanner from '../components/NameplateScanner';
import { Field, Select, TextArea, TextInput } from '../components/Field';
import {
  CALL_TYPE_LABELS, JOB_STATUS_LABELS, FOLLOWUP_REASON_LABELS,
  type JobStatus, type FollowupReason,
} from '../types';
import { format, parseISO } from 'date-fns';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = useLiveQuery(() => (id ? db.jobs.get(id) : undefined), [id]);
  const customer = useLiveQuery(() => (job ? db.customers.get(job.customer_id) : undefined), [job?.customer_id]);
  const site = useLiveQuery(() => (job ? db.sites.get(job.site_id) : undefined), [job?.site_id]);
  const equipment = useLiveQuery(() => (job?.equipment_id ? db.equipment.get(job.equipment_id) : undefined), [job?.equipment_id]);
  const activity = useLiveQuery(() => (id ? db.job_activity.where('job_id').equals(id).sortBy('created_at') : []), [id]) ?? [];
  const attachments = useLiveQuery(() => (id ? db.job_attachments.where('job_id').equals(id).toArray() : []), [id]) ?? [];
  const followUps = useLiveQuery(() => (id ? db.follow_up_tasks.where('job_id').equals(id).sortBy('due_date') : []), [id]) ?? [];

  const [noteText, setNoteText] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [fuTitle, setFuTitle] = useState('');
  const [fuDue, setFuDue] = useState('');
  const [fuReason, setFuReason] = useState<FollowupReason>('other');

  const timeline = useMemo(() => {
    const items = [
      ...activity.map((a) => ({ id: a.id, kind: a.kind, body: a.body, at: a.created_at })),
      ...attachments.map((a) => ({ id: `att-${a.id}`, kind: 'photo_item', body: a.caption, at: a.created_at, attachment: a })),
    ];
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [activity, attachments]);

  if (!job) {
    return (
      <div>
        <TopBar title="Job" back />
        <div className="p-6 text-zinc-500 text-sm">Loading…</div>
      </div>
    );
  }

  async function addNote() {
    if (!noteText.trim() || !job) return;
    await logActivity(job.id, 'note', noteText.trim());
    setNoteText('');
  }

  async function changeStatus(newStatus: JobStatus) {
    if (!job) return;
    const now = new Date().toISOString();
    const updated = {
      ...job,
      status: newStatus,
      updated_at: now,
      completed_at: newStatus === 'work_complete' || newStatus === 'closed' ? now : job.completed_at,
    };
    await saveRecord('jobs', updated);
    await logActivity(job.id, 'status_change', `Status changed to "${JOB_STATUS_LABELS[newStatus]}".`);
  }

  async function addFollowUp() {
    if (!fuTitle.trim() || !job) return;
    const ownerId = getOwnerId();
    if (!ownerId) return;
    const now = new Date().toISOString();
    await saveRecord('follow_up_tasks', {
      id: makeId(), owner_id: ownerId, job_id: job.id, title: fuTitle.trim(), description: null,
      due_date: fuDue || null, status: 'open', reason: fuReason, reminder_at: null, created_at: now, updated_at: now,
    });
    if (fuReason === 'waiting_on_parts') await changeStatus('waiting_on_parts');
    if (fuReason === 'return_visit') {
      await saveRecord('jobs', { ...job, return_visit_required: true, updated_at: now });
    }
    await logActivity(job.id, 'followup', `Follow-up scheduled: ${fuTitle.trim()}`);
    setFuTitle(''); setFuDue(''); setFuReason('other'); setShowFollowUp(false);
  }

  async function toggleFollowUp(fuId: string, done: boolean) {
    const fu = await db.follow_up_tasks.get(fuId);
    if (!fu) return;
    await saveRecord('follow_up_tasks', { ...fu, status: done ? 'done' : 'open', updated_at: new Date().toISOString() });
  }

  async function deleteThisCall() {
    if (!job) return;
    const ok = window.confirm(
      `Delete call ${job.job_number}? This permanently removes it along with its photos, notes, parts, quotes, and readings. This cannot be undone.`,
    );
    if (!ok) return;
    await deleteJobCascade(job.id);
    navigate('/jobs');
  }

  return (
    <div>
      <TopBar title={job.job_number} back right={
        <button onClick={() => navigate(`/jobs/${job.id}/edit`)} className="text-blue-400 text-sm font-semibold">Edit</button>
      } />

      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/customers/${customer?.id}`} className="text-white font-bold text-lg truncate block">{customer?.name ?? '—'}</Link>
            <Link to={`/sites/${site?.id}`} className="text-zinc-400 text-sm truncate block">
              {site?.name}{site?.address ? ` — ${site.address}` : ''}{site?.city ? `, ${site.city}` : ''}{site?.state ? `, ${site.state}` : ''}
            </Link>
            {equipment && (
              <Link to={`/equipment/${equipment.id}`} className="text-zinc-500 text-xs truncate block mt-0.5">
                {equipment.nickname || `${equipment.manufacturer ?? ''} ${equipment.model_number ?? ''}`}
              </Link>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          <span>{CALL_TYPE_LABELS[job.call_type]}</span>
          {job.scheduled_at && <span>· {format(parseISO(job.scheduled_at), 'MMM d, h:mm a')}</span>}
          {job.work_order_number && <span>· PO# {job.work_order_number}</span>}
          {job.dispatch_number && <span>· Dispatch# {job.dispatch_number}</span>}
        </div>
        {job.reason_for_call && (
          <div className="mt-2.5 text-sm text-zinc-300 bg-zinc-900/60 rounded-lg p-3 border border-zinc-800">
            <span className="text-zinc-500 text-xs font-semibold block mb-1">REASON FOR CALL</span>
            {job.reason_for_call}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <SectionCard title="Status" defaultOpen={false}>
          <Select value={job.status} onChange={(e) => changeStatus(e.target.value as JobStatus)}>
            {Object.entries(JOB_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </SectionCard>

        <SectionCard title="Add Note">
          <TextArea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Type a note…" />
          <button onClick={addNote} disabled={!noteText.trim()} className="w-full rounded-lg bg-blue-600 disabled:opacity-40 text-white text-sm font-semibold py-2.5">
            Add Note
          </button>
        </SectionCard>

        <SectionCard title="Photos" subtitle={`${attachments.length} attached`}>
          <PhotoUploader jobId={job.id} equipmentId={job.equipment_id} />
          {attachments.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {attachments.map((a) => <PhotoThumb key={a.id} attachment={a} />)}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Scan Nameplate" subtitle="Reads model/serial/specs from a photo — review before saving">
          {equipment ? (
            <NameplateScanner jobId={job.id} equipment={equipment} />
          ) : (
            <div className="text-zinc-500 text-sm">Link this call to a piece of equipment first (tap Edit) to scan its nameplate.</div>
          )}
        </SectionCard>

        <SectionCard title="Follow-Up" subtitle={`${followUps.filter(f => f.status === 'open').length} open`}>
          {followUps.map((fu) => (
            <label key={fu.id} className="flex items-start gap-2.5 py-1.5">
              <input type="checkbox" checked={fu.status === 'done'} onChange={(e) => toggleFollowUp(fu.id, e.target.checked)} className="w-4 h-4 mt-0.5" />
              <span className={`text-sm flex-1 ${fu.status === 'done' ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
                {fu.title}
                <span className="block text-xs text-zinc-500">{FOLLOWUP_REASON_LABELS[fu.reason]}{fu.due_date ? ` · due ${fu.due_date}` : ''}</span>
              </span>
            </label>
          ))}
          {!showFollowUp ? (
            <button onClick={() => setShowFollowUp(true)} className="text-blue-400 text-sm font-medium">+ Schedule follow-up</button>
          ) : (
            <div className="space-y-2.5 rounded-lg border border-zinc-800 p-3 bg-zinc-950/40">
              <Field label="What needs to happen"><TextInput value={fuTitle} onChange={(e) => setFuTitle(e.target.value)} placeholder="Call customer with quote" /></Field>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Due date"><TextInput type="date" value={fuDue} onChange={(e) => setFuDue(e.target.value)} /></Field>
                <Field label="Reason">
                  <Select value={fuReason} onChange={(e) => setFuReason(e.target.value as FollowupReason)}>
                    {Object.entries(FOLLOWUP_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowFollowUp(false)} className="flex-1 rounded-lg bg-zinc-800 text-white text-sm font-semibold py-2.5">Cancel</button>
                <button onClick={addFollowUp} className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-semibold py-2.5">Save</button>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Activity Timeline" defaultOpen={false}>
          <div className="space-y-3">
            {timeline.length === 0 && <div className="text-zinc-600 text-sm">No activity yet.</div>}
            {timeline.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-2 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-zinc-300 text-sm">{item.body}</div>
                  <div className="text-zinc-600 text-xs">{format(parseISO(item.at), 'MMM d, h:mm a')}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <button
          onClick={deleteThisCall}
          className="w-full rounded-xl border border-red-900/50 text-red-400 text-sm font-semibold py-3 mt-2"
        >
          Delete Call
        </button>
      </div>
    </div>
  );
}
