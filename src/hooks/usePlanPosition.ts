'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PlanData } from '../types';
import { makeGeoTransform, type PlanFix } from '../lib/geo';
import { samplePath } from '../lib/svgPath';

export type GpsStatus =
  | 'off'
  /** En attente du premier relevé */
  | 'searching'
  | 'ok'
  /** Autorisation refusée */
  | 'denied'
  /** Pas de GPS, ou pas de signal */
  | 'unavailable'
  /** Page en http : les navigateurs refusent la géolocalisation */
  | 'insecure'
  /** Moins de 3 points de calage dans les données */
  | 'uncalibrated';

export interface GpsReading {
  lat: number;
  lon: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}

/** Position GPS brute de l'appareil, suivie en continu tant que `active` est vrai */
export function useGeolocation(active: boolean) {
  const [status, setStatus] = useState<GpsStatus>('off');
  const [reading, setReading] = useState<GpsReading | null>(null);

  useEffect(() => {
    if (!active) {
      setStatus('off');
      setReading(null);
      return;
    }
    if (!window.isSecureContext) return setStatus('insecure');
    if (!('geolocation' in navigator)) return setStatus('unavailable');
    setStatus('searching');
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setReading({
          lat: coords.latitude,
          lon: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading,
          speed: coords.speed,
        });
        setStatus('ok');
      },
      (err) => {
        // Délai dépassé : le GPS continue de chercher, on garde l'état courant
        if (err.code === err.PERMISSION_DENIED) setStatus('denied');
        else if (err.code === err.POSITION_UNAVAILABLE) setStatus('unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  return { status, reading };
}

/** Marge autour du plan (en unités du repère) au-delà de laquelle on considère être hors du site */
const MARGIN = 60;

/**
 * Position de l'appareil sur le plan, via le calage GPS de `data.gps`.
 * `?gps=demo` dans l'URL simule un camion qui suit le premier itinéraire (pour essayer sans être sur place).
 */
export function usePlanPosition(data: PlanData, active: boolean): { status: GpsStatus; fix: PlanFix | null } {
  const demo = useMemo(() => new URLSearchParams(window.location.search).get('gps') === 'demo', []);
  const transform = useMemo(() => makeGeoTransform(data.gps ?? []), [data.gps]);
  const { status, reading } = useGeolocation(active && !demo && transform !== null);
  const demoFix = useDemoFix(data, active && demo);

  if (!active) return { status: 'off', fix: null };
  if (demo) return { status: demoFix ? 'ok' : 'searching', fix: demoFix };
  if (!transform) return { status: 'uncalibrated', fix: null };
  if (status !== 'ok' || !reading) return { status, fix: null };

  const [x, y] = transform.toPlan(reading.lat, reading.lon);
  const moving = reading.heading !== null && !Number.isNaN(reading.heading) && (reading.speed ?? 0) > 1;
  return {
    status,
    fix: {
      x,
      y,
      accuracyM: reading.accuracy,
      accuracy: reading.accuracy * transform.unitsPerMeter,
      heading: moving ? transform.headingToPlan(reading.heading!) : null,
      outside: x < -MARGIN || y < -MARGIN || x > data.width + MARGIN || y > data.height + MARGIN,
    },
  };
}

/** Déplacement simulé le long du premier itinéraire, à vitesse de camion */
function useDemoFix(data: PlanData, active: boolean): PlanFix | null {
  const [fix, setFix] = useState<PlanFix | null>(null);
  useEffect(() => {
    if (!active) {
      setFix(null);
      return;
    }
    const route = data.routes[0];
    if (!route) return;
    const pts = samplePath(route.d, 2);
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % pts.length;
      const [x, y] = pts[i]!;
      const [nx, ny] = pts[Math.min(i + 3, pts.length - 1)]!;
      const heading = Math.atan2(nx - x, -(ny - y)) * (180 / Math.PI);
      setFix({ x, y, accuracy: 9, accuracyM: 5, heading, outside: false });
    }, 400);
    return () => window.clearInterval(id);
  }, [data, active]);
  return fix;
}
