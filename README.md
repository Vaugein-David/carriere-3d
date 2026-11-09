# Carrière : plans interactifs (Next.js)

Version Next.js du projet [`carriere`](https://github.com/Vaugein-David/carriere). Elle reprend les mêmes données et fonctions, avec une nouvelle mise en page de style « maquette d'architecte » et une **maquette 3D** de la cour réalisée sous Blender.

| Page | Contenu | Données |
| --- | --- | --- |
| `/` | Accueil : carrousel des plans, consignes, étapes de la trémie | `src/data/accueil.ts` |
| `/plan-1` | Plan de circulation 2D (zoom, itinéraires par produit, mode `?edit`) | `src/data/plan-1*.ts` |
| `/plan-2` | Poste de chargement (trémie) en 6 étapes | `src/data/plan-2.ts` |
| `/plan-3d` | **Nouveau** : maquette 3D orbitable, itinéraire du produit en volume | `src/data/plan-3d.ts` + `public/models/carriere.glb` |
| `/signature` | Signature du plan et des consignes (Apps Script) | `src/data/signature.ts` |

Stack : Next.js 16 (App Router) + React 19 + TypeScript strict, GSAP pour les animations, three.js / React Three Fiber pour la 3D. La police est Inter Tight (`next/font`).

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000. Pour un essai en conditions réelles : `npm run build && npm start`.

## Version en ligne (GitHub Pages)

Le site est publié sur **https://vaugein-david.github.io/carriere-3d/**. Il est en https, donc le GPS « Me localiser » fonctionne sur téléphone.

Chaque push sur `main` relance la publication (`.github/workflows/pages.yml`) : `npm run build:pages` produit un export statique dans `out/`, servi sous `/carriere-3d`. Les images et le modèle 3D passent par `withBase()` ([`src/lib/base.ts`](src/lib/base.ts)) pour recevoir ce préfixe. En local, le préfixe est vide.

## Liens directs

- `/plan-1?produit=<id>` et `/plan-3d?produit=<id>` ouvrent directement l'itinéraire vers un produit (ex. `?produit=20-40-sv`). Les deux pages se renvoient l'une vers l'autre avec le produit choisi.
- `/plan-1?focus=<id>` et `/plan-3d?focus=<id>` centrent la vue sur une zone (ex. `?focus=tremie`, `?focus=centrale-beton`).
- `/plan-1?edit` : mode édition (relevé de coordonnées, tracés, zones, **calage GPS**).
- `?gps=demo` : position GPS simulée (voir ci-dessous).

## GPS : « Me localiser » sur le site

Le bouton viseur (plan 2D, en bas à droite) et « Me localiser » (barre de la 3D) affichent la position du téléphone en point bleu : cercle de précision, flèche de direction quand on roule, et la vue qui suit. Si on déplace le plan à la main, le suivi s'arrête ; un nouvel appui sur le bouton le reprend, un troisième coupe la localisation.

**1. Calage du plan.** Il est déjà fait pour la carrière SMBP de Viabon : la photo du plan a été superposée à l'orthophoto IGN géoréférencée (173 détails communs, écart médian d'environ 20 cm, voir `scripts/gps/recalage-ign.py` et `sources/recalage-gps-plan-1.json`). Les points sont dans [`src/data/plan-1-gps.ts`](src/data/plan-1-gps.ts). Il reste à vérifier sur place que le point bleu tombe au bon endroit. S'il est décalé, ou si la photo du plan change, ajoutez ou remplacez des points relevés sur le terrain :

1. Ouvrez `/plan-1?edit` sur le téléphone, outil **Calage GPS**.
2. Placez-vous sur un point facile à reconnaître sur la photo (coin de bâtiment, bascule, trémie…), attendez une précision de moins de 10 m, puis touchez ce point sur le plan.
3. Recommencez sur 4 à 6 points répartis aux quatre coins de la cour. L'écart moyen du calage s'affiche : visez moins de 5 m.
4. Collez les lignes obtenues dans [`src/data/plan-1-gps.ts`](src/data/plan-1-gps.ts).

Tant qu'il y a moins de 3 points, le bouton affiche « Le GPS n'est pas encore calé sur ce plan ».

**2. Ouvrir le site en https sur le téléphone.** Les navigateurs n'autorisent la géolocalisation qu'en https (ou sur `localhost`). Pour essayer depuis un téléphone sur le même Wi-Fi que l'ordinateur :

```bash
npm run dev:https
```

