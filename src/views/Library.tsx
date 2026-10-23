// A library: poster grid with sorting, filters and infinite scroll.

import { useEffect, useRef, useState } from 'react';
import { api, type ItemSummary, type LibraryQuery, type Sort } from '../api.ts';
import { Grid } from '../components/cards.tsx';
import { Empty, ErrorBox, Spinner } from '../components/ui.tsx';
import { useSession } from '../context.ts';
import { useAsync, useDebounced } from '../hooks.ts';
import { replaceQuery } from '../router.ts';

const PAGE = 100;
const SORTS: { id: Sort; label: string }[] = [
  { id: 'title', label: 'Title' },
  { id: 'added', label: 'Date added' },
  { id: 'released', label: 'Release date' },
  { id: 'year', label: 'Year' },
  { id: 'rating', label: 'Rating' },
];
type Filter = 'all' | 'unplayed' | 'played' | 'favorite';

interface Filters {
  sort: Sort;
  order: 'asc' | 'desc';
  genre: string;
  filter: Filter;
  q: string;
}

function readFilters(): Filters {
  const p = new URLSearchParams(location.search);
  const sort = (SORTS.find((s) => s.id === p.get('sort'))?.id ?? 'title') as Sort;
  const order = p.get('order') === 'asc' || p.get('order') === 'desc' ? (p.get('order') as 'asc' | 'desc') : null;
  const filter = (['unplayed', 'played', 'favorite'] as const).find((f) => f === p.get('filter')) ?? 'all';
  return {
    sort,
    order: order ?? (sort === 'title' ? 'asc' : 'desc'),
    genre: p.get('genre') ?? '',
    filter,
    q: p.get('q') ?? '',
  };
}

function toQuery(f: Filters, q: string): LibraryQuery {
  return {
    sort: f.sort,
    order: f.order,
    genre: f.genre || undefined,
    played: f.filter === 'played' ? true : f.filter === 'unplayed' ? false : undefined,
    favorite: f.filter === 'favorite' ? true : undefined,
    q: q || undefined,
  };
}

export function Library({ id }: { id: string }) {
  const { libraries } = useSession();
  const library = libraries.find((l) => l.id === id);
  // Filters live in the URL, so reloading or coming back restores them.
  const [filters, setFilters] = useState<Filters>(readFilters);
  const q = useDebounced(filters.q.trim(), 300);
  const query = toQuery(filters, q);
  const key = `${id}?${JSON.stringify(query)}`;

  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.sort !== 'title') p.set('sort', filters.sort);
    if (filters.order !== (filters.sort === 'title' ? 'asc' : 'desc')) p.set('order', filters.order);
    if (filters.genre) p.set('genre', filters.genre);
    if (filters.filter !== 'all') p.set('filter', filters.filter);
    if (q) p.set('q', q);
    replaceQuery(p);
  }, [filters.sort, filters.order, filters.genre, filters.filter, q]);

  const genres = useAsync(`genres:${id}`, (signal) => api.genres(id, signal));
  const first = useAsync(key, (signal) => api.libraryItems(id, { ...query, offset: 0, limit: PAGE }, signal));
  const [more, setMore] = useState<{ key: string; items: ItemSummary[] }>({ key, items: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const extra = more.key === key ? more.items : [];
  const items = first.data ? [...first.data.items, ...extra] : [];
  const total = first.data?.total ?? 0;

  const sentinel = useRef<HTMLDivElement>(null);
  const canLoadMore = first.data !== undefined && items.length < total && !loadingMore;
  const loadMoreRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    loadMoreRef.current = () => {
      if (!canLoadMore) return;
      setLoadingMore(true);
      api
        .libraryItems(id, { ...query, offset: items.length, limit: PAGE })
        .then((page) => setMore((m) => ({ key, items: [...(m.key === key ? m.items : []), ...page.items] })))
        .catch(() => undefined)
        .finally(() => setLoadingMore(false));
    };
  });
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: '800px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [key, first.data]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-head">
        <h1>{library?.name ?? id}</h1>
        {first.data && (
          <span className="muted">
            {total} {library?.kind === 'shows' ? 'series' : 'movies'}
          </span>
        )}
      </div>
      <div className="toolbar" role="search">
        <input
          type="search"
          className="input"
          placeholder="Filter by title"
          aria-label="Filter by title"
          value={filters.q}
          onChange={(e) => set('q', e.target.value)}
        />
        <label className="select-label">
          <span>Sort</span>
          <select
            className="select"
            value={filters.sort}
            onChange={(e) => {
              const sort = e.target.value as Sort;
              setFilters((f) => ({ ...f, sort, order: sort === 'title' ? 'asc' : 'desc' }));
            }}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => set('order', filters.order === 'asc' ? 'desc' : 'asc')}
          title="Reverse the order"
        >
          {filters.order === 'asc' ? '↑ Ascending' : '↓ Descending'}
        </button>
        <label className="select-label">
          <span>Genre</span>
          <select className="select" value={filters.genre} onChange={(e) => set('genre', e.target.value)}>
            <option value="">All</option>
            {(genres.data ?? []).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="select-label">
          <span>Show</span>
          <select className="select" value={filters.filter} onChange={(e) => set('filter', e.target.value as Filter)}>
            <option value="all">All</option>
            <option value="unplayed">Unplayed</option>
            <option value="played">Played</option>
            <option value="favorite">Favorites</option>
          </select>
        </label>
      </div>
      {first.error ? (
        <ErrorBox error={first.error} onRetry={first.reload} />
      ) : !first.data ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>No match.</Empty>
      ) : (
        <Grid items={items} />
      )}
      <div ref={sentinel} className="sentinel" />
      {loadingMore && <Spinner label="Loading more" />}
    </div>
  );
}
