// Ratings badges and external links of an item page. Pure, unit-tested.

import type { ItemKind, ProviderId, Rating } from '../api.ts';

const LABELS: Record<string, string> = {
  tmdb: 'TMDB',
  imdb: 'IMDb',
  rotten_tomatoes: 'RT',
  metacritic: 'Metacritic',
  anilist: 'AniList',
  anidb: 'AniDB',
};

/** Sources whose 0–100 scale reads as a percentage (the others show a plain score). */
const PERCENT = new Set(['rotten_tomatoes', 'anilist']);

export function ratingLabel(source: string): string {
  return LABELS[source] ?? source;
}

/** `8.5` (out of 10), `93%` (Rotten Tomatoes, AniList), `73` (Metacritic), else `value/max`. */
export function ratingValue(r: Rating): string {
  const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  if (r.max === 100) return PERCENT.has(r.source) ? `${Math.round(r.value)}%` : String(Math.round(r.value));
  if (r.max === 10) return num(r.value);
  return `${num(r.value)}/${num(r.max)}`;
}

/** Badges in a stable order, skipping unusable values. */
export function ratingBadges(ratings: Rating[]): { source: string; label: string; value: string }[] {
  const order = Object.keys(LABELS);
  return ratings
    .filter((r) => Number.isFinite(r.value) && Number.isFinite(r.max) && r.max > 0)
    .sort((a, b) => rank(order, a.source) - rank(order, b.source))
    .map((r) => ({ source: r.source, label: ratingLabel(r.source), value: ratingValue(r) }));
}

function rank(order: string[], source: string): number {
  const i = order.indexOf(source);
  return i < 0 ? order.length : i;
}

export interface ExternalLink {
  label: string;
  url: string;
}

/**
 * Links to the item on metadata sites, for the ids that apply to its kind: TMDB and TVDB pages
 * exist for movies and series (seasons and episodes carry the series' ids or none), IMDb for
 * every kind, AniDB and AniList for anime series and movies.
 */
export function externalLinks(kind: ItemKind, ids: Partial<Record<ProviderId, string | null>>): ExternalLink[] {
  const enc = encodeURIComponent;
  const out: ExternalLink[] = [];
  const top = kind === 'movie' || kind === 'series';
  if (ids.tmdb && top) {
    out.push({
      label: 'TMDB',
      url: `https://www.themoviedb.org/${kind === 'movie' ? 'movie' : 'tv'}/${enc(ids.tmdb)}`,
    });
  }
  if (ids.imdb) out.push({ label: 'IMDb', url: `https://www.imdb.com/title/${enc(ids.imdb)}/` });
  if (ids.tvdb && top) out.push({ label: 'TheTVDB', url: `https://thetvdb.com/dereferrer/series/${enc(ids.tvdb)}` });
  if (ids.anidb && top) out.push({ label: 'AniDB', url: `https://anidb.net/anime/${enc(ids.anidb)}` });
  if (ids.anilist && top) out.push({ label: 'AniList', url: `https://anilist.co/anime/${enc(ids.anilist)}` });
  return out;
}
