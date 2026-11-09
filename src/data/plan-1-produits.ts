import type { Product, ProductGroup } from '../types';
import { LANGS, tr, type Txt } from '../i18n';
import { joinPolylines, polylineLength, projectOnPolyline, slicePolyline, smoothPath, type Point } from '../lib/geometry';

/**
 * Itinéraires aller et retour vers chaque stock accessible du plan 1.
 *
 * Les pistes sont décrites une seule fois (lignes brisées, dans le sens de circulation,
 * repère 961 × 667) ; chaque itinéraire est assemblé à partir de ces pistes et coupé
 * à l'arrêt devant le stock. Les stocks barrés sur l'affiche (inaccessibles aux camions)
 * n'apparaissent pas ici.
 */

const JAUNE = '#FFD400';
const BLEU = '#1F7AE0';

type Line = Point[];

// ---------- Pistes ----------

/** Bascule d'entrée → piste de gauche → piste du haut → angle nord-ouest */
const ENTREE: Line = [
  [908, 398], [911, 320], [910, 220], [908, 130], [896, 82], [860, 61], [780, 59], [620, 61], [450, 63], [300, 64], [240, 67], [206, 78], [180, 98],
];
/** Le long de la zone d'attente trémie, jusqu'au carrefour sous la trémie */
const ATTENTE: Line = [[180, 98], [158, 124], [142, 152], [134, 190], [140, 228], [156, 252], [176, 263]];
/** Allée entre les deux rangées de stocks du haut */
const ALLEE_HAUT: Line = [[180, 98], [196, 116], [226, 123], [300, 123], [400, 123], [458, 123], [485, 128], [505, 134]];
/** Allée devant le hangar */
const ALLEE_HANGAR: Line = [[158, 124], [188, 140], [228, 156], [266, 166], [345, 168], [425, 168], [462, 162], [490, 146], [505, 134]];
/** Remontée près du silo vers la piste du haut */
const MONTEE_SILO: Line = [[505, 134], [530, 128], [552, 118], [575, 96], [598, 74], [620, 66]];
/** Piste vers les cases sous le hangar (aller, puis retour) */
const CASES_ALLER: Line = [[176, 263], [200, 273], [226, 277], [262, 271], [300, 263], [322, 260]];
const CASES_RETOUR: Line = [[322, 256], [290, 258], [256, 264], [226, 270], [200, 268], [176, 263]];
/** Descente ouest : carrefour sous la trémie → carrefour du bas */
const DESCENTE: Line = [[176, 263], [172, 292], [170, 330], [178, 370], [192, 405], [215, 445], [244, 484], [268, 496]];
const REMONTEE: Line = [[268, 494], [250, 480], [232, 450], [216, 420], [196, 385], [184, 352], [180, 318], [178, 290], [176, 263]];
/** Allée des stocks du bas : vers l'est (côté sud), retour vers l'ouest (côté nord) */
const ALLEE_BAS_EST: Line = [[268, 496], [292, 486], [336, 466], [400, 465], [480, 465], [560, 465], [610, 463]];
const ALLEE_BAS_OUEST: Line = [[610, 447], [560, 445], [480, 445], [352, 445], [326, 456], [290, 476], [268, 494]];
/** Boucle sud-ouest puis voie ouest (sens unique vers le nord) */
const VOIE_OUEST: Line = [
  [268, 496], [240, 513], [198, 534], [152, 556], [130, 550], [124, 520], [122, 470], [118, 420], [115, 372], [108, 330], [106, 290], [106, 262], [110, 228], [122, 190], [128, 180],
];
/** Accès au 0-80 PV par le sud */
const PV_ALLER: Line = [[152, 556], [110, 566], [70, 566], [48, 548], [44, 515]];
const PV_RETOUR: Line = [[44, 515], [50, 550], [84, 562], [116, 556], [124, 520]];
/** Remontée côté ouest vers la piste du haut (sortie) */
const SORTIE_OUEST: Line = [
  [176, 263], [152, 246], [132, 212], [128, 180], [138, 152], [158, 124], [180, 98], [206, 80], [240, 77], [455, 76], [560, 72], [620, 66],
];
/** Piste du haut → laveur → bascule de sortie → sortie du site */
const SORTIE: Line = [
  [620, 66], [700, 68], [845, 70], [878, 80], [897, 108], [901, 160], [903, 250], [903, 330], [899, 410], [893, 470], [882, 540], [868, 610], [856, 667],
];

