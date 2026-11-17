const PATHS: Record<string, JSX.Element> = {
  home: <path d="M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5" />,
  play: <path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none" />,
  pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" stroke="none" />,
  stepBack: <path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor" stroke="none" />,
  stepFwd: <path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor" stroke="none" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  review: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>,
  zone: <><rect x="6" y="4" width="12" height="16" /><path d="M10 4v16M14 4v16M6 9.3h12M6 14.6h12" /></>,
  block: <><path d="M4 18h16M7 18l5-12 5 12" /><circle cx="12" cy="15" r="1.5" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  model: <path d="M4 6h4v4H4zM16 4h4v4h-4zM16 16h4v4h-4zM8 8l8-2M8 8l8 10" />,
  target: <><circle cx="12" cy="12" r="8" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></>,
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
