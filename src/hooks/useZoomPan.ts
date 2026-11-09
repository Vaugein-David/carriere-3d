'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import gsap from 'gsap';

interface View {
  x: number;
  y: number;
  s: number;
}

interface Options {
  width: number;
  height: number;
  reducedMotion: boolean;
  /** Zoom maximum, relatif à l'échelle « plan entier » */
  maxZoom?: number;
  doubleTapZoom: boolean;
  /** Appui court sans déplacement (coordonnées écran) */
  onTap?: (clientX: number, clientY: number) => void;
}

export interface ZoomPanApi {
  recenter: () => void;
  zoomBy: (factor: number) => void;
  panBy: (dx: number, dy: number) => void;
  /** Centre la vue sur un point de l'image avec un zoom relatif au plan entier */
  focusOn: (x: number, y: number, zoom?: number) => void;
  /** Centre la vue sur un point de l'image sans changer le zoom (suivi GPS) */
  panTo: (x: number, y: number) => void;
  /** Convertit des coordonnées écran en coordonnées image */
  toImage: (clientX: number, clientY: number) => { x: number; y: number };
}

const TAP_SLOP = 8;
const DOUBLE_TAP_MS = 320;

/**
 * Zoom / déplacement au doigt, à la souris et au clavier.
 * Le contenu (image + calque SVG) a la taille réelle de l'image et reçoit
 * un unique transform translate/scale : les deux restent parfaitement alignés.
 */
