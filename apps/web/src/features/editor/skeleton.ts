import { GameTemplateSchema, type GameTemplate } from '@zenith/shared-types';

/**
 * El esqueleto de un juego nuevo
 * ==============================
 * Que significa "un juego vacio" es una decision, no un detalle. El esquema
 * exige siete arreglos; empezarlos vacios da una plantilla que VALIDA pero
 * todavia no SIRVE: se puede guardar, abrir y seguir editando, y el optimizador
 * dira que le falta un objetivo en vez de romperse.
 *
 * Esa distincion, valida pero incompleta, es la que permite que crear un juego
 * sea un formulario de tres campos y no el formulario de cuarenta que seria si
 * hubiera que declararlo todo de una vez.
 *
 * La funcion es pura a proposito: no toca la base, no navega y no conoce React,
 * asi que se puede probar sin montar nada.
 */

export interface NewGameInput {
  name: string;
  description?: string;
  /** Categoria libre; alimenta el filtro lateral del catalogo. */
  category?: string;
}

/** Tope de caracteres del nombre, por criterio de aceptacion de CFG-05. */
export const MAX_GAME_NAME = 100;

/**
 * Caracteres admitidos en el nombre de un juego.
 *
 * El criterio dice "letras, numeros, espacios y guiones bajos". Se usa
 * `\p{L}` y no `A-Za-z` a proposito: con el rango ASCII, "Dragon Quest" pasaria
 * y "Dragón Quest" no, y un catalogo en espanol donde la enie es un caracter
 * invalido no es lo que pide el criterio, es un descuido de implementacion.
 * Por lo mismo entran el japones y el ruso, que es justo el tipo de juego que
 * alguien va a querer optimizar.
 */
const GAME_NAME_ALLOWED = /^[\p{L}\p{N} _]*$/u;

export type NameProblem = 'required' | 'tooLong' | 'badChars' | 'taken';

/** Dos nombres chocan si solo se diferencian en mayusculas o en espacios al borde. */
const sameName = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * Que le pasa a este nombre, o `undefined` si no le pasa nada.
 *
 * Devuelve un codigo y no un texto para que los mensajes vivan en `copy.ts` y
 * no haya que tocar esta funcion para traducirlos. El orden importa: se informa
 * del primer problema, no de los cuatro a la vez, porque un campo con cuatro
 * errores encima no se lee.
 *
 * `taken` compara NOMBRES. Que el nombre sea unico no vuelve innecesario a
 * `uniqueGameId`: dos nombres distintos pueden producir el mismo slug, por
 * ejemplo "Mi Juego" y "mi_juego", asi que el id todavia puede chocar.
 */
export function nameProblem(raw: string, taken: readonly string[] = []): NameProblem | undefined {
  const value = raw.trim();
  if (!value) return 'required';
  if (value.length > MAX_GAME_NAME) return 'tooLong';
  if (!GAME_NAME_ALLOWED.test(value)) return 'badChars';
  if (taken.some((other) => sameName(other, value))) return 'taken';
  return undefined;
}

/**
 * Convierte un nombre en un identificador usable en una URL.
 *
 * Quita los acentos antes de limpiar para que "Dragón" no se vuelva "dragn".
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Un id libre entre los ya usados.
 *
 * Nombres repetidos son normales, porque dos personas pueden optimizar el
 * mismo juego, asi que en vez de rechazar el nombre se numera el id. El nombre
 * visible no se toca.
 */
export function uniqueGameId(base: string, taken: readonly string[]): string {
  const root = base || 'juego';
  if (!taken.includes(root)) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/**
 * Arma la plantilla minima que el esquema acepta.
 *
 * Lanza si el resultado no valida: si esto falla, el esquema cambio y hay que
 * enterarse aqui y no tres pantallas mas adelante.
 */
export function buildSkeleton(input: NewGameInput, gameId: string): GameTemplate {
  const skeleton: GameTemplate = {
    schemaVersion: '0.1',
    gameId,
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    stats: [],
    slots: [],
    sets: [],
    derived: [],
    objectives: [],
    baseProfiles: [],
    constrainableStats: [],
    ...(input.category?.trim() ? { category: input.category.trim() } : {}),
  };

  const parsed = GameTemplateSchema.safeParse(skeleton);
  if (!parsed.success) {
    throw new Error('El esqueleto generado no cumple el esquema de plantillas.');
  }
  return parsed.data;
}