// ---------- Textes ----------

/** Remplace {p} par le nom du produit dans toutes les langues */
function fill(txt: Exclude<Txt, string>, p: Txt): Txt {
  const out = { fr: txt.fr.replaceAll('{p}', tr(p, 'fr')) } as Exclude<Txt, string>;
  for (const l of LANGS) if (l !== 'fr' && txt[l]) out[l] = txt[l]!.replaceAll('{p}', tr(p, l));
  return out;
}

const PESEE_ENTREE = {
  fr: 'Pesée à la bascule d’entrée',
  en: 'Weigh in at the entry weighbridge',
  ro: 'Cântărire la cântarul de intrare',
  pl: 'Ważenie na wadze wjazdowej',
  pt: 'Pesagem na báscula de entrada',
};
const PISTE_GAUCHE = {
  fr: 'Après la bascule, prendre la piste de gauche puis la piste du haut',
  en: 'After the weighbridge, take the left-hand track, then the top track',
  ro: 'După cântar, luați pista din stânga, apoi pista de sus',
  pl: 'Za wagą skręć w lewą drogę, a potem jedź górną drogą',
  pt: 'Depois da báscula, siga pela pista da esquerda e depois pela pista de cima',
};
const ARRET = {
  fr: 'Arrêt au stock {p} pour le chargement',
  en: 'Stop at the {p} stockpile for loading',
  ro: 'Opriți la stocul {p} pentru încărcare',
  pl: 'Zatrzymaj się przy hałdzie {p} do załadunku',
  pt: 'Pare no stock {p} para a carga',
};
const DEPART = {
  fr: 'Repartir du stock {p} en suivant les flèches bleues',
  en: 'Leave the {p} stockpile following the blue arrows',
  ro: 'Plecați de la stocul {p} urmând săgețile albastre',
  pl: 'Odjedź od hałdy {p}, kierując się niebieskimi strzałkami',
  pt: 'Saia do stock {p} seguindo as setas azuis',
};
const RETOUR_STEPS: Txt[] = [
  {
    fr: 'Reprendre la même piste pour remonter à la bascule de sortie',
    en: 'Take the same track back up to the exit weighbridge',
    ro: 'Reluați aceeași pistă pentru a urca la cântarul de ieșire',
    pl: 'Wróć tą samą drogą do wagi wyjazdowej',
    pt: 'Volte pela mesma pista para subir à báscula de saída',
  },
  {
    fr: 'Passage OBLIGATOIRE dans le laveur de roues',
    en: 'MANDATORY pass through the wheel wash',
    ro: 'Trecere OBLIGATORIE prin spălătoria de roți',
    pl: 'OBOWIĄZKOWY przejazd przez myjnię kół',
    pt: 'Passagem OBRIGATÓRIA pelo lava-rodas',
  },
  {
    fr: 'Pesée à la bascule de sortie',
    en: 'Weigh out at the exit weighbridge',
    ro: 'Cântărire la cântarul de ieșire',
    pl: 'Ważenie na wadze wyjazdowej',
    pt: 'Pesagem na báscula de saída',
  },
  {
    fr: 'Bâchage après la bascule de sortie, puis sortie du site',
    en: 'Sheet (tarp) the load after the exit weighbridge, then leave the site',
    ro: 'Acoperiți încărcătura cu prelata după cântarul de ieșire, apoi ieșiți din carieră',
    pl: 'Plandekowanie ładunku za wagą wyjazdową, potem wyjazd z terenu',
    pt: 'Cobertura com lona depois da báscula de saída e depois saída do local',
  },
];

