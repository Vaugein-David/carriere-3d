'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { PlanData, Route } from '../types';
import { drawUnit, hotspotCenter, type Point } from '../lib/geometry';
import { copyText } from '../lib/clipboard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useZoomPan } from '../hooks/useZoomPan';
import { Hotspot } from './Hotspot';
import { Markers } from './Markers';
import { RouteLayer } from './RouteLayer';
import { AnnotationLayer } from './AnnotationLayer';
import { EditOverlay, EditPanel, editTap, initialEditState, type EditState } from './EditTools';
import { IconMinus, IconPlus, IconRecenter } from './Icons';
import { GpsBadge, IconLocate, PositionMarker } from './Gps';
import type { PlanFix } from '../lib/geo';
import { useGeolocation, type GpsStatus } from '../hooks/usePlanPosition';
import { ui, useT } from '../i18n';

gsap.registerPlugin(useGSAP);

export interface PlanViewerHandle {
  /** Zoome sur une zone ou un marqueur */
  focusItem: (id: string) => void;
  /** Centre et fait clignoter un marqueur ; renvoie false s'il n'existe pas sur cette page */
  flashMarker: (id: string) => boolean;
}

interface Props {
  data: PlanData;
  /** Itinéraires affichables (ceux du plan, plus ceux du produit choisi) */
  routes: Route[];
  activeRouteId: string;
  /** Zone des annotations à mettre en évidence */
  highlightArea?: string | null;
  selectedId: string | null;
  editMode: boolean;
  onSelect: (id: string) => void;
  onStepChange: (index: number) => void;
  /** Appelé à la fin de l'animation d'intro */
  onReady?: () => void;
  /** Position GPS de l'appareil sur le plan (bouton « Me localiser » affiché si onLocate est fourni) */
  position?: PlanFix | null;
  gpsStatus?: GpsStatus;
  /** Active ou coupe la localisation */
  onLocate?: () => void;
  ref?: Ref<PlanViewerHandle>;
}