export function useZoomPan(
  viewportRef: RefObject<HTMLDivElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  options: Options,
): ZoomPanApi {
  const opts = useRef(options);
  useLayoutEffect(() => {
    opts.current = options;
  });

  const view = useRef<View>({ x: 0, y: 0, s: 1 });
  const fit = useRef<View>({ x: 0, y: 0, s: 1 });
  const tween = useRef<gsap.core.Tween | null>(null);

  const apply = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const { x, y, s } = view.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  }, [contentRef]);

  const viewportSize = useCallback(() => {
    const vp = viewportRef.current;
    return { vw: vp?.clientWidth ?? 1, vh: vp?.clientHeight ?? 1 };
  }, [viewportRef]);

  const clampScale = useCallback(
    (s: number) => Math.min(Math.max(s, fit.current.s), fit.current.s * (opts.current.maxZoom ?? 6)),
    [],
  );

  const clamp = useCallback(
    (v: View): View => {
      const { vw, vh } = viewportSize();
      const s = clampScale(v.s);
      const cw = opts.current.width * s;
      const ch = opts.current.height * s;
      const x = cw <= vw ? (vw - cw) / 2 : Math.min(0, Math.max(vw - cw, v.x));
      const y = ch <= vh ? (vh - ch) / 2 : Math.min(0, Math.max(vh - ch, v.y));
      return { x, y, s };
    },
    [clampScale, viewportSize],
  );

  const set = useCallback(
    (v: View) => {
      view.current = clamp(v);
      apply();
    },
    [apply, clamp],
  );

  const animateTo = useCallback(
    (target: View, duration = 0.6) => {
      tween.current?.kill();
      const t = clamp(target);
      if (opts.current.reducedMotion) {
        view.current = t;
        apply();
        return;
      }
      tween.current = gsap.to(view.current, { ...t, duration, ease: 'power2.inOut', onUpdate: apply });
    },
    [apply, clamp],
  );

  /** Vue cible pour un zoom autour d'un point du viewport */
  const zoomAround = useCallback(
    (px: number, py: number, nextScale: number): View => {
      const v = view.current;
      const s = clampScale(nextScale);
      const ix = (px - v.x) / v.s;
      const iy = (py - v.y) / v.s;
      return { s, x: px - ix * s, y: py - iy * s };
    },
    [clampScale],
  );

  const computeFit = useCallback(() => {
    const { vw, vh } = viewportSize();
    const { width, height } = opts.current;
    const s = Math.min(vw / width, vh / height);
    fit.current = { s, x: (vw - width * s) / 2, y: (vh - height * s) / 2 };
  }, [viewportSize]);

  // Ajustement initial + suivi des redimensionnements
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    computeFit();
    view.current = { ...fit.current };
    apply();
    const ro = new ResizeObserver(() => {
      const wasFit = Math.abs(view.current.s - fit.current.s) < fit.current.s * 0.01;
      computeFit();
      if (wasFit) view.current = { ...fit.current };
      set(view.current);
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [apply, computeFit, set, viewportRef, options.width, options.height]);

  // Gestes
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let panStart: { x: number; y: number; v: View } | null = null;
    let pinchStart: { dist: number; mx: number; my: number; v: View } | null = null;
    let moved = false;
    let suppressClick = false;
    let lastTap = { t: 0, x: 0, y: 0 };

    const local = (e: { clientX: number; clientY: number }) => {
      const r = vp.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const capture = (id: number) => {
      try {
        vp.setPointerCapture(id);
      } catch {
        /* pointeur déjà relâché */
      }
    };
    const startPinch = () => {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      pinchStart = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        v: { ...view.current },
      };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Boutons posés sur le plan : pas de geste
      if (e.target instanceof Element && e.target.closest('[data-no-pan]')) return;
      tween.current?.kill();
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        moved = false;
        suppressClick = false;
        panStart = { ...p, v: { ...view.current } };
      } else if (pointers.size === 2) {
        moved = true;
        startPinch();
        for (const id of pointers.keys()) capture(id);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size >= 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        if (!a || !b) return;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const s = clampScale((pinchStart.v.s * dist) / pinchStart.dist);
        const ix = (pinchStart.mx - pinchStart.v.x) / pinchStart.v.s;
        const iy = (pinchStart.my - pinchStart.v.y) / pinchStart.v.s;
        set({ s, x: mx - ix * s, y: my - iy * s });
      } else if (pointers.size === 1 && panStart) {
        const dx = p.x - panStart.x;
        const dy = p.y - panStart.y;
        if (!moved && Math.hypot(dx, dy) > TAP_SLOP) {
          moved = true;
          capture(e.pointerId);
        }
        if (moved) set({ s: panStart.v.s, x: panStart.v.x + dx, y: panStart.v.y + dy });
      }
    };

    const onEnd = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.delete(e.pointerId);
      if (pointers.size === 1) {
        // Fin du pincement : on continue le déplacement avec le doigt restant, sans saut
        const [rest] = [...pointers.values()];
        pinchStart = null;
        if (rest) panStart = { ...rest, v: { ...view.current } };
        return;
      }
      if (pointers.size > 0) return;
      pinchStart = null;
      panStart = null;
      if (moved) {
        suppressClick = true;
        return;
      }
      if (e.type === 'pointercancel') return;

      const now = performance.now();
      if (
        opts.current.doubleTapZoom &&
        now - lastTap.t < DOUBLE_TAP_MS &&
        Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30
      ) {
        lastTap.t = 0;
        const zoomed = view.current.s > fit.current.s * 1.05;
        animateTo(zoomed ? fit.current : zoomAround(p.x, p.y, view.current.s * 2.5), 0.45);
        return;
      }
      lastTap = { t: now, x: p.x, y: p.y };
      opts.current.onTap?.(e.clientX, e.clientY);
    };

    // Un glisser ne doit pas déclencher le clic d'une zone
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tween.current?.kill();
      const p = local(e);
      const k = e.deltaMode === 1 ? 0.05 : 0.0022;
      set(zoomAround(p.x, p.y, view.current.s * Math.exp(-e.deltaY * k)));
    };

    // Safari : empêche le zoom natif de la page pendant un pincement sur le plan
    const prevent = (e: Event) => e.preventDefault();

    vp.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    vp.addEventListener('click', onClickCapture, true);
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('gesturestart', prevent);
    return () => {
      vp.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      vp.removeEventListener('click', onClickCapture, true);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', prevent);
    };
  }, [animateTo, clampScale, set, viewportRef, zoomAround]);

  useEffect(() => () => void tween.current?.kill(), []);

  return useMemo<ZoomPanApi>(
    () => ({
      recenter: () => animateTo(fit.current),
      zoomBy: (factor) => {
        const { vw, vh } = viewportSize();
        animateTo(zoomAround(vw / 2, vh / 2, view.current.s * factor), 0.3);
      },
      panBy: (dx, dy) => animateTo({ ...view.current, x: view.current.x + dx, y: view.current.y + dy }, 0.2),
      focusOn: (x, y, zoom = 2.5) => {
        const { vw, vh } = viewportSize();
        const s = clampScale(fit.current.s * zoom);
        animateTo({ s, x: vw / 2 - x * s, y: vh / 2 - y * s }, 0.8);
      },
      panTo: (x, y) => {
        const { vw, vh } = viewportSize();
        const { s } = view.current;
        animateTo({ s, x: vw / 2 - x * s, y: vh / 2 - y * s }, 0.5);
      },
      toImage: (clientX, clientY) => {
        const r = viewportRef.current?.getBoundingClientRect();
        const v = view.current;
        return { x: (clientX - (r?.left ?? 0) - v.x) / v.s, y: (clientY - (r?.top ?? 0) - v.y) / v.s };
      },
    }),
    [animateTo, clampScale, viewportRef, viewportSize, zoomAround],
  );
}
