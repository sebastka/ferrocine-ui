// The avatar button of the header and its menu: Profile, Log out.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useSession } from '../context.ts';
import { paths } from '../logic/route.ts';
import { navigate } from '../router.ts';
import { Avatar } from './Avatar.tsx';
import { LogoutIcon, TvIcon, UserIcon } from './icons.tsx';
import { THEME_CHOICES } from '../logic/theme.ts';
import { setTheme, THEME_LABELS, useTheme } from '../theme.ts';
import { ThemeIcon } from './ThemeIcon.tsx';

export function AccountMenu() {
  const { me } = useSession();
  const { choice } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
  const close = (focusButton: boolean) => {
    setOpen(false);
    if (focusButton) button.current?.focus();
  };

  // Focus the first entry on opening; close on a click or focus outside.
  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onFocus = (e: FocusEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('focusin', onFocus);
    };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const focus = (n: number) => list[(n + list.length) % list.length]?.focus();
    switch (e.key) {
      case 'ArrowDown':
        focus(i + 1);
        break;
      case 'ArrowUp':
        focus(i - 1);
        break;
      case 'Home':
        focus(0);
        break;
      case 'End':
        focus(list.length - 1);
        break;
      case 'Escape':
        close(true);
        break;
      case 'Tab':
        setOpen(false);
        return;
      default:
        return;
    }
    e.preventDefault();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const name = me.display_name || me.username;
  return (
    <div className="account" ref={root}>
      <button
        ref={button}
        type="button"
        className="avatar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Account: ${name}`}
        title={name}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
      >
        <Avatar me={me} />
      </button>
      {open && (
        <div ref={menu} id={id} className="account-menu" role="menu" aria-label="Account" onKeyDown={onMenuKey}>
          <div className="account-head" role="none">
            <strong>{name}</strong>
            {me.display_name && me.display_name !== me.username && <span className="muted">{me.username}</span>}
          </div>
          <div role="group" aria-labelledby={`${id}-theme`} className="menu-group">
            <span id={`${id}-theme`} className="menu-group-label">
              Theme
            </span>
            {THEME_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                role="menuitemradio"
                aria-checked={choice === c}
                tabIndex={-1}
                className="menu-entry"
                onClick={() => setTheme(c)}
              >
                <ThemeIcon choice={c} /> {THEME_LABELS[c]}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="menu-entry"
            onClick={() => {
              setOpen(false);
              navigate(paths.profile());
            }}
          >
            <UserIcon /> Profile
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="menu-entry"
            onClick={() => {
              setOpen(false);
              navigate(paths.pair());
            }}
          >
            <TvIcon /> Pair a device
          </button>
          <form method="post" action="/auth/logout" role="none">
            <button type="submit" role="menuitem" tabIndex={-1} className="menu-entry">
              <LogoutIcon /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
