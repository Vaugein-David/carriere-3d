/** Orthophoto servie depuis public/ */
const image = withBase('/plan-1.webp');
import type { PlanData } from '../types';
import { plan1Annotations } from './plan-1-annotations';
import { plan1Gps } from './plan-1-gps';
import { plan1Products } from './plan-1-produits';
import { withBase } from '../lib/base';

/**
 * PAGE 1 — Plan de circulation de la cour.
 *
 * Coordonnées dans le repère 961 × 667 (public/plan-1.webp est 3 fois plus grande, mêmes proportions).
 * Les positions ont été relevées à l'œil sur le plan fourni : vérifiez-les et
 * ajustez-les avec le mode édition (/carriere/plan-1/?edit).
 *
 * Textes en 4 langues : { fr, en, ro, pl } (une langue absente retombe sur le français).
 *
 * Valeurs PLACEHOLDER : tout ce qui porte `provisoire: true` affiche un badge
 * « À confirmer » dans l'interface. Supprimez le drapeau une fois l'info validée.
 */

const JAUNE = '#FFD400'; // circulation dans la cour (entrée)
const BLEU = '#1F7AE0'; // sortie
const VIOLET = '#A64DD6'; // accès cour après décharge
const VERT = '#00C853'; // accès décharge remblais
const ROUGE = '#E0001B'; // zones interdites
const BLANC = '#FFFFFF';
const ORANGE = '#FF8A00';

