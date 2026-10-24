import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCode, formatCode, invalidChars, parseCode, platformLabel } from '../src/logic/pair.ts';

test('codes ignore case, spaces and dashes', () => {
  assert.equal(cleanCode(' k7tq-m2xd '), 'K7TQM2XD');
  assert.equal(parseCode('K7TQ-M2XD'), 'K7TQM2XD');
  assert.equal(parseCode('k7tq m2xd'), 'K7TQM2XD');
  assert.equal(parseCode('K7TQ--M2 XD'), 'K7TQM2XD');
});

test('incomplete, too long or impossible codes are refused', () => {
  assert.equal(parseCode('K7TQ-M2X'), null);
  assert.equal(parseCode('K7TQ-M2XDA'), null);
  assert.equal(parseCode('K7TQ-M20D'), null); // 0 is never used
  assert.equal(parseCode('K7TQ-MIXD'), null); // nor I
  assert.equal(parseCode(''), null);
  assert.deepEqual(invalidChars('k0tq-m1xo'), ['0', '1', 'O']);
  assert.deepEqual(invalidChars('K7TQM2XD'), []);
});

test('display as XXXX-XXXX', () => {
  assert.equal(formatCode('k7tqm2xd'), 'K7TQ-M2XD');
  assert.equal(formatCode('K7T'), 'K7T');
  assert.equal(formatCode('K7TQ'), 'K7TQ');
  assert.equal(formatCode('K7TQM'), 'K7TQ-M');
  assert.equal(formatCode('K7TQ-M2XD-EXTRA'), 'K7TQ-M2XD');
});

test('platform labels', () => {
  assert.equal(platformLabel('androidtv'), 'Android TV');
  assert.equal(platformLabel('AndroidTV'), 'Android TV');
  assert.equal(platformLabel('kodi'), 'kodi');
  assert.equal(platformLabel(null), null);
  assert.equal(platformLabel(''), null);
});
