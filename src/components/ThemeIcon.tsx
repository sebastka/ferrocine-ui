import type { ThemeChoice } from '../logic/theme.ts';
import { MonitorIcon, MoonIcon, SunIcon } from './icons.tsx';

export function ThemeIcon({ choice }: { choice: ThemeChoice }) {
  if (choice === 'light') return <SunIcon />;
  if (choice === 'dark') return <MoonIcon />;
  return <MonitorIcon />;
}
