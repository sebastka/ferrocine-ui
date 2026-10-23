// Item cards: posters (2:3) in grids, landscape thumbnails (16:9) for episodes and rows.

import type { ItemSummary } from '../api.ts';
import { episodeCode } from '../logic/format.ts';
import { paths } from '../logic/route.ts';
import { CheckIcon } from './icons.tsx';
import { Link, Progress } from './ui.tsx';

export type CardShape = 'poster' | 'landscape';

function subtitle(item: ItemSummary): string | null {
  if (item.kind === 'episode') {
    const code = episodeCode(item.season_number, item.episode_number);
    return [item.series_title, code].filter(Boolean).join(' · ') || null;
  }
  if (item.kind === 'season') return item.child_count !== null ? `${item.child_count} episodes` : null;
  return item.year !== null ? String(item.year) : null;
}

function imageFor(item: ItemSummary, shape: CardShape): string | null {
  if (shape === 'poster') return item.images.poster ?? item.images.thumb;
  return item.images.thumb ?? item.images.backdrop ?? item.images.poster;
}

/** The image, or a placeholder with the title when there is none (or it fails to load). */
export function Artwork({ src, title, className }: { src: string | null; title: string; className?: string }) {
  return (
    <div className={`artwork${className ? ` ${className}` : ''}`}>
      <span className="artwork-placeholder" aria-hidden="true">
        {title}
      </span>
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      )}
    </div>
  );
}

export function ItemCard({ item, shape = 'poster' }: { item: ItemSummary; shape?: CardShape }) {
  const { user } = item;
  const progress = item.runtime_ms && user.position_ms > 0 ? user.position_ms / item.runtime_ms : 0;
  const sub = subtitle(item);
  return (
    <Link to={paths.item(item.id)} className={`card card-${shape}`} title={item.title}>
      <div className="card-media">
        <Artwork src={imageFor(item, shape)} title={item.title} />
        {user.played && (
          <span className="badge badge-played" title="Played">
            <CheckIcon label="Played" />
          </span>
        )}
        {!user.played && item.unplayed_count !== null && item.unplayed_count > 0 && (
          <span className="badge badge-count" title={`${item.unplayed_count} unplayed`}>
            {item.unplayed_count}
          </span>
        )}
        {progress > 0 && !user.played && <Progress value={progress} className="card-progress" />}
      </div>
      <div className="card-text">
        <span className="card-title">{item.title}</span>
        {sub && <span className="card-sub">{sub}</span>}
      </div>
    </Link>
  );
}

/** A titled horizontal row that scrolls sideways. */
export function Row({ title, items, shape }: { title: string; items: ItemSummary[]; shape: CardShape }) {
  if (items.length === 0) return null;
  return (
    <section className="row">
      <h2>{title}</h2>
      <div className={`row-scroll row-${shape}`}>
        {items.map((it) => (
          <ItemCard key={it.id} item={it} shape={shape} />
        ))}
      </div>
    </section>
  );
}

export function Grid({ items, shape = 'poster' }: { items: ItemSummary[]; shape?: CardShape }) {
  return (
    <div className={`grid grid-${shape}`}>
      {items.map((it) => (
        <ItemCard key={it.id} item={it} shape={shape} />
      ))}
    </div>
  );
}