/** Étape propre à chaque secteur, entre la piste du haut et l'arrêt */
const VIA = {
  haut: {
    fr: 'Au bout de la piste, tourner dans l’allée entre les deux rangées de stocks du haut',
    en: 'At the end of the track, turn into the lane between the two rows of top stockpiles',
    ro: 'La capătul pistei, intrați pe aleea dintre cele două rânduri de stocuri de sus',
    pl: 'Na końcu drogi skręć w alejkę między dwoma rzędami górnych hałd',
    pt: 'No fim da pista, vire para a alameda entre as duas filas de stocks de cima',
  },
  hangar: {
    fr: 'Au bout de la piste, prendre l’allée devant le hangar',
    en: 'At the end of the track, take the lane in front of the shed',
    ro: 'La capătul pistei, luați aleea din fața hangarului',
    pl: 'Na końcu drogi wjedź w alejkę przed hangarem',
    pt: 'No fim da pista, siga pela alameda em frente ao hangar',
  },
  cases: {
    fr: 'Longer la zone d’attente trémie, puis prendre la piste vers les cases sous le hangar',
    en: 'Drive along the hopper waiting area, then take the track to the bays below the shed',
    ro: 'Mergeți pe lângă zona de așteptare a buncărului, apoi luați pista spre boxele de sub hangar',
    pl: 'Jedź wzdłuż strefy oczekiwania do kosza, a potem drogą do boksów pod hangarem',
    pt: 'Siga ao longo da zona de espera da tremonha e depois pela pista até às boxes debaixo do hangar',
  },
  descente: {
    fr: 'Longer la zone d’attente trémie, puis descendre la piste ouest',
    en: 'Drive along the hopper waiting area, then go down the west track',
    ro: 'Mergeți pe lângă zona de așteptare a buncărului, apoi coborâți pista de vest',
    pl: 'Jedź wzdłuż strefy oczekiwania do kosza, a potem zjedź zachodnią drogą',
    pt: 'Siga ao longo da zona de espera da tremonha e depois desça pela pista oeste',
  },
  ouest: {
    fr: 'Longer la zone d’attente trémie, descendre la piste jusqu’en bas, puis remonter par la voie ouest',
    en: 'Drive along the hopper waiting area, go down to the bottom, then come back up the west lane',
    ro: 'Mergeți pe lângă zona de așteptare, coborâți pista până jos, apoi urcați pe aleea de vest',
    pl: 'Jedź wzdłuż strefy oczekiwania, zjedź na dół, a potem wróć w górę zachodnią alejką',
    pt: 'Siga ao longo da zona de espera da tremonha, desça a pista até ao fundo e depois suba pela via oeste',
  },
  bas: {
    fr: 'Longer la zone d’attente trémie, descendre la piste, puis prendre l’allée des stocks du bas',
    en: 'Drive along the hopper waiting area, go down the track, then take the lane of the bottom stockpiles',
    ro: 'Mergeți pe lângă zona de așteptare, coborâți pista, apoi luați aleea stocurilor de jos',
    pl: 'Jedź wzdłuż strefy oczekiwania, zjedź drogą, a potem wjedź w alejkę dolnych hałd',
    pt: 'Siga ao longo da zona de espera da tremonha, desça a pista e depois siga pela alameda dos stocks de baixo',
  },
} satisfies Record<string, Txt>;

// ---------- Assemblage ----------

/** Une piste, éventuellement limitée à la portion entre deux points */
type Leg = Line | { line: Line; from?: Point; to?: Point };

interface Spec {
  id: string;
  /** Point d'arrêt devant le stock (projeté sur la dernière piste de l'aller et la première du retour) */
  stop: Point;
  via: keyof typeof VIA;
  aller: Leg[];
  retour: Leg[];
  hint?: Txt;
  /** Stock à faire clignoter, si plusieurs produits partagent le même (par défaut `id`) */
  area?: string;
}

function assemble(legs: Leg[], stop: Point, cut: 'end' | 'start'): Point[] {
  return joinPolylines(
    ...legs.map((leg, i) => {
      const { line, from, to } = Array.isArray(leg) ? { line: leg } : leg;
      if (cut === 'end' && i === legs.length - 1) return slicePolyline(line, from, stop);
      if (cut === 'start' && i === 0) return slicePolyline(line, stop, to);
      return slicePolyline(line, from, to);
    }),
  );
}

/** Fraction de la longueur du tracé à laquelle il passe au plus près de `p` */
function fractionAt(pts: Point[], p: Point) {
  return projectOnPolyline(pts, p).along / polylineLength(pts);
}