export const plan1: PlanData = {
  eyebrow: { fr: 'Plan 1 · Circulation', en: 'Map 1 · Traffic', ro: 'Plan 1 · Circulație', pl: 'Plan 1 · Ruch', pt: 'Plano 1 · Circulação' },
  title: { fr: 'Plan de circulation', en: 'Traffic plan', ro: 'Plan de circulație', pl: 'Plan ruchu', pt: 'Plano de circulação' },
  description: {
    fr: 'Itinéraires, zones et consignes de la cour. Respectez le sens de circulation.',
    en: 'Routes, areas and rules in the yard. Follow the direction of traffic.',
    ro: 'Trasee, zone și reguli în incintă. Respectați sensul de circulație.',
    pl: 'Trasy, strefy i zasady na placu. Przestrzegaj kierunku ruchu.',
    pt: 'Percursos, zonas e regras do pátio. Respeite o sentido de circulação.',
  },
  imageAlt: {
    fr: 'Vue aérienne de la carrière avec les stocks, la trémie, la bascule et les sens de circulation',
    en: 'Aerial view of the quarry with the stockpiles, hopper, weighbridge and traffic directions',
    ro: 'Imagine aeriană a carierei cu stocurile, buncărul, cântarul și sensurile de circulație',
    pl: 'Zdjęcie lotnicze kamieniołomu z hałdami, koszem zasypowym, wagą i kierunkami ruchu',
    pt: 'Vista aérea da pedreira com os stocks, a tremonha, a báscula e os sentidos de circulação',
  },
  // Orthophoto IGN BD ORTHO® (Licence Ouverte Etalab 2.0), recalée sur le plan d'origine
  // (voir sources/recalage-ign-plan-1.json). Image 2883 × 2001 px pour un repère 961 × 667.
  image,
  imageCredit: '© IGN – BD ORTHO®',
  annotations: plan1Annotations,
  legend: [
    {
      color: JAUNE,
      label: {
        fr: 'Circulation dans la cour (entrée)',
        en: 'Traffic in the yard (entry)',
        ro: 'Circulație în incintă (intrare)',
        pl: 'Ruch na placu (wjazd)',
        pt: 'Circulação no pátio (entrada)',
      },
    },
    { color: BLEU, label: { fr: 'Sortie', en: 'Exit', ro: 'Ieșire', pl: 'Wyjazd', pt: 'Saída' } },
    {
      color: VIOLET,
      label: {
        fr: 'Accès cour après décharge',
        en: 'Yard access after tipping',
        ro: 'Acces în incintă după descărcare',
        pl: 'Wjazd na plac po rozładunku',
        pt: 'Acesso ao pátio depois da descarga',
      },
    },
    {
      color: VERT,
      label: {
        fr: 'Accès décharge remblais',
        en: 'Access to the backfill tip',
        ro: 'Acces la depozitul de umplutură',
        pl: 'Dojazd do składowiska nasypu',
        pt: 'Acesso ao aterro',
      },
    },
  ],
  width: 961,
  height: 667,

  hotspots: [
    {
      id: 'tremie',
      label: { fr: 'Trémie (poste de chargement)', en: 'Hopper (loading point)', ro: 'Buncăr (punct de încărcare)', pl: 'Kosz zasypowy (punkt załadunku)', pt: 'Tremonha (posto de carga)' },
      description: {
        fr: 'Chargement en libre-service par badge. [[plan-2]]',
        en: 'Self-service loading with a badge. [[plan-2]]',
        ro: 'Încărcare în regim self-service cu ecusonul. [[plan-2]]',
        pl: 'Samoobsługowy załadunek na identyfikator. [[plan-2]]',
        pt: 'Carga em self-service com cartão. [[plan-2]]',
      },
      consigne: {
        fr: 'Marche avant uniquement sous la trémie. Devant la trémie : un camion en chargement et un seul en attente.',
        en: 'Drive forwards only under the hopper. At the hopper: one truck loading and only one waiting.',
        ro: 'Sub buncăr circulați doar cu mersul înainte. La buncăr: un camion la încărcare și doar unul în așteptare.',
        pl: 'Pod koszem jedź wyłącznie przodem. Przy koszu: jedna ciężarówka w trakcie załadunku i tylko jedna oczekująca.',
        pt: 'Debaixo da tremonha, apenas marcha à frente. Na tremonha: um camião a carregar e apenas um à espera.',
      },
      shape: 'circle',
      coords: [183, 191, 26],
      color: JAUNE,
    },
    {
      id: 'attente-tremie',
      label: { fr: 'Zone d’attente trémie', en: 'Hopper waiting area', ro: 'Zonă de așteptare la buncăr', pl: 'Strefa oczekiwania do kosza', pt: 'Zona de espera da tremonha' },
      description: {
        fr: 'La file d’attente pour la trémie se fait le long du parking engins.',
        en: 'The queue for the hopper forms along the plant parking area.',
        ro: 'Coada pentru buncăr se formează de-a lungul parcării utilajelor.',
        pl: 'Kolejka do kosza ustawia się wzdłuż parkingu maszyn.',
        pt: 'A fila de espera para a tremonha faz-se ao longo do parque de máquinas.',
      },
      consigne: {
        fr: 'Laissez libre la sortie du parking engins. Devant la trémie : un camion en chargement et un seul en attente.',
        en: 'Keep the plant parking exit clear. At the hopper: one truck loading and only one waiting.',
        ro: 'Lăsați liberă ieșirea din parcarea utilajelor. La buncăr: un camion la încărcare și doar unul în așteptare.',
        pl: 'Nie blokuj wyjazdu z parkingu maszyn. Przy koszu: jedna ciężarówka w trakcie załadunku i tylko jedna oczekująca.',
        pt: 'Deixe livre a saída do parque de máquinas. Na tremonha: um camião a carregar e apenas um à espera.',
      },
      shape: 'polygon',
      coords: [164, 73, 182, 84, 136, 160, 119, 149],
      color: JAUNE,
    },
    {
      id: 'bascule',
      label: { fr: 'Bascule N°2', en: 'Weighbridge no. 2', ro: 'Cântarul nr. 2', pl: 'Waga nr 2', pt: 'Báscula n.º 2' },
      description: {
        fr: 'Bascule d’entrée et de sortie : pesée des camions à l’arrivée et au départ.',
        en: 'Entry and exit weighbridge: trucks are weighed on arrival and on departure.',
        ro: 'Cântar de intrare și de ieșire: camioanele se cântăresc la sosire și la plecare.',
        pl: 'Waga wjazdowa i wyjazdowa: ciężarówki są ważone przy wjeździe i przy wyjeździe.',
        pt: 'Báscula de entrada e de saída: os camiões são pesados à chegada e à partida.',
      },
      consigne: {
        fr: 'Le bâchage s’effectue après être passé en bascule de sortie.',
        en: 'Sheet (tarp) your load only after the exit weighbridge.',
        ro: 'Acoperirea cu prelată se face după trecerea pe cântarul de ieșire.',
        pl: 'Plandekowanie ładunku odbywa się po przejechaniu przez wagę wyjazdową.',
        pt: 'A cobertura com lona faz-se depois de passar na báscula de saída.',
      },
      shape: 'polygon',
      coords: [886, 308, 922, 308, 922, 398, 886, 398],
      color: BLANC,
    },
    {
      id: 'laveur',
      label: { fr: 'Laveur de roues', en: 'Wheel wash', ro: 'Spălătorie de roți', pl: 'Myjnia kół', pt: 'Lava-rodas' },
      description: {
        fr: 'Passage au laveur de roues avant la bascule de sortie.',
        en: 'Go through the wheel wash before the exit weighbridge.',
        ro: 'Treceți prin spălătoria de roți înainte de cântarul de ieșire.',
        pl: 'Przejedź przez myjnię kół przed wagą wyjazdową.',
        pt: 'Passe pelo lava-rodas antes da báscula de saída.',
      },
      consigne: {
        fr: 'Passage OBLIGATOIRE dans le laveur de roues.',
        en: 'The wheel wash is MANDATORY.',
        ro: 'Trecerea prin spălătoria de roți este OBLIGATORIE.',
        pl: 'Przejazd przez myjnię kół jest OBOWIĄZKOWY.',
        pt: 'A passagem pelo lava-rodas é OBRIGATÓRIA.',
      },
      shape: 'polygon',
      coords: [886, 252, 922, 252, 922, 302, 886, 302],
      color: BLANC,
    },
    {
      id: 'parking-engins',
      label: { fr: 'Parking engins', en: 'Plant parking', ro: 'Parcarea utilajelor', pl: 'Parking maszyn', pt: 'Parque de máquinas' },
      description: {
        fr: 'Stationnement des engins de la carrière.',
        en: 'Parking for the quarry plant and machinery.',
        ro: 'Parcare pentru utilajele carierei.',
        pl: 'Parking dla maszyn kamieniołomu.',
        pt: 'Estacionamento das máquinas da pedreira.',
      },
      consigne: {
        fr: 'Laissez toujours libre la sortie du parking engins.',
        en: 'Always keep the plant parking exit clear.',
        ro: 'Lăsați întotdeauna liberă ieșirea din parcarea utilajelor.',
        pl: 'Zawsze pozostaw wolny wyjazd z parkingu maszyn.',
        pt: 'Deixe sempre livre a saída do parque de máquinas.',
      },
      shape: 'polygon',
      coords: [101, 76, 137, 76, 152, 86, 118, 148, 106, 162, 96, 182, 94, 209, 49, 209, 40, 156, 93, 157, 94, 136, 100, 134],
      color: BLANC,
    },
    {
      id: 'parking-vl',
      label: { fr: 'Parking VL et réfectoire', en: 'Car park and canteen', ro: 'Parcare autoturisme și cantină', pl: 'Parking osobowy i stołówka', pt: 'Parque de ligeiros e refeitório' },
      description: {
        fr: 'Stationnement des véhicules légers. Le réfectoire se trouve entre les deux parkings.',
        en: 'Parking for cars and vans. The canteen is between the two parking areas.',
        ro: 'Parcare pentru autoturisme. Cantina se află între cele două parcări.',
        pl: 'Parking dla samochodów osobowych. Stołówka znajduje się między dwoma parkingami.',
        pt: 'Estacionamento dos veículos ligeiros. O refeitório fica entre os dois parques.',
      },
      shape: 'polygon',
      coords: [40, 79, 93, 79, 93, 149, 40, 149],
      color: BLANC,
    },
    {
      id: 'centrale-beton',
      label: { fr: 'Centrale à béton', en: 'Concrete plant', ro: 'Stație de betoane', pl: 'Betoniarnia', pt: 'Central de betão' },
      description: {
        fr: 'Zone de la centrale à béton.',
        en: 'Concrete plant area.',
        ro: 'Zona stației de betoane.',
        pl: 'Teren betoniarni.',
        pt: 'Zona da central de betão.',
      },
      consigne: {
        fr: 'Accès interdit sans autorisation.',
        en: 'No entry without authorisation.',
        ro: 'Accesul interzis fără autorizație.',
        pl: 'Wstęp wzbroniony bez zezwolenia.',
        pt: 'Acesso proibido sem autorização.',
      },
      shape: 'polygon',
      coords: [572, 128, 610, 100, 662, 106, 668, 140, 646, 158, 600, 160],
      color: ORANGE,
    },
    {
      id: 'poste-commande',
      label: { fr: 'Poste de commande', en: 'Control room', ro: 'Camera de comandă', pl: 'Sterownia', pt: 'Posto de comando' },
      description: {
        fr: 'Poste de pilotage de l’installation.',
        en: 'Control room for the processing plant.',
        ro: 'Camera de comandă a instalației.',
        pl: 'Sterownia instalacji.',
        pt: 'Posto de controlo da instalação.',
      },
      shape: 'polygon',
      coords: [577, 194, 606, 194, 606, 276, 577, 276],
      color: ORANGE,
    },
    {
      id: 'concassage',
      label: { fr: 'Installation de concassage', en: 'Crushing plant', ro: 'Instalația de concasare', pl: 'Instalacja kruszenia', pt: 'Instalação de britagem' },
      description: {
        fr: 'Concasseurs, cribles et convoyeurs de l’installation de traitement.',
        en: 'Crushers, screens and conveyors of the processing plant.',
        ro: 'Concasoare, ciururi și benzi transportoare ale instalației de prelucrare.',
        pl: 'Kruszarki, przesiewacze i przenośniki instalacji przeróbczej.',
        pt: 'Britadores, crivos e tapetes transportadores da instalação de tratamento.',
      },
      consigne: {
        fr: 'Accès interdit aux camions. Ne stationnez jamais sous un convoyeur.',
        en: 'No entry for trucks. Never park under a conveyor.',
        ro: 'Accesul camioanelor interzis. Nu staționați niciodată sub o bandă transportoare.',
        pl: 'Zakaz wjazdu ciężarówek. Nigdy nie parkuj pod przenośnikiem.',
        pt: 'Acesso proibido a camiões. Nunca estacione debaixo de um tapete transportador.',
      },
      shape: 'polygon',
      coords: [462, 298, 616, 298, 700, 280, 716, 316, 630, 374, 462, 374],
      color: ORANGE,
      provisoire: true, // PLACEHOLDER : consigne d'accès à valider
    },
    {
      id: 'usines-boues',
      label: { fr: 'Usines à boues', en: 'Sludge plant', ro: 'Stația de tratare a nămolului', pl: 'Instalacja szlamu', pt: 'Estação de lamas' },
      description: {
        fr: 'Installation de traitement des boues.',
        en: 'Sludge treatment plant.',
        ro: 'Instalație de tratare a nămolului.',
        pl: 'Instalacja oczyszczania szlamu.',
        pt: 'Instalação de tratamento de lamas.',
      },
      consigne: {
        fr: 'Zone interdite à la circulation des camions.',
        en: 'No trucks allowed in this area.',
        ro: 'Zonă interzisă circulației camioanelor.',
        pl: 'Strefa zamknięta dla ruchu ciężarówek.',
        pt: 'Zona proibida à circulação de camiões.',
      },
      shape: 'polygon',
      coords: [710, 330, 821, 330, 821, 433, 710, 433],
      color: ROUGE,
    },
    {
      id: 'decharge-remblais',
      label: { fr: 'Décharge remblais', en: 'Backfill tip', ro: 'Depozit de umplutură', pl: 'Składowisko nasypu', pt: 'Aterro' },
      description: {
        fr: 'Accès à la décharge de remblais par la voie verte, le long de la bascule. Après la décharge, l’accès à la cour se fait par la piste basse (flèche violette).',
        en: 'The backfill tip is reached by the green lane, alongside the weighbridge. After tipping, return to the yard by the lower track (purple arrow).',
        ro: 'La depozitul de umplutură se ajunge pe culoarul verde, de-a lungul cântarului. După descărcare, intrați în incintă pe pista de jos (săgeata mov).',
        pl: 'Do składowiska nasypu dojeżdża się zielonym pasem wzdłuż wagi. Po rozładunku wjazd na plac dolną drogą (fioletowa strzałka).',
        pt: 'O acesso ao aterro faz-se pela via verde, ao longo da báscula. Depois da descarga, o acesso ao pátio faz-se pela pista de baixo (seta roxa).',
      },
      shape: 'polygon',
      coords: [678, 619, 838, 619, 838, 652, 678, 652],
      color: VIOLET,
    },
  ],

  routes: [
    {
      id: 'chargement',
      label: { fr: 'Accès cour et trémie', en: 'Yard and hopper access', ro: 'Acces în incintă și la buncăr', pl: 'Wjazd na plac i do kosza', pt: 'Acesso ao pátio e à tremonha' },
      color: JAUNE,
      // Part de la bascule d'entrée
      d: 'M 908 398 C 911 350 912 300 911 250 L 908 120 C 907 90 887 58 845 58 L 260 64 C 222 66 194 80 170 106 C 148 132 134 165 132 195 C 131 225 148 250 172 260 C 182 264 184 250 184 235 L 184 196',
      steps: [
        {
          fr: 'Pesée à la bascule d’entrée',
          en: 'Weigh in at the entry weighbridge',
          ro: 'Cântărire la cântarul de intrare',
          pl: 'Ważenie na wadze wjazdowej',
          pt: 'Pesagem na báscula de entrada',
        },
        {
          fr: 'Après la bascule, prendre la piste de gauche pour descendre dans la cour',
          en: 'After the weighbridge, take the left-hand track down into the yard',
          ro: 'După cântar, luați pista din stânga pentru a coborî în incintă',
          pl: 'Za wagą skręć w lewą drogę, aby zjechać na plac',
          pt: 'Depois da báscula, siga pela pista da esquerda para descer ao pátio',
        },
        {
          fr: 'Suivre les indications du plan (flèches jaunes)',
          en: 'Follow the directions on the map (yellow arrows)',
          ro: 'Urmați indicațiile de pe plan (săgețile galbene)',
          pl: 'Kieruj się oznaczeniami na planie (żółte strzałki)',
          pt: 'Siga as indicações do plano (setas amarelas)',
        },
        {
          fr: 'File d’attente le long du parking engins, sortie du parking laissée libre',
          en: 'Queue along the plant parking, keeping its exit clear',
          ro: 'Așteptați la coadă de-a lungul parcării utilajelor, lăsând ieșirea liberă',
          pl: 'Ustaw się w kolejce wzdłuż parkingu maszyn, nie blokując wyjazdu',
          pt: 'Fila de espera ao longo do parque de máquinas, deixando livre a saída do parque',
        },
        {
          fr: 'Devant la trémie : un camion en chargement et un seul en attente',
          en: 'At the hopper: one truck loading and only one waiting',
          ro: 'La buncăr: un camion la încărcare și doar unul în așteptare',
          pl: 'Przy koszu: jedna ciężarówka w załadunku i tylko jedna oczekująca',
          pt: 'Na tremonha: um camião a carregar e apenas um à espera',
        },
        {
          fr: 'Avancer sous la trémie en marche avant. [[plan-2]]',
          en: 'Drive forwards under the hopper. [[plan-2]]',
          ro: 'Intrați cu mersul înainte sub buncăr. [[plan-2]]',
          pl: 'Wjedź przodem pod kosz. [[plan-2]]',
          pt: 'Avance para debaixo da tremonha em marcha à frente. [[plan-2]]',
        },
      ],
    },
    {
      id: 'sortie',
      label: { fr: 'Trémie → Sortie', en: 'Hopper → Exit', ro: 'Buncăr → Ieșire', pl: 'Kosz → Wyjazd', pt: 'Tremonha → Saída' },
      color: BLEU,
      d: 'M 182 196 L 182 130 C 183 108 190 94 208 82 C 224 75 240 74 262 74 L 845 68 C 878 70 900 90 900 122 L 903 250 C 904 330 901 400 896 450 C 889 520 870 600 856 667',
      steps: [
        {
          fr: 'Quitter la trémie en marche avant',
          en: 'Leave the hopper driving forwards',
          ro: 'Ieșiți de sub buncăr cu mersul înainte',
          pl: 'Wyjedź spod kosza przodem',
          pt: 'Saia da tremonha em marcha à frente',
        },
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
          fr: 'Bâchage après la bascule de sortie',
          en: 'Sheet (tarp) the load after the exit weighbridge',
          ro: 'Acoperiți încărcătura cu prelata după cântarul de ieșire',
          pl: 'Plandekowanie ładunku za wagą wyjazdową',
          pt: 'Cobertura com lona depois da báscula de saída',
        },
        { fr: 'Sortie du site', en: 'Leave the site', ro: 'Ieșirea din carieră', pl: 'Wyjazd z terenu', pt: 'Saída do local' },
      ],
    },
    {
      id: 'acces-decharge',
      label: {
        fr: 'Accès décharge remblais',
        en: 'Access to the backfill tip',
        ro: 'Acces la depozitul de umplutură',
        pl: 'Dojazd do składowiska nasypu',
        pt: 'Acesso ao aterro',
      },
      color: VERT,
      d: 'M 905 240 C 888 262 881 290 881 320 C 882 380 882 440 880 490 C 878 540 872 600 868 667',
      steps: [
        {
          fr: 'Depuis la cour, prendre la voie verte le long de la bascule',
          en: 'From the yard, take the green lane alongside the weighbridge',
          ro: 'Din incintă, luați culoarul verde de-a lungul cântarului',
          pl: 'Z placu jedź zielonym pasem wzdłuż wagi',
          pt: 'A partir do pátio, siga pela via verde ao longo da báscula',
        },
        {
          fr: 'Descendre par la piste d’accès',
          en: 'Drive down the access track',
          ro: 'Coborâți pe pista de acces',
          pl: 'Zjedź drogą dojazdową',
          pt: 'Desça pela pista de acesso',
        },
        {
          fr: 'Continuer vers la décharge remblais',
          en: 'Continue to the backfill tip',
          ro: 'Continuați spre depozitul de umplutură',
          pl: 'Jedź dalej do składowiska nasypu',
          pt: 'Continue até ao aterro',
        },
      ],
    },
    {
      id: 'retour-cour',
      label: {
        fr: 'Accès cour après décharge',
        en: 'Yard access after tipping',
        ro: 'Acces în incintă după descărcare',
        pl: 'Wjazd na plac po rozładunku',
        pt: 'Acesso ao pátio depois da descarga',
      },
      color: VIOLET,
      d: 'M 846 667 C 852 610 864 540 878 494 C 882 476 874 462 845 458 C 800 452 720 451 640 451 L 566 448',
      steps: [
        {
          fr: 'Retour de la décharge remblais par la piste d’accès',
          en: 'Come back from the backfill tip by the access track',
          ro: 'Întoarceți-vă de la depozitul de umplutură pe pista de acces',
          pl: 'Wróć ze składowiska nasypu drogą dojazdową',
          pt: 'Regresse do aterro pela pista de acesso',
        },
        {
          fr: 'Bifurquer avant la bascule (flèche violette)',
          en: 'Turn off before the weighbridge (purple arrow)',
          ro: 'Virați înainte de cântar (săgeata mov)',
          pl: 'Skręć przed wagą (fioletowa strzałka)',
          pt: 'Vire antes da báscula (seta roxa)',
        },
        {
          fr: 'Piste basse vers l’ouest jusqu’à la cour',
          en: 'Follow the lower track west to the yard',
          ro: 'Urmați pista de jos spre vest până în incintă',
          pl: 'Jedź dolną drogą na zachód aż do placu',
          pt: 'Pista de baixo para oeste até ao pátio',
        },
      ],
    },
  ],
  // Pas de defaultRoute : on arrive sur le plan sans trajet affiché
  products: plan1Products,
  gps: plan1Gps,

  markers: [
    {
      id: 'vous-etes-ici',
      type: 'you-are-here',
      label: { fr: 'Vous êtes ici', en: 'You are here', ro: 'Sunteți aici', pl: 'Jesteś tutaj', pt: 'Está aqui' },
      x: 872,
      y: 618,
      description: { fr: 'Entrée du site.', en: 'Site entrance.', ro: 'Intrarea în carieră.', pl: 'Wjazd na teren.', pt: 'Entrada do local.' },
      provisoire: true, // PLACEHOLDER : position du QR code à confirmer
    },
  ],

  rules: [
    {
      title: { fr: 'Accès à la cour', en: 'Getting into the yard', ro: 'Accesul în incintă', pl: 'Wjazd na plac', pt: 'Acesso ao pátio' },
      text: {
        fr: 'Pour descendre dans la cour, prendre la piste de gauche après la bascule d’entrée, puis suivre les indications du plan pour accéder aux différentes parties de la cour et à la trémie.',
        en: 'To get down into the yard, take the left-hand track after the entry weighbridge, then follow the directions on the map to reach the different parts of the yard and the hopper.',
        ro: 'Pentru a coborî în incintă, luați pista din stânga după cântarul de intrare, apoi urmați indicațiile de pe plan pentru a ajunge în diferitele zone ale incintei și la buncăr.',
        pl: 'Aby zjechać na plac, za wagą wjazdową skręć w lewą drogę, a następnie kieruj się oznaczeniami na planie do poszczególnych części placu i do kosza.',
        pt: 'Para descer ao pátio, siga pela pista da esquerda depois da báscula de entrada e depois as indicações do plano para chegar às diferentes partes do pátio e à tremonha.',
      },
    },
    {
      title: { fr: 'Sens de circulation', en: 'Direction of traffic', ro: 'Sensul de circulație', pl: 'Kierunek ruchu', pt: 'Sentido de circulação' },
      text: {
        fr: 'Suivez les flèches : jaune pour entrer dans la cour, bleu pour sortir, vert pour aller à la décharge remblais, violet pour revenir dans la cour après décharge.',
        en: 'Follow the arrows: yellow to enter the yard, blue to leave, green to go to the backfill tip, purple to come back into the yard after tipping.',
        ro: 'Urmați săgețile: galben pentru intrarea în incintă, albastru pentru ieșire, verde pentru depozitul de umplutură, mov pentru revenirea în incintă după descărcare.',
        pl: 'Kieruj się strzałkami: żółte – wjazd na plac, niebieskie – wyjazd, zielone – dojazd do składowiska nasypu, fioletowe – powrót na plac po rozładunku.',
        pt: 'Siga as setas: amarelo para entrar no pátio, azul para sair, verde para ir ao aterro, roxo para voltar ao pátio depois da descarga.',
      },
    },
    {
      title: { fr: 'Fonctionnement de la trémie', en: 'Using the hopper', ro: 'Funcționarea buncărului', pl: 'Obsługa kosza zasypowego', pt: 'Funcionamento da tremonha' },
      text: {
        fr: 'Toutes les étapes du chargement sont sur la page Poste de chargement (trémie). [[plan-2]]',
        en: 'All the loading steps are on the Loading point (hopper) page. [[plan-2]]',
        ro: 'Toți pașii încărcării sunt pe pagina Punctul de încărcare (buncăr). [[plan-2]]',
        pl: 'Wszystkie kroki załadunku są na stronie Punkt załadunku (kosz zasypowy). [[plan-2]]',
        pt: 'Todos os passos da carga estão na página Posto de carga (tremonha). [[plan-2]]',
      },
    },
    {
      title: { fr: 'Attente trémie', en: 'Waiting for the hopper', ro: 'Așteptarea la buncăr', pl: 'Oczekiwanie do kosza', pt: 'Espera pela tremonha' },
      text: {
        fr: 'La file d’attente pour la trémie se fait le long du parking engins (laisser libre la sortie du parking engins). Devant la trémie : un camion en cours de chargement plus un en attente uniquement.',
        en: 'The queue for the hopper forms along the plant parking (keep the plant parking exit clear). At the hopper: one truck loading plus only one waiting.',
        ro: 'Coada pentru buncăr se formează de-a lungul parcării utilajelor (lăsați liberă ieșirea din parcarea utilajelor). La buncăr: un camion la încărcare plus doar unul în așteptare.',
        pl: 'Kolejka do kosza ustawia się wzdłuż parkingu maszyn (nie blokuj wyjazdu z parkingu maszyn). Przy koszu: jedna ciężarówka w trakcie załadunku i tylko jedna oczekująca.',
        pt: 'A fila de espera para a tremonha faz-se ao longo do parque de máquinas (deixe livre a saída do parque). Na tremonha: apenas um camião a carregar e um à espera.',
      },
    },
    {
      title: { fr: 'Sortie', en: 'Leaving the site', ro: 'Ieșirea', pl: 'Wyjazd', pt: 'Saída' },
      text: {
        fr: 'Reprendre la même piste pour remonter à la bascule de sortie. Le passage dans le laveur de roues est OBLIGATOIRE. Le bâchage s’effectue après être passé en bascule de sortie.',
        en: 'Take the same track back up to the exit weighbridge. The wheel wash is MANDATORY. Sheet (tarp) your load only after the exit weighbridge.',
        ro: 'Reluați aceeași pistă pentru a urca la cântarul de ieșire. Trecerea prin spălătoria de roți este OBLIGATORIE. Acoperirea cu prelată se face după cântarul de ieșire.',
        pl: 'Wróć tą samą drogą do wagi wyjazdowej. Przejazd przez myjnię kół jest OBOWIĄZKOWY. Plandekowanie ładunku odbywa się dopiero za wagą wyjazdową.',
        pt: 'Volte pela mesma pista para subir à báscula de saída. A passagem pelo lava-rodas é OBRIGATÓRIA. A cobertura com lona faz-se depois de passar na báscula de saída.',
      },
    },
    {
      title: { fr: 'Zones interdites', en: 'No-entry areas', ro: 'Zone interzise', pl: 'Strefy zakazane', pt: 'Zonas proibidas' },
      text: {
        fr: 'Ne franchissez jamais un panneau sens interdit (rond rouge sur le plan).',
        en: 'Never pass a no-entry sign (red circle on the map).',
        ro: 'Nu treceți niciodată de un indicator de acces interzis (cercul roșu de pe plan).',
        pl: 'Nigdy nie mijaj znaku zakazu wjazdu (czerwone koło na planie).',
        pt: 'Nunca passe um sinal de sentido proibido (círculo vermelho no plano).',
      },
    },
    {
      title: { fr: 'Vitesse limitée', en: 'Speed limit', ro: 'Limită de viteză', pl: 'Ograniczenie prędkości', pt: 'Velocidade limitada' },
      text: {
        fr: '30 km/h maximum dans la carrière.',
        en: '30 km/h maximum in the quarry.',
        ro: 'Maximum 30 km/h în carieră.',
        pl: 'Maksymalnie 30 km/h na terenie kamieniołomu.',
        pt: 'Máximo de 30 km/h na pedreira.',
      },
    },
    {
      title: { fr: 'Priorité aux engins', en: 'Plant has priority', ro: 'Prioritate pentru utilaje', pl: 'Pierwszeństwo maszyn', pt: 'Prioridade às máquinas' },
      text: {
        fr: 'Les chargeurs et engins de carrière sont toujours prioritaires. Restez hors de leur champ d’action.',
        en: 'Loaders and quarry plant always have priority. Stay out of their working area.',
        ro: 'Încărcătoarele și utilajele carierei au întotdeauna prioritate. Rămâneți în afara razei lor de acțiune.',
        pl: 'Ładowarki i maszyny kamieniołomu mają zawsze pierwszeństwo. Trzymaj się poza ich strefą pracy.',
        pt: 'As pás carregadoras e as máquinas da pedreira têm sempre prioridade. Mantenha-se fora da sua zona de trabalho.',
      },
    },
    {
      title: { fr: 'EPI obligatoires', en: 'Mandatory PPE', ro: 'EIP obligatoriu', pl: 'Obowiązkowe ŚOI', pt: 'EPI obrigatórios' },
      text: {
        fr: 'Hors de la cabine : gilet haute visibilité, chaussures de sécurité et casque.',
        en: 'Outside the cab: high-visibility vest, safety shoes and helmet.',
        ro: 'În afara cabinei: vestă reflectorizantă, încălțăminte de protecție și cască.',
        pl: 'Poza kabiną: kamizelka odblaskowa, obuwie ochronne i kask.',
        pt: 'Fora da cabine: colete de alta visibilidade, calçado de segurança e capacete.',
      },
    },
  ],
};
