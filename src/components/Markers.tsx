'use client';

import type { KeyboardEvent } from 'react';
import type { Marker } from '../types';
import { ui, useT } from '../i18n';

interface Props {
  markers: Marker[];
  /** Largeur de l'image, pour garder les libellés à l'intérieur */
  width: number;
  u: number;
  interactive: boolean;
  onSelect: (marker: Marker) => void;
}

/** Libellé lisible sur n'importe quel fond : texte blanc cerné de noir */
function Label({ x, y, u, width, children }: { x: number; y: number; u: number; width: number; children: string }) {
  // Près d'un bord, le libellé s'aligne vers l'intérieur de l'image
  const anchor = x > width * 0.85 ? 'end' : x < width * 0.15 ? 'start' : 'middle';
  const dx = anchor === 'end' ? 12 * u : anchor === 'start' ? -12 * u : 0;
  return (
    <text
      className="marker-label"
      x={x + dx}
      y={y}
      fontSize={20 * u}
      strokeWidth={6 * u}
      textAnchor={anchor}
      aria-hidden="true"
    >
      {children}
    </text>
  );
}

export function Markers({ markers, width, u, interactive, onSelect }: Props) {
  const t = useT();
  return (
    <g className="markers">
      {markers.map((m) => {
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(m);
          }
        };
        const common = {
          'data-marker': m.id,
          role: interactive ? 'button' : undefined,
          tabIndex: interactive ? 0 : -1,
          'aria-label': interactive ? `${t(m.label)} : ${t(ui.showInfo)}` : undefined,
          onClick: interactive ? () => onSelect(m) : undefined,
          onKeyDown: interactive ? onKeyDown : undefined,
        };

        if (m.type === 'assembly') {
          const r = 13 * u;
          return (
            <g key={m.id} className="marker marker--assembly" {...common}>
              <g transform={`translate(${m.x} ${m.y})`}>
                <g className="marker-anim">
                  <circle className="marker-ring" r={r} strokeWidth={3 * u} />
                  <circle className="marker-ring marker-ring--late" r={r} strokeWidth={3 * u} />
                  <circle className="marker-flash" r={r * 2.4} strokeWidth={5 * u} />
                  <circle className="marker-hit" r={r * 2} />
                  <circle className="marker-core" r={r} strokeWidth={3 * u} />
                  {/* Pictogramme : trois personnes */}
                  <g className="marker-glyph" transform={`scale(${u})`}>
                    <circle cx="-6" cy="-4" r="2.6" />
                    <circle cx="6" cy="-4" r="2.6" />
                    <circle cx="0" cy="-6" r="3" />
                    <path d="M -10 6 q 4 -8 8 0 Z M 2 6 q 4 -8 8 0 Z M -5 5 q 5 -10 10 0 Z" />
                  </g>
                </g>
              </g>
              <Label x={m.x} y={m.y + r + 24 * u} u={u} width={width}>
                {t(m.label)}
              </Label>
            </g>
          );
        }

        const r = 9 * u;
        return (
          <g key={m.id} className="marker marker--here" {...common}>
            <g transform={`translate(${m.x} ${m.y})`}>
              <g className="marker-anim">
                <circle className="marker-halo" r={r * 2.2} />
                <circle className="marker-hit" r={r * 2.4} />
                <circle className="marker-core" r={r} strokeWidth={3.5 * u} />
              </g>
            </g>
            <Label x={m.x} y={m.y - r - 12 * u} u={u} width={width}>
              {t(m.label)}
            </Label>
          </g>
        );
      })}
    </g>
  );
}
