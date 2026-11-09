import type { ProcedureData } from '../types';

/**
 * PAGE 2 — Fonctionnement du poste de chargement.
 * Retranscription fidèle de l'affiche (sources/plan-2-affiche.webp), en 4 langues.
 * Mise en forme : **gras** et [[badge]] (étiquette verte « ← badge » du lecteur).
 */
export const plan2: ProcedureData = {
  eyebrow: { fr: 'Plan 2 · Trémie', en: 'Map 2 · Hopper', ro: 'Plan 2 · Buncăr', pl: 'Plan 2 · Kosz zasypowy', pt: 'Plano 2 · Tremonha' },
  // Comme sur l'affiche : « Fonctionnement » en gras, la suite plus légère
  title: {
    fr: '**Fonctionnement** Poste de chargement',
    en: '**How to use** the loading point',
    ro: '**Funcționarea** punctului de încărcare',
    pl: '**Obsługa** punktu załadunku',
    pt: '**Funcionamento** do posto de carga',
  },
  description: {
    fr: 'Chargement à la trémie en 6 étapes.',
    en: 'Loading at the hopper in 6 steps.',
    ro: 'Încărcarea la buncăr în 6 pași.',
    pl: 'Załadunek pod koszem w 6 krokach.',
    pt: 'Carga na tremonha em 6 passos.',
  },

  steps: [
    {
      fr: 'Présenter le **badge** sur le **premier boîtier** qui se trouve **avant la trémie sur votre gauche**, sur le lecteur qui est désigné par une flèche verte avec écrit [[badge]].',
      en: 'Present your **badge** at the **first box**, located **before the hopper on your left**, on the reader marked by a green arrow labelled [[badge]].',
      ro: 'Prezentați **ecusonul** la **prima cutie**, aflată **înainte de buncăr, pe partea stângă**, pe cititorul indicat de o săgeată verde cu inscripția [[badge]].',
      pl: 'Przyłóż **identyfikator** do **pierwszej skrzynki**, która znajduje się **przed koszem po lewej stronie**, do czytnika oznaczonego zieloną strzałką z napisem [[badge]].',
      pt: 'Apresente o **cartão** na **primeira caixa**, que se encontra **antes da tremonha, do seu lado esquerdo**, no leitor indicado por uma seta verde com a inscrição [[badge]].',
    },
    {
      fr: 'Une fois que le **feu passe au vert** et que **l’alarme retentit**, avancer **uniquement en marche avant sous la trémie**.',
      en: 'Once the **light turns green** and the **alarm sounds**, drive **forwards only under the hopper**.',
      ro: 'După ce **semaforul devine verde** și **alarma sună**, înaintați **doar cu mersul înainte sub buncăr**.',
      pl: 'Gdy **światło zmieni się na zielone** i **zabrzmi sygnał**, wjedź **wyłącznie przodem pod kosz**.',
      pt: 'Quando o **semáforo ficar verde** e o **alarme tocar**, avance **apenas em marcha à frente para debaixo da tremonha**.',
    },
    {
      fr: 'Appuyez sur le **bouton vert** à votre gauche pour valider le chargement.',
      en: 'Press the **green button** on your left to confirm the loading.',
      ro: 'Apăsați **butonul verde** din stânga pentru a valida încărcarea.',
      pl: 'Naciśnij **zielony przycisk** po lewej stronie, aby zatwierdzić załadunek.',
      pt: 'Carregue no **botão verde** à sua esquerda para validar a carga.',
    },
    {
      fr: 'Vérifier sur l’**afficheur** que c’est le **bon produit** qui est en cours de chargement.',
      en: 'Check on the **display** that the **right product** is being loaded.',
      ro: 'Verificați pe **afișaj** că se încarcă **produsul corect**.',
      pl: 'Sprawdź na **wyświetlaczu**, czy ładowany jest **właściwy produkt**.',
      pt: 'Verifique no **painel** que está a ser carregado o **produto certo**.',
    },
    {
      fr: 'S’aider du **miroir** et/ou du **poids affiché** sur l’afficheur pour répartir le chargement dans la benne.',
      en: 'Use the **mirror** and/or the **weight shown** on the display to spread the load evenly in the body.',
      ro: 'Folosiți **oglinda** și/sau **greutatea afișată** pe afișaj pentru a repartiza încărcătura în benă.',
      pl: 'Korzystaj z **lusterka** i/lub **wagi pokazanej** na wyświetlaczu, aby równomiernie rozłożyć ładunek na skrzyni.',
      pt: 'Use o **espelho** e/ou o **peso indicado** no painel para distribuir a carga na caixa do camião.',
    },
    {
      fr: 'Une fois le chargement terminé, l’afficheur indique : **« Chargement terminé. Bonne route. »**',
      en: 'When loading is finished, the display shows: **« Chargement terminé. Bonne route. »** (Loading finished. Have a safe trip.)',
      ro: 'La finalul încărcării, afișajul indică: **« Chargement terminé. Bonne route. »** (Încărcare terminată. Drum bun.)',
      pl: 'Po zakończeniu załadunku wyświetlacz pokaże: **« Chargement terminé. Bonne route. »** (Załadunek zakończony. Szerokiej drogi.)',
      pt: 'No fim da carga, o painel indica: **« Chargement terminé. Bonne route. »** (Carga terminada. Boa viagem.)',
    },
  ],

  notes: [
    {
      tone: 'warning',
      label: { fr: 'En cas de problème', en: 'If there is a problem', ro: 'În caz de problemă', pl: 'W razie problemu', pt: 'Em caso de problema' },
      text: {
        fr: 'Appelez la **bascule** :',
        en: 'Call the **weighbridge**:',
        ro: 'Sunați la **cântar**:',
        pl: 'Zadzwoń na **wagę**:',
        pt: 'Ligue para a **báscula**:',
      },
      tel: '06 02 12 63 58',
    },
    {
      tone: 'info',
      label: { fr: 'Info', en: 'Info', ro: 'Info', pl: 'Informacja', pt: 'Informação' },
      attention: true,
      text: {
        fr: 'L’attente pour la trémie se fait **le long du parking à engins**.',
        en: 'Wait for the hopper **along the plant parking area**.',
        ro: 'Așteptarea pentru buncăr se face **de-a lungul parcării utilajelor**.',
        pl: 'Na kosz czeka się **wzdłuż parkingu maszyn**.',
        pt: 'A espera pela tremonha faz-se **ao longo do parque de máquinas**.',
      },
    },
  ],
};
