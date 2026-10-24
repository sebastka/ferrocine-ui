import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Trickplay } from '../src/api.ts';
import { clampBox, frameAt, frameStyle } from '../src/logic/trickplay.ts';

const t: Trickplay = {
  interval_ms: 10_000,
  width: 240,
  height: 136,
  columns: 10,
  rows: 10,
  thumbnails: 549,
  sheets: ['s1', 's2', 's3', 's4', 's5', 's6'],
};

test('frame position within its sheet', () => {
  assert.deepEqual(frameAt(t, 0), { sheetUrl: 's1', x: 0, y: 0, width: 240, height: 136 });
  assert.deepEqual(frameAt(t, 9_999), { sheetUrl: 's1', x: 0, y: 0, width: 240, height: 136 });
  // Frame 13: column 3, row 1.
  assert.deepEqual(frameAt(t, 135_000), { sheetUrl: 's1', x: 720, y: 136, width: 240, height: 136 });
  // Frame 100: first of sheet 2.
  assert.deepEqual(frameAt(t, 1_000_000), { sheetUrl: 's2', x: 0, y: 0, width: 240, height: 136 });
  // Frame 257: sheet 3, column 7, row 5.
  assert.deepEqual(frameAt(t, 2_575_000), { sheetUrl: 's3', x: 1680, y: 680, width: 240, height: 136 });
});

test('edge cases: past the end, partial last sheet, negative and bad times', () => {
  // Last frame is 548: sheet 6, column 8, row 4.
  const last = { sheetUrl: 's6', x: 1920, y: 544, width: 240, height: 136 };
  assert.deepEqual(frameAt(t, 5_480_000), last);
  assert.deepEqual(frameAt(t, 99_999_999), last);
  assert.deepEqual(frameAt(t, -5_000), frameAt(t, 0));
  assert.deepEqual(frameAt(t, Number.NaN), frameAt(t, 0));
  assert.equal(frameAt({ ...t, thumbnails: 0 }, 0), null);
  assert.equal(frameAt({ ...t, sheets: [] }, 0), null);
  assert.equal(frameAt({ ...t, interval_ms: 0 }, 0), null);
  // A set claiming more frames than its sheets hold stays on the last sheet.
  assert.equal(frameAt({ ...t, sheets: ['a', 'b'] }, 5_000_000)?.sheetUrl, 'b');
});

test('scaled frame style', () => {
  const f = frameAt(t, 135_000)!;
  assert.deepEqual(frameStyle(t, f, 400), {
    width: 240,
    height: 136,
    backgroundSize: '2400px 1360px',
    backgroundPosition: '-720px -136px',
  });
  assert.deepEqual(frameStyle(t, f, 120), {
    width: 120,
    height: 68,
    backgroundSize: '1200px 680px',
    backgroundPosition: '-360px -68px',
  });
});

test('hover box stays inside', () => {
  assert.equal(clampBox(500, 200, 1000), 400);
  assert.equal(clampBox(10, 200, 1000), 4);
  assert.equal(clampBox(990, 200, 1000), 796);
  assert.equal(clampBox(50, 200, 150), 0);
});
