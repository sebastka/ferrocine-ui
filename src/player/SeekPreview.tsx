// The box above the seek bar while hovering or dragging: preview frame, chapter and time.

import { useEffect, useState } from 'react';
import type { Chapter, Trickplay } from '../api.ts';
import { chapterLabel, currentChapter } from '../logic/extras.ts';
import { clock } from '../logic/format.ts';
import { clampBox, frameAt, frameStyle, type Frame } from '../logic/trickplay.ts';

// Sheets already in the browser cache: shown at once; others are fetched first, keeping the
// last frame on screen meanwhile so the box never blinks empty.
const loaded = new Set<string>();

export function SeekPreview({
  ms,
  duration,
  seekWidth,
  trickplay,
  chapters,
}: {
  ms: number;
  duration: number;
  /** Width of the seek bar in CSS pixels (the box is positioned and clamped within it). */
  seekWidth: number;
  trickplay: Trickplay | null;
  chapters: Chapter[];
}) {
  const wanted = trickplay ? frameAt(trickplay, ms) : null;
  const [, setTick] = useState(0);
  // The last frame shown from a loaded sheet (state adjusted during render, React's pattern for
  // values derived from the previous render).
  const [lastShown, setLastShown] = useState<Frame | null>(null);
  const ready = wanted !== null && loaded.has(wanted.sheetUrl);
  if (ready && (lastShown?.sheetUrl !== wanted.sheetUrl || lastShown.x !== wanted.x || lastShown.y !== wanted.y)) {
    setLastShown(wanted);
  }

  useEffect(() => {
    const url = wanted?.sheetUrl;
    if (!url || loaded.has(url)) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      loaded.add(url);
      if (alive) setTick((t) => t + 1);
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [wanted?.sheetUrl]);

  const frame = ready ? wanted : lastShown;

  const i = currentChapter(chapters, ms);
  const chapter = i >= 0 && chapters[i] ? chapterLabel(chapters[i], i) : null;
  // Previews are ~240 px wide; on narrow players a third of the bar at most.
  const maxWidth = Math.max(96, Math.min(240, seekWidth / 3));
  const style = trickplay && frame ? frameStyle(trickplay, frame, maxWidth) : null;
  const frameWidth = style ? style.width : trickplay ? maxWidth : 0;
  // Room for "Chapter 12 · 1:02:15" even when the frame is small (phones); the frame is centred.
  const boxWidth = Math.min(seekWidth, Math.max(frameWidth, chapter ? 180 : 72));
  const x = duration > 0 ? (Math.min(Math.max(ms, 0), duration) / duration) * seekWidth : 0;
  const left = clampBox(x, boxWidth, seekWidth, 0);

  return (
    <div className="seek-preview" aria-hidden="true" style={{ left: `${left}px`, width: `${boxWidth}px` }}>
      {trickplay && (
        <div
          className="seek-preview-frame"
          style={
            style && frame
              ? {
                  width: `${style.width}px`,
                  height: `${style.height}px`,
                  backgroundImage: `url("${frame.sheetUrl}")`,
                  backgroundSize: style.backgroundSize,
                  backgroundPosition: style.backgroundPosition,
                }
              : {
                  width: `${frameWidth}px`,
                  height: `${Math.round((frameWidth * trickplay.height) / trickplay.width)}px`,
                }
          }
        />
      )}
      <div className="seek-preview-text">
        {chapter && <span className="seek-preview-chapter">{chapter}</span>}
        {chapter && <span aria-hidden="true"> · </span>}
        <span className="seek-preview-time">{clock(ms)}</span>
      </div>
    </div>
  );
}