Next.js crée un certificat local (il peut demander le mot de passe de la session pour l'enregistrer), puis ouvrez `https://<adresse-IP-de-l'ordinateur>:3000/plan-1` sur le téléphone et acceptez l'avertissement de certificat. Pour une utilisation dans la carrière, sans ordinateur à côté, le site devra être publié en https (par exemple sur GitHub Pages comme la version d'origine).

**Essayer sans être sur place :** ajoutez `?gps=demo` à l'adresse (`/plan-1?gps=demo`, `/plan-3d?gps=demo`) puis appuyez sur le bouton : un camion simulé suit le premier itinéraire.

## Maquette 3D (Blender)

La maquette reproduit la carrière telle qu'elle est :

- **Relief réel** : modèle numérique de surface haute résolution de l'IGN (`ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES.MNS`, 50 cm), qui contient le vrai volume des stocks et de la fosse (environ 13 m de profondeur). Le LiDAR HD « pur » n'est pas encore publié sur cette zone. Le MNT n'y est pas exploitable : la fosse y est lissée. Les structures fines (convoyeurs, charpentes) sont retirées du relief par filtrage, puis modélisées à part. Sous chaque bâtiment, le sol est aplani.
- **Photo drapée** : orthophoto IGN récente (16 cm par pixel), contraste renforcé.
- **Pas d'anciens tas dans le relief** : les stocks bougent, et le relevé IGN en montre d'anciens. Dans l'emprise du plan, le sol est donc le fond de fouille lissé (`sources/3d/sol.f32`), et les tas en 3D sont ceux du plan 1, colorés selon le produit. Le relief réel n'est gardé qu'autour : bords de la fosse et champs (`RELIEF_HORS_PLAN` dans le script Blender).
- **Installations** modélisées d'après les photos du site et positionnées sur l'orthophoto : 24 convoyeurs (hauteurs lues sur le MNS, jusqu'à 20 m en tête de stockeur), les deux grands silos noirs et leurs cases béton, les clarificateurs, les tours de l'usine, le hangar à deux nefs, la trémie, l'usine à boues, la centrale à béton, la bascule, le laveur, la rangée de peupliers, les rangées de blocs calcaires le long des pistes, les mâts d'éclairage, des conteneurs, des tombereaux articulés, des chargeuses, des pelles, des nacelles et des camions. Le niveau de détail suit les photos : treillis et capots par tronçons des galeries, passerelles et garde-corps, chevalets treillissés, échelles à crinoline, escaliers, hydrocyclones, vis à ciment et bardage nervuré. Tout est décrit dans [`scripts/blender/installations.py`](scripts/blender/installations.py) (repère du plan), modifiable sans toucher au script.
- **Flèches de circulation et panneaux** du plan 1, posés sur le relief.
- **Vidéo de drone du site** : elle a servi à affiner les formes. Les galeries hautes reposent sur des pylônes pyramidaux à trois pieds. Les stockeurs radiaux ont une tête rouge. Les deux usines de lavage (une par clarificateur) sont des cabines blanches sur charpente, avec crible, hydrocyclones et tuyaux bleus. Les pignons du hangar sont clairs, avec une ouverture en arc. La cuve de l'usine à boues est basse et noire. Sous les convoyeurs qui passent bas au-dessus des tas, le relief est nettoyé des crêtes laissées par la structure.

Pour régénérer :

```bash
npm run model:relief
```

Cette commande télécharge le relief et la photo IGN dans `sources/3d/`. Elle demande Python avec `numpy` et `opencv-python-headless`, et n'est à relancer que pour des données IGN plus récentes.

```bash
npm run model
```

Cette commande construit la maquette dans Blender, en arrière-plan, puis écrit `public/models/carriere.glb` et les rendus `public/renders/*.webp`. Blender 5.x doit être dans `/Applications/Blender.app`. Le modèle pèse environ 3 Mo, grâce à la compression Draco. Le décodeur est servi par le site depuis `public/draco/` (copié de `three`), sans CDN.

Pour exporter seulement le modèle, sans refaire les rendus, lancez la même commande Blender avec `CARRIERE_RENDER=export`. Pour un simple essai, sans rendu ni export, utilisez `CARRIERE_RENDER=0`.

Dans le navigateur, les étiquettes, les itinéraires et le point GPS sont posés sur le relief par lancer de rayons. Le stock choisi est entouré d'un contour lumineux, avec une colonne jaune au-dessus. Les emplacements des stocks viennent du plan 2D : s'ils ont bougé, corrigez `src/data/plan-1-annotations.ts`.

## Langues

Français, anglais, roumain, polonais et portugais (sélecteur dans la barre du haut). La langue du téléphone est choisie automatiquement, puis le choix du visiteur est mémorisé. Dans `src/data/*.ts`, chaque texte s'écrit `{ fr: '…', en: '…', ro: '…', pl: '…', pt: '…' }`. Une langue absente affiche le français. Les textes de l'interface sont dans `src/i18n.tsx`.

Mise en forme des titres de l'accueil et de la 3D : `*italique*`, `{1}` `{2}` pour les petites photos rondes, `\n` pour un retour à la ligne.

## Annotations, itinéraires et données à compléter

Inchangés par rapport à la version Vite :

- **Annotations du plan 1** : `src/data/plan-1-annotations.ts` (stocks, bâtiments, flèches, sens interdits, textes) dans le repère 961 × 667.
- **Itinéraires vers les produits** : `src/data/plan-1-produits.ts`.
- **Valeurs provisoires** : commentées `PLACEHOLDER`, et affichées avec un badge « À confirmer » (`provisoire: true`).
- **Orthophoto** : `public/plan-1.webp` (IGN BD ORTHO®, Licence Ouverte Etalab 2.0, mention obligatoire affichée sous le plan et en pied de page).

## Signature des chauffeurs

Voir `apps-script/INSTALLATION.md`. Les boutons se masquent ou se réaffichent avec `boutons` dans `src/data/signature.ts`. Pensez à changer `version` quand les consignes changent.

## Organisation du code

```
src/app/            routes Next.js (chaque page charge sa vue côté navigateur)
src/views/          pages : Accueil, Plan1, Plan2, Plan3D, Signature
src/components/     visionneuse 2D, scène 3D (QuarryScene), coque du site (SiteShell)…
src/data/           tous les textes et données
src/styles/         globals.css (design) et plan.css (visionneuse 2D)
scripts/blender/    génération de la maquette 3D
```

## Différences avec la version Vite

- Plus de PWA hors ligne. Le site est publié dans un dépôt séparé, `carriere-3d`, sous `/carriere-3d/`.
- Nouvelle page `/plan-3d` et nouveaux liens profonds `?produit=`.
- `npm run qr` fonctionne toujours, mais il génère les QR codes de l'URL indiquée dans `homepage`.