export function PlanViewer({
  data,
  routes,
  activeRouteId,
  highlightArea,
  selectedId,
  editMode,
  onSelect,
  onStepChange,
  onReady,
  position = null,
  gpsStatus = 'off',
  onLocate,
  ref,
}: Props) {
  const { width, height } = data;
  const u = drawUnit(width, height);
  const reducedMotion = useReducedMotion();
  const t = useT();

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [edit, setEdit] = useState<EditState>(initialEditState);

  // Outil « Calage GPS » du mode édition : chaque appui associe la position GPS du moment au point touché
  const calib = useGeolocation(editMode && edit.mode === 'gps');
  const calibReading = useRef(calib.reading);
  calibReading.current = calib.reading;

  const onTap = useCallback(
    (clientX: number, clientY: number) => {
      if (!editMode) return;
      const p = zoom.current?.toImage(clientX, clientY);
      if (!p) return;
      // Un appui hors de l'image est ramené sur son bord
      const pt: Point = [
        Math.round(Math.min(Math.max(p.x, 0), width)),
        Math.round(Math.min(Math.max(p.y, 0), height)),
      ];
      setEdit((s) => editTap(s, pt, calibReading.current));
      void copyText(`${pt[0]}, ${pt[1]}`);
    },
    [editMode, width, height],
  );

  const api = useZoomPan(viewportRef, contentRef, {
    width,
    height,
    reducedMotion,
    doubleTapZoom: !editMode,
    onTap,
  });
  const zoom = useRef(api);
  useLayoutEffect(() => {
    zoom.current = api;
  });

  // Image déjà en cache : l'événement load a pu passer avant l'hydratation
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) handleLoad();
  }, []);

  function handleLoad() {
    const img = imgRef.current;
    if (img) setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setLoaded(true);
  }

  // Intro : fondu de l'image, apparition échelonnée des zones et marqueurs, puis tracé de l'itinéraire
  useGSAP(
    () => {
      // Une seule intro, même si l'on change de fond ensuite
      if (!loaded || introDone) return;
      const done = () => {
        setIntroDone(true);
        onReady?.();
      };
      if (reducedMotion) {
        gsap.set('.viewer-base', { autoAlpha: 1 });
        done();
        return;
      }
      gsap
        .timeline({ onComplete: done })
        .fromTo('.viewer-base', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' })
        .from(
          '.hotspot-anim',
          {
            autoAlpha: 0,
            scale: 0.4,
            transformOrigin: '50% 50%',
            duration: 0.45,
            ease: 'back.out(2)',
            stagger: 0.06,
          },
          '-=0.2',
        )
        .from(
          '.marker-anim',
          { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.5)', stagger: 0.1 },
          '-=0.2',
        );
    },
    { dependencies: [loaded], scope: viewportRef },
  );

  const findPoint = useCallback(
    (id: string): Point | null => {
      const h = data.hotspots.find((x) => x.id === id);
      if (h) return hotspotCenter(h);
      const m = data.markers.find((x) => x.id === id);
      return m ? [m.x, m.y] : null;
    },
    [data],
  );

  useImperativeHandle(
    ref,
    () => ({
      focusItem: (id) => {
        const p = findPoint(id);
        if (!p) return;
        viewportRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
        zoom.current.focusOn(p[0], p[1], 2.5);
      },
      flashMarker: (id) => {
        const m = data.markers.find((x) => x.id === id);
        const el = viewportRef.current?.querySelector<SVGGElement>(`[data-marker="${id}"]`);
        if (!m || !el) return false;
        viewportRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
        zoom.current.focusOn(m.x, m.y, 3);
        const flash = el.querySelector('.marker-flash');
        const core = el.querySelector('.marker-core');
        gsap.killTweensOf([flash, core]);
        if (reducedMotion) {
          gsap.set(flash, { autoAlpha: 1 });
          gsap.set(flash, { autoAlpha: 0, delay: 5 });
          return true;
        }
        gsap
          .timeline()
          .fromTo(
            flash,
            { autoAlpha: 1, scale: 0.6, transformOrigin: '50% 50%' },
            { autoAlpha: 0, scale: 1.4, duration: 0.6, repeat: 7, ease: 'power1.out' },
          )
          .fromTo(
            core,
            { scale: 1, transformOrigin: '50% 50%' },
            { scale: 1.5, duration: 0.3, yoyo: true, repeat: 15, ease: 'sine.inOut' },
            0,
          );
        return true;
      },
    }),
    [data.markers, findPoint, reducedMotion],
  );

  // Suivi GPS : la vue suit le point bleu jusqu'à ce que l'on déplace le plan à la main
  const [follow, setFollow] = useState(false);
  const centered = useRef(false);
  const locating = gpsStatus !== 'off';
  useEffect(() => {
    setFollow(locating);
    centered.current = false;
  }, [locating]);
  useEffect(() => {
    if (!follow || !position || position.outside) return;
    if (!centered.current) {
      centered.current = true;
      viewportRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      zoom.current.focusOn(position.x, position.y, 3);
    } else {
      zoom.current.panTo(position.x, position.y);
    }
  }, [follow, position, reducedMotion]);
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !locating) return;
    const stop = (e: Event) => {
      if (!(e.target as Element).closest('[data-no-pan]')) setFollow(false);
    };
    vp.addEventListener('pointerdown', stop);
    vp.addEventListener('wheel', stop, { passive: true });
    return () => {
      vp.removeEventListener('pointerdown', stop);
      vp.removeEventListener('wheel', stop);
    };
  }, [locating]);

  // 1er appui : localiser ; si l'on a déplacé le plan : reprendre le suivi ; sinon : arrêter
  const onLocateClick = () => {
    if (!locating || follow) {
      onLocate?.();
      return;
    }
    setFollow(true);
    centered.current = false;
  };
  const locateLabel = !locating ? t(ui.locate) : follow ? t(ui.locateStop) : t(ui.locateFollow);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = 80;
    const actions: Record<string, () => void> = {
      '+': () => api.zoomBy(1.5),
      '=': () => api.zoomBy(1.5),
      '-': () => api.zoomBy(1 / 1.5),
      '0': () => api.recenter(),
      ArrowLeft: () => api.panBy(step, 0),
      ArrowRight: () => api.panBy(-step, 0),
      ArrowUp: () => api.panBy(0, step),
      ArrowDown: () => api.panBy(0, -step),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="viewer-wrap">
      <div
        ref={viewportRef}
        className={`viewer${loaded ? ' is-loaded' : ''}${introDone ? ' is-live' : ''}${editMode ? ' is-editing' : ''}`}
        style={{ '--ratio': height / width } as CSSProperties}
        tabIndex={0}
        role="group"
        aria-label={`${t(data.imageAlt)}. ${t(ui.viewerHelp)}`}
        onKeyDown={onKeyDown}
      >
        <div ref={contentRef} className="viewer-content" style={{ width, height }}>
          <img
            ref={imgRef}
            className="viewer-img viewer-base"
            src={data.image}
            width={width}
            height={height}
            alt=""
            decoding="async"
            fetchPriority="high"
            draggable={false}
            onLoad={handleLoad}
          />
          <svg className="viewer-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {data.annotations && <AnnotationLayer annotations={data.annotations} highlight={highlightArea} />}
            <g className="hotspots">
              {data.hotspots.map((h, i) => (
                <Hotspot
                  key={h.id}
                  hotspot={h}
                  u={u}
                  index={i}
                  selected={selectedId === h.id}
                  interactive={!editMode}
                  onSelect={(x) => onSelect(x.id)}
                />
              ))}
            </g>
            <RouteLayer
              routes={routes}
              activeId={activeRouteId}
              ready={introDone}
              u={u}
              reducedMotion={reducedMotion}
              onStepChange={onStepChange}
            />
            <Markers markers={data.markers} width={width} u={u} interactive={!editMode} onSelect={(m) => onSelect(m.id)} />
            {position && !position.outside && <PositionMarker fix={position} u={u} />}
            {editMode && <EditOverlay state={edit} u={u} />}
          </svg>
        </div>

        {!loaded && <p className="viewer-loading">{t(ui.loading)}</p>}


        {editMode && (
          <p className="viewer-hud" aria-hidden="true">
            {edit.last ? `x ${edit.last[0]} · y ${edit.last[1]}` : 'Mode édition'}
          </p>
        )}

        <GpsBadge status={gpsStatus} fix={position} />

        <div className="viewer-controls" data-no-pan>
          {onLocate && (
            <button
              type="button"
              className={`map-btn map-btn--locate${locating ? ' is-on' : ''}${locating && follow ? ' is-following' : ''}`}
              onClick={onLocateClick}
              aria-label={locateLabel}
              aria-pressed={locating}
              title={locateLabel}
            >
              <IconLocate />
            </button>
          )}
          <button type="button" className="map-btn" onClick={() => api.zoomBy(1.6)} aria-label={t(ui.zoomIn)}>
            <IconPlus />
          </button>
          <button type="button" className="map-btn" onClick={() => api.zoomBy(1 / 1.6)} aria-label={t(ui.zoomOut)}>
            <IconMinus />
          </button>
          <button type="button" className="map-btn" onClick={() => api.recenter()} aria-label={t(ui.recenter)}>
            <IconRecenter />
          </button>
        </div>
      </div>

      {editMode && (
        <EditPanel state={edit} setState={setEdit} declared={{ width, height }} natural={natural} gps={calib} />
      )}
    </div>
  );
}
