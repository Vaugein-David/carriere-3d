// Génère les QR codes des pages (PNG haute résolution + SVG) dans ./qr
//
//   npm run qr                                         → utilise "homepage" de package.json
//   npm run qr -- https://mon-compte.github.io/carriere/ → URL de base explicite
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

// `accueil` : QR code unique vers la page d'accueil, qui renvoie vers les deux plans
const PAGES = { accueil: '', 'plan-1': 'plan-1/', 'plan-2': 'plan-2/' };
const OUT_DIR = fileURLToPath(new URL('../qr/', import.meta.url));

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const base = process.argv[2] ?? process.env.SITE_URL ?? pkg.homepage ?? '';

if (!/^https?:\/\//.test(base) || base.includes('VOTRE-UTILISATEUR')) {
  console.error(
    'URL de base manquante. Renseignez "homepage" dans package.json ou lancez :\n' +
      '  npm run qr -- https://<utilisateur>.github.io/carriere/',
  );
  process.exit(1);
}

const baseUrl = base.endsWith('/') ? base : `${base}/`;
// Correction d'erreur H (30 %) : le QR reste lisible même sali ou abîmé en extérieur
const options = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#000000', light: '#ffffff' } };

await mkdir(OUT_DIR, { recursive: true });

for (const [page, path] of Object.entries(PAGES)) {
  const url = new URL(path, baseUrl).href;
  await QRCode.toFile(`${OUT_DIR}${page}.png`, url, { ...options, width: 2048 });
  await writeFile(`${OUT_DIR}${page}.svg`, await QRCode.toString(url, { ...options, type: 'svg' }));
  console.log(`${page.padEnd(7)}  →  ${url}`);
}

console.log('\nQR codes écrits dans ./qr (PNG 2048 px + SVG).');
