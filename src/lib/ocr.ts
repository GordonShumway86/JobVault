import { isStaleChunkError } from './staleChunk';

// Shared client-side OCR pipeline used by every photo-scan feature
// (nameplate scanner, dispatch ticket scanner, equipment-form quick scan):
// load the picked file into an <img>, run a contrast/grayscale pass on a
// canvas (reads stamped/etched or printed labels far more reliably than the
// original photo), then hand that canvas to Tesseract. Loaded via dynamic
// import() so Tesseract never bloats the main app bundle.

// Thrown only when *our own* dynamic import() of tesseract.js fails the
// stale-build way (see staleChunk.ts) — deliberately not thrown for any
// failure inside Tesseract itself (loading its worker/core/language data
// from its own CDN, or a real OCR failure), since those can plausibly use
// similar wording ("failed to fetch...") for an unrelated, real problem.
// Conflating the two would silently reload the page over a genuine OCR
// failure instead of showing it and falling back to manual entry.
export class StaleChunkImportError extends Error {}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function preprocessImage(img: HTMLImageElement, contrastPct = 150): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = `contrast(${contrastPct}%) grayscale(100%) brightness(1.05)`;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export async function runOcr(canvas: HTMLCanvasElement): Promise<string> {
  let tesseract: typeof import('tesseract.js');
  try {
    tesseract = await import('tesseract.js');
  } catch (err) {
    if (isStaleChunkError(err)) throw new StaleChunkImportError();
    throw err;
  }
  const { createWorker } = tesseract;
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(canvas);
    return text;
  } finally {
    await worker.terminate();
  }
}
