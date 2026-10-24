// Pure decisions of the player: timeline arithmetic and when to start a new HLS session.

import type { PlaybackMethod } from '../api.ts';

/** The part of a stream that can be played: `[start, end)` in item time (ms). */
export interface Stream {
  method: PlaybackMethod;
  /** Item time of stream time 0 (always 0 for direct play). */
  startMs: number;
}

/** Item time (ms) of the media element's current time (s). */
export function itemTime(stream: Stream, currentTimeS: number): number {
  return stream.startMs + Math.max(0, currentTimeS) * 1000;
}

export type SeekPlan = { kind: 'inside'; currentTimeS: number } | { kind: 'restart'; startMs: number };

/**
 * How to reach item time `targetMs`.
 *
 * Direct play seeks in the file. An HLS stream covers `[startMs, startMs + seekableEndS]` (the
 * part ffmpeg has produced so far): inside it the element seeks; outside it a new session starts
 * at the target, because seeking past the produced segments would stall until ffmpeg got there.
 * `slackS` keeps a margin before the produced end, so a seek does not land on a segment that is
 * still being written.
 */
export function planSeek(stream: Stream, targetMs: number, seekableEndS: number, slackS = 2): SeekPlan {
  const target = Math.max(0, targetMs);
  if (stream.method === 'direct') return { kind: 'inside', currentTimeS: target / 1000 };
  const offsetS = (target - stream.startMs) / 1000;
  if (offsetS >= 0 && offsetS <= Math.max(0, seekableEndS - slackS)) return { kind: 'inside', currentTimeS: offsetS };
  return { kind: 'restart', startMs: Math.round(target) };
}

export interface Quality {
  id: string;
  label: string;
  maxHeight: number | null;
  maxBitrate: number | null;
}

export const QUALITIES: Quality[] = [
  { id: 'auto', label: 'Original', maxHeight: null, maxBitrate: null },
  { id: '1080', label: '1080p · 8 Mb/s', maxHeight: 1080, maxBitrate: 8_000_000 },
  { id: '720', label: '720p · 4 Mb/s', maxHeight: 720, maxBitrate: 4_000_000 },
  { id: '480', label: '480p · 1.5 Mb/s', maxHeight: 480, maxBitrate: 1_500_000 },
];

/**
 * Where to start playing: a saved position, unless the caller asked to start over or the
 * position is within the last 5 % (then the item was nearly finished: start over too).
 */
export function resumePosition(positionMs: number, runtimeMs: number | null, fromStart: boolean): number {
  if (fromStart || positionMs <= 0) return 0;
  if (runtimeMs && positionMs >= runtimeMs * 0.95) return 0;
  return positionMs;
}

/** The core stops an HLS session after 60 s without requests; a paused player sends none. */
export const SESSION_IDLE_MS = 45_000;

/**
 * Whether resuming after a pause needs a new session: an HLS stream paused for longer than
 * the core keeps an idle session (with a margin, since buffered media delays the last request).
 */
export function sessionLikelyExpired(method: PlaybackMethod, pausedAt: number | null, now: number): boolean {
  return method !== 'direct' && pausedAt !== null && now - pausedAt > SESSION_IDLE_MS;
}

/** Whether the end-of-episode "next" card should show: the last 30 s, or the end. */
export function nearEnd(positionMs: number, durationMs: number | null): boolean {
  if (!durationMs) return false;
  return durationMs - positionMs <= 30_000;
}

/** What selecting a subtitle needs: a new session (to add or drop a burned bitmap) or not. */
export interface SubtitlePlan {
  /** Start a new session at the current position with `burn` as `burn_subtitle`. */
  restart: boolean;
  /** The bitmap subtitle to burn in, or null. */
  burn: number | null;
  /** The text subtitle to show as a WebVTT track, or null. */
  text: number | null;
}

/**
 * Bitmap subtitles (`text: false`) are drawn into the picture by the core, so choosing one, or
 * leaving one, starts a new session; text subtitles switch client-side.
 */
export function planSubtitle(choice: { index: number; text: boolean } | null, burned: number | null): SubtitlePlan {
  if (choice === null) return { restart: burned !== null, burn: null, text: null };
  if (!choice.text) return { restart: burned !== choice.index, burn: choice.index, text: null };
  return { restart: burned !== null, burn: null, text: choice.index };
}