function product(spec: Spec, label: string): Product {
  // Nom complet dans les étapes : « 0-4 PLV (côté trémie) »
  const hint = spec.hint;
  const name: Txt = hint ? (Object.fromEntries(LANGS.map((l) => [l, `${label} (${tr(hint, l)})`])) as Exclude<Txt, string>) : label;
  const aller = assemble(spec.aller, spec.stop, 'end');
  const retour = assemble(spec.retour, spec.stop, 'start');
  const L = polylineLength(aller);
  return {
    id: spec.id,
    label,
    hint: spec.hint,
    area: spec.area ?? spec.id,
    aller: {
      id: `${spec.id}--aller`,
      label: fill({ fr: 'Aller vers {p}', en: 'To {p}', ro: 'Spre {p}', pl: 'Dojazd do {p}', pt: 'Ida até {p}' }, name),
      color: JAUNE,
      d: smoothPath(aller),
      steps: [PESEE_ENTREE, PISTE_GAUCHE, VIA[spec.via], fill(ARRET, name)],
      stepAt: [0, fractionAt(aller, [910, 300]), fractionAt(aller, [206, 78]), Math.max(0.9, 1 - 40 / L)],
    },
    retour: {
      id: `${spec.id}--retour`,
      label: fill({ fr: 'Retour depuis {p}', en: 'Back from {p}', ro: 'Întoarcere de la {p}', pl: 'Powrót od {p}', pt: 'Volta de {p}' }, name),
      color: BLEU,
      d: smoothPath(retour),
      steps: [fill(DEPART, name), ...RETOUR_STEPS],
      stepAt: [
        0,
        Math.min(0.1, 40 / polylineLength(retour)),
        fractionAt(retour, [903, 245]),
        fractionAt(retour, [903, 315]),
        fractionAt(retour, [897, 440]),
      ],
    },
  };
}

const HAUT_ALLER: Leg[] = [ENTREE, ALLEE_HAUT];
const HANGAR_ALLER: Leg[] = [ENTREE, { line: ATTENTE, to: [158, 124] }, ALLEE_HANGAR];
const BAS_ALLER: Leg[] = [ENTREE, ATTENTE, DESCENTE, ALLEE_BAS_EST];
const BAS_RETOUR: Leg[] = [ALLEE_BAS_OUEST, REMONTEE, SORTIE_OUEST, SORTIE];
const OUEST_ALLER: Leg[] = [ENTREE, ATTENTE, DESCENTE, VOIE_OUEST];
const OUEST_RETOUR: Leg[] = [VOIE_OUEST, { line: SORTIE_OUEST, from: [128, 180] }, SORTIE];

const SILO = { fr: 'silo', en: 'silo', ro: 'siloz', pl: 'silos', pt: 'silo' };
const CASE = { fr: 'case sous le hangar', en: 'bay below the shed', ro: 'boxă sub hangar', pl: 'boks pod hangarem', pt: 'box debaixo do hangar' };
const COTE_TREMIE = { fr: 'côté trémie', en: 'hopper end', ro: 'capătul dinspre buncăr', pl: 'od strony kosza', pt: 'lado da tremonha' };
const COTE_0_31_5 = { fr: 'côté 0-31.5', en: '0-31.5 end', ro: 'capătul dinspre 0-31.5', pl: 'od strony 0-31.5', pt: 'lado do 0-31.5' };

