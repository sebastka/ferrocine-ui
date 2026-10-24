// The user's paired devices (TV apps), with sign-out.

import { useState } from 'react';
import { api, type Device } from '../api.ts';
import { useAsync } from '../hooks.ts';
import { ago } from '../logic/format.ts';
import { platformLabel } from '../logic/pair.ts';
import { paths } from '../logic/route.ts';
import { TvIcon } from './icons.tsx';
import { ErrorBox, Link, Spinner } from './ui.tsx';

export function Devices() {
  const devices = useAsync('devices', (signal) => api.devices(signal));
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signOut = (d: Device) => {
    if (!window.confirm(`Sign out “${d.name}”? It will need to be paired again.`)) return;
    setBusy(d.id);
    setError(null);
    api
      .signOutDevice(d.id)
      .then(devices.reload)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(null));
  };

  return (
    <section className="profile-card devices" aria-labelledby="devices-title">
      <div className="devices-head">
        <h2 id="devices-title">Devices</h2>
        <Link to={paths.pair()} className="btn btn-quiet">
          Pair a device
        </Link>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {devices.error ? (
        <ErrorBox error={devices.error} onRetry={devices.reload} />
      ) : !devices.data ? (
        <Spinner />
      ) : devices.data.length === 0 ? (
        <p className="muted">
          No device is signed in. TV apps show a code to <Link to={paths.pair()}>pair them with your account</Link>.
        </p>
      ) : (
        <ul className="device-list">
          {devices.data.map((d) => (
            <li key={d.id} className="device">
              <TvIcon />
              <div className="device-text">
                <span className="device-name">
                  {d.name}
                  {d.current && <span className="pill">this device</span>}
                </span>
                <span className="muted">
                  {[platformLabel(d.platform), `last used ${d.last_seen_at ? ago(d.last_seen_at) : 'never'}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-small"
                disabled={busy !== null}
                onClick={() => signOut(d)}
                aria-label={`Sign out ${d.name}`}
              >
                {busy === d.id ? 'Signing out…' : 'Sign out'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
