// URL paths of the UI, parsed into routes. Pure; the History API glue is in ../router.ts.

export type Route =
  | { name: 'home' }
  | { name: 'library'; id: string }
  | { name: 'item'; id: number }
  | { name: 'play'; id: number; fromStart: boolean }
  | { name: 'search'; q: string }
  | { name: 'admin' }
  | { name: 'profile' }
  | { name: 'pair'; code: string }
  | { name: 'notFound' };

export function parseRoute(pathname: string, search: string): Route {
  const params = new URLSearchParams(search);
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const num = (s: string | undefined) => (s && /^\d+$/.test(s) ? Number(s) : null);
  if (parts.length === 0) return { name: 'home' };
  const [head, arg] = parts;
  if (head === 'library' && arg && parts.length === 2) return { name: 'library', id: arg };
  if (head === 'item' && parts.length === 2) {
    const id = num(arg);
    if (id !== null) return { name: 'item', id };
  }
  if (head === 'play' && parts.length === 2) {
    const id = num(arg);
    if (id !== null) return { name: 'play', id, fromStart: params.get('from') === 'start' };
  }
  if (head === 'search' && parts.length === 1) return { name: 'search', q: params.get('q') ?? '' };
  if (head === 'admin' && parts.length === 1) return { name: 'admin' };
  if (head === 'profile' && parts.length === 1) return { name: 'profile' };
  if (head === 'pair' && parts.length === 1) return { name: 'pair', code: params.get('code') ?? '' };
  return { name: 'notFound' };
}

export const paths = {
  home: () => '/',
  library: (id: string) => `/library/${encodeURIComponent(id)}`,
  item: (id: number) => `/item/${id}`,
  play: (id: number, fromStart = false) => `/play/${id}${fromStart ? '?from=start' : ''}`,
  search: (q: string) => (q ? `/search?q=${encodeURIComponent(q)}` : '/search'),
  admin: () => '/admin',
  profile: () => '/profile',
  pair: (code = '') => (code ? `/pair?code=${encodeURIComponent(code)}` : '/pair'),
};

/** A `return_to` for sign-in: a local path only, never `//host` (open redirect). */
export function safeReturnTo(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/';
}
