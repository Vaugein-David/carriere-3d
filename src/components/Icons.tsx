'use client';

import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconPlus = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconMinus = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);

export const IconRecenter = () => (
  <Icon>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    <circle cx="12" cy="12" r="2.5" />
  </Icon>
);

export const IconClose = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconChevron = () => (
  <Icon>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const IconPhone = () => (
  <Icon>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </Icon>
);

/** Panneau attention (triangle jaune, contour et point d'exclamation noirs) */
export const IconAttention = () => (
  <svg className="icon icon-attention" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <path d="M12 2.5 L22.5 20.5 H1.5 Z" fill="#FFD400" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 9 V14" stroke="#000" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="12" cy="17.3" r="1.4" fill="#000" />
  </svg>
);

/** Flèche fine des boutons pilule (style « maquette ») */
export const IconArrow = ({ dir = 'right' }: { dir?: 'right' | 'left' | 'up-right' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    style={{ transform: dir === 'left' ? 'rotate(180deg)' : dir === 'up-right' ? 'rotate(-45deg)' : undefined }}
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** Logo : tas de granulats */
export const IconLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M2 19 9.5 7.5l3 4.2L15 8l7 11z" />
  </svg>
);
