// The signed-in user, as the identity provider describes them.

import { Avatar } from '../components/Avatar.tsx';
import { LogoutIcon } from '../components/icons.tsx';
import { ThemeIcon } from '../components/ThemeIcon.tsx';
import { useSession } from '../context.ts';
import { THEME_CHOICES } from '../logic/theme.ts';
import { setTheme, THEME_LABELS, useTheme } from '../theme.ts';

export function Profile() {
  const { me } = useSession();
  const { choice, theme } = useTheme();
  return (
    <div className="page profile">
      <h1 className="sr-only">Profile</h1>
      <div className="profile-card">
        <Avatar me={me} size="large" />
        <div className="profile-text">
          <p className="profile-name">{me.display_name || me.username}</p>
          <dl className="tech">
            <div className="tech-row">
              <dt>Username</dt>
              <dd>{me.username}</dd>
            </div>
            {me.email && (
              <div className="tech-row">
                <dt>E-mail</dt>
                <dd>{me.email}</dd>
              </div>
            )}
            <div className="tech-row">
              <dt>Role</dt>
              <dd>{me.admin ? 'Administrator' : 'User'}</dd>
            </div>
            <div className="tech-row">
              <dt>Groups</dt>
              <dd>
                {me.groups.length === 0 ? (
                  <span className="muted">none</span>
                ) : (
                  <ul className="chips">
                    {me.groups.map((g) => (
                      <li key={g} className="chip">
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            <div className="tech-row">
              <dt id="appearance">Appearance</dt>
              <dd>
                <div className="segmented" role="radiogroup" aria-labelledby="appearance">
                  {THEME_CHOICES.map((c) => (
                    <label key={c} className="segment">
                      <input type="radio" name="theme" value={c} checked={choice === c} onChange={() => setTheme(c)} />
                      <span>
                        <ThemeIcon choice={c} /> {THEME_LABELS[c]}
                      </span>
                    </label>
                  ))}
                </div>
                {choice === 'system' && <span className="muted segmented-hint">Currently {theme}.</span>}
                <span className="muted segmented-hint">Remembered in this browser.</span>
              </dd>
            </div>
          </dl>
          <p className="muted profile-note">
            These details come from your identity provider. Changes made there show here after your next sign-in.
          </p>
          <form method="post" action="/auth/logout">
            <button type="submit" className="btn">
              <LogoutIcon /> Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
