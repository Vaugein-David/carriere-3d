/**
 * Format des données d'une page de plan (voir src/data/plan-*.ts).
 * Toutes les coordonnées sont exprimées en pixels de l'image d'origine
 * (repère du viewBox "0 0 width height"). Utilisez le mode ?edit pour les relever.
 *
 * Les textes sont de type Txt : une chaîne, ou { fr, en, ro, pl } pour les traduire
 * (une langue absente retombe sur le français).
 */

import type { Txt } from './i18n';
import type { GpsControlPoint } from './lib/geo';

/** Marque une valeur non validée : un badge « À confirmer » s'affiche dans l'interface. */
interface MaybeProvisional {
  provisoire?: boolean;
}

export type HotspotGeometry =
  /** coords = [cx, cy, r] */
  | { shape: 'circle'; coords: [number, number, number] }
  /** coords = [x1, y1, x2, y2, x3, y3, ...] */
  | { shape: 'polygon'; coords: number[] };

export type Hotspot = HotspotGeometry &
  MaybeProvisional & {
    id: string;
    label: Txt;
    description: Txt;
    /** Consigne mise en avant dans le panneau d'info */
    consigne?: Txt;
    color: string;
  };

export interface Route {
  id: string;
  label: Txt;
  /** Attribut `d` d'un <path> SVG, dans le sens de circulation */
  d: string;
  color: string;
  /** Étapes réparties uniformément le long du tracé */
  steps: Txt[];
  /** Début de chaque étape, en fraction de la longueur du tracé (par défaut : réparties uniformément) */
  stepAt?: number[];
}

export interface Marker extends MaybeProvisional {
  id: string;
  type: 'assembly' | 'you-are-here';
  label: Txt;
  x: number;
  y: number;
  description?: Txt;
}

export interface Rule extends MaybeProvisional {
  title: Txt;
  text: Txt;
}

/** Catégories de couleur des étiquettes de stocks et bâtiments (couleurs dans AnnotationLayer) */
export type AreaKind =
  | 'stock'
  | 'reserve'
  | 'green'
  | 'blue'
  | 'orange'
  | 'navy'
  | 'dark'
  | 'building'
  | 'plant'
  | 'parking'
  | 'tremie'
  | 'wait';

export type AnnotationShape =
  /** rect = [x, y, largeur, hauteur] */
  | { rect: [number, number, number, number] }
  /** polygon = [x1, y1, x2, y2, ...] (format exporté par l'outil « Zone polygone » du mode ?edit) */
  | { polygon: number[] };

export type AnnotationArea = AnnotationShape & {
  /** Identifiant, pour mettre le stock en évidence quand on choisit son itinéraire */
  id?: string;
  kind: AreaKind;
  /** Retour à la ligne avec \n */
  label?: Txt;
  /** Texte écrit verticalement */
  vertical?: boolean;
  /** Taille de texte maximale (par défaut : ajustée à la surface) */
  fontSize?: number;
  /** Position du libellé si le centre de la forme ne convient pas (forme en L, par ex.) */
  labelAt?: [number, number];
};

/** Annotations dessinées sur la photo, dans le repère du plan (0 0 width height). */
export interface Annotations {
  /** Étiquettes des stocks et bâtiments */
  areas: AnnotationArea[];
  /** Panneaux sens interdit : [x, y] */
  noEntry: [number, number][];
  /** Flèches de sens de circulation (tracé dans le sens de la flèche) */
  arrows?: { d: string; color: string }[];
  /** Textes libres */
  labels?: { x: number; y: number; text: Txt; size?: number; anchor?: 'start' | 'middle' | 'end' }[];
}

export interface PlanData {
  /** Petite ligne au-dessus du titre */
  eyebrow: Txt;
  title: Txt;
  description: Txt;
  /** Texte alternatif de l'image */
  imageAlt: Txt;
  /** Photo aérienne du plan */
  image: string;
  /** Mention de source affichée sous le plan (ex. « © IGN ») */
  imageCredit?: string;
  /** Étiquettes, flèches et panneaux dessinés par-dessus la photo */
  annotations?: Annotations;
  /** Légende des couleurs affichée sous le plan */
  legend?: { color: string; label: Txt }[];
  /**
   * Repère des coordonnées (viewBox "0 0 width height").
   * L'image peut être plus grande (ex. 3 fois) tant qu'elle a les mêmes proportions.
   */
  width: number;
  height: number;
  hotspots: Hotspot[];
  routes: Route[];
  /** Itinéraire affiché à l'arrivée ; absent : aucun trajet tant que le visiteur n'en choisit pas */
  defaultRoute?: string;
  markers: Marker[];
  rules: Rule[];
  /** Calage GPS : au moins 3 points relevés sur place (outil « Calage GPS » du mode ?edit) */
  gps?: GpsControlPoint[];
  /** Produits accessibles, avec leur itinéraire aller et retour (menu « Itinéraire vers un produit ») */
  products?: ProductGroup[];
}

export interface Product {
  id: string;
  /** Code du produit, tel qu'écrit sur le plan */
  label: string;
  /** Précision quand deux stocks portent le même nom */
  hint?: Txt;
  /** Zone des annotations mise en évidence */
  area: string;
  aller: Route;
  retour: Route;
}

export interface ProductGroup {
  label: Txt;
  products: Product[];
}

/** Contenu affiché dans l'InfoSheet (déjà traduit) */
export interface InfoItem {
  id: string;
  title: string;
  description?: string;
  consigne?: string;
  color: string;
  provisoire?: boolean;
}

/**
 * Page simple qui retranscrit une affiche (plan 2).
 * Mise en forme légère dans les textes : **gras** et [[badge]] (étiquette verte « ← badge »).
 */
export interface ProcedureData {
  eyebrow: Txt;
  title: Txt;
  description: Txt;
  steps: Txt[];
  /** Encadrés après les étapes (ex. « En cas de problème », « Info ») */
  notes: {
    label: Txt;
    text: Txt;
    tone: 'info' | 'warning';
    /** Pictogramme attention avant le titre */
    attention?: boolean;
    /** Numéro à appeler : affiche un gros bouton d'appel dans l'encadré */
    tel?: string;
  }[];
}
