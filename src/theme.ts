// The theme choice as shared state: stored per browser, applied to <html>, followed live by
// every component (and across tabs through the `storage` event).

import { useSyncExternalStore } from 'react';
import { parseTheme, resolveTheme, THEME_KEY, themeAttribute, type Theme, type ThemeChoice } from './logic/theme.ts';

const CHANGE = 'ferrocine:theme';
const dark = () => window.matchMedia('(prefers-color-scheme: dark)');

function read(): ThemeChoice {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

function apply(choice: ThemeChoice): void {
  const attr = themeAttribute(choice);
  if (attr) document.documentElement.setAttribute('data-theme', attr);
  else document.documentElement.removeAttribute('data-theme');
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Not remembered, but applied to this page all the same.
  }
  current = choice;
  apply(choice);
  window.dispatchEvent(new Event(CHANGE));
}

let current: ThemeChoice = read();

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY && e.key !== null) return;
    current = read();
    apply(current);
    onChange();
  };
  const mq = dark();
  window.addEventListener(CHANGE, onChange);
  window.addEventListener('storage', onStorage);
  mq.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener('storage', onStorage);
    mq.removeEventListener('change', onChange);
  };
}

/** The choice and the theme in effect (which follows the system live under "system"). */
export function useTheme(): { choice: ThemeChoice; theme: Theme } {
  const choice = useSyncExternalStore(subscribe, () => current);
  const systemDark = useSyncExternalStore(subscribe, () => dark().matches);
  return { choice, theme: resolveTheme(choice, systemDark) };
}

export const THEME_LABELS: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' };
