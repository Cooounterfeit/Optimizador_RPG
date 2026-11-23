import { FUNCTION_NAMES } from './formula.js';

/**
 * Que puede llamarse una estadistica (apoya CFG-01)
 * =================================================
 * El id de una estadistica no es una etiqueta: ES EL NOMBRE DE UNA VARIABLE.
 * Acaba dentro de las formulas de los objetivos y los derivados, y lo lee el
 * tokenizador de `formula.ts`, que solo entiende identificadores.
 *
 * De ahi que esto no sea cosmetica. Un id con guion, como "ataque-critico",
 * no falla al crearse: falla despues y en otro sitio, porque el tokenizador lo
 * lee como la RESTA de dos variables que no existen. El autor ve un error sobre
 * una formula que escribio bien, lejos de donde esta la causa.
 *
 * `skills.ts` ya tenia esta regla para los nodos, por el mismo motivo y con el
 * mismo comentario. Las estadisticas se habian quedado fuera.
 */

/** Lo que el tokenizador acepta como identificador. Ver `tokenize` en formula.ts. */
export const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Prefijos que el motor usa para espacios de nombres propios.
 *
 * `base_<stat>` es el valor que trae el personaje y `skill_<nodo>` el rango
 * elegido. Una estadistica llamada `base_atk` chocaria con la variable base de
 * otra llamada `atk`, y el choque no se nota hasta que las dos existen.
 */
const RESERVED_PREFIXES = ['base_', 'skill_'];

export type IdProblem = 'empty' | 'shape' | 'reserved' | 'prefix' | 'taken';

/**
 * Que le pasa a este id, o `undefined` si sirve.
 *
 * Devuelve un codigo y no un texto porque lo consumen dos sitios con idiomas
 * distintos: los mensajes del motor, en espanol, y el formulario del editor,
 * en ingles.
 */
export function statIdProblem(
  id: string,
  taken: readonly string[] = [],
): IdProblem | undefined {
  const value = id.trim();
  if (!value) return 'empty';
  if (!IDENT_RE.test(value)) return 'shape';
  if (FUNCTION_NAMES.includes(value)) return 'reserved';
  if (RESERVED_PREFIXES.some((prefix) => value.startsWith(prefix)))
    return 'prefix';
  if (taken.includes(value)) return 'taken';
  return undefined;
}
