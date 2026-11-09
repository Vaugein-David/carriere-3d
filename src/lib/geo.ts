import type { Point } from './geometry';

/** Point de calage : une position GPS relevée sur place et le même endroit sur le plan (repère du plan) */
export interface GpsControlPoint {
  lat: number;
  lon: number;
  x: number;
  y: number;
}

/** Position de l'appareil ramenée sur le plan */
export interface PlanFix {
  x: number;
  y: number;
  /** Rayon d'incertitude, en unités du plan */
  accuracy: number;
  /** Précision annoncée par le GPS, en mètres */
  accuracyM: number;
  /** Direction de déplacement à l'écran, en degrés (0 = vers le haut du plan), si l'on roule */
  heading: number | null;
  /** Hors de l'emprise du plan (avec une marge) */
  outside: boolean;
}

export interface GeoTransform {
  toPlan: (lat: number, lon: number) => Point;
  /** Cap GPS (degrés depuis le nord, sens horaire) → angle à l'écran (0 = vers le haut) */
  headingToPlan: (deg: number) => number;
  unitsPerMeter: number;
  /** Écart moyen entre les points de calage et le calage obtenu, en mètres */
  rmsMeters: number;
}

const R = 6371008.8;
const RAD = Math.PI / 180;

/**
 * Calage affine (rotation, échelle, cisaillement, translation) par moindres carrés
 * entre des coordonnées métriques locales (projection équirectangulaire, exacte à
 * l'échelle d'une carrière) et le repère du plan. Il faut au moins 3 points non alignés.
 */
export function makeGeoTransform(points: GpsControlPoint[]): GeoTransform | null {
  if (points.length < 3) return null;
  const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon0 = points.reduce((s, p) => s + p.lon, 0) / points.length;
  const k = Math.cos(lat0 * RAD);
  const local = (lat: number, lon: number): Point => [(lon - lon0) * RAD * R * k, (lat - lat0) * RAD * R];

  // Équations normales : [E N 1] · (a b c) = x et (d e f) = y
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const vx = [0, 0, 0];
  const vy = [0, 0, 0];
  for (const p of points) {
    const [E, N] = local(p.lat, p.lon);
    const row = [E, N, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) m[i]![j]! += row[i]! * row[j]!;
      vx[i]! += row[i]! * p.x;
      vy[i]! += row[i]! * p.y;
    }
  }
  const sx = solve3(m, vx);
  const sy = solve3(m, vy);
  if (!sx || !sy) return null;
  const [a, b, c] = sx;
  const [d, e, f] = sy;
  const det = a * e - b * d;
  if (Math.abs(det) < 1e-12) return null;

  const unitsPerMeter = Math.sqrt(Math.abs(det));
  const toPlan = (lat: number, lon: number): Point => {
    const [E, N] = local(lat, lon);
    return [a * E + b * N + c, d * E + e * N + f];
  };
  const headingToPlan = (deg: number) => {
    const h = deg * RAD;
    const dx = a * Math.sin(h) + b * Math.cos(h);
    const dy = d * Math.sin(h) + e * Math.cos(h);
    return Math.atan2(dx, -dy) / RAD;
  };
  const rms = Math.sqrt(
    points.reduce((s, p) => {
      const [x, y] = toPlan(p.lat, p.lon);
      return s + (x - p.x) ** 2 + (y - p.y) ** 2;
    }, 0) / points.length,
  );
  return { toPlan, headingToPlan, unitsPerMeter, rmsMeters: rms / unitsPerMeter };
}

/** Résout un système 3 × 3 (élimination de Gauss avec pivot) */
function solve3(m: number[][], v: number[]): [number, number, number] | null {
  const a = m.map((row, i) => [...row, v[i]!]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r]![col]!) > Math.abs(a[piv]![col]!)) piv = r;
    if (Math.abs(a[piv]![col]!) < 1e-9) return null;
    [a[col], a[piv]] = [a[piv]!, a[col]!];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r]![col]! / a[col]![col]!;
      for (let k = col; k < 4; k++) a[r]![k]! -= f * a[col]![k]!;
    }
  }
  return [a[0]![3]! / a[0]![0]!, a[1]![3]! / a[1]![1]!, a[2]![3]! / a[2]![2]!];
}
