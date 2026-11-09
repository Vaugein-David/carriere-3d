'use client';

import { useMemo, useState } from 'react';
import { copyText } from '../lib/clipboard';
import { type Point, pointsAttr, smoothPath, straightPath } from '../lib/geometry';
import { makeGeoTransform } from '../lib/geo';
import type { GpsReading, GpsStatus } from '../hooks/usePlanPosition';

export type EditMode = 'point' | 'path' | 'polygon' | 'circle' | 'gps';

export interface EditState {
  mode: EditMode;
  points: Point[];
  smooth: boolean;
  last: Point | null;
  /** Outil « Calage GPS » : position GPS relevée pour chaque point (même ordre que `points`) */
  gps: GpsReading[];
}

export const initialEditState: EditState = { mode: 'point', points: [], smooth: true, last: null, gps: [] };

/** Précision GPS au-delà de laquelle un point de calage est refusé (mètres) */
const GPS_MAX_ACCURACY = 25;

/** Applique un appui sur le plan à l'état d'édition */
export function editTap(state: EditState, p: Point, reading: GpsReading | null = null): EditState {
  switch (state.mode) {
    case 'gps':
      // Sans position GPS assez précise, l'appui ne fait que montrer le point
      if (!reading || reading.accuracy > GPS_MAX_ACCURACY) return { ...state, last: p };
      return { ...state, last: p, points: [...state.points, p], gps: [...state.gps, reading] };
    case 'point':
      return { ...state, last: p, points: [p] };
    case 'circle':
      return { ...state, last: p, points: state.points.length >= 2 ? [p] : [...state.points, p] };
    default:
      return { ...state, last: p, points: [...state.points, p] };
  }
}

function circleOf(points: Point[]): [number, number, number] | null {
  const [c, e] = points;
  if (!c || !e) return null;
  return [c[0], c[1], Math.round(Math.hypot(e[0] - c[0], e[1] - c[1]))];
}

function exportCode(state: EditState): string {
  const { mode, points, smooth } = state;
  if (points.length === 0) return '';
  const flat = points.flat().join(', ');
  switch (mode) {
    case 'point': {
      const [p] = points;
      return p ? `x: ${p[0]},\ny: ${p[1]},` : '';
    }
    case 'path':
      return [
        '{',
        "  id: 'nouvel-itineraire',",
        "  label: 'Nouvel itinéraire',",
        `  d: '${smooth ? smoothPath(points) : straightPath(points)}',`,
        "  color: '#FFD400',",
        "  steps: ['Première étape', 'Deuxième étape'],",
        '},',
      ].join('\n');
    case 'polygon':
      return [
        '{',
        "  id: 'nouvelle-zone',",
        "  label: 'Nouvelle zone',",
        "  description: 'Description de la zone.',",
        "  shape: 'polygon',",
        `  coords: [${flat}],`,
        "  color: '#FFD400',",
        '},',
      ].join('\n');
    case 'gps':
      return points
        .map(([x, y], i) => {
          const g = state.gps[i]!;
          return `  { lat: ${g.lat.toFixed(7)}, lon: ${g.lon.toFixed(7)}, x: ${x}, y: ${y} }, // ±${Math.round(g.accuracy)} m`;
        })
        .join('\n');
    case 'circle': {
      const c = circleOf(points);
      if (!c) return `// Centre : ${flat} — touchez le bord du cercle`;
      return [
        '{',
        "  id: 'nouvelle-zone',",
        "  label: 'Nouvelle zone',",
        "  description: 'Description de la zone.',",
        "  shape: 'circle',",
        `  coords: [${c.join(', ')}],`,
        "  color: '#FFD400',",
        '},',
      ].join('\n');
    }
  }
}

/** Aperçu dans le calque SVG */
export function EditOverlay({ state, u }: { state: EditState; u: number }) {
  const { mode, points, smooth, last } = state;
  const circle = mode === 'circle' ? circleOf(points) : null;
  const r = 5 * u;
  return (
    <g className="edit-overlay" aria-hidden="true">
      {mode === 'path' && points.length > 1 && (
        <path d={smooth ? smoothPath(points) : straightPath(points)} strokeWidth={4 * u} />
      )}
      {mode === 'polygon' && points.length > 1 && <polygon points={pointsAttr(points)} strokeWidth={3 * u} />}
      {circle && <circle cx={circle[0]} cy={circle[1]} r={circle[2]} strokeWidth={3 * u} />}
      {mode !== 'point' &&
        points.map(([x, y], i) => (
          <g key={i}>
            <circle className="edit-vertex" cx={x} cy={y} r={r} strokeWidth={2 * u} />
            <text className="edit-index" x={x + r * 1.6} y={y - r * 1.2} fontSize={12 * u} strokeWidth={3 * u}>
              {i + 1}
            </text>
          </g>
        ))}
      {last && (
        <g className="edit-cross" transform={`translate(${last[0]} ${last[1]})`} strokeWidth={2 * u}>
          <line x1={-18 * u} x2={18 * u} y1={0} y2={0} />
          <line y1={-18 * u} y2={18 * u} x1={0} x2={0} />
        </g>
      )}
    </g>
  );
}

