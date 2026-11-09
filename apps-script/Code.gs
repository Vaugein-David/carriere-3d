/**
 * Enregistrement des signatures des chauffeurs (Google Apps Script).
 *
 * Reçoit la signature envoyée par la page /carriere/signature/, puis :
 *  - enregistre l'image de la signature et un PDF de preuve dans Google Drive ;
 *  - ajoute une ligne au tableau Google Sheets ;
 *  - attribue un code de référence à la signature (non affiché au chauffeur).
 *
 * Installation : voir apps-script/INSTALLATION.md.
 * Ce script ne relève ni l'adresse IP ni la position du téléphone.
 */

const FUSEAU = 'Europe/Paris';
const NOM_DOSSIER = 'Signatures chauffeurs';
const NOM_TABLEAU = 'Signatures chauffeurs';
const ENTETES = [
  'Code',
  'Date et heure (Paris)',
  'Nom et prénom',
  'Société',
  'Immatriculation',
  'Badge',
  'Langue',
  'Version signée',
  'Empreinte SHA-256 du texte',
  'Image de la signature',
  'PDF de preuve',
  'Contrôle bascule',
];
const LANGUES = ['fr', 'en', 'ro', 'pl', 'pt'];
const MAX_SIGNATURE = 300000; // caractères base64, environ 220 Ko
const MAX_TEXTE = 40000;
const MAX_PAR_MINUTE = 30;
const DUREE_CACHE = 21600; // 6 h : un renvoi après coupure réseau ne crée pas de doublon

/** À lancer une seule fois depuis l'éditeur : crée le tableau et le dossier Drive. */
function installer() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SHEET_ID')) {
    Logger.log('Déjà installé : ' + SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl());
    return;
  }
  const dossier = DriveApp.createFolder(NOM_DOSSIER);
  const classeur = SpreadsheetApp.create(NOM_TABLEAU);
  DriveApp.getFileById(classeur.getId()).moveTo(dossier);

  const feuille = classeur.getSheets()[0];
  feuille.setName('Signatures');
  feuille.getRange(1, 1, 1, ENTETES.length).setValues([ENTETES]).setFontWeight('bold');
  feuille.setFrozenRows(1);

  // Seul le compte propriétaire peut modifier les lignes ; la colonne « Contrôle bascule » reste libre
  const protection = feuille.protect().setDescription('Signatures : ne pas modifier');
  protection.setUnprotectedRanges([feuille.getRange(2, ENTETES.length, feuille.getMaxRows() - 1, 1)]);
  protection.addEditor(Session.getEffectiveUser());
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) protection.setDomainEdit(false);

  props.setProperties({ SHEET_ID: classeur.getId(), FOLDER_ID: dossier.getId() });
  Logger.log('Tableau : ' + classeur.getUrl());
  Logger.log('Dossier : ' + dossier.getUrl());
}

/** Permet de vérifier que le déploiement répond (sans donnée personnelle). */
function doGet() {
  const pret = !!PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return json({ ok: pret, service: 'signatures-carriere' });
}

function doPost(e) {
  const verrou = LockService.getScriptLock();
  try {
    verrou.waitLock(25000);
  } catch (err) {
    return json({ ok: false, error: 'busy' });
  }
  try {
    return json(enregistrer(JSON.parse(e.postData.contents)));
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server' });
  } finally {
    verrou.releaseLock();
  }
}

function enregistrer(d) {
  // Champ invisible sur la page : seul un robot le remplit
  if (d.website) return { ok: false, error: 'invalid' };
  const invalide = verifier(d);
  if (invalide) return { ok: false, error: 'invalid', field: invalide };

  const cache = CacheService.getScriptCache();
  const cleRequete = 'req:' + d.requestId;
  const dejaRecu = cache.get(cleRequete);
  if (dejaRecu) return JSON.parse(dejaRecu);
  if (tropDeRequetes(cache)) return { ok: false, error: 'busy' };

  const props = PropertiesService.getScriptProperties();
  const maintenant = new Date();
  const date = Utilities.formatDate(maintenant, FUSEAU, 'yyyy-MM-dd HH:mm:ss');
  const code = nouveauCode();
  const nom = propre(d.name);
  const societe = propre(d.company);
  const plaque = propre(d.plate).toUpperCase();
  const badge = propre(d.badge || '');
  const empreinte = sha256(d.document);
  const base = Utilities.formatDate(maintenant, FUSEAU, 'yyyy-MM-dd') + '_' + code + '_' + nomDeFichier(nom);

  const dossier = dossierDuMois(DriveApp.getFolderById(props.getProperty('FOLDER_ID')), maintenant);
  const octets = Utilities.base64Decode(d.signature.split(',')[1]);
  const image = dossier.createFile(Utilities.newBlob(octets, 'image/png', base + '.png'));

  // Le PDF ne doit jamais faire perdre une signature : en cas d'échec, la ligne reste enregistrée
  let lienPdf = 'Erreur PDF';
  try {
    const html = pagePreuve({ code, date, nom, societe, plaque, badge, langue: d.lang, version: d.version, empreinte, texte: d.document, signature: d.signature });
    const pdf = HtmlService.createHtmlOutput(html).getAs('application/pdf').setName(base + '.pdf');
    lienPdf = dossier.createFile(pdf).getUrl();
  } catch (err) {
    console.error(err);
  }

  const feuille = SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheets()[0];
  const ligne = [code, date, nom, societe, plaque, badge, d.lang, d.version, empreinte, image.getUrl(), lienPdf, ''];
  feuille.appendRow(ligne.map(sansFormule));

  const reponse = { ok: true, code: code, date: date };
  cache.put(cleRequete, JSON.stringify(reponse), DUREE_CACHE);
  return reponse;
}

