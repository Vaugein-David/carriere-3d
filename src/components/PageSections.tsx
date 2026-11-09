'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Hotspot, Product, ProductGroup, Route, Rule } from '../types';
import { ui, useT } from '../i18n';
import { IconChevron } from './Icons';
import { LinkedText } from './PageLink';

export function RouteChips({
  routes,
  activeId,
  onChange,
}: {
  routes: Route[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const t = useT();
  if (routes.length < 2) return null;
  return (
    <div className="chips" role="group" aria-label={t(ui.chooseRoute)}>
      {routes.map((r) => (
        <button
          key={r.id}
          type="button"
          className="chip"
          aria-pressed={r.id === activeId}
          onClick={() => onChange(r.id)}
          style={{ '--chip-color': r.color } as CSSProperties}
        >
          <span className="chip-dot" aria-hidden="true" />
          {t(r.label)}
        </button>
      ))}
    </div>
  );
}

export type Leg = 'aller' | 'retour';

/** Mots d'un texte : minuscules, sans accents, coupés sur tout ce qui n'est ni lettre ni chiffre (« 0-4 » donne 0 et 4) */
const words = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Chaque mot cherché doit commencer un mot du produit : « 0 4 » trouve 0-4 TLV mais pas 20-40 SV */
function matches(query: string[], text: string[]) {
  return query.every((q) => text.some((w) => w.startsWith(q)));
}

/** Menu dépliant : choix d'un produit, puis du sens (aller ou retour) */
export function ProductPicker({
  groups,
  product,
  leg,
  onProduct,
  onLeg,
}: {
  groups: ProductGroup[];
  product: Product | null;
  leg: Leg;
  onProduct: (id: string) => void;
  onLeg: (leg: Leg) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Résultats : on cherche dans le code du produit, sa précision et le nom de son groupe
  const results = useMemo(() => {
    const q = words(query);
    return groups
      .map((g) => ({
        label: g.label,
        products: g.products.filter((p) => matches(q, words(`${p.label} ${p.hint ? t(p.hint) : ''} ${t(g.label)}`))),
      }))
      .filter((g) => g.products.length > 0);
  }, [groups, query, t]);

  // À la souris, le champ prend le focus à l'ouverture ; au doigt, on évite d'ouvrir le clavier d'office
  useEffect(() => {
    if (open && window.matchMedia('(pointer: fine)').matches) searchRef.current?.focus({ preventScroll: true });
    if (!open) setQuery('');
  }, [open]);

  const choose = (id: string) => {
    onProduct(id);
    setOpen(false);
    // Le menu se referme : on remonte au choix aller / retour et au plan
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: 'start' }));
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // Entrée : de préférence un produit dont le code lui-même correspond (pas seulement sa précision)
    const found = results.flatMap((g) => g.products);
    const best = found.find((p) => matches(words(query), words(p.label))) ?? found[0];
    if (e.key === 'Enter' && best) {
      e.preventDefault();
      choose(best.id);
    } else if (e.key === 'Escape') {
      if (query) setQuery('');
      else setOpen(false);
    }
  };

  return (
    <section ref={rootRef} className={`product-picker${product ? ' is-active' : ''}`}>
      <button
        type="button"
        className="product-toggle"
        aria-expanded={open}
        aria-controls="product-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="product-toggle-text">
          <span className="product-toggle-label">{t(ui.productRoute)}</span>
          <span className="product-toggle-value">
            {product ? product.label : t(ui.chooseProduct)}
            {product?.hint && <small> · {t(product.hint)}</small>}
          </span>
        </span>
        <IconChevron />
      </button>

      <div id="product-menu" className="product-menu" hidden={!open}>
        <div className="product-search">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={t(ui.searchProduct)}
            aria-label={t(ui.searchProduct)}
            aria-controls="product-results"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          {query && (
            <button type="button" className="product-search-clear" onClick={() => (setQuery(''), searchRef.current?.focus())} aria-label={t(ui.clearSearch)}>
              ×
            </button>
          )}
        </div>
        <div id="product-results" aria-live="polite">
        {results.length === 0 && <p className="product-empty">{t(ui.noProduct)}</p>}
        {results.map((g, i) => (
          <div key={i} className="product-group">
            <h3>{t(g.label)}</h3>
            <ul className="product-grid">
              {g.products.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="product-btn"
                    aria-pressed={p.id === product?.id}
                    onClick={() => choose(p.id)}
                  >
                    {p.label}
                    {p.hint && <small>{t(p.hint)}</small>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        </div>
      </div>

      {product && !open && (
        <div className="leg-switch" role="group" aria-label={t(ui.legChoice)}>
          {(['aller', 'retour'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className="chip"
              aria-pressed={leg === l}
              onClick={() => onLeg(l)}
              style={{ '--chip-color': product[l].color } as CSSProperties}
            >
              <span className="chip-dot" aria-hidden="true" />
              {t(ui[l])}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function RouteSteps({ route, current }: { route: Route | undefined; current: number }) {
  const t = useT();
  if (!route || route.steps.length === 0) return null;
  return (
    <section className="card" aria-labelledby="steps-title">
      <h2 id="steps-title">
        <span className="title-swatch" style={{ background: route.color }} aria-hidden="true" />
        {t(route.label)}
      </h2>
      <ol className="steps">
        {route.steps.map((s, i) => (
          <li
            key={`${route.id}-${i}`}
            className={`step${i === current ? ' is-current' : ''}${i < current ? ' is-past' : ''}`}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="step-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="step-text">
              <LinkedText text={t(s)} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ZoneList({ hotspots, onSelect }: { hotspots: Hotspot[]; onSelect: (id: string) => void }) {
  const t = useT();
  if (hotspots.length === 0) return null;
  return (
    <section className="card" aria-labelledby="zones-title">
      <h2 id="zones-title">{t(ui.zones)}</h2>
      <ul className="zone-list">
        {hotspots.map((h) => (
          <li key={h.id}>
            <button type="button" className="zone-btn" onClick={() => onSelect(h.id)}>
              <span className="zone-dot" style={{ background: h.color }} aria-hidden="true" />
              {t(h.label)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SafetyRules({ rules }: { rules: Rule[] }) {
  const t = useT();
  if (rules.length === 0) return null;
  return (
    <section className="card card--rules" aria-labelledby="rules-title">
      <h2 id="rules-title">{t(ui.rules)}</h2>
      <ul className="rules">
        {rules.map((r, i) => (
          <li key={i} className="rule">
            <strong className="rule-title">{t(r.title)}</strong>
            <span className="rule-text">
              <LinkedText text={t(r.text)} />
            </span>
            {r.provisoire && <span className="badge-provisoire">{t(ui.toConfirm)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
