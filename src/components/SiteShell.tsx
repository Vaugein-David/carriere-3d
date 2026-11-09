'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LangProvider, LangSwitcher, ui, useT } from '../i18n';
import { IconArrow, IconLogo } from './Icons';

const LINKS = [
  { href: '/', label: ui.navHome },
  { href: '/plan-1', label: ui.navTraffic },
  { href: '/plan-2', label: ui.navHopper },
  { href: '/plan-3d', label: ui.nav3d },
];

function Shell({ children }: { children: ReactNode }) {
  const t = useT();
  const path = usePathname();
  const current = (href: string) => ((path.replace(/\/$/, '') || '/') === href ? 'page' : undefined);

  return (
    <div className="site">
      <header className="topbar">
        <Link href="/" className="topbar-brand">
          <span className="brand-mark">
            <IconLogo />
          </span>
          <strong>{t(ui.site)}</strong>
          <small>{t(ui.siteTag)}</small>
        </Link>
        <nav className="topbar-nav" aria-label={t(ui.navLabel)}>
          {LINKS.slice(0, 3).map((l) => (
            <Link key={l.href} href={l.href} aria-current={current(l.href)}>
              {t(l.label)}
            </Link>
          ))}
        </nav>
        <LangSwitcher />
        <Link href="/plan-3d" className="topbar-cta" aria-current={current('/plan-3d')}>
          <span className="visually-hidden">{t(ui.nav3d)}</span>
          <span aria-hidden="true">3D</span>
          <span className="arrow-dot">
            <IconArrow dir="up-right" />
          </span>
        </Link>
      </header>
      <nav className="mobile-nav" aria-label={t(ui.navLabel)}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={current(l.href)}>
            {t(l.label)}
          </Link>
        ))}
      </nav>

      {children}

      <footer className="site-footer">
        <p>{t(ui.footer)}</p>
        <p>{t(ui.aerial)} : © IGN – BD ORTHO® · Maquette 3D : Blender</p>
      </footer>
    </div>
  );
}

/** Coque commune : langue, barre de navigation et pied de page */
export function App({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <Shell>{children}</Shell>
    </LangProvider>
  );
}

/** Bouton pilule noir suivi d'un rond fléché */
export function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn-pill">
      <span>{children}</span>
      <span className="arrow-dot">
        <IconArrow />
      </span>
    </Link>
  );
}
