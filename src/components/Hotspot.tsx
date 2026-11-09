'use client';

import type { CSSProperties, KeyboardEvent, SVGProps } from 'react';
import type { Hotspot as HotspotData } from '../types';
import { pairs, pointsAttr } from '../lib/geometry';
import { ui, useT } from '../i18n';

interface Props {
  hotspot: HotspotData;
  /** Unité de dessin (voir drawUnit) */
  u: number;
  index: number;
  selected: boolean;
  interactive: boolean;
  onSelect: (hotspot: HotspotData) => void;
}

function Shape({ hotspot, className, ...rest }: { hotspot: HotspotData; className: string } & SVGProps<SVGElement>) {
  if (hotspot.shape === 'circle') {
    const [cx, cy, r] = hotspot.coords;
    return <circle className={className} cx={cx} cy={cy} r={r} {...(rest as SVGProps<SVGCircleElement>)} />;
  }
  return (
    <polygon
      className={className}
      points={pointsAttr(pairs(hotspot.coords))}
      {...(rest as SVGProps<SVGPolygonElement>)}
    />
  );
}

export function Hotspot({ hotspot, u, index, selected, interactive, onSelect }: Props) {
  const t = useT();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(hotspot);
    }
  };

  const style = {
    '--hs-color': hotspot.color,
    '--u': u,
    animationDelay: `${(index % 5) * 0.45}s`,
  } as CSSProperties;

  return (
    <g
      className={`hotspot hotspot--${hotspot.shape}${selected ? ' is-selected' : ''}`}
      data-hotspot={hotspot.id}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={interactive ? `${t(hotspot.label)} : ${t(ui.showInfo)}` : undefined}
      aria-hidden={interactive ? undefined : true}
      onClick={interactive ? () => onSelect(hotspot) : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      style={style}
    >
      <g className="hotspot-anim">
        <Shape hotspot={hotspot} className="hotspot-pulse" style={{ animationDelay: style.animationDelay }} />
        <Shape hotspot={hotspot} className="hotspot-focus" strokeWidth={9 * u} />
        <Shape hotspot={hotspot} className="hotspot-casing" strokeWidth={6 * u} />
        <Shape hotspot={hotspot} className="hotspot-shape" strokeWidth={3 * u} />
        {/* Zone tactile élargie (au moins ~44 px une fois affichée) */}
        <Shape hotspot={hotspot} className="hotspot-hit" strokeWidth={22 * u} />
      </g>
    </g>
  );
}
