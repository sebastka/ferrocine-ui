// Full-window player: video, custom controls over the whole item timeline, track menus.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { api, type ItemDetail, type ItemSummary, type SubtitleStream } from '../api.ts';
import {
  AudioIcon,
  BackIcon,
  CloseIcon,
  ExitFullscreenIcon,
  ForwardIcon,
  FullscreenIcon,
  InfoIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  SettingsIcon,
  SubtitlesIcon,
  ChaptersIcon,
  VolumeIcon,
} from '../components/icons.tsx';
import { ErrorBox, Spinner } from '../components/ui.tsx';
import { useAsync } from '../hooks.ts';
import { chapterLabel, chapterMarks, currentChapter } from '../logic/extras.ts';
import { channels, clock, episodeCode, language } from '../logic/format.ts';
import { nearEnd, QUALITIES, resumePosition } from '../logic/playback.ts';
import { paths } from '../logic/route.ts';
import { back, navigate } from '../router.ts';
import { PlayerController, type PlayerState } from '../player/controller.ts';
import { SubtitleSearch } from '../player/SubtitleSearch.tsx';

const IDLE_MS = 3000;

export function Player({ id, fromStart }: { id: number; fromStart: boolean }) {
  const item = useAsync(`item:${id}`, (signal) => api.item(id, signal));
  if (item.error) return <ErrorBox error={item.error} onRetry={item.reload} />;
  if (!item.data) return <Spinner />;
  // Keyed: another item (next episode) gets a fresh player.
  return <PlayerView key={id} item={item.data} fromStart={fromStart} />;
}

/** The episode after `item`: next in its season, else first of the next season. */
async function findNext(item: ItemDetail): Promise<ItemSummary | null> {
  if (item.kind !== 'episode' || item.parent_id === null) return null;
  const episodes = await api.children(item.parent_id);
  const i = episodes.findIndex((e) => e.id === item.id);
  if (i >= 0 && i + 1 < episodes.length) return episodes[i + 1] ?? null;
  if (item.series_id === null) return null;
  const seasons = (await api.children(item.series_id)).filter((s) => (s.season_number ?? 0) > 0);
  const j = seasons.findIndex((s) => s.id === item.parent_id);
  const nextSeason = j >= 0 ? seasons[j + 1] : undefined;
  if (!nextSeason) return null;
  return (await api.children(nextSeason.id))[0] ?? null;
}

type Menu = 'audio' | 'subtitles' | 'chapters' | 'quality' | null;

