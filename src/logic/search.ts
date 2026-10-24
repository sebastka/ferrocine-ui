// Why a search result matched, as a short line under its title. Pure, unit-tested.

import type { SearchMatch } from '../api.ts';

/** "with Keanu Reeves (Neo)", "Directed by Lana Wachowski", "Writer: …", "Original title: …". */
export function matchLabel(m: SearchMatch | null | undefined): string | null {
  if (!m || !m.text) return null;
  switch (m.kind) {
    case 'cast':
      return `with ${m.text}${m.character ? ` (${m.character})` : ''}`;
    case 'crew': {
      const role = m.role?.trim().replace(/_/g, ' ');
      if (!role) return `Crew: ${m.text}`;
      if (role.toLowerCase() === 'director') return `Directed by ${m.text}`;
      return `${role.charAt(0).toLocaleUpperCase()}${role.slice(1)}: ${m.text}`;
    }
    case 'original_title':
      return `Original title: ${m.text}`;
    default:
      // A kind added by a newer core: its text alone.
      return (m as { text: string }).text;
  }
}

/** Lower case, accents and punctuation removed: how the core compares words. */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

export interface Highlight {
  text: string;
  hit: boolean;
}

/**
 * `text` split into parts, the words starting with one of the query's words marked as hits
 * (case- and accent-insensitive, any order), for emphasis. Text is never changed, only split.
 */
export function highlight(text: string, query: string): Highlight[] {
  const words = fold(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (words.length === 0) return text ? [{ text, hit: false }] : [];
  const out: Highlight[] = [];
  const push = (t: string, hit: boolean) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && last.hit === hit) last.text += t;
    else out.push({ text: t, hit });
  };
  // Tokens: runs of letters/digits, and the separators between them.
  for (const token of text.match(/[\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+/gu) ?? []) {
    const f = fold(token);
    push(token, /[\p{L}\p{N}]/u.test(f) && words.some((w) => f.startsWith(w)));
  }
  return out;
}
