// The user's picture, or their initials on a colour derived from the username.

import { useState } from 'react';
import type { Me } from '../api.ts';
import { avatarColour, initials } from '../logic/avatar.ts';

export function Avatar({ me, size = 'small' }: { me: Me; size?: 'small' | 'large' }) {
  // Remember which URL failed, so a new picture (new versioned URL) is tried again.
  const [failed, setFailed] = useState<string | null>(null);
  const name = me.display_name || me.username;
  const cls = `avatar avatar-${size}`;
  if (me.avatar && failed !== me.avatar) {
    const src = me.avatar;
    return <img className={cls} src={src} alt={name} onError={() => setFailed(src)} />;
  }
  return (
    <span className={`${cls} avatar-initials avatar-c${avatarColour(me.username)}`} role="img" aria-label={name}>
      <span aria-hidden="true">{initials(me.display_name, me.username)}</span>
    </span>
  );
}
