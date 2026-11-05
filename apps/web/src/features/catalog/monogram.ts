const STOPWORDS = new Set([
  'of',
  'the',
  'and',
  'a',
  'an',
  'de',
  'la',
  'el',
  'los',
  'las',
  'del',
  'y',
]);

const split = (name: string): string[] =>
  name
    .replace(/\([^)]*\)/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Iniciales de la portada por defecto.
 * "Age of Empires 2" -> "A2", "Zenless Zone Zero" -> "ZZ", "Genshin" -> "G".
 */
export function monogram(name: string): string {
  const words = split(name).filter((word) => !STOPWORDS.has(word.toLowerCase()));
  const letters = words.filter((word) => /^\p{L}/u.test(word));
  const number = words.find((word) => /^\d+$/.test(word));

  if (number && letters.length > 0) {
    return (letters[0][0] + number).toUpperCase();
  }

  if (letters.length >= 2) {
    return (letters[0][0] + letters[1][0]).toUpperCase();
  }

  if (letters.length === 1) {
    return letters[0][0].toUpperCase();
  }

  return number ? number[0] : '?';
}
