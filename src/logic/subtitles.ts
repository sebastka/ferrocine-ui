// Subtitle search: languages offered and the default one. Pure, unit-tested.

/** ISO 639-1 codes offered in the search dialog (OpenSubtitles' most used ones). */
export const SUBTITLE_LANGUAGES = [
  'en',
  'fr',
  'de',
  'es',
  'it',
  'pt',
  'nl',
  'sv',
  'no',
  'da',
  'fi',
  'is',
  'pl',
  'cs',
  'sk',
  'hu',
  'ro',
  'bg',
  'hr',
  'sr',
  'sl',
  'el',
  'tr',
  'ru',
  'uk',
  'et',
  'lv',
  'lt',
  'ar',
  'he',
  'fa',
  'hi',
  'ja',
  'ko',
  'zh',
  'vi',
  'th',
  'id',
  'ms',
];

/**
 * The first browser language that can be searched (`nb-NO` → `no`, `pt-BR` → `pt`), else
 * English.
 */
export function defaultSubtitleLanguage(browserLanguages: readonly string[]): string {
  for (const tag of browserLanguages) {
    let code = tag.toLowerCase().split(/[-_]/)[0] ?? '';
    if (code === 'nb' || code === 'nn') code = 'no';
    if (SUBTITLE_LANGUAGES.includes(code)) return code;
  }
  return 'en';
}

/** Short badges of a search result, in a fixed order. */
export function resultBadges(r: {
  hash_match: boolean;
  hearing_impaired: boolean;
  foreign_parts_only: boolean;
  machine_translated: boolean;
  ai_translated: boolean;
}): { id: string; label: string; title: string }[] {
  const out: { id: string; label: string; title: string }[] = [];
  if (r.hash_match) out.push({ id: 'hash', label: 'Matches file', title: 'Made for this exact file' });
  if (r.hearing_impaired) out.push({ id: 'hi', label: 'HI', title: 'For the hearing impaired' });
  if (r.foreign_parts_only) out.push({ id: 'forced', label: 'Forced', title: 'Foreign parts only' });
  if (r.machine_translated || r.ai_translated) {
    out.push({ id: 'machine', label: 'Machine', title: 'Machine or AI translated' });
  }
  return out;
}
