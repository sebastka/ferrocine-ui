// Administration: system information, library scans, active transcodes.

import { useState } from 'react';
import { api, ApiError, type ReloadReport, type ScanStatus } from '../api.ts';
import { ConfigView } from '../components/ConfigView.tsx';
import { CloseIcon, RefreshIcon } from '../components/icons.tsx';
import { ErrorBox, Link, Spinner } from '../components/ui.tsx';
import { useSession } from '../context.ts';
import { useAsync, useInterval } from '../hooks.ts';
import { ago } from '../logic/format.ts';
import { paths } from '../logic/route.ts';

export function Admin() {
  const { me, libraries, refreshLibraries } = useSession();
  const system = useAsync(me.admin ? 'system' : null, (signal) => api.system(signal));
  useInterval(system.reload, 5000);
  const config = useAsync(me.admin ? 'config' : null, (signal) => api.config(signal));
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState<{ report?: ReloadReport; error?: string } | null>(null);
  const [reloading, setReloading] = useState(false);

  if (!me.admin) return <ErrorBox error={new Error('Administrators only.')} />;
  if (system.error && !system.data) return <ErrorBox error={system.error} onRetry={system.reload} />;
  if (!system.data) return <Spinner />;
  const s = system.data;
  const scanOf = (id: string): ScanStatus | undefined => s.libraries.find((l) => l.id === id)?.scan;

  const scan = (id: string, refresh: boolean) => {
    api
      .scan(id, refresh)
      .then(() => {
        setNotice(`Scan of ${id} started.`);
        system.reload();
      })
      .catch((e: Error) => setNotice(e.message));
  };

  const reloadConfig = () => {
    setReloading(true);
    setReload(null);
    api
      .reload()
      .then((report) => {
        setReload({ report });
        system.reload();
        config.reload();
        return refreshLibraries();
      })
      .catch((e: Error) =>
        // 422: the configuration is invalid (the running one is kept); the text lists why.
        setReload({ error: e instanceof ApiError && e.status === 422 ? e.message : `Reload failed: ${e.message}` }),
      )
      .finally(() => setReloading(false));
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Administration</h1>
        <button type="button" className="btn" disabled={reloading} onClick={reloadConfig}>
          <RefreshIcon /> {reloading ? 'Reloading…' : 'Reload configuration'}
        </button>
      </div>
      {reload && <ReloadResult {...reload} onClose={() => setReload(null)} />}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <section className="section">
        <h2>System</h2>
        <dl className="tech">
          <div className="tech-row">
            <dt>Ferrocine</dt>
            <dd>{s.version}</dd>
          </div>
          <div className="tech-row">
            <dt>ffmpeg</dt>
            <dd>{s.ffmpeg.version ?? 'not found'}</dd>
          </div>
          <div className="tech-row">
            <dt>Hardware acceleration</dt>
            <dd>
              {s.ffmpeg.hw_accel ? (
                <>
                  <span className="pill pill-good">{s.ffmpeg.hw_accel}</span> {s.ffmpeg.device}
                </>
              ) : (
                <span className="pill">software</span>
              )}
            </dd>
          </div>
          <div className="tech-row">
            <dt>Encoders</dt>
            <dd>
              <ul className="chips">
                {s.ffmpeg.encoders.map((e) => (
                  <li key={e} className="chip">
                    {e}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="tech-row">
            <dt>Remote metadata (TMDB)</dt>
            <dd>{s.metadata.tmdb ? 'enabled' : 'disabled (local metadata only)'}</dd>
          </div>
        </dl>
      </section>

      <section className="section">
        <h2>Libraries</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Library</th>
                <th scope="col">Items</th>
                <th scope="col">Last scan</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {libraries.map((l) => {
                const sc = scanOf(l.id) ?? l.scan;
                return (
                  <tr key={l.id}>
                    <td>
                      <Link to={paths.library(l.id)}>{l.name}</Link> <span className="muted">({l.kind})</span>
                    </td>
                    <td>{l.item_count}</td>
                    <td>
                      {sc?.running ? (
                        <span className="pill pill-busy">scanning…</span>
                      ) : sc?.last_error ? (
                        <span className="pill pill-bad" title={sc.last_error}>
                          failed {ago(sc.last_finished_at)}
                        </span>
                      ) : (
                        <span className="muted">{ago(sc?.last_finished_at ?? null)}</span>
                      )}
                      {sc?.last_error && <p className="error-text">{sc.last_error}</p>}
                    </td>
                    <td className="cell-actions">
                      <button type="button" className="btn" disabled={sc?.running} onClick={() => scan(l.id, false)}>
                        <RefreshIcon /> Scan
                      </button>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        disabled={sc?.running}
                        onClick={() => scan(l.id, true)}
                        title="Also fetch metadata again for unchanged items"
                      >
                        Scan + refresh metadata
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2>Active streams</h2>
        {s.transcodes.length === 0 ? (
          <p className="muted">No transcode or remux running.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Item</th>
                  <th scope="col">Method</th>
                  <th scope="col">Started</th>
                </tr>
              </thead>
              <tbody>
                {s.transcodes.map((t) => (
                  <tr key={t.session_id}>
                    <td>{t.user}</td>
                    <td>
                      <Link to={paths.item(t.item_id)}>{t.title}</Link>
                    </td>
                    <td>
                      {t.method}
                      {t.method === 'transcode' && (
                        <span className={`pill${t.hw_accel ? ' pill-good' : ''}`}>{t.hw_accel ?? 'software'}</span>
                      )}
                    </td>
                    <td>{ago(t.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Configuration</h2>
        <p className="muted">
          The running configuration. It is edited in the configuration files; reload it from the button above.
        </p>
        {config.error ? (
          <ErrorBox error={config.error} onRetry={config.reload} />
        ) : !config.data ? (
          <Spinner />
        ) : (
          <ConfigView config={config.data} />
        )}
      </section>
    </div>
  );
}

function ReloadResult({ report, error, onClose }: { report?: ReloadReport; error?: string; onClose: () => void }) {
  const list = (items: string[]) => (items.length > 0 ? items.join(', ') : 'none');
  return (
    <div className={`result-panel${error ? ' result-panel-bad' : ''}`} role={error ? 'alert' : 'status'}>
      <button type="button" className="icon-btn result-close" onClick={onClose} aria-label="Close">
        <CloseIcon />
      </button>
      {error ? (
        <>
          <strong>The configuration was not reloaded; the running one is kept.</strong>
          <pre className="result-error">{error}</pre>
        </>
      ) : (
        report && (
          <>
            <strong>Configuration reloaded.</strong>
            <dl className="tech">
              <div className="tech-row">
                <dt>Applied</dt>
                <dd>{list(report.applied)}</dd>
              </div>
              <div className="tech-row">
                <dt>Needs a restart</dt>
                <dd>{list(report.restart_required)}</dd>
              </div>
              <div className="tech-row">
                <dt>Scans queued</dt>
                <dd>{list(report.scans_queued)}</dd>
              </div>
            </dl>
          </>
        )
      )}
    </div>
  );
}
