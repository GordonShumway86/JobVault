import { db } from './db';

// Per-field autosave for in-progress forms (New Customer, New Site, New
// Equipment, New Call). Leaving a field (onBlur) persists the whole form's
// current values to IndexedDB, so switching apps or getting interrupted
// mid-form only risks losing the one field being actively typed, not
// everything entered before it. Cleared once the form is actually saved.

export async function saveDraft(id: string, data: Record<string, unknown>) {
  await db.form_drafts.put({ id, data, updated_at: Date.now() });
}

export async function loadDraft(id: string): Promise<Record<string, unknown> | undefined> {
  const row = await db.form_drafts.get(id);
  return row?.data;
}

export async function clearDraft(id: string) {
  await db.form_drafts.delete(id);
}
