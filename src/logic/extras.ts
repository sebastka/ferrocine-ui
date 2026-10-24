// Extras and chapters: labels and positions. Pure, unit-tested.

import type { Chapter, ExtraType } from '../api.ts';

const EXTRA_LABELS: Record<ExtraType, string> = {
  trailer: 'Trailer',
  featurette: 'Featurette',
  behind_the_scenes: 'Behind the scenes',
  deleted_scene: 'Deleted scene',
  interview: 'Interview',
  scene: 'Scene',
  short: 'Short',
  extra: 'Extra',
};

export function extraLabel(type: ExtraType | string | null | undefined): string {
  return (type && EXTRA_LABELS[type as ExtraType]) || 'Extra';
}

/** "Chapter 3" when the chapter has no title (or only a generic numbered one). */
export function chapterLabel(chapter: Chapter, i: number): string {
  const t = chapter.title?.trim();
  return t ? t : `Chapter ${i + 1}`;
}

/**
 * Seek-bar tick positions (percent of the duration): chapters within the item, the one at 0 left
 * out (it would sit on the bar's start).
 */
export function chapterMarks(chapters: Chapter[], durationMs: number): number[] {
  if (!(durationMs > 0)) return [];
  return chapters.filter((c) => c.start_ms > 0 && c.start_ms < durationMs).map((c) => (c.start_ms / durationMs) * 100);
}

/** Index of the chapter playing at `positionMs` (the last one started), or -1. */
export function currentChapter(chapters: Chapter[], positionMs: number): number {
  let current = -1;
  chapters.forEach((c, i) => {
    if (c.start_ms <= positionMs) current = i;
  });
  return current;
}
