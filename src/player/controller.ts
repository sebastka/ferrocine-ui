// The player's imperative core: playback sessions, hls.js, seeking, subtitles and progress
// reports. React renders its state (see ../views/Player.tsx) and calls its methods.

import type HlsType from 'hls.js/light';
import { api, ApiError, sendOnExit, type ItemDetail, type Playback, type SubtitleStream } from '../api.ts';
import { capabilities } from '../logic/caps.ts';
import { itemTime, planSeek, QUALITIES, sessionLikelyExpired, type Quality, type Stream } from '../logic/playback.ts';

const PROGRESS_EVERY_MS = 10_000;
/** New sessions started in a row after stream errors, without playback resuming in between. */
const MAX_RESTARTS = 3;

export interface PlayerState {
  /** Item time in ms. */
  position: number;
  duration: number | null;
  /** Item time up to which the current stream can be played without a new session. */
  available: number | null;
  paused: boolean;
  waiting: boolean;
  ended: boolean;
  starting: boolean;
  error: string | null;
  playback: Playback | null;
  audioIndex: number | null;
  subtitleIndex: number | null;
  quality: Quality;
}

type Listener = (s: PlayerState) => void;

export class PlayerController {
  private readonly video: HTMLVideoElement;
  private readonly item: ItemDetail;
  private readonly listener: Listener;
  private hls: HlsType | null = null;
  private stream: Stream | null = null;
  private session: string | null = null;
  /** Incremented by every start and by destroy: answers of older starts are discarded. */
  private epoch = 0;
  private subtitleUrl: string | null = null;
  private lastReport = 0;
  private lastReported = -1;
  private destroyed = false;
  /** When the user paused (the core stops sessions left without requests for 60 s). */
  private pausedAt: number | null = null;
  private restarts = 0;
  /** Subtitles downloaded while playing (not in the item's media yet). */
  private readonly added: SubtitleStream[] = [];
  private readonly cleanups: (() => void)[] = [];
  state: PlayerState;

  constructor(video: HTMLVideoElement, item: ItemDetail, listener: Listener) {
    this.video = video;
    this.item = item;
    this.listener = listener;
    const audio = item.media?.audio.find((a) => a.default) ?? item.media?.audio[0];
    this.state = {
      position: 0,
      duration: item.media?.duration_ms ?? item.runtime_ms,
      available: null,
      paused: true,
      waiting: false,
      ended: false,
      starting: true,
      error: null,
      playback: null,
      audioIndex: audio?.index ?? null,
      subtitleIndex: null,
      quality: QUALITIES[0]!,
    };
    const on = <K extends keyof HTMLMediaElementEventMap>(type: K, fn: () => void) => {
      video.addEventListener(type, fn);
      this.cleanups.push(() => video.removeEventListener(type, fn));
    };
    on('timeupdate', () => this.onTime());
    on('progress', () => this.update({ available: this.availableEnd() }));
    on('play', () => {
      this.pausedAt = null;
      this.update({ paused: false, ended: false });
    });
    on('pause', () => {
      this.pausedAt = Date.now();
      this.update({ paused: true });
      this.report(true);
    });
    on('waiting', () => this.update({ waiting: true }));
    on('playing', () => {
      this.restarts = 0;
      this.update({ waiting: false, starting: false });
    });
    on('canplay', () => this.update({ waiting: false }));
    on('ended', () => {
      this.update({ ended: true, paused: true });
      this.report(true);
    });
    on('error', () => {
      if (this.hls) return; // hls.js reports (and recovers) its own errors.
      const err = video.error;
      if (err)
        this.update({ error: `Playback failed (${err.message || `media error ${err.code}`}).`, starting: false });
    });
    const onPageHide = () => this.leave();
    window.addEventListener('pagehide', onPageHide);
    this.cleanups.push(() => window.removeEventListener('pagehide', onPageHide));
  }

  private update(patch: Partial<PlayerState>): void {
    if (this.destroyed) return;
    this.state = { ...this.state, ...patch };
    this.listener(this.state);
  }

  /** Item time of the playhead. */
  position(): number {
    return this.stream ? itemTime(this.stream, this.video.currentTime) : this.state.position;
  }

  /** Seconds of the current stream that can be played (for HLS: produced so far). */
  private seekableEnd(): number {
    const r = this.video.seekable;
    return r.length > 0 ? r.end(r.length - 1) : 0;
  }

  private availableEnd(): number | null {
    if (!this.stream || this.stream.method === 'direct') return null;
    return this.stream.startMs + this.seekableEnd() * 1000;
  }

  private onTime(): void {
    const position = this.position();
    this.update({ position, available: this.availableEnd() });
    this.report(false);
  }

