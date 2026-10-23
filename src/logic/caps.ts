// What the browser can play, as the `capabilities` of a playback request.

import type { Capabilities } from '../api.ts';

/** Answers whether a MIME type with codecs is playable (MSE first, then the media element). */
export type Probe = (mime: string) => boolean;

const VIDEO: [string, string[]][] = [
  ['h264', ['video/mp4; codecs="avc1.640028"', 'video/mp4; codecs="avc1.42E01E"']],
  ['hevc', ['video/mp4; codecs="hvc1.1.6.L120.90"', 'video/mp4; codecs="hev1.1.6.L120.90"']],
  ['vp9', ['video/webm; codecs="vp9"', 'video/mp4; codecs="vp09.00.10.08"']],
  ['av1', ['video/mp4; codecs="av01.0.08M.08"', 'video/webm; codecs="av01.0.08M.08"']],
];

const AUDIO: [string, string[]][] = [
  ['aac', ['audio/mp4; codecs="mp4a.40.2"']],
  ['mp3', ['audio/mpeg', 'audio/mp4; codecs="mp4a.40.34"']],
  ['opus', ['audio/webm; codecs="opus"', 'audio/mp4; codecs="opus"']],
  ['flac', ['audio/flac', 'audio/mp4; codecs="flac"']],
  ['vorbis', ['audio/webm; codecs="vorbis"']],
  ['ac3', ['audio/mp4; codecs="ac-3"']],
  ['eac3', ['audio/mp4; codecs="ec-3"']],
];

export function detectCapabilities(probe: Probe): Capabilities {
  const video_codecs = VIDEO.filter(([, mimes]) => mimes.some(probe)).map(([name]) => name);
  const audio_codecs = AUDIO.filter(([, mimes]) => mimes.some(probe)).map(([name]) => name);
  const containers: string[] = [];
  if (video_codecs.includes('h264')) containers.push('mp4');
  if (probe('video/webm; codecs="vp9"') || probe('audio/webm; codecs="opus"')) containers.push('webm');
  return { containers, video_codecs, audio_codecs };
}

/** The browser's probe: MediaSource when there is one (what hls.js needs), else canPlayType. */
export function browserProbe(): Probe {
  const video = document.createElement('video');
  const mse = (globalThis as { MediaSource?: { isTypeSupported(t: string): boolean } }).MediaSource;
  return (mime) => {
    try {
      if (mse?.isTypeSupported(mime)) return true;
    } catch {
      // Some browsers throw on unknown codec strings.
    }
    return video.canPlayType(mime) === 'probably';
  };
}

let cached: Capabilities | null = null;

export function capabilities(): Capabilities {
  cached ??= detectCapabilities(browserProbe());
  return cached;
}
