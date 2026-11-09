/** Noir ou blanc selon la luminosité d'une couleur (#rgb ou #rrggbb) */
export function inkOn(color: string): string {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#000' : '#fff';
}
