/**
 * Las reglas de un nombre escrito por el autor
 * ============================================
 * Un solo sitio para las tres preguntas que se repiten en todo el editor: si
 * hay nombre, si cabe, y si ya existe. Las hace CFG-05 con el nombre de un
 * juego y CFG-01 con el de un atributo, y las van a volver a hacer CFG-02 a
 * CFG-04.
 *
 * Estaban escritas dos veces y, peor, de dos formas distintas: una devolvia
 * codigos y la otra encadenaba condiciones dentro del componente. Se unifican
 * ahora, con dos copias, y no mas tarde con cuatro.
 *
 * Lo que NO se comparte son los mensajes. "Give the game a name" y "Give the
 * attribute a name" son textos distintos sobre cosas distintas, y viven en
 * `copy.ts` como el resto. Esta funcion devuelve un codigo justamente para que
 * cada pantalla ponga sus palabras sin tocarla.
 */

/** Por criterio de aceptacion, el mismo para juegos y para atributos. */
export const MAX_NAME = 100;

/**
 * Caracteres admitidos cuando el nombre se restringe.
 *
 * Se usa `\p{L}` y no `A-Za-z` a proposito: con el rango ASCII, "Dragon Quest"
 * pasaria y "Dragón Quest" no, y un catalogo en espanol donde la enie es un
 * caracter invalido no es lo que pide el criterio, es un descuido de
 * implementacion. Por lo mismo entran el japones y el ruso, que es justo el
 * tipo de juego que alguien va a querer optimizar.
 */
const ALLOWED = /^[\p{L}\p{N} _]*$/u;

export type NameProblem = 'required' | 'tooLong' | 'badChars' | 'taken';

export interface NameRules {
  /** Nombres ya usados. Se comparan sin mirar mayusculas ni espacios al borde. */
  taken?: readonly string[];
  /**
   * Limitar a letras, numeros, espacios y guion bajo. Lo pide CFG-05 para el
   * nombre de un juego; el de un atributo no lo restringe.
   */
  restrictChars?: boolean;
}

/** Dos nombres chocan si solo se diferencian en mayusculas o en espacios al borde. */
export const sameName = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * Que le pasa a este nombre, o `undefined` si no le pasa nada.
 *
 * El orden importa: se informa del PRIMER problema y no de los cuatro a la vez,
 * porque un campo con cuatro errores encima no se lee.
 */
export function nameProblem(
  raw: string,
  rules: NameRules = {},
): NameProblem | undefined {
  const value = raw.trim();
  if (!value) return 'required';
  if (value.length > MAX_NAME) return 'tooLong';
  if (rules.restrictChars && !ALLOWED.test(value)) return 'badChars';
  if (rules.taken?.some((other) => sameName(other, value))) return 'taken';
  return undefined;
}
