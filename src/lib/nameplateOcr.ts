// Regex heuristics for pulling common HVAC/refrigeration nameplate fields
// out of raw OCR text. Deliberately conservative: only returns a field when
// a recognizable label is found nearby, never guesses from noise. Modeled
// on the same "look for MODEL:/S/N: style labels" approach as
// Model-Photo-to-Manual-Lookup, extended to more fields.

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
  'R-449A', 'R449A',
];

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

export function extractNameplateFields(rawText: string): NameplateExtraction {
  const text = rawText.replace(/[\r\n]+/g, ' ').toUpperCase();

  const manufacturer = KNOWN_MANUFACTURERS.find((m) => text.includes(m)) ?? null;

  const model_number = firstMatch(text, [
    /(?:MODEL|MOD)[\s.:#-]*(?:NO\.?|NUMBER)?[\s.:#-]*([A-Z0-9/-]{4,30})/,
  ]);

  const serial_number = firstMatch(text, [
    /(?:SERIAL|SER|S\/N)[\s.:#-]*(?:NO\.?|NUMBER)?[\s.:#-]*([A-Z0-9/-]{4,30})/,
  ]);

  const refrigerant_type = KNOWN_REFRIGERANTS.find((r) => text.includes(r)) ?? null;

  const voltage = firstMatch(text, [
    /(\d{2,3}(?:\/\d{2,3})?)\s?V(?:OLTS?)?\b/,
  ]);

  const phase = firstMatch(text, [
    /(\d)\s?(?:PH|PHASE|~)\b/,
  ]);

  const mca = firstMatch(text, [
    /MCA[\s.:#-]*(\d+(?:\.\d+)?)/,
  ]);

  const mocp = firstMatch(text, [
    /M(?:OCP|OP|FS)[\s.:#-]*(\d+(?:\.\d+)?)/,
  ]);

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
