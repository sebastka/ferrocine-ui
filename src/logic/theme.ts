// Theme choice: follow the system, or force light or dark. Pure, unit-tested; public/theme.js
// repeats parseTheme in plain JavaScript to apply the choice before the first paint.

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'ferrocine.theme';
export const THEME_CHOICES: ThemeChoice[] = ['system', 'light', 'dark'];

/** A stored value as a choice: anything missing or unknown means "system". */
export function parseTheme(raw: unknown): ThemeChoice {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/** The theme in effect, given whether the system currently prefers dark. */
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): Theme {
  if (choice === 'system') return systemDark ? 'dark' : 'light';
  return choice;
}

/** The `data-theme` attribute of <html> for a choice: none for "system" (CSS follows the media query). */
export function themeAttribute(choice: ThemeChoice): Theme | null {
  return choice === 'system' ? null : choice;
}
