import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, paths, safeReturnTo } from '../src/logic/route.ts';

test('parses every route', () => {
  assert.deepEqual(parseRoute('/', ''), { name: 'home' });
  assert.deepEqual(parseRoute('/library/my%20movies', ''), { name: 'library', id: 'my movies' });
  assert.deepEqual(parseRoute('/item/42', ''), { name: 'item', id: 42 });
  assert.deepEqual(parseRoute('/play/42', '?from=start'), { name: 'play', id: 42, fromStart: true });
  assert.deepEqual(parseRoute('/play/42', ''), { name: 'play', id: 42, fromStart: false });
  assert.deepEqual(parseRoute('/search', '?q=dune'), { name: 'search', q: 'dune' });
  assert.deepEqual(parseRoute('/admin', ''), { name: 'admin' });
  assert.deepEqual(parseRoute('/profile', ''), { name: 'profile' });
  assert.deepEqual(parseRoute('/item/abc', ''), { name: 'notFound' });
  assert.deepEqual(parseRoute('/nope', ''), { name: 'notFound' });
});

test('paths round-trip', () => {
  assert.deepEqual(parseRoute(paths.library('a b'), ''), { name: 'library', id: 'a b' });
  const [p, q] = paths.play(7, true).split('?');
  assert.deepEqual(parseRoute(p ?? '', `?${q}`), { name: 'play', id: 7, fromStart: true });
});

test('return_to stays local', () => {
  assert.equal(safeReturnTo('/item/1?x=2'), '/item/1?x=2');
  assert.equal(safeReturnTo('//evil.example/'), '/');
  assert.equal(safeReturnTo('/\\evil.example/'), '/');
  assert.equal(safeReturnTo('https://evil.example/'), '/');
});
