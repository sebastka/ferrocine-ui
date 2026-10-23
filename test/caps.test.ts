import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCapabilities } from '../src/logic/caps.ts';

const probeOf = (supported: string[]) => (mime: string) => supported.some((s) => mime.includes(s));

test('a typical desktop Chromium', () => {
  const caps = detectCapabilities(probeOf(['avc1', 'vp9', 'av01', 'mp4a.40.2', 'audio/mpeg', 'opus', 'flac']));
  assert.deepEqual(caps.video_codecs, ['h264', 'vp9', 'av1']);
  assert.deepEqual(caps.audio_codecs, ['aac', 'mp3', 'opus', 'flac']);
  assert.deepEqual(caps.containers, ['mp4', 'webm']);
});

test('HEVC and Dolby audio when the platform decodes them', () => {
  const caps = detectCapabilities(probeOf(['avc1', 'hvc1', 'mp4a.40.2', 'ec-3', 'ac-3']));
  assert.deepEqual(caps.video_codecs, ['h264', 'hevc']);
  assert.deepEqual(caps.audio_codecs, ['aac', 'ac3', 'eac3']);
  assert.deepEqual(caps.containers, ['mp4']);
});

test('nothing playable', () => {
  assert.deepEqual(
    detectCapabilities(() => false),
    { containers: [], video_codecs: [], audio_codecs: [] },
  );
});
