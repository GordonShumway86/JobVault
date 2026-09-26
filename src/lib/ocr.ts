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

// A crop region as fractions (0..1) of the source image's natural width/
// height — resolution-independent, so the same rect works whether it came
// from a small preview or the original full-resolution photo.
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Tesseract's own docs (and every comparable nameplate-OCR tool) treat
// cropping to just the text region as the standard fix for a small label
// photographed against a large, busy background — more reliable than a
// page-segmentation-mode setting alone, since a big surrounding area can
// still get misread as text-like noise. `crop` is optional so callers that
// don't need it (the dispatch ticket scanner, which photographs a card
// that's mostly text already) are unaffected.
export function preprocessImage(img: HTMLImageElement, contrastPct = 150, crop?: CropRect): HTMLCanvasElement {
  const sx = crop ? crop.x * img.naturalWidth : 0;
  const sy = crop ? crop.y * img.naturalHeight : 0;
  const sw = crop ? crop.width * img.naturalWidth : img.naturalWidth;
  const sh = crop ? crop.height * img.naturalHeight : img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = `contrast(${contrastPct}%) grayscale(100%) brightness(1.05)`;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

// 'label' is for a small printed/etched nameplate photographed as part of a
// much larger, visually noisy background (the rest of the equipment
// cabinet — scratches, cracks, screws, other stickers) — Tesseract's
// default automatic page segmentation tries to lay the whole image out as
// a page and can mistake that background texture for text blocks, or
// scramble a multi-column label into the wrong reading order. Sparse-text
// mode instead looks for text of any size anywhere in the image, which
// reads a small label surrounded by blank metal far more reliably.
// 'document' (the default) is for a photo that's mostly text edge-to-edge
// (a dispatch ticket/work order card) where the normal automatic mode
// already works well.
export async function runOcr(canvas: HTMLCanvasElement, mode: 'label' | 'document' = 'document'): Promise<string> {
  let tesseract: typeof import('tesseract.js');
  try {
    tesseract = await import('tesseract.js');
  } catch (err) {
    if (isStaleChunkError(err)) throw new StaleChunkImportError();
    throw err;
  }
  const { createWorker, PSM } = tesseract;
  const worker = await createWorker('eng');
  try {
    if (mode === 'label') {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    }
    const { data: { text } } = await worker.recognize(canvas);
    return text;
  } finally {
    await worker.terminate();
  }
}
