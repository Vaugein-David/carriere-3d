'use client';

import { memo } from 'react';
import type { AnnotationArea, Annotations, AreaKind } from '../types';
import { pairs, pointsAttr } from '../lib/geometry';
import { inkOn } from '../lib/color';
import { useT } from '../i18n';

export const AREA: Record<AreaKind, string> = {
  stock: '#FFF6BF',
  reserve: '#E3C8F0',
  green: '#2E9B45',
  blue: '#86C3EC',
  orange: '#F4AE38',
  navy: '#15306E',
  dark: '#262626',
  building: '#FFFFFF',
  plant: '#E9C6B4',
  parking: '#EBC6BB',
  tremie: '#FFD400',
  wait: '#FFD400',
};

function bbox(area: AnnotationArea) {
  if ('rect' in area) {
    const [x, y, w, h] = area.rect;
    return { x, y, w, h };
  }
  const pts = pairs(area.polygon);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function AreaLabel({ area, fill }: { area: AnnotationArea; fill: string }) {
  const t = useT();
  if (!area.label) return null;
  const { x, y, w, h } = bbox(area);
  const lines = t(area.label).split('\n');
  // Largeur estimée en em : les majuscules en gras sont plus larges que la moyenne
  const longest = Math.max(...lines.map((l) => [...l].reduce((s, c) => s + (/\p{Lu}/u.test(c) ? 0.74 : 0.62), 0) / 0.62));
  // Taille ajustée à la surface (en sens de lecture), plafonnée
  const along = area.vertical ? h : w;
  const across = area.vertical ? w : h;
  const size = Math.max(
    5,
    Math.min(area.fontSize ?? 13, (along - 6) / (longest * 0.62), ((across - 4) / lines.length) * 0.82),
  );
  const [cx, cy] = area.labelAt ?? [x + w / 2, y + h / 2];
  const first = -((lines.length - 1) * size * 1.05) / 2;
  return (
    <text
      className="annot-label"
      x={cx}
      y={cy}
      fontSize={size}
      fill={inkOn(fill)}
      textAnchor="middle"
      dominantBaseline="central"
      transform={area.vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={cx} dy={i === 0 ? first : size * 1.05}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function AreaShape({ area, ...rest }: { area: AnnotationArea; className: string; fill?: string }) {
  if ('rect' in area) {
    const [x, y, w, h] = area.rect;
    return <rect x={x} y={y} width={w} height={h} rx={Math.min(6, w / 4, h / 4)} {...rest} />;
  }
  return <polygon points={pointsAttr(pairs(area.polygon))} {...rest} />;
}

/** Annotations posées sur la photo : étiquettes des stocks, flèches de sens, sens interdits, textes. */
export const AnnotationLayer = memo(function AnnotationLayer({
  annotations,
  highlight,
}: {
  annotations: Annotations;
  /** Zone mise en évidence (stock de l'itinéraire choisi) */
  highlight?: string | null;
}) {
  const t = useT();
  const { areas, noEntry, labels = [], arrows = [] } = annotations;
  const arrowColors = [...new Set(arrows.map((a) => a.color))];
  return (
    <g className="annot" aria-hidden="true">
      <defs>
        {arrowColors.map((c, i) => (
          <marker
            key={c}
            id={`annot-arrow-${i}`}
            viewBox="0 0 12 12"
            refX="5"
            refY="6"
            markerWidth="12"
            markerHeight="12"
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path d="M 0 0 L 12 6 L 0 12 L 3 6 Z" fill={c} stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
          </marker>
        ))}
        <pattern id="annot-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#FFD400" />
          <rect width="3.5" height="8" fill="#111" />
        </pattern>
      </defs>

      {areas.map((a, i) => {
        const fill = AREA[a.kind];
        return (
          <g key={i} className={`annot-area annot-area--${a.kind}${a.id && a.id === highlight ? ' is-target' : ''}`}>
            <AreaShape area={a} className="annot-shape" fill={a.kind === 'wait' ? 'url(#annot-hatch)' : fill} />
            <AreaLabel area={a} fill={fill} />
          </g>
        );
      })}

      {/* Flèches de sens de circulation */}
      {arrows.map((a, i) => (
        <g key={i} className="annot-arrow">
          <path className="annot-arrow-casing" d={a.d} />
          <path
            className="annot-arrow-line"
            d={a.d}
            stroke={a.color}
            markerEnd={`url(#annot-arrow-${arrowColors.indexOf(a.color)})`}
          />
        </g>
      ))}

      {noEntry.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="11" fill="#E0001B" stroke="#fff" strokeWidth="2.5" />
          <rect x="-6.5" y="-2" width="13" height="4" rx="1" fill="#fff" />
        </g>
      ))}

      {labels.map((l, i) => (
        <text key={i} className="annot-text" x={l.x} y={l.y} fontSize={l.size ?? 12} textAnchor={l.anchor ?? 'middle'}>
          {t(l.text)}
        </text>
      ))}
    </g>
  );
});
