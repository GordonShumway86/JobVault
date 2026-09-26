// Regex heuristics for pulling common HVAC/refrigeration nameplate fields
// out of raw OCR text. Deliberately conservative: only returns a field when
// a recognizable label is found nearby, never guesses from noise. Modeled
// on the same "look for MODEL:/S/N: style labels" approach as
// Model-Photo-to-Manual-Lookup, extended to more fields.
//
// Real nameplates vary a lot in layout. Some print values inline right
// after an abbreviated label ("MCA 30.4", "208/230V"). Others — commercial
// refrigeration condensing units especially — spell labels out in full and
// lay them out as a table: a row of headers ("VOLTS PHASE HERTZ", "MIN.
// CIRC. AMPACITY") with the actual values in a separate row or a few words
// later, sometimes with an unrelated number (a wire temperature rating, a
// weight) sitting in between. The functions below try the simple inline
// form first and only fall back to the table-aware search when that finds
// nothing, so cleaner nameplates aren't affected.

export interface NameplateExtraction {
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  refrigerant_type: string | null;
  voltage: string | null;
  phase: string | null;
  mca: string | null;
  mocp: string | null;
}

const KNOWN_MANUFACTURERS = [
  'TRANE', 'CARRIER', 'LENNOX', 'YORK', 'RHEEM', 'GOODMAN', 'BRYANT', 'DAIKIN',
  'MITSUBISHI', 'AMANA', 'RUUD', 'AMERICAN STANDARD', 'HEIL', 'PAYNE', 'TEMPSTAR',
  'ARMSTRONG', 'COLEMAN', 'FRIGIDAIRE', 'HEATCRAFT', 'COPELAND', 'TECUMSEH',
  'HUSSMANN', 'HOSHIZAKI', 'MANITOWOC', 'TRUE', 'BEVERAGE-AIR', 'MIDEA',
];

const KNOWN_REFRIGERANTS = [
  'R-410A', 'R410A', 'R-22', 'R22', 'R-134A', 'R134A', 'R-404A', 'R404A',
  'R-407C', 'R407C', 'R-454B', 'R454B', 'R-32', 'R32', 'R-448A', 'R448A',
  'R-449A', 'R449A', 'R-507', 'R507',
];

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// A label's simple "value immediately follows" regex can capture the next
// label's own word instead of a real value, when a nameplate prints its
// labels stacked with no value between them (see findModelSerialFromLabelBlock
// below). None of these words is ever a real model/serial number on its own.
const LABEL_WORDS = new Set(['SERIAL', 'MODEL', 'PART', 'NUMBER', 'NO', 'TYPE', 'VOLTS', 'PHASE', 'HERTZ', 'WEIGHT']);
function rejectLabelWord(v: string | null): string | null {
  return v && LABEL_WORDS.has(v) ? null : v;
}

// Refrigeration nameplates often print the bare code with no "R-"/"R"
// prefix at all (e.g. a dual-refrigerant condensing unit rated
// "404A/507"). Only look for that shape near the word REFRIGERANT, so a
// stray number elsewhere on the plate (an amp rating, a weight) doesn't
// get mistaken for one — and require a letter suffix or a slash pair so a
// plain 2-3 digit number isn't treated as a refrigerant code either.
function findRefrigerant(text: string): string | null {
  const known = KNOWN_REFRIGERANTS.find((r) => text.includes(r));
  if (known) return known;
  const idx = text.indexOf('REFRIGERANT');
  if (idx === -1) return null;
  const window = text.slice(idx, idx + 120);
  const m = window.match(/\b(\d{3}[A-Z](?:\/\d{2,3}[A-Z]?)?)\b/);
  return m ? m[1] : null;
}

// Some nameplates print "PART NO. MODEL NO. SERIAL NO." (or just "MODEL NO.
// SERIAL NO.") as a run of labels with no value between them, then the
// actual values as their own run right after (e.g. "...SERIAL NO 89026301
// CZT069M6CF T16J11397..."). The simple label-then-value regexes above
// can't tell "the next word" from "the next label" or "a different
// column's value" in that shape — they've been seen to grab the literal
// word "SERIAL" as a model number, and PART NO.'s value as the serial
// number, on a real scanned Heatcraft condensing unit plate. When this
// stacked-labels shape is detected, read the values positionally instead:
// skip PART NO.'s value (if present), then take the next two real-looking
// tokens (must contain a digit — plain-letter OCR noise between numbers
// doesn't) as model, then serial, in that fixed order.
function findModelSerialFromLabelBlock(text: string): { model: string | null; serial: string | null } {
  const m = /(PART\s*NO\.?\s+)?MODEL\s*NO\.?\s+SERIAL\s*NO\.?/.exec(text);
  if (!m) return { model: null, serial: null };
  const after = text.slice(m.index + m[0].length, m.index + m[0].length + 100);
  const values = (after.match(/[A-Z0-9][A-Z0-9/-]{2,29}/g) ?? []).filter((t) => /\d/.test(t));
  const skip = m[1] ? 1 : 0;
  return { model: values[skip] ?? null, serial: values[skip + 1] ?? null };
}

