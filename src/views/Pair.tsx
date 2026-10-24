// Quick Connect: approve a device (a TV app) that shows a pairing code.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, type Pairing } from '../api.ts';
import { CheckIcon, TvIcon } from '../components/icons.tsx';
import { Link } from '../components/ui.tsx';
import { useSession } from '../context.ts';
import { formatCode, invalidChars, parseCode, platformLabel } from '../logic/pair.ts';
import { paths } from '../logic/route.ts';
import { navigate } from '../router.ts';

type Step =
  | { kind: 'enter' }
  | { kind: 'looking'; code: string }
  | { kind: 'found'; pairing: Pairing; code: string }
  | { kind: 'approving'; pairing: Pairing; code: string }
  | { kind: 'approved'; pairing: Pairing };

const NOT_FOUND = 'Code not found or expired: check the TV and try again.';

function errorText(e: unknown): string {
  if (e instanceof ApiError && e.status === 404) return NOT_FOUND;
  return e instanceof Error ? e.message : String(e);
}

export function Pair({ initial }: { initial: string }) {
  const { me } = useSession();
  const [text, setText] = useState(() => formatCode(initial));
  const [step, setStep] = useState<Step>({ kind: 'enter' });
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const lookUp = (code: string) => {
    setError(null);
    setStep({ kind: 'looking', code });
    api.pairing(code).then(
      (pairing) => setStep({ kind: 'found', pairing, code }),
      (e: unknown) => {
        setError(errorText(e));
        setStep({ kind: 'enter' });
      },
    );
  };

  // A code from the TV's QR code is looked up at once.
  const prefilled = useRef(parseCode(initial));
  useEffect(() => {
    if (prefilled.current) lookUp(prefilled.current);
    else input.current?.focus();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = parseCode(text);
    if (code) {
      navigate(paths.pair(code), { replace: true });
      lookUp(code);
    } else {
      setError('A code has 8 characters, as shown on the TV.');
    }
  };

  const approve = (pairing: Pairing, code: string) => {
    setError(null);
    setStep({ kind: 'approving', pairing, code });
    api.approvePairing(code).then(
      () => setStep({ kind: 'approved', pairing }),
      (e: unknown) => {
        setError(errorText(e));
        // Gone meanwhile (expired, or approved elsewhere): back to the code.
        setStep(e instanceof ApiError && e.status === 404 ? { kind: 'enter' } : { kind: 'found', pairing, code });
      },
    );
  };

  const reset = () => {
    setText('');
    setError(null);
    setStep({ kind: 'enter' });
    navigate(paths.pair(), { replace: true });
    setTimeout(() => input.current?.focus());
  };

  const bad = invalidChars(text);
  const user = me.display_name || me.username;

  return (
    <div className="page pair">
      <div className="pair-card">
        <h1>Pair a device</h1>
        {step.kind === 'approved' ? (
          <div className="pair-done" role="status">
            <span className="pair-done-icon" aria-hidden="true">
              <CheckIcon />
            </span>
            <p>
              <strong>{step.pairing.device_name}</strong> is now signed in as <strong>{user}</strong>.
            </p>
            <p className="muted">It may take a few seconds for the TV to notice.</p>
            <div className="actions">
              <Link to={paths.profile()} className="btn">
                Your devices
              </Link>
              <button type="button" className="btn btn-quiet" onClick={reset}>
                Pair another device
              </button>
            </div>
          </div>
        ) : step.kind === 'found' || step.kind === 'approving' ? (
          <div className="pair-confirm">
            <div className="pair-device">
              <TvIcon />
              <div>
                <strong className="pair-device-name">{step.pairing.device_name}</strong>
                <span className="muted">
                  {[platformLabel(step.pairing.platform), `code ${formatCode(step.code)}`].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
            <p className="pair-warning" role="note">
              Only approve a device you are holding the remote of. It will be signed in as <strong>{user}</strong>, with
              access to your libraries and watch history.
            </p>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={step.kind === 'approving'}
                onClick={() => approve(step.pairing, step.code)}
              >
                {step.kind === 'approving' ? 'Approving…' : 'Approve'}
              </button>
              <button type="button" className="btn btn-quiet" disabled={step.kind === 'approving'} onClick={reset}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="pair-form" noValidate>
            <p className="muted">Enter the code shown on the TV, or scan its QR code with this phone.</p>
            <label className="sr-only" htmlFor="pair-code">
              Pairing code
            </label>
            <input
              ref={input}
              id="pair-code"
              className="input pair-code"
              value={text}
              onChange={(e) => {
                setText(formatCode(e.target.value));
                setError(null);
              }}
              placeholder="XXXX-XXXX"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              maxLength={9}
              aria-invalid={error !== null || bad.length > 0}
              aria-describedby="pair-help"
              disabled={step.kind === 'looking'}
            />
            <p id="pair-help" className={bad.length > 0 || error ? 'error-text' : 'muted pair-help'} role="status">
              {error ??
                (bad.length > 0
                  ? `Codes never contain ${bad.join(', ')}: check the TV again.`
                  : 'Letters and digits; case and dashes do not matter.')}
            </p>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={step.kind === 'looking' || parseCode(text) === null}
            >
              {step.kind === 'looking' ? 'Looking up…' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