  /** Save the position: every 10 s while playing, at once on pause, end and exit. */
  private report(now: boolean): void {
    if (!this.stream) return;
    const position = this.position();
    const t = Date.now();
    if (!now && t - this.lastReport < PROGRESS_EVERY_MS) return;
    if (Math.abs(position - this.lastReported) < 1000 && !this.state.ended) return;
    this.lastReport = t;
    this.lastReported = position;
    const at = this.state.ended && this.state.duration ? this.state.duration : position;
    api.progress(this.item.id, at).catch(() => undefined);
  }

  /** Start (or restart) playback at item time `startMs`. */
  async start(startMs: number, opts: { forceTranscode?: boolean } = {}): Promise<void> {
    const epoch = ++this.epoch;
    this.teardown();
    this.update({ starting: true, error: null, ended: false, position: startMs, available: null });
    let pb: Playback;
    try {
      pb = await api.playback(this.item.id, {
        start_ms: Math.round(startMs),
        audio_index: this.state.audioIndex,
        max_height: this.state.quality.maxHeight,
        max_bitrate: this.state.quality.maxBitrate,
        force_transcode: opts.forceTranscode ?? false,
        capabilities: capabilities(),
      });
    } catch (e) {
      if (epoch === this.epoch) this.update({ error: startError(e), starting: false });
      return;
    }
    if (epoch !== this.epoch) {
      // Superseded (a seek, a track change, or the player closed) while we waited.
      if (pb.session_id) api.stopSession(pb.session_id).catch(() => undefined);
      return;
    }
    this.session = pb.session_id;
    this.stream = { method: pb.method, startMs: pb.method === 'direct' ? 0 : pb.start_ms };
    this.update({ playback: pb, duration: pb.duration_ms ?? this.state.duration });

    try {
      if (pb.method === 'direct') await this.attachDirect(pb.url, startMs);
      else await this.attachHls(pb.url, epoch);
    } catch (e) {
      if (epoch === this.epoch) this.update({ error: (e as Error).message, starting: false });
      return;
    }
    if (epoch !== this.epoch) return;
    if (this.state.subtitleIndex !== null) void this.loadSubtitle(this.state.subtitleIndex);
    this.video.play().catch(() => this.update({ paused: true, starting: false }));
  }

  private attachDirect(url: string, startMs: number): Promise<void> {
    return new Promise((resolve) => {
      const v = this.video;
      const onMeta = () => {
        v.removeEventListener('loadedmetadata', onMeta);
        if (startMs > 0) v.currentTime = startMs / 1000;
        resolve();
      };
      v.addEventListener('loadedmetadata', onMeta);
      v.src = url;
    });
  }

