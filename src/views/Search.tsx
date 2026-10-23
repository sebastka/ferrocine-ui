import { useEffect, useState } from 'react';
import { api, type ItemKind, type ItemSummary } from '../api.ts';
import { Grid } from '../components/cards.tsx';
import { Empty, ErrorBox, Spinner } from '../components/ui.tsx';
import { useAsync, useDebounced } from '../hooks.ts';
import { paths } from '../logic/route.ts';
import { navigate } from '../router.ts';

const GROUPS: { kind: ItemKind; title: string }[] = [
  { kind: 'movie', title: 'Movies' },
  { kind: 'series', title: 'Series' },
  { kind: 'episode', title: 'Episodes' },
];

export function Search({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const q = useDebounced(text.trim(), 300);
  useEffect(() => navigate(paths.search(q), { replace: true }), [q]);
  const results = useAsync(q.length >= 2 ? `search:${q}` : null, (signal) => api.search(q, signal));
  const by = (kind: ItemKind) => (results.data ?? []).filter((i: ItemSummary) => i.kind === kind);

  return (
    <div className="page">
      <h1 className="sr-only">Search</h1>
      <input
        type="search"
        className="input input-large"
        placeholder="Search movies, series and episodes"
        aria-label="Search"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {q.length < 2 ? null : results.error ? (
        <ErrorBox error={results.error} onRetry={results.reload} />
      ) : !results.data ? (
        <Spinner />
      ) : results.data.length === 0 ? (
        <Empty>Nothing matches “{q}”.</Empty>
      ) : (
        GROUPS.map(({ kind, title }) => {
          const items = by(kind);
          return items.length === 0 ? null : (
            <section key={kind} className="section">
              <h2>{title}</h2>
              <Grid items={items} shape={kind === 'episode' ? 'landscape' : 'poster'} />
            </section>
          );
        })
      )}
    </div>
  );
}
