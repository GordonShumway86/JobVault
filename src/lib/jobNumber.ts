// Client-generated so job creation works fully offline. Short, sortable-ish,
// and effectively collision-free for a single-owner app.
export function generateJobNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SL-${datePart}-${rand}`;
}

export function generateQuoteNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `Q-${datePart}-${rand}`;
}
