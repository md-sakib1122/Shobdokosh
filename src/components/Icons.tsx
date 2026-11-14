// Line icons (24px grid, 1.6 stroke, currentColor). Decorative by default: give the
// surrounding control an accessible name instead.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Svg({ children, className = "h-5 w-5", ...rest }: P) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} {...rest}
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: P) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const IconChevronDown = (p: P) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Svg>;
export const IconSpeaker = (p: P) => (
  <Svg {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /></Svg>
);
export const IconInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Svg>;
export const IconMove = (p: P) => <Svg {...p}><path d="M7 7h11l-3-3M17 17H6l3 3" /></Svg>;
export const IconPencil = (p: P) => <Svg {...p}><path d="M5 19l1-4L16 5l3 3L9 18z" /><path d="M14 7l3 3" /></Svg>;
export const IconTrash = (p: P) => (
  <Svg {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /><path d="M10.5 10.5v5M13.5 10.5v5" /></Svg>
);
export const IconAlert = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></Svg>;
export const IconWarning = (p: P) => <Svg {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></Svg>;

// Navigation
export const IconPractice = (p: P) => (
  <Svg {...p}><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" /><path d="M8 4v16M11 9h5M11 12.5h5" /></Svg>
);
export const IconWords = (p: P) => (
  <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 4v16M11 9h5M11 12.5h5M11 16h3" /></Svg>
);
export const IconAdd = (p: P) => <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8.5v7M8.5 12h7" /></Svg>;
export const IconCategories = (p: P) => (
  <Svg {...p}><path d="M4 7.5A1.5 1.5 0 015.5 6H10l2 2h6.5A1.5 1.5 0 0120 9.5v8a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z" /></Svg>
);
export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6" />
  </Svg>
);

/** The ruled-page mark (DESIGN.md › Logo): margin rule in accent, three hairlines. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="var(--background)" stroke="var(--border)" />
      <path d="M9.6 6v20" stroke="var(--accent-solid)" strokeWidth="1.6" />
      <path d="M13 12.8h11M13 17.6h11M13 22.4h7" stroke="var(--border-strong)" strokeWidth="1.2" />
    </svg>
  );
}
