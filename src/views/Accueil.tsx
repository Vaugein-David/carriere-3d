'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { App, PillLink } from '../components/SiteShell';
import { IconArrow } from '../components/Icons';
import { LinkedText } from '../components/PageLink';
import { RichText } from '../components/ProcedurePage';
import { home } from '../data/accueil';
import { plan1 } from '../data/plan-1';
import { plan2 } from '../data/plan-2';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { LANGS, ui, useT } from '../i18n';
import { withBase } from '../lib/base';

gsap.registerPlugin(useGSAP);

/** *italique* et {n} (photo ronde) dans les titres */
function Styled({ text, pills = [] }: { text: string; pills?: string[] }) {
  return (
    <>
      {text.split(/(\*[^*]+\*|\{\d\})/).map((part, i) => {
        if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
        const pill = /^\{(\d)\}$/.exec(part);
        if (pill) {
          const src = pills[Number(pill[1]) - 1];
          return src ? <span key={i} className="title-pill" style={{ backgroundImage: `url(${src})` }} aria-hidden="true" /> : null;
        }
        return part;
      })}
    </>
  );
}

function Lines({ text, pills }: { text: string; pills?: string[] }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i} className="line">
          <Styled text={line} pills={pills} />
        </span>
      ))}
    </>
  );
}