  private async attachHls(url: string, epoch: number): Promise<void> {
    const v = this.video;
    const { default: Hls } = await import('hls.js/light');
    if (epoch !== this.epoch) return;
    if (!Hls.isSupported()) {
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = url;
        return;
      }
      throw new Error('This browser can play neither HLS nor Media Source Extensions.');
    }
    const hls = new Hls({
      // EVENT playlists look "live" to hls.js: start at the beginning, not at the live edge,
      // and never jump ahead when playback falls behind the produced end.
      startPosition: 0,
      liveSyncDurationCount: 1,
      liveMaxLatencyDurationCount: Infinity,
      maxBufferLength: 60,
      backBufferLength: 90,
      // POST /playback returns once the first segment exists, so loads are quick. A 404 means
      // the core pruned the segment (far behind the playhead) or stopped the session (idle):
      // retry once, then the fatal error below starts a new session at the playhead.
      manifestLoadPolicy: {
        default: {
          maxTimeToFirstByteMs: 30_000,
          maxLoadTimeMs: 60_000,
          timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 },
          errorRetry: { maxNumRetry: 1, retryDelayMs: 1000, maxRetryDelayMs: 1000 },
        },
      },
      playlistLoadPolicy: {
        default: {
          maxTimeToFirstByteMs: 20_000,
          maxLoadTimeMs: 30_000,
          timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 },
          errorRetry: { maxNumRetry: 1, retryDelayMs: 1000, maxRetryDelayMs: 1000 },
        },
      },
      fragLoadPolicy: {
        default: {
          // A segment ahead of ffmpeg is served once produced; the core pauses ffmpeg about
          // three minutes ahead of the playhead, so a request can wait a while.
          maxTimeToFirstByteMs: 60_000,
          maxLoadTimeMs: 120_000,
          timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 },
          errorRetry: { maxNumRetry: 1, retryDelayMs: 1000, maxRetryDelayMs: 1000 },
        },
      },
    });
    this.hls = hls;
    let recoveries = 0;
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal || hls !== this.hls) return;
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveries < 2) {
        recoveries++;
        hls.recoverMediaError();
      } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR && this.restarts < MAX_RESTARTS) {
        // Pruned segment or expired session: same path as a seek outside the stream.
        this.restarts++;
        void this.start(this.position());
      } else {
        this.update({ error: `Streaming failed (${data.details}).`, starting: false });
      }
    });
    hls.loadSource(url);
    hls.attachMedia(v);
  }

  /** Stop the current stream: hls.js, the media element, the server session. */
  private teardown(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.session) {
      const id = this.session;
      this.session = null;
      api.stopSession(id).catch(() => undefined);
    }
    this.stream = null;
    this.video.removeAttribute('src');
    this.video.load();
  }

  seek(targetMs: number): void {
    const duration = this.state.duration ?? Infinity;
    const target = Math.min(Math.max(0, targetMs), Math.max(0, duration - 1000));
    if (!this.stream) {
      void this.start(target);
      return;
    }
    const plan = planSeek(this.stream, target, this.seekableEnd());
    if (plan.kind === 'inside') {
      this.video.currentTime = plan.currentTimeS;
      this.update({ position: target, ended: false });
    } else {
      void this.start(plan.startMs);
    }
  }

  skip(deltaMs: number): void {
    this.seek(this.position() + deltaMs);
  }

  toggle(): void {
    if (this.state.ended) this.seek(0);
    else if (this.video.paused) {
      // After a long pause the core has stopped the session: start a new one here.
      if (this.stream && sessionLikelyExpired(this.stream.method, this.pausedAt, Date.now()))
        void this.start(this.position());
      else this.video.play().catch(() => undefined);
    } else this.video.pause();
  }

  setAudio(index: number): void {
    if (index === this.state.audioIndex) return;
    this.update({ audioIndex: index });
    void this.start(this.position());
  }

  setQuality(q: Quality): void {
    if (q.id === this.state.quality.id) return;
    this.update({ quality: q });
    void this.start(this.position());
  }

  /** Make a newly downloaded subtitle stream selectable. */
  addSubtitle(sub: SubtitleStream): void {
    if (!this.added.some((s) => s.index === sub.index)) this.added.push(sub);
  }

  setSubtitle(index: number | null): void {
    this.update({ subtitleIndex: index });
    if (index === null) this.clearSubtitle();
    else void this.loadSubtitle(index);
  }

  /** Fetch the WebVTT (shifted to the stream's start) and show it as the only text track. */
  private async loadSubtitle(index: number): Promise<void> {
    const startMs = this.stream?.startMs ?? 0;
    const epoch = this.epoch;
    try {
      const res = await fetch(api.subtitleUrl(this.item.id, index, startMs), { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`subtitles: HTTP ${res.status}`);
      const text = await res.text();
      if (epoch !== this.epoch || this.state.subtitleIndex !== index) return;
      this.clearSubtitle();
      this.subtitleUrl = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.default = true;
      track.src = this.subtitleUrl;
      const sub = [...(this.item.media?.subtitles ?? []), ...this.added].find((s) => s.index === index);
      if (sub?.language) track.srclang = sub.language;
      track.label = sub?.title ?? sub?.language ?? 'Subtitles';
      this.video.appendChild(track);
      track.track.mode = 'showing';
    } catch (e) {
      this.update({ error: (e as Error).message });
    }
  }

  private clearSubtitle(): void {
    for (const t of Array.from(this.video.querySelectorAll('track'))) t.remove();
    if (this.subtitleUrl) URL.revokeObjectURL(this.subtitleUrl);
    this.subtitleUrl = null;
  }

  /** Report the position and stop the session with requests that outlive the page. */
  private leave(): void {
    if (this.stream) {
      const at = this.state.ended && this.state.duration ? this.state.duration : this.position();
      sendOnExit('POST', `/api/v1/items/${this.item.id}/progress`, { position_ms: Math.round(at) });
    }
    if (this.session) {
      sendOnExit('DELETE', `/api/v1/hls/${encodeURIComponent(this.session)}`);
      this.session = null;
    }
  }

  destroy(): void {
    this.epoch++;
    this.leave();
    this.destroyed = true;
    for (const c of this.cleanups) c();
    this.clearSubtitle();
    if (this.hls) this.hls.destroy();
    this.hls = null;
    this.stream = null;
    this.video.removeAttribute('src');
    this.video.load();
  }
}

/** A readable message for a failed POST /playback. */
function startError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return 'The server is busy with other streams. Try again in a moment.';
    if (e.status >= 500) return `The server could not start the stream: ${e.message}`;
  }
  return e instanceof Error ? e.message : String(e);
}
