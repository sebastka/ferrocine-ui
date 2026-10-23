// History API routing: a hook that follows the location, and navigation helpers.

import { useSyncExternalStore } from 'react';
import { parseRoute, type Route } from './logic/route.ts';

const CHANGE = 'ferrocine:navigate';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

const snapshot = () => location.pathname + location.search;

/** The current path and query; re-renders on navigation. */
export function useLocation(): string {
  return useSyncExternalStore(subscribe, snapshot);
}

export function useRoute(): Route {
  const loc = useLocation();
  const i = loc.indexOf('?');
  return parseRoute(i < 0 ? loc : loc.slice(0, i), i < 0 ? '' : loc.slice(i));
}

// Entries this tab pushed: `back` only goes back into the UI, never out of it.
let pushed = 0;

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  if (to === snapshot()) return;
  if (opts.replace) history.replaceState(null, '', to);
  else {
    pushed++;
    history.pushState(null, '', to);
    window.scrollTo(0, 0);
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** Change the query string of the current page without a history entry or re-render. */
export function replaceQuery(params: URLSearchParams): void {
  const q = params.toString();
  history.replaceState(null, '', location.pathname + (q ? `?${q}` : ''));
}

/** Go back within the UI, or to `fallback` when the page was opened directly. */
export function back(fallback: string): void {
  if (pushed > 0) {
    pushed--;
    history.back();
  } else navigate(fallback, { replace: true });
}
