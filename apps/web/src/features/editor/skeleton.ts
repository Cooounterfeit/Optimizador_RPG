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
export function buildSkeleton(
  input: NewGameInput,
  gameId: string,
): GameTemplate {
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
    throw new Error(
      'El esqueleto generado no cumple el esquema de plantillas.',
    );
  }
  return parsed.data;
}
