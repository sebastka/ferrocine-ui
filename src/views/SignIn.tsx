import { safeReturnTo } from '../logic/route.ts';

export function SignIn() {
  const returnTo = safeReturnTo(location.pathname + location.search);
  return (
    <main className="sign-in">
      <div className="sign-in-card">
        <img src="/logo.svg" alt="" width="56" height="56" />
        <h1>Ferrocine</h1>
        <p className="muted">Sign in to browse and play your media.</p>
        <a className="btn btn-primary btn-large" href={`/auth/login?return_to=${encodeURIComponent(returnTo)}`}>
          Sign in
        </a>
      </div>
    </main>
  );
}
