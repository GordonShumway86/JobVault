// Regex heuristics for pulling customer/site info out of a photographed
// dispatch ticket / work order (the kind an office sends over showing
// store name, address, work order #, and the task description). Same
// "extract what a label/pattern clearly points to, leave the rest blank"
// philosophy as nameplateOcr.ts — never guesses from noise, always meant
// to be reviewed before saving.

export interface DispatchExtraction {
  customerName: string | null;
  siteName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  workOrderNumber: string | null;
  reasonForCall: string | null;
  contactName: string | null;
}

const CITY_STATE_ZIP = /^(.{2,40}?),\s*([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?$/;
const STREET_LIKE = /^\d+[A-Za-z]?\s+\S/; // starts with a house/unit number

function findCityStateZipIndex(lines: string[]): number {
  return lines.findIndex((l) => CITY_STATE_ZIP.test(l));
}

export function extractDispatchFields(rawText: string): DispatchExtraction {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const joined = rawText.replace(/\s+/g, ' ');

  // "Customer Name | Site/Store #" — the most distinctive line on these
  // tickets, usually near the top.
  let customerName: string | null = null;
  let siteName: string | null = null;
  const pipeLine = lines.find((l) => /\|/.test(l));
  if (pipeLine) {
    const [left, right] = pipeLine.split('|').map((s) => s.trim());
    if (left) customerName = left;
    if (right) siteName = /^\d+$/.test(right) ? `Store #${right}` : right;
  }

  // Address: a "City, ST 12345" line, with the street address on the line
  // directly above it (dispatch cards consistently stack these two lines).
  let address: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;
  const cszIndex = findCityStateZipIndex(lines);
  if (cszIndex !== -1) {
    const m = lines[cszIndex].match(CITY_STATE_ZIP)!;
    city = m[1];
    state = m[2].toUpperCase();
    zip = m[3];
    const prev = lines[cszIndex - 1];
    if (prev && STREET_LIKE.test(prev)) address = prev;
  }

  // Work order / ticket number — prefer a dash-suffixed reference number
  // (e.g. "1894132-01", matching the app's own WO- example format) since
  // that's the more specific per-visit reference; fall back to a plain
  // numeric ticket ID near the top of the card.
  const workOrderNumber =
    joined.match(/\b(\d{5,}-\d{2,})\b/)?.[1] ??
    lines.find((l) => /^\d{4,8}$/.test(l)) ??
    null;

  // "Tasks: <description>" — the reason for the call. Extracted from a
  // single source line (not the whitespace-collapsed `joined` text) so it
  // doesn't run on into whatever comes after on the ticket.
  const tasksLine = lines.find((l) => /^tasks?:/i.test(l));
  const reasonForCall = tasksLine?.replace(/^tasks?:\s*/i, '').trim() || null;

  // A short "First Last"-looking line that isn't any of the above — best
  // effort, often the dispatcher/site contact.
  const usedLines = new Set([pipeLine, lines[cszIndex], lines[cszIndex - 1]].filter(Boolean));
  const contactName =
    lines.find((l) => !usedLines.has(l) && /^[A-Z][a-zA-Z.]*\s+[A-Z][a-zA-Z.]+$/.test(l) && !/\d/.test(l)) ?? null;

  return { customerName, siteName, address, city, state, zip, workOrderNumber, reasonForCall, contactName };
}
