import { useEffect, useState } from 'react';
import { api, type ItemKind, type SearchResult } from '../api.ts';
import { Grid } from '../components/cards.tsx';
import { Empty, ErrorBox, Spinner } from '../components/ui.tsx';
import { useAsync, useDebounced } from '../hooks.ts';
import { paths } from '../logic/route.ts';
import { highlight, matchLabel } from '../logic/search.ts';
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
  const by = (kind: ItemKind) => (results.data ?? []).filter((i) => i.kind === kind);

  return (
    <div className="page">
      <h1 className="sr-only">Search</h1>
      <input
        type="search"
        className="input input-large"
        placeholder="Search titles, cast, crew…"
        aria-label="Search"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="muted search-hint">
        Movies, series and episodes by title (also original and translated ones), cast or crew. Words can come in any
        order.
      </p>
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
              <Grid items={items} shape={kind === 'episode' ? 'landscape' : 'poster'} note={(i) => matchNote(i, q)} />
            </section>
          );
        })
      )}
    </div>
  );
}

/** Why a result was found when not by its shown title, the query's words emphasised; null otherwise. */
function matchNote(result: SearchResult, query: string) {
  const label = matchLabel(result.matched);
  if (!label) return null;
  // The card clamps the line to two rows; the full text is the tooltip.
  return (
    <span title={label}>{highlight(label, query).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text))}</span>
  );
}
