// Shared client-side OCR pipeline used by every photo-scan feature
// (nameplate scanner, dispatch ticket scanner, equipment-form quick scan):
// load the picked file into an <img>, run a contrast/grayscale pass on a
// canvas (reads stamped/etched or printed labels far more reliably than the
// original photo), then hand that canvas to Tesseract. Loaded via dynamic
// import() so Tesseract never bloats the main app bundle.

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
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(canvas);
    return text;
  } finally {
    await worker.terminate();
  }
}
