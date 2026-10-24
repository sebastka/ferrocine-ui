// Item details: movie, series (with seasons), season (with episodes) or episode.

import { useState, type ReactNode } from 'react';
import { api, type ItemDetail, type ItemSummary, type MediaInfo, type VideoInfo } from '../api.ts';
import { Artwork, Grid } from '../components/cards.tsx';
import { CheckIcon, HeartFilledIcon, HeartIcon, PlayIcon, RefreshIcon } from '../components/icons.tsx';
import { ErrorBox, Link, Progress, Spinner } from '../components/ui.tsx';
import { useSession } from '../context.ts';
import { useAsync } from '../hooks.ts';
import {
  bitrate,
  bytes,
  channels,
  clock,
  episodeCode,
  language,
  resolution,
  runtime as formatRuntime,
} from '../logic/format.ts';
import { chapterLabel, extraLabel } from '../logic/extras.ts';
import { externalLinks, ratingBadges } from '../logic/ratings.ts';
import { paths } from '../logic/route.ts';
import { navigate } from '../router.ts';

const HDR_LABELS: Record<NonNullable<VideoInfo['hdr']>, string> = {
  hdr10: 'HDR10',
  hlg: 'HLG',
  dolby_vision: 'Dolby Vision',
};

const playable = (i: ItemSummary) => i.kind === 'movie' || i.kind === 'episode' || i.kind === 'extra';

export function Item({ id }: { id: number }) {
  const item = useAsync(`item:${id}`, (signal) => api.item(id, signal));
  // Series have seasons, seasons episodes, and movies their extras.
  const hasChildren =
    item.data && (item.data.kind === 'series' || item.data.kind === 'season' || item.data.kind === 'movie');
  const children = useAsync(hasChildren ? `children:${id}` : null, (signal) => api.children(id, signal));

  if (item.error) return <ErrorBox error={item.error} onRetry={item.reload} />;
  if (!item.data) return <Spinner />;
  const it = item.data;
  const reload = () => {
    item.reload();
    children.reload();
  };

  return (
    <div className="item-page">
      <Hero item={it} episodes={it.kind === 'season' ? children.data : undefined} onChange={reload} />
      <div className="page">
        {it.kind === 'series' && (
          <section className="section">
            <h2>Seasons</h2>
            {children.data ? <Grid items={children.data} /> : <Spinner />}
          </section>
        )}
        {it.kind === 'season' && (
          <section className="section">
            <h2>Episodes</h2>
            {children.data ? <EpisodeList episodes={children.data} /> : <Spinner />}
          </section>
        )}
        {it.kind === 'movie' && children.data && children.data.length > 0 && (
          <Extras extras={children.data} fallback={it.images.backdrop} />
        )}
        {it.people.length > 0 && <People item={it} />}
        {it.media && <TechInfo item={it} media={it.media} onChange={item.reload} />}
      </div>
    </div>
  );
}

