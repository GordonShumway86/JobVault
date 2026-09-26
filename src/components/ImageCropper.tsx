import { useRef, useState } from 'react';
import type { CropRect } from '../lib/ocr';

const HANDLE_SIZE = 26; // px — generous hit target for a finger
const MIN_SIZE = 0.12; // minimum box dimension, as a fraction of the image

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

// A drag-to-crop step shown after picking a nameplate photo, before OCR
// runs. Tesseract's own docs treat cropping to just the text region as the
// standard fix for a small label lost in a large, busy background (see
// NOTES.md's 2026-09-26 OCR entries) — more reliable than a page-
// segmentation-mode setting alone.
export default function ImageCropper({
  imageUrl,
  onConfirm,
  onSkip,
}: {
  imageUrl: string;
  onConfirm: (rect: CropRect) => void;
  onSkip: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<CropRect>({ x: 0.15, y: 0.15, width: 0.7, height: 0.7 });
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; startBox: CropRect } | null>(null);

  function startDrag(mode: DragMode, e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startBox: box };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || !container) return;
    const rect = container.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    const b = drag.startBox;

    if (drag.mode === 'move') {
      setBox({ ...b, x: clamp(b.x + dx, 0, 1 - b.width), y: clamp(b.y + dy, 0, 1 - b.height) });
      return;
    }

    let { x, y, width, height } = b;
    if (drag.mode === 'nw' || drag.mode === 'sw') {
      x = clamp(b.x + dx, 0, b.x + b.width - MIN_SIZE);
      width = b.x + b.width - x;
    }
    if (drag.mode === 'ne' || drag.mode === 'se') {
      width = clamp(b.width + dx, MIN_SIZE, 1 - b.x);
    }
    if (drag.mode === 'nw' || drag.mode === 'ne') {
      y = clamp(b.y + dy, 0, b.y + b.height - MIN_SIZE);
      height = b.y + b.height - y;
    }
    if (drag.mode === 'sw' || drag.mode === 'se') {
      height = clamp(b.height + dy, MIN_SIZE, 1 - b.y);
    }
    setBox({ x, y, width, height });
  }

  function endDrag() {
    dragRef.current = null;
  }

  return (
    <div className="space-y-2">
      <div className="text-zinc-400 text-xs">Drag the box to cover just the nameplate, then tap Scan.</div>
      <div
        ref={containerRef}
        className="relative select-none rounded-lg overflow-hidden border border-zinc-700 bg-black"
        style={{ touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img src={imageUrl} alt="nameplate to crop" className="w-full h-auto block" draggable={false} />
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10"
          style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }}
          onPointerDown={(e) => startDrag('move', e)}
        >
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <div
              key={corner}
              onPointerDown={(e) => startDrag(corner, e)}
              className="absolute bg-blue-500 rounded-full border-2 border-white"
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                left: corner.endsWith('w') ? -HANDLE_SIZE / 2 : undefined,
                right: corner.endsWith('e') ? -HANDLE_SIZE / 2 : undefined,
                top: corner.startsWith('n') ? -HANDLE_SIZE / 2 : undefined,
                bottom: corner.startsWith('s') ? -HANDLE_SIZE / 2 : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onConfirm(box)} className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-semibold py-3">
          Scan This Area
        </button>
        <button type="button" onClick={onSkip} className="flex-1 rounded-lg bg-zinc-800 text-white text-sm font-semibold py-3">
          Use Full Photo
        </button>
      </div>
    </div>
  );
}
