import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ConfigField } from '../src/api.ts';
import { activeChoice, display, sameValue, showDefault, splitCode } from '../src/logic/config.ts';

const field = (f: Partial<ConfigField>): ConfigField => ({
  key: 'k',
  kind: 'string',
  value: null,
  default: null,
  description: '',
  ...f,
});

test('values compare, lists element by element', () => {
  assert.equal(sameValue(8, 8), true);
  assert.equal(sameValue('6h', '6h'), true);
  assert.equal(sameValue(['a', 'b'], ['a', 'b']), true);
  assert.equal(sameValue(['a'], ['a', 'b']), false);
  assert.equal(sameValue([], null), false);
  assert.equal(sameValue(null, null), true);
});

test('the default is shown only when it differs from an existing default', () => {
  assert.equal(showDefault(field({ kind: 'integer', value: 4, default: 8 })), true);
  assert.equal(showDefault(field({ kind: 'integer', value: 8, default: 8 })), false);
  assert.equal(showDefault(field({ value: 'https://id.example.com', default: null })), false);
  assert.equal(showDefault(field({ kind: 'secret', value: null, default: 'x', set: true })), false);
  assert.equal(showDefault(field({ kind: 'list', value: ['openid'], default: ['openid', 'profile'] })), true);
});

test('display by kind', () => {
  assert.deepEqual(display('boolean', true), { text: 'On', mono: false, muted: false });
  assert.deepEqual(display('boolean', false), { text: 'Off', mono: false, muted: false });
  assert.deepEqual(display('string', null), { text: 'not set', mono: false, muted: true });
  assert.deepEqual(display('list', []), { text: 'empty', mono: false, muted: true });
  assert.deepEqual(display('duration', '6h'), { text: '6h', mono: true, muted: false });
  assert.deepEqual(display('path', '/media'), { text: '/media', mono: true, muted: false });
  assert.deepEqual(display('integer', 8), { text: '8', mono: false, muted: false });
});

test('active choice', () => {
  const choices = [
    { value: 'auto', description: '' },
    { value: 'none', description: '' },
  ];
  assert.equal(activeChoice(field({ kind: 'choice', value: 'none', choices })), 'none');
  assert.equal(activeChoice(field({ kind: 'choice', value: 'other', choices })), null);
  assert.equal(activeChoice(field({ kind: 'choice', value: null, choices })), null);
  const engines = [
    { value: 'postgres://', description: '' },
    { value: 'postgresql://', description: '' },
    { value: 'mariadb://', description: '' },
    { value: 'mysql://', description: '' },
  ];
  assert.equal(activeChoice(field({ kind: 'url', value: 'postgresql://fc@db/fc', choices: engines })), 'postgresql://');
  assert.equal(activeChoice(field({ kind: 'url', value: 'mariadb://fc@db/fc', choices: engines })), 'mariadb://');
  assert.equal(activeChoice(field({ kind: 'url', value: 'sqlite://x', choices: engines })), null);
  assert.equal(activeChoice(field({ kind: 'url', value: 'x' })), null);
});

test('code spans in descriptions', () => {
  assert.deepEqual(splitCode('Bearer token required by `/metrics`.'), [
    { text: 'Bearer token required by ', code: false },
    { text: '/metrics', code: true },
    { text: '.', code: false },
  ]);
  assert.deepEqual(splitCode('`a` and `b`'), [
    { text: 'a', code: true },
    { text: ' and ', code: false },
    { text: 'b', code: true },
  ]);
  assert.deepEqual(splitCode('no code'), [{ text: 'no code', code: false }]);
  assert.deepEqual(splitCode('one ` stray'), [{ text: 'one ` stray', code: false }]);
  assert.deepEqual(splitCode('`x` and ` stray'), [{ text: '`x` and ` stray', code: false }]);
  assert.deepEqual(splitCode('<b>`<i>`'), [
    { text: '<b>', code: false },
    { text: '<i>', code: true },
  ]);
  assert.deepEqual(splitCode(''), []);
});