function Hero({ item, episodes, onChange }: { item: ItemDetail; episodes?: ItemSummary[]; onChange: () => void }) {
  const { me } = useSession();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const act = (fn: () => Promise<void>, done?: string) => {
    setBusy(true);
    fn()
      .then(() => {
        if (done) setNotice(done);
        onChange();
      })
      .catch((e: Error) => setNotice(e.message))
      .finally(() => setBusy(false));
  };

  const u = item.user;
  const resumable = playable(item) && u.position_ms > 0 && !u.played;
  // A season plays its first unplayed episode (or the first one).
  const nextEpisode = episodes?.find((e) => !e.user.played) ?? episodes?.[0];
  const meta = [
    item.kind === 'episode' ? episodeCode(item.season_number, item.episode_number) : null,
    item.year !== null ? String(item.year) : null,
    formatRuntime(item.runtime_ms),
    item.official_rating,
    // The per-source badges below say more; the single score only when there are none.
    item.rating !== null && item.ratings.length === 0 ? `★ ${item.rating.toFixed(1)}` : null,
    item.media?.video ? resolution(item.media.video.width, item.media.video.height) : null,
  ].filter(Boolean);
  const landscape = item.kind === 'episode' || item.kind === 'extra';
  const poster = landscape ? null : item.images.poster;
  const badges = ratingBadges(item.ratings);
  const links = externalLinks(item.kind, item.provider_ids);

  return (
    <section className="hero">
      {item.images.backdrop && (
        <div className="hero-backdrop" aria-hidden="true">
          <img src={item.images.backdrop} alt="" />
        </div>
      )}
      <div className="hero-body">
        {poster !== null && <Artwork src={poster} title={item.title} className="hero-poster" />}
        {landscape && (item.images.thumb ?? item.images.backdrop) && (
          <Artwork src={item.images.thumb ?? item.images.backdrop} title={item.title} className="hero-thumb" />
        )}
        <div className="hero-text">
          {item.series_id !== null && item.series_title && (
            <p className="hero-parent">
              <Link to={paths.item(item.series_id)}>{item.series_title}</Link>
              {item.kind === 'episode' && item.parent_id !== null && item.season_number !== null && (
                <>
                  {' · '}
                  <Link to={paths.item(item.parent_id)}>
                    {item.season_number === 0 ? 'Specials' : `Season ${item.season_number}`}
                  </Link>
                </>
              )}
            </p>
          )}
          {item.kind === 'extra' && (
            <p className="hero-parent">
              {item.parent_id !== null && <Link to={paths.item(item.parent_id)}>← Back to the movie</Link>}
              <span className="extra-type">{extraLabel(item.extra_type)}</span>
            </p>
          )}
          <HeroTitle item={item} />
          {item.original_title && item.original_title !== item.title && <p className="muted">{item.original_title}</p>}
          {item.localized_title && item.localized_title !== item.title && (
            <p className="muted">{item.localized_title}</p>
          )}
          {meta.length > 0 && <p className="hero-meta">{meta.join(' · ')}</p>}
          {badges.length > 0 && (
            <ul className="ratings" aria-label="Ratings">
              {badges.map((b) => (
                <li key={b.source} className={`rating rating-${b.source}`}>
                  <span className="rating-label">{b.label}</span> {b.value}
                </li>
              ))}
            </ul>
          )}
          {item.genres.length > 0 && (
            <ul className="chips" aria-label="Genres">
              {item.genres.map((g) => (
                <li key={g} className="chip">
                  {g}
                </li>
              ))}
            </ul>
          )}
          {resumable && item.runtime_ms && (
            <div className="hero-progress">
              <Progress value={u.position_ms / item.runtime_ms} />
              <span className="muted">
                {clock(u.position_ms)} of {clock(item.runtime_ms)}
              </span>
            </div>
          )}
          <div className="actions">
            {playable(item) && (
              <button type="button" className="btn btn-primary" onClick={() => navigate(paths.play(item.id))}>
                <PlayIcon /> {resumable ? 'Resume' : 'Play'}
              </button>
            )}
            {resumable && (
              <button type="button" className="btn" onClick={() => navigate(paths.play(item.id, true))}>
                Play from start
              </button>
            )}
            {item.kind === 'season' && nextEpisode && (
              <button type="button" className="btn btn-primary" onClick={() => navigate(paths.play(nextEpisode.id))}>
                <PlayIcon /> Play {episodeCode(nextEpisode.season_number, nextEpisode.episode_number)}
              </button>
            )}
            <button
              type="button"
              className={`btn${u.played ? ' btn-on' : ''}`}
              aria-pressed={u.played}
              disabled={busy}
              onClick={() => act(() => api.setPlayed(item.id, !u.played))}
            >
              <CheckIcon /> {u.played ? 'Played' : 'Mark played'}
            </button>
            <button
              type="button"
              className={`btn${u.favorite ? ' btn-on' : ''}`}
              aria-pressed={u.favorite}
              disabled={busy}
              onClick={() => act(() => api.setFavorite(item.id, !u.favorite))}
              title={u.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {u.favorite ? <HeartFilledIcon /> : <HeartIcon />} Favorite
            </button>
            {me.admin && (
              <button
                type="button"
                className="btn btn-quiet"
                disabled={busy}
                onClick={() => act(() => api.refresh(item.id), 'Metadata refresh started.')}
              >
                <RefreshIcon /> Refresh metadata
              </button>
            )}
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {item.tagline && <p className="tagline">{item.tagline}</p>}
          {item.overview && <p className="overview">{item.overview}</p>}
          {item.studios.length > 0 && <p className="muted">{item.studios.join(', ')}</p>}
          {links.length > 0 && (
            <p className="external-links">
              {links.map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** The title logo when there is one (the title stays its alt text), else the title. */
function HeroTitle({ item }: { item: ItemDetail }) {
  const [failed, setFailed] = useState<string | null>(null);
  const logo = item.images.logo;
  if (logo && failed !== logo) {
    return (
      <h1 className="hero-logo-title">
        <img className="hero-logo" src={logo} alt={item.title} onError={() => setFailed(logo)} />
      </h1>
    );
  }
  return <h1>{item.title}</h1>;
}

/** A movie's extras: cards that start playing at once. */
function Extras({ extras, fallback }: { extras: ItemSummary[]; fallback: string | null }) {
  return (
    <section className="section">
      <h2>Extras</h2>
      <div className="row-scroll row-landscape">
        {extras.map((e) => (
          <Link key={e.id} to={paths.play(e.id)} className="card card-landscape" title={`Play ${e.title}`}>
            <div className="card-media">
              <Artwork src={e.images.thumb ?? fallback} title={e.title} />
              <span className="extra-play" aria-hidden="true">
                <PlayIcon />
              </span>
            </div>
            <div className="card-text">
              <span className="card-title">{e.title}</span>
              <span className="card-sub">
                {[extraLabel(e.extra_type), formatRuntime(e.runtime_ms)].filter(Boolean).join(' · ')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EpisodeList({ episodes }: { episodes: ItemSummary[] }) {
  if (episodes.length === 0) return <p className="muted">No episodes.</p>;
  return (
    <ol className="episodes">
      {episodes.map((e) => {
        const progress =
          e.runtime_ms && e.user.position_ms > 0 && !e.user.played ? e.user.position_ms / e.runtime_ms : 0;
        return (
          <li key={e.id} className="episode">
            <Link to={paths.item(e.id)} className="episode-thumb" ariaLabel={e.title}>
              <Artwork src={e.images.thumb ?? e.images.backdrop} title={e.title} />
              {progress > 0 && <Progress value={progress} className="card-progress" />}
            </Link>
            <div className="episode-text">
              <Link to={paths.item(e.id)} className="episode-title">
                <span className="muted">{e.episode_number ?? '–'}.</span> {e.title}
              </Link>
              <span className="muted episode-meta">
                {[formatRuntime(e.runtime_ms), e.premiere_date].filter(Boolean).join(' · ')}
                {e.user.played && (
                  <span className="played-mark">
                    <CheckIcon label="Played" />
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              className="icon-btn episode-play"
              title="Play"
              aria-label={`Play ${e.title}`}
              onClick={() => navigate(paths.play(e.id))}
            >
              <PlayIcon />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function People({ item }: { item: ItemDetail }) {
  const [all, setAll] = useState(false);
  const people = all ? item.people : item.people.slice(0, 16);
  return (
    <section className="section">
      <h2>Cast &amp; crew</h2>
      <ul className="people">
        {people.map((p, i) => (
          <li key={`${p.name}-${p.role}-${i}`}>
            <span className="person-name">{p.name}</span>
            <span className="muted">{p.character ?? p.role}</span>
          </li>
        ))}
      </ul>
      {item.people.length > 16 && !all && (
        <button type="button" className="btn btn-quiet" onClick={() => setAll(true)}>
          Show all {item.people.length}
        </button>
      )}
    </section>
  );
}

function TechInfo({ item, media, onChange }: { item: ItemDetail; media: MediaInfo; onChange: () => void }) {
  const { me } = useSession();
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const remove = (index: number, label: string) => {
    if (!window.confirm(`Remove the downloaded subtitles “${label}”?`)) return;
    setRemoving(index);
    setError(null);
    api
      .deleteSubtitle(item.id, index)
      .then(onChange)
      .catch((e: Error) => setError(e.message))
      .finally(() => setRemoving(null));
  };
  const v = media.video;
  const rows: [string, ReactNode][] = [
    ['File', media.file_name],
    ['Size', bytes(media.size)],
  ];
  if (media.container) rows.push(['Container', media.container]);
  if (media.duration_ms) rows.push(['Duration', clock(media.duration_ms)]);
  const br = bitrate(media.bitrate);
  if (br) rows.push(['Bitrate', br]);
  if (v) {
    rows.push([
      'Video',
      [
        v.codec.toUpperCase(),
        v.profile,
        v.width && v.height ? `${v.width}×${v.height}` : null,
        v.bit_depth ? `${v.bit_depth}-bit` : null,
        v.hdr ? HDR_LABELS[v.hdr] : null,
        v.frame_rate ? `${Number(v.frame_rate.toFixed(3))} fps` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    ]);
  }
  media.audio.forEach((a, i) =>
    rows.push([
      i === 0 ? 'Audio' : '',
      [language(a.language), a.codec.toUpperCase(), channels(a.channels), a.title, a.default ? 'default' : null]
        .filter(Boolean)
        .join(' · '),
    ]),
  );
  media.subtitles.forEach((s, i) => {
    const downloaded = s.source === 'opensubtitles';
    const text = [
      language(s.language),
      s.codec,
      s.title,
      s.forced ? 'forced' : null,
      downloaded ? 'downloaded from OpenSubtitles' : s.external ? 'external' : null,
      s.text ? null : 'image (burned in when chosen)',
    ]
      .filter(Boolean)
      .join(' · ');
    rows.push([
      i === 0 ? 'Subtitles' : '',
      downloaded && me.admin ? (
        <span className="tech-with-action">
          {text}
          <button
            type="button"
            className="btn btn-quiet btn-small"
            disabled={removing !== null}
            onClick={() => remove(s.index, text)}
          >
            {removing === s.index ? 'Removing…' : 'Remove'}
          </button>
        </span>
      ) : (
        text
      ),
    ]);
  });
  return (
    <section className="section">
      <h2>Media</h2>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <dl className="tech">
        {rows.map(([k, v], i) => (
          <div key={i} className="tech-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {media.chapters && media.chapters.length > 0 && (
          <div className="tech-row">
            <dt>Chapters</dt>
            <dd>
              <details className="chapters">
                <summary>{media.chapters.length} chapters</summary>
                <ol>
                  {media.chapters.map((c, i) => (
                    <li key={`${c.start_ms}-${i}`}>
                      <span className="chapter-time">{clock(c.start_ms)}</span> {chapterLabel(c, i)}
                    </li>
                  ))}
                </ol>
              </details>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
