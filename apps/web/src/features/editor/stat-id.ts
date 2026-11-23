import { statIdProblem } from '@zenith/core-engine';
import type { StatDef } from '@zenith/shared-types';

/**
 * Del nombre visible al identificador (CFG-01)
 * ============================================
 * El autor escribe "Ataque critico"; el motor necesita una variable. Esto
 * traduce lo primero en lo segundo.
 *
 * NO se usa `slugify`, que es la funcion que ya existe para el id de un juego,
 * y la diferencia importa: `slugify` separa con guiones, y un guion dentro de
 * una formula es una RESTA. "ataque-critico" no fallaria al crearse, fallaria
 * mucho despues, en una formula que el autor escribio bien.
 *
 * El estilo sale de las plantillas que ya existen, no de un gusto propio. Las
 * diez usan ids cortos en camelCase (`atkPhys`, `maxLife`, `weaponAtk`) y
 * ninguna deriva el id de un nombre visible. Y hay una convencion mas: el guion
 * bajo final marca la version porcentual (`hp` y `hp_`, `atk` y `atk_`,
 * `critRate_`). Un generador que la ignorara ensuciaria el patron justo cuando
 * el sistema empieza a crear ids solo.
 *
 * El id no se le pide al autor: hoy no hay donde escribir una formula en la
 * aplicacion, asi que seria un campo obligatorio que no sirve para nada. Se ve
 * en el listado, junto a cada estadistica, que es donde se vuelve util.
 */

/** Quita acentos y junta las palabras en camelCase. Vacio si no queda nada. */
function camelCase(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return '';

  const [first, ...rest] = words;
  const joined =
    first.toLowerCase() +
    rest
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join('');

  // Un identificador no puede empezar por un numero: "2 manos" seria invalido.
  return /^[0-9]/.test(joined) ? `_${joined}` : joined;
}

const withUnit = (base: string, unit: StatDef['unit']): string =>
  unit === 'percent' ? `${base}_` : base;

/**
 * Un id valido y libre para una estadistica nueva.
 *
 * Numera la RAIZ y no el resultado, para que el guion bajo final se quede
 * donde tiene que estar: `atk2_` y no `atk_2`.
 */
export function suggestStatId(
  name: string,
  unit: StatDef['unit'],
  taken: readonly string[] = [],
): string {
  const base = camelCase(name) || 'stat';

  const first = withUnit(base, unit);
  if (!statIdProblem(first, taken)) return first;

  for (let n = 2; n < 1000; n++) {
    const candidate = withUnit(`${base}${n}`, unit);
    if (!statIdProblem(candidate, taken)) return candidate;
  }
  return withUnit(`${base}${Date.now()}`, unit);
}
