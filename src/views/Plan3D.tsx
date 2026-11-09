'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, PillLink } from '../components/SiteShell';
import { ProductPicker, RouteChips, RouteSteps, type Leg } from '../components/PageSections';
import { QuarryScene, VIEW_OVERVIEW, VIEW_TOP, areaCenter, viewOn, type CameraView } from '../components/QuarryScene';
import { plan1 } from '../data/plan-1';
import { plan3d } from '../data/plan-3d';
import { hotspotCenter, type Point } from '../lib/geometry';
import { GpsBadge, IconLocate } from '../components/Gps';
import { usePlanPosition } from '../hooks/usePlanPosition';
import { ui, useT } from '../i18n';
import { withBase } from '../lib/base';

const data = plan1;

/** Point du plan pour ?focus=<id> : zone cliquable, marqueur ou étiquette des annotations */
function focusPoint(id: string): Point | null {
  const h = data.hotspots.find((x) => x.id === id);
  if (h) return hotspotCenter(h);
  const m = data.markers.find((x) => x.id === id);
  if (m) return [m.x, m.y];
  const a = data.annotations?.areas.find((x) => x.id === id);
  return a ? areaCenter(a) : null;
}

function areaPoint(id: string): Point | null {
  const a = data.annotations?.areas.find((x) => x.id === id);
  return a ? areaCenter(a) : null;
}

function Plan3D() {
  const t = useT();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const allProducts = useMemo(() => data.products?.flatMap((g) => g.products) ?? [], []);

  const [routeId, setRouteId] = useState(data.defaultRoute ?? '');
  const [productId, setProductId] = useState<string | null>(() => {
    const id = params.get('produit');
    return id && allProducts.some((p) => p.id === id) ? id : null;
  });
  const [leg, setLeg] = useState<Leg>('aller');
  const [labels, setLabels] = useState(true);
  const [view, setView] = useState<CameraView>(() => {
    const p = productId ? areaPoint(allProducts.find((x) => x.id === productId)!.area) : focusPoint(params.get('focus') ?? '');
    return p ? viewOn(data, p) : VIEW_OVERVIEW;
  });
  const [mode, setMode] = useState<'overview' | 'top' | 'focus'>(view === VIEW_OVERVIEW ? 'overview' : 'focus');

  // Localisation : la caméra suit le point bleu jusqu'à ce que l'on tourne la vue à la main
  const [gpsOn, setGpsOn] = useState(false);
  const gps = usePlanPosition(data, gpsOn);
  const [follow, setFollow] = useState(false);
  const stopFollow = useCallback(() => setFollow(false), []);
  useEffect(() => setFollow(gpsOn), [gpsOn]);
  useEffect(() => {
    if (!follow || !gps.fix || gps.fix.outside) return;
    setView(viewOn(data, [gps.fix.x, gps.fix.y]));
    setMode('focus');
  }, [follow, gps.fix]);
  const onLocate = () => {
    if (gpsOn && !follow) setFollow(true);
    else setGpsOn((v) => !v);
  };
  const locateLabel = !gpsOn ? t(ui.locate) : follow ? t(ui.locateStop) : t(ui.locateFollow);

  const product = allProducts.find((p) => p.id === productId) ?? null;
  const route = product ? product[leg] : data.routes.find((r) => r.id === routeId);

  useEffect(() => {
    document.title = `${t(plan3d.title).replace(/\*/g, '')} — ${t(ui.site)}`;
  }, [t]);

  const go = (v: CameraView, m: typeof mode) => {
    setView(v);
    setMode(m);
  };

  const pickProduct = (id: string) => {
    const p = allProducts.find((x) => x.id === id);
    if (!p) return;
    setProductId(id);
    setLeg('aller');
    const at = areaPoint(p.area);
    if (at) go(viewOn(data, at), 'focus');
  };

  const pickRoute = (id: string) => {
    setProductId(null);
    if (!product && id === routeId) {
      // Toucher à nouveau l'itinéraire affiché le masque
      setRouteId('');
      return;
    }
    setRouteId(id);
    go({ ...VIEW_OVERVIEW }, 'overview');
  };

  const [before, after] = t(plan3d.title).split(/\*(.+?)\*/);

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">{t(plan3d.eyebrow)}</p>
        <h1>
          {before}
          <em>{after}</em>
          <span className="title-pill" style={{ backgroundImage: `url(${withBase('/renders/silos.webp')})` }} aria-hidden="true" />
        </h1>
        <p className="lead">{t(plan3d.description)}</p>
        <div className="header-actions">
          <PillLink href={product ? `/plan-1?produit=${product.id}` : '/plan-1'}>{t(ui.view2d)}</PillLink>
        </div>
      </header>

      <main className="page-main">
        <RouteChips routes={data.routes} activeId={product ? '' : routeId} onChange={pickRoute} />
        {data.products && (
          <ProductPicker groups={data.products} product={product} leg={leg} onProduct={pickProduct} onLeg={setLeg} />
        )}

        <div className="scene-card">
          <div className="scene-toolbar">
            <button type="button" className="scene-btn" aria-pressed={mode === 'overview'} onClick={() => go({ ...VIEW_OVERVIEW }, 'overview')}>
              {t(plan3d.overview)}
            </button>
            <button type="button" className="scene-btn" aria-pressed={mode === 'top'} onClick={() => go({ ...VIEW_TOP }, 'top')}>
              {t(plan3d.top)}
            </button>
            <button type="button" className="scene-btn" aria-pressed={labels} onClick={() => setLabels((v) => !v)}>
              {t(plan3d.labels)}
            </button>
            <button
              type="button"
              className={`scene-btn scene-btn--locate${gpsOn ? ' is-on' : ''}${gpsOn && follow ? ' is-following' : ''}`}
              aria-pressed={gpsOn}
              onClick={onLocate}
            >
              <IconLocate />
              {locateLabel}
            </button>
          </div>
          <QuarryScene
            data={data}
            url={plan3d.model}
            view={view}
            routes={route ? [route] : []}
            targetArea={product?.area ?? null}
            showLabels={labels}
            loadingLabel={t(plan3d.loading)}
            onPickProduct={pickProduct}
            position={gps.fix}
            onUserMove={stopFollow}
          />
          <GpsBadge status={gps.status} fix={gps.fix} />
          <p className="scene-hint">{t(plan3d.hint)}</p>
        </div>

        {data.legend && (
          <ul className="legend" aria-label={t(ui.legend)}>
            {data.legend.map((l) => (
              <li key={l.color}>
                <span className="legend-swatch" style={{ background: l.color }} aria-hidden="true" />
                {t(l.label)}
              </li>
            ))}
          </ul>
        )}
        <p className="viewer-tip">{t(plan3d.pickHint)}</p>

        <div className="scene-below">
          <RouteSteps route={route} current={-1} />
          <section className="card">
            <h2>{t(plan3d.aboutTitle)}</h2>
            <p className="rule-text">{t(plan3d.about)}</p>
            <p className="image-credit">{t(ui.aerial)} : © IGN – BD ORTHO®</p>
          </section>
        </div>
      </main>
    </>
  );
}

export default function Plan3DPage() {
  return (
    <App>
      <Plan3D />
    </App>
  );
}
