// Types and calls of the Ferrocine core API (docs/api.md is the contract).

export type ItemKind = 'movie' | 'series' | 'season' | 'episode' | 'extra';
export type ExtraType =
  'trailer' | 'featurette' | 'behind_the_scenes' | 'deleted_scene' | 'interview' | 'scene' | 'short' | 'extra';
export type LibraryKind = 'movies' | 'shows';
export type PlaybackMethod = 'direct' | 'remux' | 'transcode';
export type HwAccel = 'vaapi' | 'qsv' | 'nvenc';

export interface Me {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  admin: boolean;
  /** Values of the provider's groups claim at sign-in. */
  groups: string[];
  /** URL of the user's picture (versioned), or null when the provider sent none. */
  avatar: string | null;
}

export interface ScanStatus {
  running: boolean;
  last_started_at: number | null;
  last_finished_at: number | null;
  last_error: string | null;
}

export interface Library {
  id: string;
  name: string;
  kind: LibraryKind;
  item_count: number;
  scan?: ScanStatus;
}

export interface UserData {
  position_ms: number;
  played: boolean;
  play_count: number;
  favorite: boolean;
  last_played_at: number | null;
}

export interface Images {
  poster: string | null;
  backdrop: string | null;
  thumb: string | null;
  /** Title logo: PNG with transparency. */
  logo: string | null;
}

export interface ItemSummary {
  id: number;
  library_id: string;
  kind: ItemKind;
  title: string;
  year: number | null;
  parent_id: number | null;
  series_id: number | null;
  series_title: string | null;
  season_number: number | null;
  episode_number: number | null;
  runtime_ms: number | null;
  rating: number | null;
  official_rating: string | null;
  genres: string[];
  premiere_date: string | null;
  added_at: number;
  images: Images;
  user: UserData;
  child_count: number | null;
  unplayed_count: number | null;
  /** Extras only. */
  extra_type?: ExtraType | null;
}

export interface Person {
  name: string;
  role: string;
  character: string | null;
}

export interface VideoInfo {
  codec: string;
  profile: string | null;
  width: number | null;
  height: number | null;
  bit_depth: number | null;
  hdr: 'hdr10' | 'hlg' | 'dolby_vision' | null;
  frame_rate: number | null;
}

export interface AudioStream {
  index: number;
  codec: string;
  channels: number | null;
  language: string | null;
  title: string | null;
  default: boolean;
}

export interface SubtitleStream {
  index: number;
  codec: string;
  language: string | null;
  title: string | null;
  default: boolean;
  forced: boolean;
  external: boolean;
  text: boolean;
  /** `opensubtitles` for downloaded subtitles (index ≥ 1 000 000), null otherwise. */
  source?: string | null;
}

export interface MediaInfo {
  file_name: string;
  size: number;
  container: string | null;
  duration_ms: number | null;
  bitrate: number | null;
  video: VideoInfo | null;
  audio: AudioStream[];
  subtitles: SubtitleStream[];
  chapters?: Chapter[];
}

export interface Chapter {
  start_ms: number;
  title: string | null;
}

export type ProviderId = 'tmdb' | 'imdb' | 'tvdb' | 'anidb' | 'anilist';
export type RatingSource = 'tmdb' | 'imdb' | 'rotten_tomatoes' | 'metacritic' | 'anilist' | 'anidb';

export interface Rating {
  source: RatingSource | string;
  value: number;
  max: number;
}

/** Seek bar preview sheets of an item. */
export interface Trickplay {
  interval_ms: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  thumbnails: number;
  sheets: string[];
}

