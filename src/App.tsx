import { useEffect, useState } from 'react';
import { api, ApiError, UNAUTHENTICATED, type Library, type Me } from './api.ts';
import { Header } from './components/Header.tsx';
import { ErrorBox, Spinner } from './components/ui.tsx';
import { SessionContext } from './context.ts';
import { useRoute } from './router.ts';
import { Admin } from './views/Admin.tsx';
import { Home } from './views/Home.tsx';
import { Item } from './views/Item.tsx';
import { Library as LibraryView } from './views/Library.tsx';
import { NotFound } from './views/NotFound.tsx';
import { Player } from './views/Player.tsx';
import { Profile } from './views/Profile.tsx';
import { Search } from './views/Search.tsx';
import { SignIn } from './views/SignIn.tsx';

type Auth =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'error'; error: Error }
  | { kind: 'signedIn'; me: Me; libraries: Library[] };

export function App() {
  const [auth, setAuth] = useState<Auth>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const route = useRoute();

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([api.me(ac.signal), api.libraries(ac.signal)]).then(
      ([me, libraries]) => setAuth({ kind: 'signedIn', me, libraries }),
      (e: unknown) => {
        if (ac.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) setAuth({ kind: 'signedOut' });
        else setAuth({ kind: 'error', error: e instanceof Error ? e : new Error(String(e)) });
      },
    );
    return () => ac.abort();
  }, [attempt]);

  // Any 401 later on (session expired or revoked) brings the sign-in screen back.
  useEffect(() => {
    const onUnauthenticated = () => setAuth({ kind: 'signedOut' });
    window.addEventListener(UNAUTHENTICATED, onUnauthenticated);
    return () => window.removeEventListener(UNAUTHENTICATED, onUnauthenticated);
  }, []);

  if (auth.kind === 'loading') return <Spinner />;
  if (auth.kind === 'signedOut') return <SignIn />;
  if (auth.kind === 'error')
    return (
      <main className="page">
        <ErrorBox error={auth.error} onRetry={() => setAttempt((a) => a + 1)} />
      </main>
    );

  const session = {
    me: auth.me,
    libraries: auth.libraries,
    refreshLibraries: () =>
      api.libraries().then((libraries) => setAuth((a) => (a.kind === 'signedIn' ? { ...a, libraries } : a))),
  };
  if (route.name === 'play')
    return (
      <SessionContext value={session}>
        <Player id={route.id} fromStart={route.fromStart} />
      </SessionContext>
    );
  return (
    <SessionContext value={session}>
      <Header />
      <main>
        {route.name === 'home' && <Home />}
        {route.name === 'library' && <LibraryView key={route.id} id={route.id} />}
        {route.name === 'item' && <Item key={route.id} id={route.id} />}
        {route.name === 'search' && <Search initial={route.q} />}
        {route.name === 'admin' && <Admin />}
        {route.name === 'profile' && <Profile />}
        {route.name === 'notFound' && <NotFound />}
      </main>
    </SessionContext>
  );
}
