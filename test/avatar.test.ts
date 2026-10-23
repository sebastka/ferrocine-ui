import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_COLOURS, avatarColour, initials } from '../src/logic/avatar.ts';

test('initials from the display name, else the username', () => {
  assert.equal(initials('Ada Lovelace', 'ada'), 'AL');
  assert.equal(initials('Ada', 'ada'), 'A');
  assert.equal(initials('Jean-Luc de la Tour', 'jl'), 'JT');
  assert.equal(initials('  élodie   durand ', 'x'), 'ÉD');
  assert.equal(initials(null, 'bob.smith'), 'BS');
  assert.equal(initials('', 'alice'), 'A');
  assert.equal(initials('🎬 ', 'zoë@example.com'), 'Z');
  assert.equal(initials(null, 'jane.doe@example.com'), 'JD');
  assert.equal(initials(null, '---'), '?');
  assert.equal(initials('山田 太郎', 'yamada'), '山太');
});

test('colour is stable and within the palette', () => {
  assert.equal(avatarColour('alice'), avatarColour('alice'));
  for (const name of ['alice', 'bob', 'carol', 'dave', '', 'zoë']) {
    const c = avatarColour(name);
    assert.ok(Number.isInteger(c) && c >= 0 && c < AVATAR_COLOURS);
  }
  // Different users spread over several colours.
  const used = new Set(['alice', 'bob', 'carol', 'dave', 'erin', 'frank', 'grace', 'heidi'].map(avatarColour));
  assert.ok(used.size >= 4);
});
