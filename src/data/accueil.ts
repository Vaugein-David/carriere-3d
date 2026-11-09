import type { Txt } from '../i18n';
import { withBase } from '../lib/base';

/**
 * Textes de la page d'accueil.
 * Mise en forme : *italique*, {1} {2} = petites photos rondes glissées dans le titre, \n = retour à la ligne.
 */
export const home = {
  title: {
    fr: 'Trouver *sa route* {1}\n& charger {2} *sans détour*',
    en: 'Find *your way* {1}\n& load {2} *without detours*',
    ro: 'Găsiți *drumul* {1}\n& încărcați {2} *fără ocolișuri*',
    pl: 'Znajdź *swoją trasę* {1}\ni ładuj {2} *bez objazdów*',
    pt: 'Encontrar *o caminho* {1}\n& carregar {2} *sem desvios*',
  } satisfies Txt,
  titlePills: [withBase('/renders/stocks.webp'), withBase('/renders/tremie.webp')],
  kicker: {
    fr: 'Carrière · plans interactifs',
    en: 'Quarry · interactive maps',
    ro: 'Carieră · planuri interactive',
    pl: 'Kamieniołom · interaktywne plany',
    pt: 'Pedreira · planos interativos',
  } satisfies Txt,
  aboutLabel: { fr: 'À propos.', en: 'About.', ro: 'Despre.', pl: 'O stronie.', pt: 'Sobre.' } satisfies Txt,
  about: {
    fr: 'Plan de circulation, itinéraire vers chaque produit, fonctionnement de la trémie et maquette 3D de la cour, en cinq langues.',
    en: 'Traffic plan, route to every product, how to use the hopper and a 3D model of the yard, in five languages.',
    ro: 'Planul de circulație, traseul către fiecare produs, funcționarea buncărului și macheta 3D a incintei, în cinci limbi.',
    pl: 'Plan ruchu, trasa do każdego produktu, obsługa kosza i model 3D placu, w pięciu językach.',
    pt: 'Plano de circulação, percurso até cada produto, funcionamento da tremonha e maqueta 3D do pátio, em cinco línguas.',
  } satisfies Txt,
  cta: { fr: 'Ouvrir le plan', en: 'Open the map', ro: 'Deschide planul', pl: 'Otwórz plan', pt: 'Abrir o plano' } satisfies Txt,
  stats: {
    products: { fr: 'produits desservis', en: 'products served', ro: 'produse deservite', pl: 'produktów', pt: 'produtos servidos' },
    rules: { fr: 'consignes', en: 'safety rules', ro: 'reguli', pl: 'zasad', pt: 'regras' },
    langs: { fr: 'langues', en: 'languages', ro: 'limbi', pl: 'języków', pt: 'línguas' },
  } satisfies Record<string, Txt>,

  cards: [
    {
      href: '/plan-1',
      img: withBase('/renders/dessus.webp'),
      tag: { fr: 'Plan 1', en: 'Map 1', ro: 'Plan 1', pl: 'Plan 1', pt: 'Plano 1' },
      em: { fr: 'Plan de', en: 'Traffic', ro: 'Planul de', pl: 'Plan', pt: 'Plano de' },
      title: { fr: 'circulation', en: 'plan', ro: 'circulație', pl: 'ruchu', pt: 'circulação' },
    },
    {
      href: '/plan-1#produits',
      img: withBase('/renders/stocks.webp'),
      tag: { fr: 'Itinéraires', en: 'Routes', ro: 'Trasee', pl: 'Trasy', pt: 'Percursos' },
      em: { fr: 'Aller à', en: 'Drive to', ro: 'Mergeți la', pl: 'Dojazd do', pt: 'Ir até' },
      title: { fr: 'un produit', en: 'a product', ro: 'un produs', pl: 'produktu', pt: 'um produto' },
    },
    {
      href: '/plan-2',
      img: withBase('/renders/tremie.webp'),
      tag: { fr: 'Plan 2', en: 'Map 2', ro: 'Plan 2', pl: 'Plan 2', pt: 'Plano 2' },
      em: { fr: 'Poste de', en: 'Loading', ro: 'Punctul de', pl: 'Punkt', pt: 'Posto de' },
      title: { fr: 'chargement', en: 'point', ro: 'încărcare', pl: 'załadunku', pt: 'carga' },
    },
    {
      href: '/plan-3d',
      img: withBase('/renders/vue-ensemble.webp'),
      contain: true,
      tag: { fr: 'Nouveau', en: 'New', ro: 'Nou', pl: 'Nowość', pt: 'Novo' },
      em: { fr: 'Maquette', en: '3D model', ro: 'Macheta', pl: 'Model 3D', pt: 'Maqueta' },
      title: { fr: 'de la cour en 3D', en: 'of the yard', ro: 'incintei în 3D', pl: 'placu', pt: 'do pátio em 3D' },
    },
    {
      href: '/plan-3d?focus=centrale-beton',
      img: withBase('/renders/silos.webp'),
      tag: { fr: 'Repères', en: 'Landmarks', ro: 'Repere', pl: 'Punkty orientacyjne', pt: 'Referências' },
      em: { fr: 'Silos &', en: 'Silos &', ro: 'Silozuri &', pl: 'Silosy i', pt: 'Silos &' },
      title: { fr: 'centrale à béton', en: 'concrete plant', ro: 'stația de betoane', pl: 'betoniarnia', pt: 'central de betão' },
    },
  ] satisfies { href: string; img: string; contain?: boolean; tag: Txt; em: Txt; title: Txt }[],

  rulesWord: { fr: 'Consignes', en: 'Rules', ro: 'Reguli', pl: 'Zasady', pt: 'Regras' } satisfies Txt,

  showcaseTitle: {
    fr: 'La cour, *en volume*',
    en: 'The yard, *in 3D*',
    ro: 'Incinta, *în 3D*',
    pl: 'Plac *w 3D*',
    pt: 'O pátio, *em 3D*',
  } satisfies Txt,
  showcase: [
    {
      href: '/plan-3d',
      img: withBase('/renders/vue-ensemble.webp'),
      contain: true,
      wide: true,
      title: { fr: 'Maquette 3D de la cour', en: '3D model of the yard', ro: 'Macheta 3D a incintei', pl: 'Model 3D placu', pt: 'Maqueta 3D do pátio' },
      text: {
        fr: 'Tournez autour des stocks, zoomez sur la trémie et suivez l’itinéraire de votre produit en volume.',
        en: 'Orbit around the stockpiles, zoom in on the hopper and follow the route to your product in 3D.',
        ro: 'Rotiți în jurul stocurilor, măriți buncărul și urmați traseul către produsul dvs. în 3D.',
        pl: 'Obracaj widok wokół hałd, przybliż kosz i śledź trasę do swojego produktu w 3D.',
        pt: 'Rode à volta dos stocks, aproxime a tremonha e siga o percurso até ao seu produto em 3D.',
      },
      cta: { fr: 'Explorer en 3D', en: 'Explore in 3D', ro: 'Explorați în 3D', pl: 'Zobacz w 3D', pt: 'Explorar em 3D' },
    },
    {
      href: '/plan-2',
      img: withBase('/renders/tremie.webp'),
      title: { fr: 'Trémie', en: 'Hopper', ro: 'Buncăr', pl: 'Kosz zasypowy', pt: 'Tremonha' },
      text: {
        fr: 'Badge, feu vert, marche avant uniquement : le chargement pas à pas.',
        en: 'Badge, green light, forward only: loading step by step.',
        ro: 'Ecuson, semafor verde, doar înainte: încărcarea pas cu pas.',
        pl: 'Identyfikator, zielone światło, tylko do przodu: załadunek krok po kroku.',
        pt: 'Cartão, sinal verde, só em frente: o carregamento passo a passo.',
      },
      cta: { fr: 'Les 6 étapes', en: 'The 6 steps', ro: 'Cei 6 pași', pl: '6 kroków', pt: 'Os 6 passos' },
    },
    {
      href: '/plan-1#consignes',
      img: withBase('/renders/boues.webp'),
      title: { fr: 'Sortie', en: 'Exit', ro: 'Ieșire', pl: 'Wyjazd', pt: 'Saída' },
      text: {
        fr: 'Laveur de roues obligatoire, bâchage après la bascule de sortie.',
        en: 'Wheel wash is mandatory; sheet the load after the exit weighbridge.',
        ro: 'Spălarea roților este obligatorie; prelata după cântarul de ieșire.',
        pl: 'Myjnia kół obowiązkowa, plandeka po wadze wyjazdowej.',
        pt: 'Lava-rodas obrigatório; cobrir a carga depois da báscula de saída.',
      },
      cta: { fr: 'Les consignes', en: 'The rules', ro: 'Regulile', pl: 'Zasady', pt: 'As regras' },
    },
  ] satisfies { href: string; img: string; contain?: boolean; wide?: boolean; title: Txt; text: Txt; cta: Txt }[],

  quotesTitle: {
    fr: 'Charger à la trémie\n*en six étapes*',
    en: 'Loading at the hopper\n*in six steps*',
    ro: 'Încărcarea la buncăr\n*în șase pași*',
    pl: 'Załadunek przy koszu\n*w sześciu krokach*',
    pt: 'Carregar na tremonha\n*em seis passos*',
  } satisfies Txt,
  hopper: { fr: 'Poste de chargement', en: 'Loading point', ro: 'Punct de încărcare', pl: 'Punkt załadunku', pt: 'Posto de carga' } satisfies Txt,
  prev: { fr: 'Étape précédente', en: 'Previous step', ro: 'Pasul anterior', pl: 'Poprzedni krok', pt: 'Passo anterior' } satisfies Txt,
  next: { fr: 'Étape suivante', en: 'Next step', ro: 'Pasul următor', pl: 'Następny krok', pt: 'Passo seguinte' } satisfies Txt,
  pageTitle: { fr: 'Plans de la carrière', en: 'Quarry maps', ro: 'Planurile carierei', pl: 'Plany kamieniołomu', pt: 'Planos da pedreira' } satisfies Txt,
};
