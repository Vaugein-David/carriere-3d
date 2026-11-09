// Exporte les annotations du plan 1 en JSON pour le script Blender (scripts/blender/build_carriere.py).
// Usage : node scripts/export-3d-data.mjs
import { writeFileSync } from 'node:fs';
import { plan1Annotations as a } from '../src/data/plan-1-annotations.ts';

const fr = (t) => (t === undefined ? '' : typeof t === 'string' ? t : t.fr);
const out = {
  width: 961,
  height: 667,
  areas: a.areas.map((x) => ({
    id: x.id ?? null,
    kind: x.kind,
    label: fr(x.label),
    points: 'rect' in x
      ? [[x.rect[0], x.rect[1]], [x.rect[0] + x.rect[2], x.rect[1]], [x.rect[0] + x.rect[2], x.rect[1] + x.rect[3]], [x.rect[0], x.rect[1] + x.rect[3]]]
      : x.polygon.reduce((p, v, i) => (i % 2 ? (p[p.length - 1].push(v), p) : [...p, [v]]), []),
  })),
  noEntry: a.noEntry,
  arrows: a.arrows ?? [],
};
writeFileSync(new URL('../sources/plan-1-3d.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`${out.areas.length} zones, ${out.arrows.length} flèches, ${out.noEntry.length} sens interdits`);