const groups: { label: Txt; specs: (Spec & { label: string })[] }[] = [
  {
    label: { fr: 'Stocks du haut', en: 'Top stockpiles', ro: 'Stocurile de sus', pl: 'Hałdy górne', pt: 'Stocks de cima' },
    specs: [
      { id: 'surcharge', label: 'SUR CHARGE', stop: [220, 123], via: 'haut', aller: HAUT_ALLER, retour: [ALLEE_HAUT, MONTEE_SILO, SORTIE] },
      { id: '4-20-r1v-haut', label: '4-20 R1V', stop: [298, 123], via: 'haut', aller: HAUT_ALLER, retour: [ALLEE_HAUT, MONTEE_SILO, SORTIE] },
      { id: '10-20-tlv-stock', label: '10-20 TLV STOCK', stop: [400, 123], via: 'haut', aller: HAUT_ALLER, retour: [ALLEE_HAUT, MONTEE_SILO, SORTIE] },
      { id: '4-10-tlv-stock', label: '4-10 TLV STOCK', stop: [489, 129], via: 'haut', aller: HAUT_ALLER, retour: [ALLEE_HAUT, MONTEE_SILO, SORTIE] },
      { id: '4-16-r1v', label: '4-16 R1V', stop: [343, 168], via: 'hangar', aller: HANGAR_ALLER, retour: [ALLEE_HANGAR, MONTEE_SILO, SORTIE] },
      // Pas de chargement au 4-20 R1V de la 2e rangée pour le moment
      { id: '4-10-tlv', label: '4-10 TLV', hint: SILO, stop: [518, 131], via: 'haut', aller: [...HAUT_ALLER, MONTEE_SILO], retour: [MONTEE_SILO, SORTIE] },
      { id: '10-20-tlv', label: '10-20 TLV', hint: SILO, stop: [552, 118], via: 'haut', aller: [...HAUT_ALLER, MONTEE_SILO], retour: [MONTEE_SILO, SORTIE] },
    ],
  },
  {
    label: { fr: 'Autour du hangar', en: 'Around the shed', ro: 'În jurul hangarului', pl: 'Wokół hangaru', pt: 'À volta do hangar' },
    specs: [
      { id: '0-20-plv', label: '0-20 PLV', stop: [232, 157], via: 'hangar', aller: HANGAR_ALLER, retour: [ALLEE_HANGAR, MONTEE_SILO, SORTIE] },
      { id: '0-4-r1v-case', label: '0-4 R1V', hint: CASE, stop: [279, 268], via: 'cases', aller: [ENTREE, ATTENTE, CASES_ALLER], retour: [CASES_RETOUR, SORTIE_OUEST, SORTIE] },
      { id: '01-ha', label: '01-HA', hint: CASE, stop: [306, 262], via: 'cases', aller: [ENTREE, ATTENTE, CASES_ALLER], retour: [CASES_RETOUR, SORTIE_OUEST, SORTIE] },
    ],
  },
  {
    label: { fr: 'Côté ouest', en: 'West side', ro: 'Partea de vest', pl: 'Strona zachodnia', pt: 'Lado oeste' },
    specs: [
      { id: '0-4-tlv', label: '0-4 TLV', stop: [106, 290], via: 'ouest', aller: OUEST_ALLER, retour: OUEST_RETOUR },
      { id: '0-4-r1v', label: '0-4 R1V STOCK', stop: [108, 342], via: 'ouest', aller: OUEST_ALLER, retour: OUEST_RETOUR },
      { id: '0-20-r1v', label: '0-20 R1V', stop: [121, 466], via: 'ouest', aller: OUEST_ALLER, retour: OUEST_RETOUR },
      {
        id: '0-80-pv',
        label: '0-80 PV',
        stop: [44, 515],
        via: 'ouest',
        aller: [ENTREE, ATTENTE, DESCENTE, { line: VOIE_OUEST, to: [152, 556] }, PV_ALLER],
        retour: [PV_RETOUR, { line: VOIE_OUEST, from: [124, 520] }, { line: SORTIE_OUEST, from: [128, 180] }, SORTIE],
      },
      { id: '0-1-bu', label: '0-1 BU', stop: [171, 305], via: 'descente', aller: [ENTREE, ATTENTE, DESCENTE], retour: [REMONTEE, SORTIE_OUEST, SORTIE] },
      // Le 0-4 PLV se charge par ses deux extrémités
      { id: '0-4-plv-tremie', area: '0-4-plv', label: '0-4 PLV', hint: COTE_TREMIE, stop: [182, 318], via: 'descente', aller: [ENTREE, ATTENTE, DESCENTE], retour: [REMONTEE, SORTIE_OUEST, SORTIE] },
      { id: '0-4-plv-0-31-5', area: '0-4-plv', label: '0-4 PLV', hint: COTE_0_31_5, stop: [318, 462], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
    ],
  },
  {
    label: { fr: 'Stocks du bas', en: 'Bottom stockpiles', ro: 'Stocurile de jos', pl: 'Hałdy dolne', pt: 'Stocks de baixo' },
    specs: [
      { id: '0-31-5-ou-0-4-sv', label: '0-31.5 SV ou 0-4 SV', stop: [350, 455], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
      { id: '4-20-plv', label: '4-20 PLV*', stop: [413, 455], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
      { id: '20-40-sv', label: '20-40 SV*', stop: [470, 455], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
      { id: '31-5-63-sv', label: '31.5-63 SV', stop: [556, 455], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
      { id: '0-31-5-sv', label: '0-31.5 SV', stop: [340, 470], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
      { id: '0-4-sv-stock', label: '0-4 SV STOCK', stop: [391, 470], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
      { id: 'smd', label: 'S.M.D', stop: [520, 470], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
      { id: '0-63-sv', label: '0-63 SV', stop: [576, 470], via: 'bas', aller: BAS_ALLER, retour: BAS_RETOUR },
    ],
  },
];

export const plan1Products: ProductGroup[] = groups.map((g) => ({
  label: g.label,
  products: g.specs.map((s) => product(s, s.label)),
}));
