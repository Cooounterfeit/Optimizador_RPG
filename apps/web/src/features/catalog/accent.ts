/** Hue estable por texto: el mismo juego siempre recibe el mismo arte. */
export function accentHue(seed: string): number {
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return hash % 360;
}
