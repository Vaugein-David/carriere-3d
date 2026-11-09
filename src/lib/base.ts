/**
 * Préfixe des adresses quand le site est publié dans un sous-dossier (GitHub Pages : /carriere-3d).
 * Vide en local. Les liens <Link> de Next le reçoivent tout seuls ; les images, le modèle 3D
 * et les liens <a> ordinaires passent par withBase().
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const withBase = (path: string) => (path.startsWith('/') ? BASE + path : path);
