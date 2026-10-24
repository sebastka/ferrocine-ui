import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlight, matchLabel } from '../src/logic/search.ts';

test('match labels', () => {
  assert.equal(matchLabel(null), null);
  assert.equal(
    matchLabel({ kind: 'cast', text: 'Keanu Reeves', role: 'actor', character: 'Neo' }),
    'with Keanu Reeves (Neo)',
  );
  assert.equal(matchLabel({ kind: 'cast', text: 'Halina Reijn', role: 'actor', character: null }), 'with Halina Reijn');
  assert.equal(matchLabel({ kind: 'crew', text: 'Lana Wachowski', role: 'director' }), 'Directed by Lana Wachowski');
  assert.equal(matchLabel({ kind: 'crew', text: 'Esther Wouda', role: 'writer' }), 'Writer: Esther Wouda');
  assert.equal(matchLabel({ kind: 'crew', text: 'Jan Morgenstern', role: 'composer' }), 'Composer: Jan Morgenstern');
  assert.equal(matchLabel({ kind: 'crew', text: 'X', role: 'guest_star' }), 'Guest star: X');
  assert.equal(matchLabel({ kind: 'crew', text: 'X', role: null }), 'Crew: X');
  assert.equal(matchLabel({ kind: 'original_title', text: '千と千尋の神隠し' }), 'Original title: 千と千尋の神隠し');
});

test('highlight: word starts, any order, case and accents ignored', () => {
  const hits = (t: string, q: string) =>
    highlight(t, q)
      .filter((p) => p.hit)
      .map((p) => p.text);
  assert.deepEqual(hits('with Keanu Reeves (Neo)', 'reeves keanu'), ['Keanu', 'Reeves']);
  assert.deepEqual(hits('Original title: Le Fabuleux Destin d’Amélie Poulain', 'amelie'), ['Amélie']);
  assert.deepEqual(hits('Directed by Colin Levy', 'lev'), ['Levy']);
  assert.deepEqual(hits('with Derek de Lint', 'xyz'), []);
  assert.equal(
    highlight('with Keanu Reeves (Neo)', 'keanu')
      .map((p) => p.text)
      .join(''),
    'with Keanu Reeves (Neo)',
  );
  assert.deepEqual(highlight('', 'x'), []);
});
