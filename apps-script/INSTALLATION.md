# Installer l'enregistrement des signatures

À faire une seule fois, environ 10 minutes, **connecté au compte Google de l'entreprise**. Le tableau et les signatures seront créés dans le Drive de ce compte.

## 1. Créer le script

1. Ouvrez https://script.google.com et cliquez sur **Nouveau projet**.
2. Renommez le projet en haut à gauche : `Signatures chauffeurs`.
3. Effacez le contenu de `Code.gs`, puis collez-y tout le contenu du fichier `apps-script/Code.gs` de ce dossier.
4. Enregistrez (icône disquette).

## 2. Créer le tableau et le dossier

1. Dans la liste en haut, choisissez la fonction **installer**, puis cliquez sur **Exécuter**.
2. Google demande une autorisation. Choisissez le compte de l'entreprise.
3. Si Google affiche « Google n'a pas validé cette application », cliquez sur **Paramètres avancés**, puis sur **Accéder à Signatures chauffeurs**, puis sur **Autoriser**. Cet avertissement est normal pour un script écrit pour vous.
4. Le journal en bas affiche les liens du tableau et du dossier **Signatures chauffeurs**. Ils apparaissent aussi dans votre Drive.

## 3. Mettre le script en service

1. Cliquez sur **Déployer**, puis **Nouveau déploiement**.
2. Cliquez sur la roue dentée, puis choisissez **Application Web**.
3. Réglez :
   - **Exécuter en tant que** : Moi ;
   - **Qui peut accéder** : Tout le monde. Sans ce réglage, les chauffeurs ne pourront pas envoyer leur signature.
4. Cliquez sur **Déployer**, puis copiez l'**URL de l'application Web**. Elle se termine par `/exec`.

Pour vérifier, ouvrez cette URL dans une **fenêtre de navigation privée**, sans être connecté à Google : la page doit afficher `{"ok":true,"service":"signatures-carriere"}`. Si Google demande de se connecter, l'accès n'est pas réglé sur « Tout le monde » et les chauffeurs ne pourront pas signer. Corrigez-le avec **Déployer**, **Gérer les déploiements**, le crayon, **Qui peut accéder : Tout le monde** et **Version : Nouvelle version**. L'URL ne change pas.

Si « Tout le monde » n'est pas proposé, le compte Google Workspace de l'entreprise l'interdit : demandez à son administrateur de l'autoriser.

## 4. Activer la page de signature

Ces deux valeurs vont dans `src/data/signature.ts`. Tant qu'elles sont vides, le bouton de signature n'apparaît pas.

- `url` : l'URL copiée à l'étape 3 ;
- `responsable` : le nom de l'entreprise, affiché au chauffeur.

Publiez ensuite le site. Faites une signature d'essai et vérifiez que la ligne, l'image et le PDF arrivent bien.

## Au quotidien

- **Vérifier un chauffeur** : cherchez son nom ou sa plaque dans le tableau (Ctrl + F). La colonne **Contrôle bascule** est libre pour noter la vérification.
- **Donner accès à la bascule** : partagez le tableau en tant qu'**éditeur**. Les autres colonnes restent protégées : seul le compte propriétaire peut les modifier. Limitez cet accès à 1 ou 2 personnes.
- **Ne partagez jamais le dossier Drive par lien public** : il contient des données personnelles.
- **Nouvelles consignes ou nouveau plan** : changez `version` dans `src/data/signature.ts`, puis publiez. Les chauffeurs peuvent signer la nouvelle version, et l'historique Git garde le contenu exact de chaque version, plan compris.
- **Durée de conservation** : l'entreprise a choisi de conserver les signatures sans limite de durée, et la page le dit au chauffeur avant qu'il signe. Rien n'est supprimé automatiquement. Une demande d'effacement reçue à la bascule se traite à la main : supprimer la ligne, l'image et le PDF.
- **Modifier le script plus tard** : passez par **Déployer**, **Gérer les déploiements**, le crayon, puis **Nouvelle version**. L'URL ne change pas.
