// Hand-drawn 24×24 stroke icons. Decorative by default (aria-hidden); pass a label otherwise.

import type { ReactNode } from 'react';

interface IconProps {
  label?: string;
  className?: string;
}

function icon(body: ReactNode, filled = false) {
  return function Icon({ label, className }: IconProps) {
    return (
      <svg
        className={`icon${className ? ` ${className}` : ''}`}
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {body}
      </svg>
    );
  };
}

export const PlayIcon = icon(
  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />,
  true,
);
export const PauseIcon = icon(
  <>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </>,
  true,
);
export const RewindIcon = icon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 3v6h6" />
    <text x="12" y="15.5" fontSize="7" textAnchor="middle" stroke="none" fill="currentColor">
      10
    </text>
  </>,
);
export const ForwardIcon = icon(
  <>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v6h-6" />
    <text x="12" y="15.5" fontSize="7" textAnchor="middle" stroke="none" fill="currentColor">
      10
    </text>
  </>,
);
export const VolumeIcon = icon(
  <>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </>,
);
export const MuteIcon = icon(
  <>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </>,
);
export const FullscreenIcon = icon(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const ExitFullscreenIcon = icon(<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />);
export const SubtitlesIcon = icon(
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 12h4M12 12h6M6 15h8M16 15h2" />
  </>,
);
export const AudioIcon = icon(
  <>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </>,
);
export const SettingsIcon = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>,
);
export const InfoIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
);
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);
export const HeartIcon = icon(
  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
);
export const HeartFilledIcon = icon(
  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
  true,
);
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
);
export const BackIcon = icon(<path d="M19 12H5M12 19l-7-7 7-7" />);
export const CloseIcon = icon(<path d="M18 6 6 18M6 6l12 12" />);
export const NextIcon = icon(
  <>
    <path d="M5 4.5v15l11-7.5z" />
    <path d="M19 5v14" />
  </>,
);
export const RefreshIcon = icon(
  <>
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 12A9 9 0 0 1 18.5 5.8L21 8" />
    <path d="M21 3v5h-5M3 21v-5h5" />
  </>,
);
export const AdminIcon = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);
export const LogoutIcon = icon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </>,
);
export const FilmIcon = icon(
  <>
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5" />
  </>,
);
export const TvIcon = icon(
  <>
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="m17 2-5 4-5-4" />
  </>,
);
export const UserIcon = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);
export const MonitorIcon = icon(
  <>
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </>,
);
export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);
export const MoonIcon = icon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />);
export const ChaptersIcon = icon(<path d="M4 6h16M4 12h16M4 18h10M18 16v4" />);
