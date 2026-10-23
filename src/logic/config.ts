// Presentation of the running configuration (GET /api/v1/config). Pure, unit-tested.

import type { ConfigField, ConfigValue } from '../api.ts';

/** Whether two configuration values are equal (lists element by element). */
export function sameValue(a: ConfigValue, b: ConfigValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return a === b;
}

/**
 * Whether to show "default: …" next to a field: when it differs from a default that exists.
 * Secrets never show one; a null default means "required" or "off", which says nothing useful.
 */
export function showDefault(f: ConfigField): boolean {
  return f.kind !== 'secret' && f.default !== null && !sameValue(f.value, f.default);
}

export interface Display {
  text: string;
  /** Monospace: durations, paths, URLs, addresses. */
  mono: boolean;
  /** Muted: "not set", "empty". */
  muted: boolean;
}

const MONO_KINDS = new Set(['duration', 'path', 'url', 'address']);

/** A scalar value (or a list's emptiness) as text; lists with items are rendered as chips. */
export function display(kind: ConfigField['kind'], value: ConfigValue): Display {
  if (value === null) return { text: 'not set', mono: false, muted: true };
  if (typeof value === 'boolean') return { text: value ? 'On' : 'Off', mono: false, muted: false };
  if (Array.isArray(value))
    return { text: value.length === 0 ? 'empty' : value.join(', '), mono: false, muted: value.length === 0 };
  if (typeof value === 'string' && value === '') return { text: 'empty', mono: false, muted: true };
  return { text: String(value), mono: MONO_KINDS.has(kind), muted: false };
}

/**
 * The value of the active alternative: the value itself for a choice; for other kinds with
 * alternatives (the database URL and its engine schemes), the longest alternative the value
 * starts with. Null when none matches.
 */
export function activeChoice(f: ConfigField): string | null {
  if (!f.choices || f.choices.length === 0 || f.value === null || typeof f.value !== 'string') return null;
  const value = f.value;
  if (f.kind === 'choice') return f.choices.some((c) => c.value === value) ? value : null;
  let best: string | null = null;
  for (const c of f.choices) {
    if (value.toLowerCase().startsWith(c.value.toLowerCase()) && (best === null || c.value.length > best.length)) {
      best = c.value;
    }
  }
  return best;
}

export interface TextPart {
  text: string;
  code: boolean;
}

/**
 * Split Markdown-style `code` spans out of a description. With an odd number of backticks the
 * text is returned unchanged (one plain part), so stray backticks never swallow the rest.
 */
export function splitCode(text: string): TextPart[] {
  const pieces = text.split('`');
  if (pieces.length % 2 === 0) return [{ text, code: false }];
  return pieces.map((t, i) => ({ text: t, code: i % 2 === 1 })).filter((p) => p.text !== '');
}
