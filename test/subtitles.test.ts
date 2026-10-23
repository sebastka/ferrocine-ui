import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSubtitleLanguage, resultBadges } from '../src/logic/subtitles.ts';

test('default search language from the browser', () => {
  assert.equal(defaultSubtitleLanguage(['fr-FR', 'en-US']), 'fr');
  assert.equal(defaultSubtitleLanguage(['nb-NO', 'en']), 'no');
  assert.equal(defaultSubtitleLanguage(['pt_BR']), 'pt');
  assert.equal(defaultSubtitleLanguage(['xx', 'de']), 'de');
  assert.equal(defaultSubtitleLanguage([]), 'en');
});

test('result badges', () => {
  const none = {
    hash_match: false,
    hearing_impaired: false,
    foreign_parts_only: false,
    machine_translated: false,
    ai_translated: false,
  };
  assert.deepEqual(resultBadges(none), []);
  assert.deepEqual(
    resultBadges({ ...none, hash_match: true, hearing_impaired: true, ai_translated: true }).map((b) => b.label),
    ['Matches file', 'HI', 'Machine'],
  );
  assert.deepEqual(
    resultBadges({ ...none, foreign_parts_only: true, machine_translated: true }).map((b) => b.label),
    ['Forced', 'Machine'],
  );
});