export interface ItemDetail extends ItemSummary {
  overview: string | null;
  tagline: string | null;
  original_title: string | null;
  /** ISO 639-1. */
  original_language: string | null;
  /** The title in the library's language; differs from `title` when the original title is preferred. */
  localized_title: string | null;
  studios: string[];
  people: Person[];
  provider_ids: Partial<Record<ProviderId, string | null>>;
  ratings: Rating[];
  /** Seek bar previews; null until made. */
  trickplay?: Trickplay | null;
  media: MediaInfo | null;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface Home {
  continue_watching: ItemSummary[];
  next_up: ItemSummary[];
  latest: { library: Pick<Library, 'id' | 'name' | 'kind'>; items: ItemSummary[] }[];
}

/** Why a search result was found, when not by its shown title. */
export type SearchMatch =
  | { kind: 'cast'; text: string; role?: string | null; character?: string | null }
  | { kind: 'crew'; text: string; role?: string | null }
  | { kind: 'original_title'; text: string };

export interface SearchResult extends ItemSummary {
  matched?: SearchMatch | null;
}

export interface Capabilities {
  containers: string[];
  video_codecs: string[];
  audio_codecs: string[];
}

export interface PlaybackRequest {
  start_ms: number;
  audio_index: number | null;
  max_height: number | null;
  max_bitrate: number | null;
  force_transcode: boolean;
  /** A bitmap subtitle (`text: false`) to draw into the picture; forces a transcode. */
  burn_subtitle: number | null;
  capabilities: Capabilities;
}

export interface Playback {
  method: PlaybackMethod;
  url: string;
  session_id: string | null;
  start_ms: number;
  duration_ms: number | null;
  hw_accel: HwAccel | null;
  /** True when an HDR source is transcoded to SDR with tone mapping. */
  tone_mapping: boolean;
  /** The subtitle index drawn into the picture, if any. */
  burned_subtitle?: number | null;
  reasons: string[];
}

export interface Transcode {
  session_id: string;
  user: string;
  item_id: number;
  title: string;
  method: PlaybackMethod;
  hw_accel: HwAccel | null;
  started_at: number;
}

export interface SystemInfo {
  version: string;
  ffmpeg: { version: string | null; hw_accel: HwAccel | null; device: string | null; encoders: string[] };
  metadata: { tmdb: boolean };
  transcodes: Transcode[];
  libraries: { id: string; scan: ScanStatus }[];
}

export type ConfigValue = string | number | boolean | string[] | null;

export interface ConfigField {
  /** Path within the section; nested settings are dotted (`oidc.issuer`). */
  key: string;
  kind: 'string' | 'integer' | 'boolean' | 'duration' | 'path' | 'url' | 'address' | 'list' | 'choice' | 'secret';
  /** The running value; null when unset, and always for secrets. */
  value: ConfigValue;
  /** The value when the setting is absent; null when there is none. */
  default: ConfigValue;
  description: string;
  choices?: { value: string; description: string }[];
  /** Secrets only: whether a value is configured. */
  set?: boolean;
}

export interface ConfigSection {
  key: string;
  title: string;
  description: string;
  applies: 'reload' | 'restart';
  fields: ConfigField[];
  /** Libraries: one entry per library. */
  items?: { title: string; fields: ConfigField[] }[];
}

/** Answer of GET /api/v1/config. */
export interface RunningConfig {
  sections: ConfigSection[];
}

export interface SubtitleSearchResult {
  file_id: number;
  language: string;
  release: string | null;
  file_name: string | null;
  hearing_impaired: boolean;
  foreign_parts_only: boolean;
  ai_translated: boolean;
  machine_translated: boolean;
  from_trusted: boolean;
  downloads: number | null;
  rating: number | null;
  hash_match: boolean;
}

export interface SubtitleDownload {
  file_id: number;
  language: string;
  release: string | null;
  hearing_impaired: boolean;
  foreign_parts_only: boolean;
  hash_match: boolean;
}

/** A device waiting for approval (Quick Connect). */
export interface Pairing {
  code: string;
  device_name: string;
  platform: string | null;
  expires_at: number;
}

/** A device signed in with a token of its own (TV apps). */
export interface Device {
  id: number;
  name: string;
  platform: string | null;
  created_at: number;
  last_seen_at: number | null;
  /** The device making the request. */
  current?: boolean;
}

/** Answer of POST /api/v1/reload. */
export interface ReloadReport {
  /** Sections whose changes now apply. */
  applied: string[];
  /** Sections that changed but keep their running values until a restart. */
  restart_required: string[];
  /** Libraries that are new or whose paths changed. */
  scans_queued: string[];
}

export type Sort = 'title' | 'year' | 'added' | 'rating' | 'released';

export interface LibraryQuery {
  sort?: Sort;
  order?: 'asc' | 'desc';
  genre?: string;
  played?: boolean;
  favorite?: boolean;
  q?: string;
  offset?: number;
  limit?: number;
}

/** Dispatched on `window` when the API answers 401: the session is gone. */
export const UNAUTHENTICATED = 'ferrocine:unauthenticated';

/** Thrown for any non-2xx answer; `status` 401 means "signed out". */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', signal };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHENTICATED));
    let message = `${res.status} ${res.statusText}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // Not JSON (a proxy error page, say): keep the status line.
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204 || res.status === 202) return undefined as T;
  return (await res.json()) as T;
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

const enc = encodeURIComponent;

export const api = {
  me: (signal?: AbortSignal) => request<Me>('GET', '/api/v1/me', undefined, signal),
  home: (signal?: AbortSignal) => request<Home>('GET', '/api/v1/home', undefined, signal),
  libraries: (signal?: AbortSignal) => request<Library[]>('GET', '/api/v1/libraries', undefined, signal),
  libraryItems: (id: string, q: LibraryQuery, signal?: AbortSignal) =>
    request<Page<ItemSummary>>('GET', `/api/v1/libraries/${enc(id)}/items${query({ ...q })}`, undefined, signal),
  genres: (id: string, signal?: AbortSignal) =>
    request<string[]>('GET', `/api/v1/libraries/${enc(id)}/genres`, undefined, signal),
  scan: (id: string, refreshMetadata: boolean) =>
    request<void>(
      'POST',
      `/api/v1/libraries/${enc(id)}/scan${query({ refresh_metadata: refreshMetadata || undefined })}`,
    ),
  item: (id: number, signal?: AbortSignal) => request<ItemDetail>('GET', `/api/v1/items/${id}`, undefined, signal),
  children: (id: number, signal?: AbortSignal) =>
    request<ItemSummary[]>('GET', `/api/v1/items/${id}/children`, undefined, signal),
  refresh: (id: number) => request<void>('POST', `/api/v1/items/${id}/refresh`),
  search: (q: string, signal?: AbortSignal) =>
    request<SearchResult[]>('GET', `/api/v1/search${query({ q, limit: 60 })}`, undefined, signal),
  setPlayed: (id: number, played: boolean) => request<void>(played ? 'POST' : 'DELETE', `/api/v1/items/${id}/played`),
  setFavorite: (id: number, favorite: boolean) =>
    request<void>(favorite ? 'POST' : 'DELETE', `/api/v1/items/${id}/favorite`),
  progress: (id: number, positionMs: number) =>
    request<void>('POST', `/api/v1/items/${id}/progress`, { position_ms: Math.max(0, Math.round(positionMs)) }),
  playback: (id: number, req: PlaybackRequest) => request<Playback>('POST', `/api/v1/items/${id}/playback`, req),
  stopSession: (sessionId: string) => request<void>('DELETE', `/api/v1/hls/${enc(sessionId)}`),
  reload: () => request<ReloadReport>('POST', '/api/v1/reload'),
  pairing: (code: string, signal?: AbortSignal) =>
    request<Pairing>('GET', `/api/v1/pair/${enc(code)}`, undefined, signal),
  approvePairing: (code: string) => request<void>('POST', `/api/v1/pair/${enc(code)}/approve`),
  devices: (signal?: AbortSignal) => request<Device[]>('GET', '/api/v1/me/devices', undefined, signal),
  signOutDevice: (id: number) => request<void>('DELETE', `/api/v1/me/devices/${id}`),
  searchSubtitles: (id: number, language: string | null, signal?: AbortSignal) =>
    request<{ results: SubtitleSearchResult[] }>(
      'GET',
      `/api/v1/items/${id}/subtitles/search${query({ language: language ?? undefined })}`,
      undefined,
      signal,
    ),
  downloadSubtitle: (id: number, body: SubtitleDownload) =>
    request<SubtitleStream>('POST', `/api/v1/items/${id}/subtitles`, body),
  deleteSubtitle: (id: number, index: number) => request<void>('DELETE', `/api/v1/items/${id}/subtitles/${index}`),
  config: (signal?: AbortSignal) => request<RunningConfig>('GET', '/api/v1/config', undefined, signal),
  system: (signal?: AbortSignal) => request<SystemInfo>('GET', '/api/v1/system', undefined, signal),
  subtitleUrl: (id: number, index: number, startMs: number) =>
    `/api/v1/items/${id}/subtitles/${index}.vtt${query({ start_ms: startMs > 0 ? Math.round(startMs) : undefined })}`,
};

/**
 * Fire-and-forget calls that must survive the page going away (pagehide): `keepalive` lets the
 * browser finish them after the document is gone.
 */
export function sendOnExit(method: 'POST' | 'DELETE', path: string, body?: unknown): void {
  try {
    void fetch(path, {
      method,
      credentials: 'same-origin',
      keepalive: true,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => undefined);
  } catch {
    // Nothing to do: the page is going away.
  }
}