function PlayerView({ item, fromStart }: { item: ItemDetail; fromStart: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const ctl = useRef<PlayerController | null>(null);
  const [state, setState] = useState<PlayerState | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [info, setInfo] = useState(false);
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [volume, setVolume] = useState(() => readVolume());
  const [muted, setMuted] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [next, setNext] = useState<ItemSummary | null>(null);
  const [downloaded, setDownloaded] = useState<SubtitleStream[]>([]);
  // Hidden for good after a 503: the core has no subtitle provider configured.
  const [searchAvailable, setSearchAvailable] = useState(true);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const onSearchUnavailable = useCallback(() => {
    setSearchAvailable(false);
    setSearching(false);
    setToast('Subtitle search is not available on this server.');
  }, []);
  const onDownloaded = useCallback((sub: SubtitleStream) => {
    setSearching(false);
    setDownloaded((d) => (d.some((x) => x.index === sub.index) ? d : [...d, sub]));
    ctl.current?.addSubtitle(sub);
    ctl.current?.setSubtitle(sub.index);
    setToast(`Subtitles added: ${language(sub.language) ?? sub.language ?? 'unknown language'}.`);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const c = new PlayerController(v, item, setState);
    ctl.current = c;
    setState(c.state);
    void c.start(resumePosition(item.user.position_ms, item.runtime_ms, fromStart));
    return () => {
      c.destroy();
      ctl.current = null;
    };
  }, [item, fromStart]);

  useEffect(() => {
    let cancelled = false;
    findNext(item)
      .then((n) => !cancelled && setNext(n))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
    try {
      localStorage.setItem('ferrocine.volume', String(volume));
    } catch {
      // Storage may be unavailable (private mode); the volume just is not remembered.
    }
  }, [volume, muted]);

  // Focus the player so that the keyboard shortcuts work at once.
  useEffect(() => root.current?.focus(), []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Controls hide after a few seconds without pointer movement while playing.
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);
  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.();
  }, []);

  const close = () => back(paths.item(item.id));
  const playNext = () => next && navigate(paths.play(next.id, true), { replace: true });

  const onKey = (e: ReactKeyboardEvent) => {
    const c = ctl.current;
    if (!c || searching || e.altKey || e.ctrlKey || e.metaKey) return;
    // Let focused form controls (menus, sliders) keep their own keys.
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT' || (target instanceof HTMLInputElement && target.type !== 'range')) return;
    // Space and Enter on a focused button press it, not the player.
    if (target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    let handled = true;
    switch (e.key) {
      case ' ':
      case 'k':
        c.toggle();
        break;
      case 'ArrowLeft':
      case 'j':
        c.skip(-10_000);
        break;
      case 'ArrowRight':
      case 'l':
        c.skip(10_000);
        break;
      case 'ArrowUp':
        setVolume((v) => Math.min(1, v + 0.1));
        break;
      case 'ArrowDown':
        setVolume((v) => Math.max(0, v - 0.1));
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 'm':
        setMuted((m) => !m);
        break;
      case 'i':
        setInfo((i) => !i);
        break;
      case 'Escape':
        if (menu) setMenu(null);
        else if (!document.fullscreenElement) close();
        else handled = false;
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      wake();
    }
  };

  const s = state;
  const duration = s?.duration ?? 0;
  const shown = drag ?? s?.position ?? 0;
  const pct = (ms: number) => (duration > 0 ? Math.min(100, Math.max(0, (ms / duration) * 100)) : 0);
  const pb = s?.playback ?? null;
  // Text subtitles come as WebVTT tracks; bitmap ones (PGS, DVD) are burned into the picture.
  const subs = [
    ...(item.media?.subtitles ?? []),
    ...downloaded.filter((d) => !item.media?.subtitles.some((x) => x.index === d.index)),
  ];
  const chapters = item.media?.chapters ?? [];
  const marks = chapterMarks(chapters, duration);
  const chapterNow = currentChapter(chapters, s?.position ?? 0);
  // Only movies and episodes have subtitles to search for (extras have no
  // ids, and the core answers 400 for them).
  const canSearch = searchAvailable && item.media !== null && item.kind !== 'extra';
  const audio = item.media?.audio ?? [];
  const title =
    item.kind === 'episode'
      ? `${item.series_title ?? ''} ${episodeCode(item.season_number, item.episode_number) ?? ''} · ${item.title}`
      : item.title;
  const showNext = next !== null && s !== null && (s.ended || nearEnd(s.position, duration));
  const controlsHidden = idle && s !== null && !s.paused && menu === null && !searching;

  return (
    <div
      ref={root}
      className={`player${controlsHidden ? ' player-idle' : ''}`}
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={onKey}
      tabIndex={-1}
    >
      <video
        ref={video}
        className="player-video"
        playsInline
        preload="auto"
        onClick={() => ctl.current?.toggle()}
        onDoubleClick={toggleFullscreen}
      />

      {s && (s.starting || s.waiting) && !s.error && (
        <div className="player-center">
          <Spinner label="Buffering" />
        </div>
      )}
      {s?.error && (
        <div className="player-center player-error" role="alert">
          <p>{s.error}</p>
          <div className="actions">
            <button type="button" className="btn" onClick={() => void ctl.current?.start(s.position)}>
              Retry
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void ctl.current?.start(s.position, { forceTranscode: true })}
            >
              Retry with transcoding
            </button>
          </div>
        </div>
      )}

      <div className="player-top">
        <button type="button" className="icon-btn" onClick={close} title="Back" aria-label="Back">
          <BackIcon />
        </button>
        <span className="player-title">{title}</span>
      </div>

      {showNext && next && (
        <div className="player-next">
          <span className="muted">Up next</span>
          <strong>
            {episodeCode(next.season_number, next.episode_number)} · {next.title}
          </strong>
          <button type="button" className="btn btn-primary" onClick={playNext}>
            <NextIcon /> Play next episode
          </button>
        </div>
      )}

      {info && pb && (
        <div className="player-info" role="dialog" aria-label="Stream information">
          <button
            type="button"
            className="icon-btn player-info-close"
            onClick={() => setInfo(false)}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
          <dl>
            <dt>Method</dt>
            <dd>{pb.method}</dd>
            <dt>Acceleration</dt>
            <dd>{pb.method === 'transcode' ? (pb.hw_accel ?? 'software') : '—'}</dd>
            {pb.burned_subtitle != null && (
              <>
                <dt>Subtitles</dt>
                <dd>burned into the picture (track {pb.burned_subtitle})</dd>
              </>
            )}
            {pb.tone_mapping && (
              <>
                <dt>Colour</dt>
                <dd>HDR → SDR (tone-mapped)</dd>
              </>
            )}
            {pb.reasons.length > 0 && (
              <>
                <dt>Why</dt>
                <dd>
                  <ul>
                    {pb.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
            {pb.method !== 'direct' && (
              <>
                <dt>Stream starts at</dt>
                <dd>{clock(pb.start_ms)}</dd>
                <dt>Session</dt>
                <dd className="mono">{pb.session_id}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {menu && s && (
        <div className="player-menu" role="dialog" aria-label={menu}>
          {menu === 'audio' &&
            audio.map((a) => (
              <MenuItem
                key={a.index}
                active={s.audioIndex === a.index}
                label={
                  [language(a.language), a.title, a.codec.toUpperCase(), channels(a.channels)]
                    .filter(Boolean)
                    .join(' · ') || `Track ${a.index}`
                }
                onSelect={() => {
                  setMenu(null);
                  ctl.current?.setAudio(a.index);
                }}
              />
            ))}
          {menu === 'subtitles' && (
            <>
              <MenuItem
                active={s.subtitleIndex === null}
                label="Off"
                onSelect={() => {
                  setMenu(null);
                  ctl.current?.setSubtitle(null);
                }}
              />
              {subs.map((t) => (
                <MenuItem
                  key={t.index}
                  active={s.subtitleIndex === t.index}
                  label={
                    [
                      language(t.language),
                      t.title,
                      t.forced ? 'forced' : null,
                      t.source === 'opensubtitles' ? 'downloaded' : t.external ? 'external' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || `Track ${t.index}`
                  }
                  hint={t.text ? undefined : '(burned in)'}
                  onSelect={() => {
                    setMenu(null);
                    ctl.current?.setSubtitle(t.index);
                  }}
                />
              ))}
              {canSearch && (
                <MenuItem
                  active={false}
                  label="Search subtitles…"
                  onSelect={() => {
                    setMenu(null);
                    setSearching(true);
                  }}
                />
              )}
            </>
          )}
          {menu === 'chapters' &&
            chapters.map((c, i) => (
              <MenuItem
                key={`${c.start_ms}-${i}`}
                active={chapterNow === i}
                label={chapterLabel(c, i)}
                hint={clock(c.start_ms)}
                onSelect={() => {
                  setMenu(null);
                  ctl.current?.seek(c.start_ms);
                }}
              />
            ))}
          {menu === 'quality' &&
            QUALITIES.map((q) => (
              <MenuItem
                key={q.id}
                active={s.quality.id === q.id}
                label={q.label}
                onSelect={() => {
                  setMenu(null);
                  ctl.current?.setQuality(q);
                }}
              />
            ))}
        </div>
      )}

      {searching && (
        <SubtitleSearch
          itemId={item.id}
          onClose={() => {
            setSearching(false);
            root.current?.focus();
          }}
          onDownloaded={onDownloaded}
          onUnavailable={onSearchUnavailable}
        />
      )}
      {toast && (
        <div className="player-toast" role="status">
          {toast}
        </div>
      )}

      <div className="player-controls">
        <div className="seek">
          {s?.available != null && pb?.method !== 'direct' && (
            <div
              className="seek-available"
              style={{ left: `${pct(pb?.start_ms ?? 0)}%`, width: `${pct(s.available) - pct(pb?.start_ms ?? 0)}%` }}
            />
          )}
          {marks.map((m, i) => (
            <span key={i} className="seek-chapter" style={{ left: `${m}%` }} aria-hidden="true" />
          ))}
          <SeekBar
            duration={duration}
            value={shown}
            onDrag={setDrag}
            onCommit={(ms) => {
              setDrag(null);
              ctl.current?.seek(ms);
            }}
          />
        </div>
        <div className="player-bar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => ctl.current?.toggle()}
            aria-label={s?.paused ? 'Play' : 'Pause'}
            title={s?.paused ? 'Play (space)' : 'Pause (space)'}
          >
            {s?.paused ? <PlayIcon /> : <PauseIcon />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => ctl.current?.skip(-10_000)}
            aria-label="Back 10 seconds"
          >
            <RewindIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => ctl.current?.skip(10_000)}
            aria-label="Forward 10 seconds"
          >
            <ForwardIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title="Mute (m)"
          >
            {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
          </button>
          <input
            type="range"
            className="volume"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            aria-label="Volume"
            onChange={(e) => {
              setVolume(Number(e.target.value));
              setMuted(false);
            }}
          />
          <span className="player-time">
            {clock(shown)} / {clock(duration)}
          </span>
          <span className="spacer" />
          {next && (
            <button
              type="button"
              className="icon-btn"
              onClick={playNext}
              aria-label="Next episode"
              title="Next episode"
            >
              <NextIcon />
            </button>
          )}
          {audio.length > 1 && (
            <MenuButton label="Audio track" current={menu} id="audio" setMenu={setMenu}>
              <AudioIcon />
            </MenuButton>
          )}
          {chapters.length > 1 && (
            <MenuButton label="Chapters" current={menu} id="chapters" setMenu={setMenu}>
              <ChaptersIcon />
            </MenuButton>
          )}
          {(subs.length > 0 || canSearch) && (
            <MenuButton label="Subtitles" current={menu} id="subtitles" setMenu={setMenu}>
              <SubtitlesIcon />
            </MenuButton>
          )}
          <MenuButton label="Quality" current={menu} id="quality" setMenu={setMenu}>
            <SettingsIcon />
          </MenuButton>
          <button
            type="button"
            className={`icon-btn${info ? ' icon-btn-on' : ''}`}
            onClick={() => setInfo((i) => !i)}
            aria-label="Stream information"
            aria-pressed={info}
            title="Stream information (i)"
          >
            <InfoIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            title="Full screen (f)"
          >
            {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The timeline. Dragging only previews (`onDrag`); the seek happens on release (`onCommit`),
 * so dragging across the bar does not start a new transcode at every step.
 */
function SeekBar({
  duration,
  value,
  onDrag,
  onCommit,
}: {
  duration: number;
  value: number;
  onDrag: (ms: number | null) => void;
  onCommit: (ms: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The native `change` event fires on release (pointer) or per key press (keyboard).
    const onChange = () => commit.current(Number(el.value));
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, []);
  return (
    <input
      ref={ref}
      type="range"
      className="seek-input"
      min={0}
      max={Math.max(1, Math.round(duration))}
      step={1000}
      value={Math.round(Math.min(value, duration || value))}
      aria-label="Seek"
      aria-valuetext={`${clock(value)} of ${clock(duration)}`}
      onChange={(e) => onDrag(Number(e.target.value))}
      onKeyDown={(e) => {
        // Arrow keys are the player's ±10 s shortcuts; leave them to it.
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
      }}
    />
  );
}

function MenuButton({
  id,
  label,
  current,
  setMenu,
  children,
}: {
  id: Exclude<Menu, null>;
  label: string;
  current: Menu;
  setMenu: (m: Menu) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`icon-btn${current === id ? ' icon-btn-on' : ''}`}
      aria-label={label}
      title={label}
      aria-expanded={current === id}
      onClick={() => setMenu(current === id ? null : id)}
    >
      {children}
    </button>
  );
}

function MenuItem({
  label,
  hint,
  active,
  onSelect,
}: {
  label: string;
  /** Muted text after the label (a time, "(burned in)"). */
  hint?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`menu-item${active ? ' menu-item-on' : ''}`}
      aria-pressed={active}
      onClick={onSelect}
    >
      {label}
      {hint && <span className="menu-item-hint"> {hint}</span>}
    </button>
  );
}

function readVolume(): number {
  try {
    const v = Number(localStorage.getItem('ferrocine.volume'));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 1;
  } catch {
    return 1;
  }
}
