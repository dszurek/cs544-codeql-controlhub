const iconProps = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function SpacesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 2a7 7 0 017 7c0 4-3.5 8-7 11-3.5-3-7-7-7-11a7 7 0 017-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/* ── Surface icons (6-surface IA) ── */

export function TodayIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  );
}

export function PlanIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="13" rx="1.5" />
      <rect x="14" y="3" width="7" height="8" rx="1.5" />
      <path d="M3 21h7M14 16h7" />
    </svg>
  );
}

export function StreamsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 7c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
      <path d="M2 13c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
      <path d="M2 19c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" opacity="0.5" />
    </svg>
  );
}

export function BodyIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12h4l2-7 4 14 3-10 1.5 3H22" />
    </svg>
  );
}

export function LibraryIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 19.5V5a2 2 0 012-2h3v18H6a2 2 0 01-2-1.5z" />
      <path d="M9 3h5v18H9" />
      <path d="M14 4l5 1-3.5 17-4-1" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
