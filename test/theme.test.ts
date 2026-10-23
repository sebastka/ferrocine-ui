import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTheme, resolveTheme, themeAttribute } from '../src/logic/theme.ts';

test('stored values', () => {
  assert.equal(parseTheme('light'), 'light');
  assert.equal(parseTheme('dark'), 'dark');
  assert.equal(parseTheme('system'), 'system');
  assert.equal(parseTheme(null), 'system');
  assert.equal(parseTheme('Dark'), 'system');
  assert.equal(parseTheme(''), 'system');
  assert.equal(parseTheme(undefined), 'system');
});

test('effective theme', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('html attribute', () => {
  assert.equal(themeAttribute('system'), null);
  assert.equal(themeAttribute('light'), 'light');
  assert.equal(themeAttribute('dark'), 'dark');
});
