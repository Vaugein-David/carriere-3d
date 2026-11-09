'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import type { Route } from '../types';
import { inkOn } from '../lib/color';

interface Props {
  routes: Route[];
  activeId: string;
  /** Faux tant que l'animation d'intro n'est pas terminée */
  ready: boolean;
  u: number;
  reducedMotion: boolean;
  /** Index de l'étape courante (-1 = aucune) */
  onStepChange: (index: number) => void;
}

const CHEVRON_SPACING = 46; // en unités de dessin


export function RouteLayer({ routes, activeId, ready, u, reducedMotion, onStepChange }: Props) {
  const rootRef = useRef<SVGGElement>(null);
  const [lengths, setLengths] = useState<Record<string, number>>({});
  const onStep = useRef(onStepChange);
  useLayoutEffect(() => {
    onStep.current = onStepChange;
  });

  // Mesure des tracés (nombre de flèches, durées)
  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    rootRef.current?.querySelectorAll<SVGPathElement>('.route-line').forEach((p) => {
      next[p.dataset.route ?? ''] = p.getTotalLength();
    });
    setLengths(next);
  }, [routes]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !ready) return;
    const anims: (gsap.core.Animation | undefined)[] = [];
    let lastStep = -2;
    const setStep = (i: number) => {
      if (i !== lastStep) {
        lastStep = i;
        onStep.current(i);
      }
    };

    for (const route of routes) {
      const g = root.querySelector<SVGGElement>(`[data-route-group="${route.id}"]`);
      if (!g) continue;
      if (route.id !== activeId) {
        gsap.killTweensOf(g);
        anims.push(gsap.to(g, { autoAlpha: 0, duration: reducedMotion ? 0 : 0.3 }));
        continue;
      }

      const L = lengths[route.id] ?? 0;
      if (!L) continue;
      const strokes = g.querySelectorAll<SVGPathElement>('.route-casing, .route-line');
      const line = g.querySelector<SVGPathElement>('.route-line')!;
      const vehicle = g.querySelector<SVGGElement>('.route-vehicle')!;
      const chevrons = [...g.querySelectorAll<SVGPathElement>('.route-chevron')];
      const arrowsGroup = g.querySelector<SVGGElement>('.route-arrows')!;
      const spacing = L / Math.max(chevrons.length, 1);
      const n = route.steps.length;

      const place = (el: SVGElement, at: number) => {
        const l = Math.min(Math.max(at, 0), L);
        const a = line.getPointAtLength(l);
        const b = line.getPointAtLength(Math.min(l + 1, L));
        const c = l + 1 > L ? line.getPointAtLength(l - 1) : a;
        const angle =
          l + 1 > L
            ? Math.atan2(a.y - c.y, a.x - c.x)
            : Math.atan2(b.y - a.y, b.x - a.x);
        el.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${(angle * 180) / Math.PI})`);
      };
      const placeChevrons = (offset: number) => {
        chevrons.forEach((c, i) => place(c, (i * spacing + offset + spacing / 2) % L));
      };

      gsap.killTweensOf([g, ...strokes, vehicle, arrowsGroup]);
      gsap.set(strokes, { strokeDasharray: L });

      if (reducedMotion) {
        gsap.set(g, { autoAlpha: 1 });
        gsap.set(strokes, { strokeDashoffset: 0 });
        gsap.set(vehicle, { autoAlpha: 0 });
        gsap.set(arrowsGroup, { autoAlpha: 1 });
        placeChevrons(0);
        setStep(-1);
        continue;
      }

      const duration = gsap.utils.clamp(2.2, 7, L / (u * 160));
      const stepAt = route.stepAt;
      const travel = (p: number) => {
        place(vehicle, p * L);
        setStep(stepAt ? stepAt.findLastIndex((s) => s <= p) : Math.min(n - 1, Math.floor(p * n)));
      };

      // 1. Le tracé se dessine derrière le véhicule
      const draw = { p: 0 };
      const tl = gsap.timeline();
      tl.set(strokes, { strokeDashoffset: L })
        .set(arrowsGroup, { autoAlpha: 0 })
        .set(vehicle, { autoAlpha: 1 })
        .to(g, { autoAlpha: 1, duration: 0.25 }, 0.15)
        .to(
          draw,
          {
            p: 1,
            duration,
            ease: 'power1.inOut',
            onUpdate: () => {
              gsap.set(strokes, { strokeDashoffset: L * (1 - draw.p) });
              travel(draw.p);
            },
          },
          0.15,
        )
        // 2. Les flèches de sens apparaissent
        .to(arrowsGroup, { autoAlpha: 1, duration: 0.4 });
      anims.push(tl);

      // 3. Boucle : flèches qui défilent + véhicule qui parcourt l'itinéraire
      tl.call(() => {
        const flow = { o: 0 };
        placeChevrons(0);
        anims.push(
          gsap.to(flow, {
            o: spacing,
            duration: spacing / (u * 55),
            ease: 'none',
            repeat: -1,
            onUpdate: () => placeChevrons(flow.o),
          }),
        );
        const loop = { p: 0 };
        anims.push(
          gsap.to(loop, {
            p: 1,
            duration: duration * 1.6,
            ease: 'none',
            repeat: -1,
            repeatDelay: 0.8,
            onUpdate: () => travel(loop.p),
          }),
        );
      });
    }

    return () => anims.forEach((a) => a?.kill());
  }, [routes, activeId, ready, lengths, u, reducedMotion]);

  return (
    <g ref={rootRef} className="routes">
      {routes.map((route) => {
        const L = lengths[route.id] ?? 0;
        const count = L ? Math.max(3, Math.floor(L / (CHEVRON_SPACING * u))) : 0;
        const a = 6 * u;
        return (
          <g
            key={route.id}
            className="route"
            data-route-group={route.id}
            style={{ opacity: 0, visibility: 'hidden', '--chevron': inkOn(route.color) } as CSSProperties}
            aria-hidden="true"
          >
            <path className="route-casing" d={route.d} strokeWidth={11 * u} />
            <path className="route-line" data-route={route.id} d={route.d} stroke={route.color} strokeWidth={6 * u} />
            <g className="route-arrows">
              {Array.from({ length: count }, (_, i) => (
                <path
                  key={i}
                  className="route-chevron"
                  d={`M ${-a} ${-a} L ${a * 0.6} 0 L ${-a} ${a}`}
                  strokeWidth={2.6 * u}
                />
              ))}
            </g>
            <g className="route-vehicle" style={{ opacity: 0, visibility: 'hidden' }}>
              <path
                d={`M ${14 * u} 0 L ${-9 * u} ${-11 * u} L ${-4 * u} 0 L ${-9 * u} ${11 * u} Z`}
                fill={route.color}
                stroke="#000"
                strokeWidth={2.5 * u}
                strokeLinejoin="round"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
