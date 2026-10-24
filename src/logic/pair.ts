// Quick Connect pairing codes and device labels. Pure, unit-tested.

/** The characters of pairing codes: no 0/O and 1/I, which are easily confused. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

/** What the user typed, without case, spaces and dashes (as the core reads codes). */
export function cleanCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]+/g, '');
}

/** The 8-character code, or null while it is incomplete or holds a character codes never use. */
export function parseCode(input: string): string | null {
  const code = cleanCode(input);
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

/** As shown on the TV: `K7TQ-M2XD`; a partial code keeps its dash once past four characters. */
export function formatCode(input: string): string {
  const code = cleanCode(input).slice(0, CODE_LENGTH);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Characters typed that no code contains (shown as a hint, e.g. `O` for `0`). */
export function invalidChars(input: string): string[] {
  return [...new Set([...cleanCode(input)].filter((c) => !CODE_ALPHABET.includes(c)))];
}

const PLATFORMS: Record<string, string> = {
  androidtv: 'Android TV',
  android: 'Android',
  ios: 'iOS',
  tvos: 'Apple TV',
  webos: 'webOS',
  tizen: 'Tizen',
  roku: 'Roku',
  firetv: 'Fire TV',
};

/** `androidtv` → `Android TV`; unknown platforms as they are; none → null. */
export function platformLabel(platform: string | null | undefined): string | null {
  if (!platform) return null;
  return PLATFORMS[platform.toLowerCase()] ?? platform;
}
