// Formatting helpers. Pure functions, unit-tested under node --test.

/** `1:02:03` or `2:03` (always at least m:ss). Negative and non-finite values read as 0. */
export function clock(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** `1 h 42 min`, `42 min`; null for unknown. */
export function runtime(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** `1.2 GB`, `640 MB` (decimal units, as file managers show them). */
export function bytes(n: number): string {
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** `8.5 Mb/s`, `640 kb/s`. */
export function bitrate(bps: number | null | undefined): string | null {
  if (!bps || bps <= 0) return null;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mb/s`;
  return `${Math.round(bps / 1000)} kb/s`;
}

/** `S01E02`, `S00E05`; null when the numbers are unknown. */
export function episodeCode(season: number | null, episode: number | null): string | null {
  if (season === null || episode === null) return null;
  return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
}

/** Channel count as a layout name. */
export function channels(n: number | null): string | null {
  if (!n) return null;
  return { 1: 'mono', 2: 'stereo', 6: '5.1', 8: '7.1' }[n] ?? `${n} ch`;
}

/** Height as a resolution label: `4K`, `1080p`, `720p`… */
export function resolution(width: number | null, height: number | null): string | null {
  if (!height || !width) return null;
  if (width >= 3800 || height >= 2100) return '4K';
  if (width >= 2500 || height >= 1400) return '1440p';
  if (width >= 1900 || height >= 1000) return '1080p';
  if (width >= 1200 || height >= 700) return '720p';
  if (height >= 540) return '576p';
  return `${height}p`;
}

/** A language code as a readable name when the browser knows it (`eng` → `English`). */
export function language(code: string | null): string | null {
  if (!code || code === 'und') return null;
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'language' });
    const name = names.of(code.length === 3 ? (ISO_639_2[code] ?? code) : code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}

// The three-letter codes media files use most (ISO 639-2/B), mapped to ISO 639-1, which
// Intl.DisplayNames handles everywhere.
const ISO_639_2: Record<string, string> = {
  eng: 'en',
  fre: 'fr',
  fra: 'fr',
  ger: 'de',
  deu: 'de',
  spa: 'es',
  ita: 'it',
  por: 'pt',
  nor: 'no',
  nob: 'nb',
  nno: 'nn',
  swe: 'sv',
  dan: 'da',
  fin: 'fi',
  dut: 'nl',
  nld: 'nl',
  jpn: 'ja',
  chi: 'zh',
  zho: 'zh',
  kor: 'ko',
  rus: 'ru',
  pol: 'pl',
  cze: 'cs',
  ces: 'cs',
  hun: 'hu',
  gre: 'el',
  ell: 'el',
  tur: 'tr',
  ara: 'ar',
  heb: 'he',
  hin: 'hi',
  tha: 'th',
  vie: 'vi',
  ukr: 'uk',
  ice: 'is',
  isl: 'is',
};

/** `3 minutes ago`-style relative time for admin views. */
export function ago(ts: number | null, now = Date.now()): string {
  if (!ts) return 'never';
  const s = Math.round((now - ts) / 1000);
  if (s < 45) return 'just now';
  const units: [number, string][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
  ];
  let value = Math.round(s / 60);
  let unit = 'minute';
  for (const [secs, name] of units) {
    if (s >= secs) {
      value = Math.round(s / secs);
      unit = name;
    }
  }
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}
