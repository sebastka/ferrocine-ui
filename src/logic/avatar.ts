// Initials and colour of the fallback avatar (no picture from the identity provider).

/** Number of avatar colours; `.avatar-c0` … `.avatar-c7` in styles.css. */
export const AVATAR_COLOURS = 8;

/**
 * One or two letters: the first letters of the first and last words of the display name
 * ("Ada Lovelace" → "AL", "Ada" → "A"), else of the username. Letters, not code units, so
 * accented and non-Latin names work; "?" when there is nothing usable.
 */
export function initials(displayName: string | null, username: string): string {
  const words = (name: string) => name.split(/[\s._-]+/u).filter((w) => /\p{L}|\p{N}/u.test(w));
  let parts = words(displayName ?? '');
  // A username may be an e-mail address: its domain says nothing about the person.
  if (parts.length === 0) parts = words(username.split('@')[0] ?? '');
  const first = (w: string | undefined) => (w ? (Array.from(w).find((c) => /\p{L}|\p{N}/u.test(c)) ?? '') : '');
  const head = first(parts[0]);
  const tail = parts.length > 1 ? first(parts[parts.length - 1]) : '';
  return (head + tail).toLocaleUpperCase() || '?';
}

/**
 * The colour index of a user: a hash (FNV-1a, 32 bits) of the username, so the same user keeps
 * the same colour everywhere and across sessions, without storing anything.
 */
export function avatarColour(username: string): number {
  let h = 0x811c9dc5;
  for (const c of username) {
    h ^= c.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % AVATAR_COLOURS;
}
