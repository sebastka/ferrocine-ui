// Seek bar previews: which frame of which sheet shows a time, and where the hover box goes.
// Pure, unit-tested.

import type { Trickplay } from '../api.ts';

export interface Frame {
  sheetUrl: string;
  /** Offset of the frame within its sheet, in sheet pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The preview frame for item time `ms` (clamped to the set), or null for an unusable set. */
export function frameAt(t: Trickplay, ms: number): Frame | null {
  const perSheet = t.columns * t.rows;
  if (!(t.interval_ms > 0) || !(perSheet > 0) || !(t.thumbnails > 0) || t.sheets.length === 0) return null;
  const time = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const n = Math.min(Math.floor(time / t.interval_ms), t.thumbnails - 1);
  const sheet = Math.min(Math.floor(n / perSheet), t.sheets.length - 1);
  const column = n % t.columns;
  const row = Math.floor(n / t.columns) % t.rows;
  const sheetUrl = t.sheets[sheet];
  if (!sheetUrl) return null;
  return { sheetUrl, x: column * t.width, y: row * t.height, width: t.width, height: t.height };
}

export interface FrameStyle {
  width: number;
  height: number;
  backgroundSize: string;
  backgroundPosition: string;
}

/**
 * CSS of a frame shown `maxWidth` pixels wide at most (never enlarged), aspect kept: the whole
 * sheet is scaled by the same factor and shifted to the frame.
 */
export function frameStyle(t: Trickplay, f: Frame, maxWidth: number): FrameStyle {
  const scale = Math.min(1, maxWidth / f.width);
  const r = (v: number) => Math.round(v * scale * 100) / 100;
  return {
    width: r(f.width),
    height: r(f.height),
    backgroundSize: `${r(t.columns * t.width)}px ${r(t.rows * t.height)}px`,
    backgroundPosition: `${-r(f.x)}px ${-r(f.y)}px`,
  };
}

/**
 * Left edge of a box `boxWidth` wide centred on `x` inside a container `containerWidth` wide,
 * kept `margin` pixels from its edges.
 */
export function clampBox(x: number, boxWidth: number, containerWidth: number, margin = 4): number {
  const max = containerWidth - boxWidth - margin;
  if (max < margin) return Math.max(0, (containerWidth - boxWidth) / 2);
  return Math.min(Math.max(x - boxWidth / 2, margin), max);
}
