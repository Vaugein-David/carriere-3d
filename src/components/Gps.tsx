'use client';

import type { PlanFix } from '../lib/geo';
import type { GpsStatus } from '../hooks/usePlanPosition';
import { ui, useT } from '../i18n';

/** Pictogramme « viseur » du bouton de localisation */
export const IconLocate = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

/** Point bleu « vous êtes ici » dans le calque SVG du plan 2D */
export function PositionMarker({ fix, u }: { fix: PlanFix; u: number }) {
  const r = 7 * u;
  return (
    <g className="gps" style={{ transform: `translate(${fix.x}px, ${fix.y}px)` }} aria-hidden="true">
      <circle className="gps-accuracy" r={Math.max(fix.accuracy, r * 1.6)} strokeWidth={1.5 * u} />
      {fix.heading !== null && (
        <path
          className="gps-heading"
          d={`M 0 0 L ${-11 * u} ${-30 * u} A ${32 * u} ${32 * u} 0 0 1 ${11 * u} ${-30 * u} Z`}
          style={{ transform: `rotate(${fix.heading}deg)` }}
        />
      )}
      <circle className="gps-pulse" r={r} />
      <circle className="gps-dot" r={r} strokeWidth={3 * u} />
    </g>
  );
}

/** Message d'état de la localisation, affiché par-dessus le plan */
export function GpsBadge({ status, fix }: { status: GpsStatus; fix: PlanFix | null }) {
  const t = useT();
  if (status === 'off') return null;
  const text =
    status === 'ok' && fix
      ? fix.outside
        ? t(ui.gpsOutside)
        : t(ui.gpsOk).replace('{m}', String(Math.max(1, Math.round(fix.accuracyM))))
      : {
          searching: t(ui.gpsSearching),
          ok: t(ui.gpsSearching),
          denied: t(ui.gpsDenied),
          unavailable: t(ui.gpsUnavailable),
          insecure: t(ui.gpsInsecure),
          uncalibrated: t(ui.gpsUncalibrated),
        }[status];
  const tone = status === 'ok' && fix && !fix.outside ? 'ok' : status === 'searching' ? 'wait' : 'warn';
  return (
    <p className={`gps-badge gps-badge--${tone}`} role="status">
      <span aria-hidden="true" />
      {text}
    </p>
  );
}
