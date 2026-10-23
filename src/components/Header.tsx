// Top bar: brand, libraries, search, admin, account.

import { paths } from '../logic/route.ts';
import { useSession } from '../context.ts';
import { useRoute } from '../router.ts';
import { AccountMenu } from './AccountMenu.tsx';
import { AdminIcon, FilmIcon, SearchIcon, TvIcon } from './icons.tsx';
import { Link } from './ui.tsx';

export function Header() {
  const { me, libraries } = useSession();
  const route = useRoute();
  return (
    <header className="header">
      <Link to={paths.home()} className="brand" ariaLabel="Ferrocine home">
        <img src="/logo.svg" alt="" width="28" height="28" />
        <span>Ferrocine</span>
      </Link>
      <nav className="nav" aria-label="Libraries">
        <ul>
          <li>
            <Link to={paths.home()} className="nav-item" current={route.name === 'home'}>
              Home
            </Link>
          </li>
          {libraries.map((l) => (
            <li key={l.id}>
              <Link
                to={paths.library(l.id)}
                className="nav-item"
                current={route.name === 'library' && route.id === l.id}
              >
                {l.kind === 'shows' ? <TvIcon /> : <FilmIcon />}
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="header-actions">
        <Link
          to={paths.search('')}
          className="icon-btn"
          title="Search"
          ariaLabel="Search"
          current={route.name === 'search'}
        >
          <SearchIcon />
        </Link>
        {me.admin && (
          <Link
            to={paths.admin()}
            className="icon-btn"
            title="Administration"
            ariaLabel="Administration"
            current={route.name === 'admin'}
          >
            <AdminIcon />
          </Link>
        )}
        <AccountMenu />
      </div>
    </header>
  );
}
