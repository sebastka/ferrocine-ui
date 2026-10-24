import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterLabel, chapterMarks, currentChapter, extraLabel } from '../src/logic/extras.ts';
import { planSubtitle } from '../src/logic/playback.ts';

test('extra labels', () => {
  assert.equal(extraLabel('trailer'), 'Trailer');
  assert.equal(extraLabel('behind_the_scenes'), 'Behind the scenes');
  assert.equal(extraLabel('deleted_scene'), 'Deleted scene');
  assert.equal(extraLabel(null), 'Extra');
  assert.equal(extraLabel('unknown'), 'Extra');
});

test('chapters', () => {
  const ch = [
    { start_ms: 0, title: null },
    { start_ms: 60_000, title: 'The Gate' },
    { start_ms: 120_000, title: '  ' },
  ];
  assert.deepEqual(
    ch.map((c, i) => chapterLabel(c, i)),
    ['Chapter 1', 'The Gate', 'Chapter 3'],
  );
  assert.deepEqual(chapterMarks(ch, 240_000), [25, 50]);
  assert.deepEqual(chapterMarks([...ch, { start_ms: 300_000, title: null }], 240_000), [25, 50]);
  assert.deepEqual(chapterMarks(ch, 0), []);
  assert.equal(currentChapter(ch, 0), 0);
  assert.equal(currentChapter(ch, 90_000), 1);
  assert.equal(currentChapter(ch, 500_000), 2);
  assert.equal(currentChapter([], 10), -1);
});

test('subtitle selection: burned bitmaps restart, text switches client-side', () => {
  const pgs = { index: 4, text: false };
  const srt = { index: 3, text: true };
  assert.deepEqual(planSubtitle(pgs, null), { restart: true, burn: 4, text: null });
  assert.deepEqual(planSubtitle(pgs, 4), { restart: false, burn: 4, text: null });
  assert.deepEqual(planSubtitle({ index: 2000, text: false }, 4), { restart: true, burn: 2000, text: null });
  assert.deepEqual(planSubtitle(srt, null), { restart: false, burn: null, text: 3 });
  assert.deepEqual(planSubtitle(srt, 4), { restart: true, burn: null, text: 3 });
  assert.deepEqual(planSubtitle(null, 4), { restart: true, burn: null, text: null });
  assert.deepEqual(planSubtitle(null, null), { restart: false, burn: null, text: null });
});
