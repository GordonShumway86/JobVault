// A dynamic import() (e.g. `import('tesseract.js')`) can fail with a
// "Failed to fetch dynamically imported module" / "error loading dynamically
// imported module" style error if the tab has been open since before a new
// deploy went live — the page is still running the old build's JS, which
// points at an old chunk filename that no longer exists on the server (the
// new deploy replaced it). This isn't a real OCR/network failure; the fix is
// just to reload so the tab picks up the current build.
export function isStaleChunkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /dynamically imported module|importing a module script failed/i.test(message);
}
