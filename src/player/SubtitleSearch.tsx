// Dialog of the player: search OpenSubtitles (through the core) and download a result.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { api, ApiError, type SubtitleSearchResult, type SubtitleStream } from '../api.ts';
import { CloseIcon } from '../components/icons.tsx';
import { Spinner } from '../components/ui.tsx';
import { useAsync } from '../hooks.ts';
import { language as languageName } from '../logic/format.ts';
import { defaultSubtitleLanguage, resultBadges, SUBTITLE_LANGUAGES } from '../logic/subtitles.ts';

export function SubtitleSearch({
  itemId,
  onClose,
  onDownloaded,
  onUnavailable,
}: {
  itemId: number;
  onClose: () => void;
  onDownloaded: (sub: SubtitleStream) => void;
  /** The core has no subtitle provider (503): the entry point should disappear. */
  onUnavailable: (message: string) => void;
}) {
  const titleId = useId();
  const [lang, setLang] = useState(() => defaultSubtitleLanguage(navigator.languages ?? [navigator.language]));
  const results = useAsync(`subtitles:${itemId}:${lang}`, (signal) =>
    api.searchSubtitles(itemId, lang === '' ? null : lang, signal),
  );
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const select = useRef<HTMLSelectElement>(null);

  useEffect(() => select.current?.focus(), []);

  const unavailable = results.error instanceof ApiError && results.error.status === 503;
  useEffect(() => {
    if (unavailable && results.error) onUnavailable(results.error.message);
  }, [unavailable, results.error, onUnavailable]);

  const download = (r: SubtitleSearchResult) => {
    setBusy(r.file_id);
    setError(null);
    api
      .downloadSubtitle(itemId, {
        file_id: r.file_id,
        language: r.language,
        release: r.release,
        hearing_impaired: r.hearing_impaired,
        foreign_parts_only: r.foreign_parts_only,
        hash_match: r.hash_match,
      })
      .then(onDownloaded)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 503) onUnavailable(e.message);
        else setError(downloadError(e));
      })
      .finally(() => setBusy(null));
  };

  // Escape closes the dialog only, not the player; other keys stay out of the player's shortcuts.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    e.stopPropagation();
  };

  const list = results.data?.results ?? [];
  return (
    <div className="player-dialog-backdrop" onClick={onClose}>
      <div
        className="player-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKey}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="player-dialog-head">
          <h2 id={titleId}>Search subtitles</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <label className="select-label">
          <span>Language</span>
          <select ref={select} className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="">Server defaults</option>
            {SUBTITLE_LANGUAGES.map((c) => (
              <option key={c} value={c}>
                {languageName(c) ?? c}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="player-dialog-error" role="alert">
            {error}
          </p>
        )}
        <div className="player-dialog-body">
          {results.error && !unavailable ? (
            <p className="player-dialog-error" role="alert">
              {searchError(results.error)}
            </p>
          ) : results.loading || !results.data ? (
            <Spinner label="Searching" />
          ) : list.length === 0 ? (
            <p className="muted">No subtitles found in this language.</p>
          ) : (
            <ul className="subtitle-results">
              {list.map((r) => (
                <li key={r.file_id} className="subtitle-result">
                  <div className="subtitle-result-text">
                    <span className="subtitle-release">{r.release || r.file_name || `File ${r.file_id}`}</span>
                    <span className="subtitle-meta">
                      {languageName(r.language) ?? r.language}
                      {r.downloads !== null && ` · ${r.downloads.toLocaleString()} downloads`}
                      {resultBadges(r).map((b) => (
                        <span key={b.id} className={`sub-badge sub-badge-${b.id}`} title={b.title}>
                          {b.label}
                        </span>
                      ))}
                    </span>
                  </div>
                  <button type="button" className="btn btn-small" disabled={busy !== null} onClick={() => download(r)}>
                    {busy === r.file_id ? 'Downloading…' : 'Download'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function searchError(e: Error): string {
  if (e instanceof ApiError && e.status === 502) return `The subtitle provider does not answer: ${e.message}`;
  return `Search failed: ${e.message}`;
}

function downloadError(e: Error): string {
  // 429: the provider's daily download quota; the core's message says when it resets.
  if (e instanceof ApiError && e.status === 429) return e.message;
  if (e instanceof ApiError && e.status === 502) return `The subtitle provider does not answer: ${e.message}`;
  return `Download failed: ${e.message}`;
}
