// Data loading hooks.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Async<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

/**
 * Load `fn` whenever `key` changes (the key names everything `fn` depends on). Stale answers
 * are dropped through the abort signal; `reload` refetches and keeps the old data meanwhile.
 */
export function useAsync<T>(key: string | null, fn: (signal: AbortSignal) => Promise<T>): Async<T> {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ key: string | null; tick: number; data?: T; error?: Error }>({
    key: null,
    tick: -1,
  });

  useEffect(() => {
    if (key === null) return;
    const ac = new AbortController();
    fnRef.current(ac.signal).then(
      (data) => setState({ key, tick, data }),
      (error: unknown) => {
        if (!ac.signal.aborted)
          setState({ key, tick, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => ac.abort();
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const sameKey = state.key === key;
  return {
    data: sameKey ? state.data : undefined,
    error: sameKey ? state.error : undefined,
    loading: key !== null && (!sameKey || state.tick !== tick),
    reload,
  };
}

/** `value`, once it has stopped changing for `ms`. */
export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Run `fn` every `ms` while mounted (and once the page is visible again). */
export function useInterval(fn: () => void, ms: number | null): void {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    if (ms === null) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') ref.current();
    }, ms);
    return () => clearInterval(t);
  }, [ms]);
}