const MODES: { id: EditMode; label: string; hint: string }[] = [
  { id: 'point', label: 'Point', hint: 'Chaque appui copie « x, y ».' },
  { id: 'path', label: 'Itinéraire', hint: 'Touchez les points dans le sens de circulation.' },
  { id: 'polygon', label: 'Zone polygone', hint: 'Touchez les sommets de la zone.' },
  { id: 'circle', label: 'Zone cercle', hint: 'Touchez le centre, puis le bord.' },
  {
    id: 'gps',
    label: 'Calage GPS',
    hint: `Sur place : placez-vous sur un point reconnaissable, attendez une précision de moins de 10 m, puis touchez ce point sur le plan. Relevez 4 à 6 points bien répartis (refusés au-delà de ${GPS_MAX_ACCURACY} m).`,
  },
];

interface PanelProps {
  state: EditState;
  setState: (s: EditState) => void;
  /** Dimensions déclarées dans data vs dimensions réelles de l'image chargée */
  declared: { width: number; height: number };
  natural: { width: number; height: number } | null;
  /** Position GPS en direct (outil « Calage GPS ») */
  gps: { status: GpsStatus; reading: GpsReading | null };
}

export function EditPanel({ state, setState, declared, natural, gps }: PanelProps) {
  const [copied, setCopied] = useState<{ code: string; message: string } | null>(null);
  const code = useMemo(() => exportCode(state), [state]);
  // L'image peut être plus grande que le repère (ex. 3 fois) : seules les proportions doivent correspondre
  const mismatch =
    natural && Math.abs(natural.width / natural.height - declared.width / declared.height) > 0.01;
  const hint = MODES.find((m) => m.id === state.mode)?.hint;
  // Qualité du calage dès 3 points : écart moyen entre les points relevés et le calage calculé
  const fit =
    state.mode === 'gps'
      ? makeGeoTransform(state.points.map(([x, y], i) => ({ lat: state.gps[i]!.lat, lon: state.gps[i]!.lon, x, y })))
      : null;

  const copy = async () => {
    const ok = await copyText(code);
    setCopied({ code, message: ok ? 'Code copié' : 'Copie impossible : sélectionnez le texte' });
  };

  return (
    <section className="edit-panel" aria-label="Mode édition">
      <h2>Mode édition</h2>
      {mismatch && (
        <p className="edit-warning" role="alert">
          L'image chargée ({natural.width} × {natural.height} px) n'a pas les proportions du repère déclaré dans le
          fichier data ({declared.width} × {declared.height}). Corrigez <code>width</code> / <code>height</code>.
        </p>
      )}
      <div className="edit-modes" role="group" aria-label="Outil">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="chip"
            aria-pressed={state.mode === m.id}
            onClick={() => setState({ ...state, mode: m.id, points: [], last: null, gps: [] })}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="edit-hint">{hint}</p>
      {state.mode === 'gps' && (
        <p className="edit-last" aria-live="polite">
          {gps.reading
            ? `GPS : ${gps.reading.lat.toFixed(6)}, ${gps.reading.lon.toFixed(6)} · précision ±${Math.round(gps.reading.accuracy)} m`
            : `GPS : ${gps.status === 'insecure' ? 'page non sécurisée (ouvrir en https)' : gps.status === 'denied' ? 'autorisation refusée' : 'recherche…'}`}
          {fit && (
            <>
              <br />
              Calage sur {state.points.length} points : écart moyen <strong>{fit.rmsMeters.toFixed(1)} m</strong>
              {fit.rmsMeters > 8 && ' (élevé : vérifiez les points ou ajoutez-en)'}
            </>
          )}
        </p>
      )}
      <p className="edit-last" aria-live="polite">
        {state.last ? (
          <>
            Dernier point : <strong>{state.last[0]}, {state.last[1]}</strong> (copié)
          </>
        ) : (
          'Touchez le plan pour relever des coordonnées.'
        )}
      </p>
      {state.mode === 'path' && (
        <label className="edit-toggle">
          <input
            type="checkbox"
            checked={state.smooth}
            onChange={(e) => setState({ ...state, smooth: e.target.checked })}
          />
          Tracé lissé (courbes)
        </label>
      )}
      <div className="edit-actions">
        <button
          type="button"
          className="btn"
          disabled={state.points.length === 0}
          onClick={() =>
            setState({ ...state, points: state.points.slice(0, -1), gps: state.gps.slice(0, -1), last: state.points.at(-2) ?? null })
          }
        >
          Annuler le dernier point
        </button>
        <button
          type="button"
          className="btn"
          disabled={state.points.length === 0}
          onClick={() => setState({ ...state, points: [], last: null, gps: [] })}
        >
          Effacer
        </button>
      </div>
      {code && (
        <>
          <label className="edit-code-label" htmlFor="edit-code">
            {state.mode === 'gps' ? (
              <>
                Lignes à coller dans <code>src/data/plan-1-gps.ts</code>
              </>
            ) : (
              <>
                Code à coller dans <code>src/data/*.ts</code>
              </>
            )}
          </label>
          <textarea id="edit-code" className="edit-code" readOnly value={code} rows={Math.min(9, code.split('\n').length + 1)} />
          <button type="button" className="btn btn--primary" onClick={copy}>
            Copier le code
          </button>
          {copied?.code === code && <p className="edit-copied" aria-live="polite">{copied.message}</p>}
        </>
      )}
    </section>
  );
}
