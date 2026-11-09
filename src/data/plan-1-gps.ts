import type { GpsControlPoint } from '../lib/geo';

/**
 * Calage GPS du plan 1 (carrière SMBP de Viabon) : relie une position GPS (lat, lon)
 * à sa place sur le plan (x, y, repère 961 × 667).
 *
 * Points calculés en superposant la photo du plan à l'orthophoto IGN géoréférencée
 * (scripts/gps/recalage-ign.py, résultat dans sources/recalage-gps-plan-1.json) :
 * 173 détails communs, écart médian 0.21 m, 1 unité du plan ≈ 0.56 m.
 *
 * À vérifier sur place : si le point bleu est décalé, ajoutez des points relevés avec l'outil
 * « Calage GPS » de /plan-1?edit (ils s'ajoutent à ceux-ci dans le calcul), ou remplacez la liste.
 */
export const plan1Gps: GpsControlPoint[] = [
  { lat: 48.2431058, lon: 1.7159807, x: 60, y: 60 },
  { lat: 48.2429781, lon: 1.7128436, x: 480, y: 40 },
  { lat: 48.2430540, lon: 1.7097150, x: 900, y: 60 },
  { lat: 48.2444276, lon: 1.7096228, x: 920, y: 330 },
  { lat: 48.2458545, lon: 1.7098310, x: 900, y: 610 },
  { lat: 48.2459822, lon: 1.7129681, x: 480, y: 630 },
  { lat: 48.2459063, lon: 1.7160967, x: 60, y: 610 },
  { lat: 48.2444818, lon: 1.7161868, x: 40, y: 330 },
  { lat: 48.2444547, lon: 1.7129048, x: 480, y: 330 },
];
