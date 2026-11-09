import type { Point } from './geometry';

/** Points d'un tracé SVG (M, L, C…) tous les `step` px, mesurés par le navigateur */
export function samplePath(d: string, step = 3): Point[] {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  svg.appendChild(path);
  document.body.appendChild(svg);
  const len = path.getTotalLength();
  const out: Point[] = [];
  for (let l = 0; l < len; l += step) {
    const p = path.getPointAtLength(l);
    out.push([p.x, p.y]);
  }
  const end = path.getPointAtLength(len);
  out.push([end.x, end.y]);
  svg.remove();
  return out;
}
