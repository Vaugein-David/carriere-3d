'use client';

import { useEffect, type ReactNode } from 'react';
import type { ProcedureData } from '../types';
import { IconAttention, IconPhone } from './Icons';
import { SignLink } from './PageLink';
import { ui, useT } from '../i18n';
import { PillLink } from './SiteShell';
import { withBase } from '../lib/base';

/** Mise en forme légère : **gras** et [[badge]] (étiquette verte de l'affiche) */
export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[\[badge\]\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(
      m[1] !== undefined ? (
        <strong key={i}>{m[1]}</strong>
      ) : (
        <span key={i} className="badge-tag">
          ← badge
        </span>
      ),
    );
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Page simple : retranscription d'une affiche, étape par étape. */
export function ProcedurePage({ data }: { data: ProcedureData }) {
  const t = useT();

  useEffect(() => {
    document.title = `${t(data.title).replace(/\*\*/g, '')} — ${t(ui.site)}`;
  }, [data.title, t]);

  return (
    <>
      <header className="page-header page-header--poster">
        <p className="eyebrow">{t(data.eyebrow)}</p>
        <h1>
          <RichText text={t(data.title)} />
          <span className="title-pill" style={{ backgroundImage: `url(${withBase('/renders/tremie.webp')})` }} aria-hidden="true" />
        </h1>
        <p className="lead">{t(data.description)}</p>
        <div className="header-actions">
          <PillLink href="/plan-3d?focus=tremie">{t(ui.view3d)}</PillLink>
          <SignLink />
        </div>
      </header>

      <main className="page-main procedure">
        <ol className="procedure-steps">
          {data.steps.map((step, i) => (
            <li key={i} className="procedure-step">
              <span className="procedure-num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h2 className="procedure-step-title">
                  {t(ui.step)} {i + 1}
                </h2>
                <p className="procedure-step-text">
                  <RichText text={t(step)} />
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="procedure-notes">
        {data.notes.map((n, i) => (
          <section key={i} className={`procedure-note procedure-note--${n.tone}`} aria-label={t(n.label)}>
            <h2>
              {n.attention && <IconAttention />}
              {t(n.label)}
            </h2>
            <p>
              <RichText text={t(n.text)} />
            </p>
            {n.tel && (
              <a className="call-btn" href={`tel:${n.tel.replace(/[^\d+]/g, '')}`}>
                <IconPhone />
                <span>
                  {t(ui.call)} <strong>{n.tel}</strong>
                </span>
              </a>
            )}
          </section>
        ))}
        </div>
      </main>
    </>
  );
}
