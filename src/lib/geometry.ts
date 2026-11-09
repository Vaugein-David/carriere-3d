import type { Hotspot } from '../types';

export type Point = [number, number];

/** Unité de dessin proportionnelle à la taille de l'image (1 pour une diagonale de 1000 px). */
export const drawUnit = (width: number, height: number) => Math.hypot(width, height) / 1000;

export function pairs(coords: number[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i + 1 < coords.length; i += 2) out.push([coords[i]!, coords[i + 1]!]);
  return out;
}

export const pointsAttr = (pts: Point[]) => pts.map(([x, y]) => `${x},${y}`).join(' ');

/** Centre approximatif d'une zone (centre du cercle ou de la boîte englobante du polygone). */
export function hotspotCenter(h: Hotspot): Point {
  if (h.shape === 'circle') return [h.coords[0], h.coords[1]];
  const pts = pairs(h.coords);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

const r = (n: number) => Math.round(n);

/** Path SVG en segments droits. */
export function straightPath(pts: Point[]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${r(x)} ${r(y)}`).join(' ');
}

/** Path SVG lissé (Catmull-Rom converti en courbes de Bézier cubiques). */
export function smoothPath(pts: Point[]): string {
  if (pts.length < 3) return straightPath(pts);
  let d = `M ${r(pts[0]![0])} ${r(pts[0]![1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}

const dist = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Longueur d'une ligne brisée. */
export function polylineLength(pts: Point[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1]!, pts[i]!);
  return l;
}

/** Projection d'un point sur une ligne brisée : segment, point projeté et distance depuis le début. */
export function projectOnPolyline(pts: Point[], p: Point) {
  let best = { i: 0, at: pts[0]!, along: 0, d: Infinity };
  let run = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const len = dist(a, b);
    const t = len ? Math.min(1, Math.max(0, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / len ** 2)) : 0;
    const at: Point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    const d = dist(at, p);
    if (d < best.d) best = { i, at, along: run + t * len, d };
    run += len;
  }
  return best;
}

/** Portion d'une ligne brisée comprise entre les projections de `from` et `to` (bouts par défaut). */
export function slicePolyline(pts: Point[], from?: Point, to?: Point): Point[] {
  const a = from ? projectOnPolyline(pts, from) : null;
  const b = to ? projectOnPolyline(pts, to) : null;
  const start = a ? a.i + 1 : 0;
  const end = b ? b.i + 1 : pts.length;
  return [...(a ? [a.at] : []), ...pts.slice(start, end), ...(b ? [b.at] : [])];
}

/** Met bout à bout des lignes brisées (sans doubler les points de jonction). */
export function joinPolylines(...parts: Point[][]): Point[] {
  const out: Point[] = [];
  for (const part of parts) {
    for (const p of part) {
      const last = out[out.length - 1];
      if (!last || dist(last, p) > 2) out.push(p);
    }
  }
  return out;
}