// Fallback for nameplates that print "VOLTS PHASE HERTZ" as a table header
// with the actual values in the row below, instead of inline like "230V"
// or "3PH" — the value row is a voltage (possibly a dash range), then a
// single-digit phase, then a two-digit hertz reading, in that order.
function findVoltagePhaseFromHeaderRow(text: string): { voltage: string | null; phase: string | null } {
  const headerRe = /VOLTS\s+PHASE\s+HERTZ/;
  const m = headerRe.exec(text);
  if (!m) return { voltage: null, phase: null };
  const after = text.slice(m.index + m[0].length, m.index + m[0].length + 200);
  const row = after.match(/(\d{2,3}(?:-\d{2,3})?)\s+(\d)\s+\d{2}\b/);
  return row ? { voltage: row[1], phase: row[2] } : { voltage: null, phase: null };
}

export function extractNameplateFields(rawText: string): NameplateExtraction {
  const text = rawText.replace(/[\r\n]+/g, ' ').toUpperCase();

  const manufacturer = KNOWN_MANUFACTURERS.find((m) => text.includes(m)) ?? null;

  let model_number = rejectLabelWord(firstMatch(text, [
    /(?:MODEL|MOD)[\s.:#-]*(?:NO\.?|NUMBER)?[\s.:#-]*([A-Z0-9/-]{4,30})/,
  ]));

  let serial_number = rejectLabelWord(firstMatch(text, [
    /(?:SERIAL|SER|S\/N)[\s.:#-]*(?:NO\.?|NUMBER)?[\s.:#-]*([A-Z0-9/-]{4,30})/,
  ]));

  // A stacked-labels nameplate (see findModelSerialFromLabelBlock) always
  // has "MODEL NO." directly followed by "SERIAL NO." with nothing in
  // between — the inline regexes above can never get a real value out of
  // that shape, so prefer the positional read whenever it's detected.
  if (/MODEL\s*NO\.?\s+SERIAL\s*NO\.?/.test(text)) {
    const fromBlock = findModelSerialFromLabelBlock(text);
    model_number = fromBlock.model ?? model_number;
    serial_number = fromBlock.serial ?? serial_number;
  }

  const refrigerant_type = findRefrigerant(text);

  // \b before the digits matters here: without it, this can match the
  // tail end of an unrelated alphanumeric run right before a "VOLTS"
  // header elsewhere on the plate (e.g. the last 3 digits of a serial
  // number like "...T16J11397 VOLTS PHASE HERTZ...").
  let voltage = firstMatch(text, [/\b(\d{2,3}(?:\/\d{2,3})?)\s?V(?:OLTS?)?\b/]);
  let phase = firstMatch(text, [/\b(\d)\s?(?:PH|PHASE|~)\b/]);
  if (!voltage || !phase) {
    const fromHeader = findVoltagePhaseFromHeaderRow(text);
    voltage = voltage ?? fromHeader.voltage;
    phase = phase ?? fromHeader.phase;
  }

  // MCA/MOCP are safety-critical (wire and breaker sizing) — only trust the
  // abbreviated inline form ("MCA 30.4"). A nameplate that spells the label
  // out in full ("MIN. CIRC. AMPACITY") usually lays it out as a multi-
  // column table, where a "closest number after the label" guess can just
  // as easily land on a different column's value — a confidently wrong
  // number here is worse than leaving it blank for a tech to read off the
  // actual plate.
  const mca = firstMatch(text, [/MCA[\s.:#-]*(\d+(?:\.\d+)?)/]);
  const mocp = firstMatch(text, [/M(?:OCP|OP|FS)[\s.:#-]*(\d+(?:\.\d+)?)/]);

  return {
    manufacturer,
    model_number,
    serial_number,
    refrigerant_type: refrigerant_type?.replace(/^R(\d)/, 'R-$1') ?? null,
    voltage,
    phase,
    mca,
    mocp,
  };
}
