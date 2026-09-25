// Regex heuristics for pulling customer/site info out of a photographed
// dispatch ticket / work order (the kind an office sends over showing
// store name, address, PO#/Dispatch#, and the task description). Same
// "extract what a label/pattern clearly points to, leave the rest blank"
// philosophy as nameplateOcr.ts — never guesses from noise, always meant
// to be reviewed before saving. Two real ticket layouts have been seen so
// far (one with "City, ST ZIP", one with "City, ST - County" and no zip;
// one with "Tasks:", one with "Issues:"; one with unlabeled PO/Dispatch
// numbers, one with them explicitly labeled "PO#:"/"Dispatch#:") — this
// handles both, preferring an explicit label whenever one is present.

export interface DispatchExtraction {
  customerName: string | null;
  siteName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  workOrderNumber: string | null; // "PO #" on the call
  dispatchNumber: string | null; // "Dispatch #" on the call
  reasonForCall: string | null;
  contactName: string | null;
}

// City + state required; zip is optional since not every ticket layout has one.
const CITY_STATE = /^(.{2,40}?),\s*([A-Za-z]{2})\b(?:\s+(\d{5})(?:-\d{4})?)?/;
const STREET_LIKE = /^\d+[A-Za-z]?\s+\S/; // starts with a house/unit number

export function extractDispatchFields(rawText: string): DispatchExtraction {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const joined = rawText.replace(/\s+/g, ' ');

  // "Customer Name | Site/Store #" — the most distinctive line on these
  // tickets, usually near the top. When only a bare store number follows
  // the pipe, fold the customer name into the site name too (so the site
  // record isn't just "Store #948" with no name at all) — some accounts
  // have a distinct site brand name instead (e.g. Discount Tire the
  // customer, Mavis Tire the site), in which case that name is used as-is.
  let customerName: string | null = null;
  let siteName: string | null = null;
  const pipeLine = lines.find((l) => /\|/.test(l));
  if (pipeLine) {
    const [left, right] = pipeLine.split('|').map((s) => s.trim());
    if (left) customerName = left;
    if (right) siteName = /^\d+$/.test(right) ? `${left} #${right}` : right;
  }

  // Address: a "City, ST[ ZIP]" line. The street address line isn't always
  // immediately above it (a route/date badge line can sit in between), so
  // scan up to a few lines back for the first one that looks like a street
  // address.
  let address: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let zip: string | null = null;
  const cszIndex = lines.findIndex((l) => CITY_STATE.test(l));
  if (cszIndex !== -1) {
    const m = lines[cszIndex].match(CITY_STATE)!;
    city = m[1];
    state = m[2].toUpperCase();
    zip = m[3] ?? null;
    for (let back = 1; back <= 3; back++) {
      const candidate = lines[cszIndex - back];
      if (candidate && STREET_LIKE.test(candidate)) { address = candidate; break; }
    }
  }

  // PO # — prefer an explicit "PO#:" label; fall back to a dash-suffixed
  // reference number (e.g. "1894132-01") when there's no label at all.
  const workOrderNumber =
    joined.match(/PO\s*#?:?\s*([A-Za-z0-9-]{4,})/i)?.[1] ??
    joined.match(/\b(\d{5,}-\d{2,})\b/)?.[1] ??
    null;

  // Dispatch # — prefer an explicit "Dispatch#:" label; fall back to a
  // standalone numeric ticket ID line when there's no label.
  const dispatchNumber =
    joined.match(/Dispatch\s*#?:?\s*(\d{4,8})/i)?.[1] ??
    lines.find((l) => /^\d{4,8}$/.test(l)) ??
    null;

  // "Tasks:"/"Issues:" — the reason for the call. Extracted from a single
  // source line (not the whitespace-collapsed `joined` text) so it doesn't
  // run on into whatever comes after on the ticket.
  const tasksLine = lines.find((l) => /^(?:tasks?|issues?):/i.test(l));
  const reasonForCall = tasksLine?.replace(/^(?:tasks?|issues?):\s*/i, '').trim() || null;

  // A short "First Last"-looking line that isn't any of the above — best
  // effort, often the dispatcher/site contact.
  const usedLines = new Set([pipeLine, lines[cszIndex]].filter(Boolean));
  const contactName =
    lines.find((l) => !usedLines.has(l) && /^[A-Z][a-zA-Z.]*\s+[A-Z][a-zA-Z.]+$/.test(l) && !/\d/.test(l)) ?? null;

  return { customerName, siteName, address, city, state, zip, workOrderNumber, dispatchNumber, reasonForCall, contactName };
}
