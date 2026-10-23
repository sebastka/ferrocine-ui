import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemTime, nearEnd, planSeek, resumePosition, sessionLikelyExpired } from '../src/logic/playback.ts';

test('item time adds the stream start', () => {
  assert.equal(itemTime({ method: 'transcode', startMs: 600_000 }, 12.5), 612_500);
  assert.equal(itemTime({ method: 'direct', startMs: 0 }, 3), 3000);
});

test('direct play always seeks inside the file', () => {
  assert.deepEqual(planSeek({ method: 'direct', startMs: 0 }, 5_000_000, 0), { kind: 'inside', currentTimeS: 5000 });
});

test('HLS seeks inside the produced range, restarts outside it', () => {
  const s = { method: 'transcode' as const, startMs: 600_000 };
  // Produced: 120 s from 10:00, i.e. item time 10:00 to 12:00.
  assert.deepEqual(planSeek(s, 660_000, 120), { kind: 'inside', currentTimeS: 60 });
  assert.deepEqual(planSeek(s, 600_000, 120), { kind: 'inside', currentTimeS: 0 });
  // Too close to the produced end (2 s slack), past it, or before the start.
  assert.deepEqual(planSeek(s, 719_000, 120), { kind: 'restart', startMs: 719_000 });
  assert.deepEqual(planSeek(s, 900_000, 120), { kind: 'restart', startMs: 900_000 });
  assert.deepEqual(planSeek(s, 300_000, 120), { kind: 'restart', startMs: 300_000 });
  assert.deepEqual(planSeek(s, -10, 120), { kind: 'restart', startMs: 0 });
});

test('resume position', () => {
  assert.equal(resumePosition(60_000, 3_600_000, false), 60_000);
  assert.equal(resumePosition(60_000, 3_600_000, true), 0);
  assert.equal(resumePosition(3_500_000, 3_600_000, false), 0);
  assert.equal(resumePosition(0, null, false), 0);
});

test('near end', () => {
  assert.equal(nearEnd(3_580_000, 3_600_000), true);
  assert.equal(nearEnd(3_000_000, 3_600_000), false);
  assert.equal(nearEnd(10, null), false);
});

test('a long pause expires HLS sessions only', () => {
  assert.equal(sessionLikelyExpired('transcode', 0, 60_000), true);
  assert.equal(sessionLikelyExpired('remux', 0, 30_000), false);
  assert.equal(sessionLikelyExpired('direct', 0, 600_000), false);
  assert.equal(sessionLikelyExpired('transcode', null, 600_000), false);
});