/** Carrousel horizontal : défilement au doigt, glisser à la souris, barre de progression */
function Carousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ w: 30, x: 0 });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
      const max = el.scrollWidth - el.clientWidth;
      setBar({ w, x: max > 0 ? (el.scrollLeft / max) * (100 - w) : 0 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const onDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      setDragging(true);
    }
    if (d.moved) ref.current.scrollLeft = d.left - dx;
  };
  const onUp = () => {
    drag.current = null;
    // Laisse passer le clic qui suit le relâchement avant de réactiver les liens
    requestAnimationFrame(() => setDragging(false));
  };

  return (
    <>
      <div
        ref={ref}
        className={`carousel${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {children}
      </div>
      <div className="carousel-progress" aria-hidden="true">
        <span style={{ '--w': `${bar.w}%`, '--x': `${bar.x}%` } as CSSProperties} />
      </div>
    </>
  );
}

/** Pictogrammes des consignes, dans l'ordre de plan1.rules */
const RULE_ICONS = [
  'M4 20V6l8-3 8 3v14M9 20v-6h6v6', // accès
  'M4 8h13l-3-3M20 16H7l3 3', // sens de circulation
  'M4 5h16l-6 8v6l-4-2v-4z', // trémie
  'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', // attente
  'M14 4h6v16h-6M3 12h12M11 8l4 4-4 4', // sortie
  'M5.6 5.6l12.8 12.8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', // interdit
  'M12 14l4-6M4 18a9 9 0 1 1 16 0', // vitesse
  'M12 4l9 16H3zM12 10v4M12 17h.01', // priorité
  'M4 15a8 8 0 0 1 16 0zM3 15h18v2H3zM12 7V4', // EPI
];

function Steps() {
  const t = useT();
  const [i, setI] = useState(0);
  const n = plan2.steps.length;
  return (
    <div className="quotes" style={{ '--i': i } as CSSProperties}>
      <div className="quotes-nav">
        <button type="button" className="round-btn" onClick={() => setI((v) => v - 1)} disabled={i === 0} aria-label={t(home.prev)}>
          <IconArrow dir="left" />
        </button>
        <button type="button" className="round-btn round-btn--dark" onClick={() => setI((v) => v + 1)} disabled={i === n - 1} aria-label={t(home.next)}>
          <IconArrow />
        </button>
      </div>
      <ol className="quotes-track">
        {plan2.steps.map((s, k) => (
          <li key={k} className={`quote${k === i ? ' is-current' : ''}`} aria-current={k === i ? 'step' : undefined} onClick={() => setI(k)}>
            <p>
              <RichText text={t(s)} />
            </p>
            <footer>
              <span className="quote-who">
                <span className="quote-num">{k + 1}</span>
                <span>
                  {t(ui.step)} {k + 1}
                  <small>{t(home.hopper)}</small>
                </span>
              </span>
              <span className="quote-mark" aria-hidden="true">
                ”
              </span>
            </footer>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Accueil() {
  const t = useT();
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const products = plan1.products?.reduce((n, g) => n + g.products.length, 0) ?? 0;
  // Grille des consignes sur 4 colonnes : le mot « Consignes » prend juste la place qu'il faut pour remplir les rangées
  const free = 4 - (plan1.rules.length % 4);
  const wordSpan = free === 1 ? 4 : free;

  useEffect(() => {
    document.title = `${t(home.pageTitle)} — ${t(ui.site)}`;
  }, [t]);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.from('.hero-title .line, .hero-kicker, .hero-bottom > *', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
      });
      gsap.from('.p-card', { x: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.25 });
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <main ref={root}>
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">
            <span className="title-pill title-pill--round" style={{ backgroundImage: `url(${withBase('/renders/silos.webp')})` }} aria-hidden="true" />
            {t(home.kicker)}
          </p>
          <h1 className="hero-title">
            <Lines text={t(home.title)} pills={home.titlePills} />
          </h1>
          <div className="hero-bottom">
            <ul className="hero-stats">
              <li>
                <strong>{products}</strong>
                <span>{t(home.stats.products)}</span>
              </li>
              <li>
                <strong>{plan1.rules.length}</strong>
                <span>{t(home.stats.rules)}</span>
              </li>
              <li>
                <strong>{LANGS.length}</strong>
                <span>{t(home.stats.langs)}</span>
              </li>
            </ul>
            <div>
              <p className="hero-about">
                <strong>{t(home.aboutLabel)}</strong> {t(home.about)}
              </p>
              <PillLink href="/plan-1">{t(home.cta)}</PillLink>
            </div>
          </div>
        </div>
      </section>

      <section className="band" aria-label={t(ui.navLabel)}>
        <Carousel>
          {home.cards.map((c) => (
            <Link key={c.href} href={c.href} className={`p-card${'contain' in c && c.contain ? ' p-card--contain' : ''}`} draggable={false}>
              <img src={c.img} alt="" draggable={false} />
              <span className="tag">{t(c.tag)}</span>
              <span className="arrow-dot" aria-hidden="true">
                <IconArrow />
              </span>
              <span className="p-card-title">
                <span>{t(c.em)}</span>
                <span>{t(c.title)}</span>
              </span>
            </Link>
          ))}
        </Carousel>
      </section>

      <section className="section" aria-labelledby="rules-word">
        <div className="section-inner rules-board" style={{ '--word-span': wordSpan } as CSSProperties}>
          <h2 id="rules-word" className="rules-board-word">
            {t(home.rulesWord)}
          </h2>
          {plan1.rules.map((r, i) => (
            <article key={i} className={`rule-card${free === 1 && i === plan1.rules.length - 1 ? ' rule-card--wide' : ''}`}>
              <span className="rule-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={RULE_ICONS[i] ?? RULE_ICONS[0]} />
                </svg>
              </span>
              <h3>{t(r.title)}</h3>
              <p>
                <LinkedText text={t(r.text).replace(/\s*\[\[plan-2\]\]/, '')} />
              </p>
              {r.provisoire && <span className="badge-provisoire">{t(ui.toConfirm)}</span>}
              <Link className="outline-pill" href={/\[\[plan-2\]\]/.test(t(r.text)) ? '/plan-2' : '/plan-1#consignes'}>
                {t(ui.view2d)}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="showcase-title">
        <div className="section-inner">
          <h2 id="showcase-title" className="section-title">
            <Styled text={t(home.showcaseTitle)} />
          </h2>
          <div className="showcase">
            {home.showcase.map((c) => (
              <article key={c.href} className={`s-card${'contain' in c && c.contain ? ' s-card--contain' : ''}`}>
                <img src={c.img} alt="" />
                <div className="s-card-tags">
                  <span className="tag">{t(ui.site)}</span>
                  <span className="tag">{t(c.cta)}</span>
                </div>
                <h3>{t(c.title)}</h3>
                <p>{t(c.text)}</p>
                <Link href={c.href} className="s-card-bar">
                  {t(c.cta)}
                  <span className="arrow-dot">
                    <IconArrow />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="steps-title">
        <div className="section-inner">
          <h2 id="steps-title" className="section-title">
            <Lines text={t(home.quotesTitle)} />
          </h2>
        </div>
        <Steps />
      </section>
    </main>
  );
}

export default function AccueilPage() {
  return (
    <App>
      <Accueil />
    </App>
  );
}