/** Renvoie le nom du premier champ incorrect, sinon null. */
function verifier(d) {
  const texte = (v, min, max) => typeof v === 'string' && propre(v).length >= min && propre(v).length <= max;
  if (!(typeof d.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(d.requestId))) return 'requestId';
  if (!texte(d.name, 2, 80)) return 'name';
  if (!texte(d.company, 2, 80)) return 'company';
  if (!texte(d.plate, 2, 20)) return 'plate';
  if (d.badge && !texte(d.badge, 1, 30)) return 'badge';
  if (LANGUES.indexOf(d.lang) < 0) return 'lang';
  if (!texte(d.version, 1, 40)) return 'version';
  if (!(typeof d.document === 'string' && d.document.length > 0 && d.document.length <= MAX_TEXTE)) return 'document';
  if (d.accepted !== true) return 'accepted';
  if (!signatureValide(d.signature)) return 'signature';
  return null;
}

function signatureValide(s) {
  const prefixe = 'data:image/png;base64,';
  if (typeof s !== 'string' || s.indexOf(prefixe) !== 0 || s.length > MAX_SIGNATURE) return false;
  try {
    const o = Utilities.base64Decode(s.slice(prefixe.length));
    // Signature de fichier PNG : 89 50 4E 47 (les octets sont signés en Apps Script)
    return o.length > 8 && (o[0] & 255) === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47;
  } catch (err) {
    return false;
  }
}

function tropDeRequetes(cache) {
  const cle = 'minute:' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(cle) || 0) + 1;
  cache.put(cle, String(n), 120);
  return n > MAX_PAR_MINUTE;
}

function dossierDuMois(racine, date) {
  const nom = Utilities.formatDate(date, FUSEAU, 'yyyy-MM');
  const existants = racine.getFoldersByName(nom);
  return existants.hasNext() ? existants.next() : racine.createFolder(nom);
}

/** Code court sans caractères ambigus (0/O, 1/I) */
function nouveauCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[(octets[i] & 255) % alphabet.length];
  return 'S-' + code;
}

function sha256(texte) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texte, Utilities.Charset.UTF_8)
    .map((o) => ((o & 255) + 256).toString(16).slice(1))
    .join('');
}

function propre(v) {
  return String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Empêche une valeur saisie (« =IMPORTXML(...) ») d'être exécutée comme formule par le tableau. */
function sansFormule(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}

function nomDeFichier(nom) {
  return nom.normalize('NFD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'chauffeur';
}

function echapper(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pagePreuve(p) {
  const e = echapper;
  const ligne = (k, v) => '<tr><th>' + e(k) + '</th><td>' + e(v) + '</td></tr>';
  return (
    '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:11pt;color:#000}h1{font-size:17pt;margin:0 0 4pt}' +
    'table{border-collapse:collapse;width:100%;margin:8pt 0}th,td{border:1px solid #888;padding:4pt 6pt;text-align:left;vertical-align:top}' +
    'th{width:34%;background:#eee}img{height:110pt;border:1px solid #888}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:9.5pt}' +
    '.mono{font-family:monospace;font-size:8pt;word-break:break-all}' +
    '</style></head><body>' +
    '<h1>Prise de connaissance du plan et des consignes de sécurité</h1>' +
    '<table>' +
    ligne('Code', p.code) +
    ligne('Date et heure (serveur, Paris)', p.date) +
    ligne('Nom et prénom', p.nom) +
    ligne('Société', p.societe) +
    ligne('Immatriculation', p.plaque) +
    ligne('Badge', p.badge || '-') +
    ligne('Langue de lecture', p.langue) +
    ligne('Version signée', p.version) +
    '<tr><th>Empreinte SHA-256 du texte</th><td class="mono">' + e(p.empreinte) + '</td></tr>' +
    '</table>' +
    '<p><strong>Signature :</strong></p><img src="' + e(p.signature) + '">' +
    '<h2>Texte présenté au chauffeur</h2><pre>' + e(p.texte) + '</pre>' +
    '</body></html>'
  );
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
