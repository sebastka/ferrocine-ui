import { createContext, useContext } from 'react';
import type { Library, Me } from './api.ts';

export interface Session {
  me: Me;
  libraries: Library[];
  /** Fetch the library list again (after a configuration reload, say). */
  refreshLibraries: () => Promise<void>;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside of a signed-in session');
  return s;
}
