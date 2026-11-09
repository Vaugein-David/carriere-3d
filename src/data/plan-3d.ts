import type { Txt } from '../i18n';
import { withBase } from '../lib/base';

/**
 * PAGE 3 — Maquette 3D de la cour.
 *
 * Le modèle public/models/carriere.glb est généré par scripts/blender/build_carriere.py
 * (relief IGN, installations, annotations du plan 1 ; npm run model). Les étiquettes, les itinéraires
 * et la mise en évidence des stocks sont calculés dans le navigateur à partir des mêmes
 * données que le plan 2D : modifier src/data/plan-1*.ts suffit pour les textes et les tracés.
 */
export const plan3d = {
  model: withBase('/models/carriere.glb'),
  eyebrow: { fr: 'Plan 3 · Maquette 3D', en: 'Map 3 · 3D model', ro: 'Plan 3 · Machetă 3D', pl: 'Plan 3 · Model 3D', pt: 'Plano 3 · Maqueta 3D' } satisfies Txt,
  title: { fr: 'La cour *en 3D*', en: 'The yard *in 3D*', ro: 'Incinta *în 3D*', pl: 'Plac *w 3D*', pt: 'O pátio *em 3D*' } satisfies Txt,
  description: {
    fr: 'Tournez autour de la maquette, choisissez un produit : son stock s’allume et l’itinéraire se dessine en volume.',
    en: 'Orbit around the model and choose a product: its stockpile lights up and the route is drawn in 3D.',
    ro: 'Rotiți macheta și alegeți un produs: stocul se aprinde, iar traseul apare în 3D.',
    pl: 'Obracaj model i wybierz produkt: jego hałda się podświetli, a trasa pojawi się w 3D.',
    pt: 'Rode à volta da maqueta e escolha um produto: o stock acende-se e o percurso aparece em 3D.',
  } satisfies Txt,
  overview: { fr: 'Vue d’ensemble', en: 'Overview', ro: 'Vedere de ansamblu', pl: 'Widok ogólny', pt: 'Vista geral' } satisfies Txt,
  top: { fr: 'Vue de dessus', en: 'Top view', ro: 'Vedere de sus', pl: 'Widok z góry', pt: 'Vista de cima' } satisfies Txt,
  labels: { fr: 'Étiquettes', en: 'Labels', ro: 'Etichete', pl: 'Etykiety', pt: 'Etiquetas' } satisfies Txt,
  hint: {
    fr: 'Glisser pour tourner · pincer ou molette pour zoomer · deux doigts pour déplacer',
    en: 'Drag to orbit · pinch or scroll to zoom · two fingers to pan',
    ro: 'Glisați pentru rotire · ciupiți sau rotița pentru zoom · două degete pentru deplasare',
    pl: 'Przeciągnij, aby obrócić · uszczypnij lub kółko, aby przybliżyć · dwa palce, aby przesunąć',
    pt: 'Arraste para rodar · afaste os dedos ou use a roda para ampliar · dois dedos para deslocar',
  } satisfies Txt,
  loading: { fr: 'Chargement de la maquette…', en: 'Loading the model…', ro: 'Se încarcă macheta…', pl: 'Ładowanie modelu…', pt: 'A carregar a maqueta…' } satisfies Txt,
  aboutTitle: { fr: 'À propos de la maquette', en: 'About the model', ro: 'Despre machetă', pl: 'O modelu', pt: 'Sobre a maqueta' } satisfies Txt,
  about: {
    fr: 'Relief réel issu du modèle de surface haute résolution de l’IGN, avec la photo aérienne drapée. Installations (convoyeurs, silos, clarificateurs, usine, trémie) modélisées sous Blender d’après les photos du site, convoyeurs à leur hauteur mesurée. Les stocks bougent : seule la signalisation sur place fait foi.',
    en: 'Real terrain from the IGN high-resolution surface model, with the aerial photo draped on top. Installations (conveyors, silos, thickeners, plant, hopper) modelled in Blender from site photos, conveyors at their measured height. Stockpiles move: only the signs on site are authoritative.',
    ro: 'Relief real din modelul de suprafață de înaltă rezoluție IGN, cu fotografia aeriană aplicată. Instalațiile (benzi transportoare, silozuri, decantoare, stație, buncăr) sunt modelate în Blender după fotografiile carierei, benzile la înălțimea măsurată. Stocurile se mută: doar semnalizarea de pe teren este valabilă.',
    pl: 'Rzeczywista rzeźba terenu z modelu powierzchni wysokiej rozdzielczości IGN z nałożonym zdjęciem lotniczym. Instalacje (przenośniki, silosy, osadniki, zakład, kosz) wymodelowane w Blenderze na podstawie zdjęć, przenośniki na zmierzonej wysokości. Hałdy się zmieniają: obowiązuje wyłącznie oznakowanie na miejscu.',
    pt: 'Relevo real a partir do modelo de superfície de alta resolução do IGN, com a fotografia aérea aplicada. Instalações (transportadores, silos, espessadores, central, tremonha) modeladas no Blender a partir de fotografias do local, transportadores à altura medida. Os stocks mudam: só a sinalização no local faz fé.',
  } satisfies Txt,
  pickHint: {
    fr: 'Astuce : touchez l’étiquette d’un stock sur la maquette pour afficher son itinéraire.',
    en: 'Tip: tap a stockpile label on the model to show its route.',
    ro: 'Sfat: atingeți eticheta unui stoc pe machetă pentru a-i afișa traseul.',
    pl: 'Wskazówka: dotknij etykiety hałdy na modelu, aby zobaczyć trasę.',
    pt: 'Dica: toque na etiqueta de um stock na maqueta para ver o percurso.',
  } satisfies Txt,
};
