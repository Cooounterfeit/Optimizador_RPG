import type { GameTemplate, Item } from '@zenith/shared-types';

import { formulaVariables } from './formula.js';

/**
 * Quien usa una estadistica (RF.2, apoya CFG-04)
 * ==============================================
 * El motor ya comprueba una direccion: si algo referencia un id, que ese id
 * exista. `validate.ts` esta lleno de eso (E_SET_STAT, W_STAT_DESCONOCIDA).
 *
 * Lo que nadie sabia responder es la direccion contraria, que es la que hace
 * falta para borrar: QUIEN referencia esta estadistica. Sin eso, un editor que
 * ofrezca un boton de eliminar es una forma comoda de corromperse la plantilla.
 *
 * Dos razones por las que esto vive en el motor y no en la interfaz:
 *
 * 1. Las referencias en formulas hay que sacarlas del arbol sintactico, no con
 *    expresiones regulares. Buscando texto, borrar "atk" creeria que
 *    "atk_pct" lo usa, y no reconoceria `base_atk`. El tokenizador vive aqui.
 *
 * 2. Una estadistica declarada registra DOS variables: `atk` (el valor final de
 *    la build) y `base_atk` (lo que trae el personaje). Las dos cuentan como
 *    referencia, pero no se rompen igual, y esa diferencia es facil de contar
 *    mal: al dejar de ser una estadistica declarada, su clave en el perfil pasa
 *    a ser una clave suelta, que `validate.ts` SIGUE registrando como
 *    `base_atk` y sin un solo aviso. O sea que una formula que solo use
 *    `base_atk` sobrevive al borrado, mientras una que use `atk` no compila.
 *    La clave suelta sale del PRIMER perfil (`baseProfiles[0]`), asi que es ahi
 *    donde hay que mirar. Decir "se va a romper" de algo que no se rompe es una
 *    falsa alarma que frena un borrado seguro, y es el error que este modulo
 *    tiene que evitar en los dos sentidos.
 *
 * Deliberadamente NO se mira `damageCalculator`: sus formulas se resuelven
 * contra sus propios campos y salidas (ver `calculator.ts`), nunca contra las
 * estadisticas de la plantilla. Un nombre que coincida ahi es una casualidad,
 * no una referencia, y contarlo seria un falso positivo que frenaria un borrado
 * perfectamente seguro.
 */

export type ReferenceKind =
  | 'objective'
  | 'derived'
  | 'profile'
  | 'constrainable'
  | 'budget'
  | 'set'
  | 'leveling'
  | 'skill'
  | 'selfTest'
  | 'item';

export interface StatReference {
  kind: ReferenceKind;
  /** El elemento que la usa, por su id, para poder llevar al autor hasta el. */
  where: string;
  /** Como se llama, para no ensenarle ids crudos. */
  label: string;
  /**
   * Si quitar la estadistica deja la plantilla en ERROR de validacion o una
   * formula que no compila. Lo que no rompe, degrada: el motor avisa y sigue,
   * como una ranura que queda sin cubrir o una pieza cuyo valor se ignora.
   *
   * El criterio no es una opinion: es lo que `validate.ts` emite para ese caso,
   * un error o un aviso.
   */
  breaks: boolean;
}

export interface StatUsage {
  refs: StatReference[];
  /**
   * Formulas que no se pudieron leer, porque estan a medio escribir o tienen un
   * error de sintaxis. No se puede afirmar que usen la estadistica ni que no:
   * quien borre tiene derecho a saber que aqui no hay respuesta.
   */
  unreadable: { kind: ReferenceKind; where: string }[];
}

interface Sink {
  ref: (
    kind: ReferenceKind,
    where: string,
    label: string,
    breaks: boolean,
  ) => void;
  unreadable: (kind: ReferenceKind, where: string) => void;
}

/** Nombre visible de una estadistica, o su id si no la encuentra. */
const statName = (t: GameTemplate, statId: string): string =>
  t.stats.find((stat) => stat.id === statId)?.name ?? statId;

/**
 * Si `base_<statId>` seguiria existiendo tras borrar la estadistica.
 *
 * Solo cuenta el primer perfil: es de donde `validate.ts` saca las claves
 * sueltas que registra como variables.
 */
const keepsBaseVar = (t: GameTemplate, statId: string): boolean =>
  t.baseProfiles.length > 0 && statId in t.baseProfiles[0].base;

/** Una formula se rompe si pierde alguna variable que usa. */
const breaksFormula = (use: Use, baseSurvives: boolean): boolean =>
  use.final || (use.base && !baseSurvives);

/** Como usa una formula la estadistica. `undefined` es que no se pudo leer. */
interface Use {
  /** Usa `atk`, el valor final de la build. Esa variable desaparece al borrar. */
  final: boolean;
  /** Usa `base_atk`, que puede sobrevivir como clave suelta del perfil. */
  base: boolean;
}

/**
 * Como usa la formula la estadistica, o `undefined` si no se pudo leer.
 *
 * Una formula ilegible no se da por buena ni por mala: se delata por el sink,
 * para no inventar una referencia ni descartarla sin haberla leido.
 */
const useOf = (
  expr: string,
  statId: string,
  kind: ReferenceKind,
  where: string,
  sink: Sink,
): Use | undefined => {
  let names: string[];
  try {
    names = formulaVariables(expr);
  } catch {
    sink.unreadable(kind, where);
    return undefined;
  }
  const use = {
    final: names.includes(statId),
    base: names.includes(`base_${statId}`),
  };
  return use.final || use.base ? use : undefined;
};

type Collector = (
  t: GameTemplate,
  statId: string,
  items: readonly Item[],
  sink: Sink,
) => void;

/**
 * Un recolector por sitio donde puede aparecer un id de estadistica.
 *
 * Es una lista y no una funcion larga por lo mismo que `blocks.ts` en el
 * editor: cuando la plantilla gane un bloque nuevo, cubrirlo es anadir una
 * entrada, y se puede probar sola. Una referencia que se escape es el fallo
 * grave de este modulo, porque el editor diria "no esta en uso" y el autor
 * borraria creyendo que no pasa nada.
 */
const COLLECTORS: Collector[] = [
  // Objetivos.
  (t, statId, _items, sink) => {
    const baseSurvives = keepsBaseVar(t, statId);
    for (const objective of t.objectives) {
      const use = useOf(
        objective.formula,
        statId,
        'objective',
        objective.id,
        sink,
      );
      if (use)
        sink.ref(
          'objective',
          objective.id,
          objective.name,
          breaksFormula(use, baseSurvives),
        );
    }
  },

  // Valores derivados: su formula, y la curva, cuya entrada es una clave.
  (t, statId, _items, sink) => {
    const baseSurvives = keepsBaseVar(t, statId);
    for (const derived of t.derived) {
      const use = useOf(derived.formula, statId, 'derived', derived.id, sink);
      if (use) {
        sink.ref(
          'derived',
          derived.id,
          derived.name,
          breaksFormula(use, baseSurvives),
        );
      } else if (derived.curve?.input === statId) {
        // La curva compila a `(base_x + x)` cuando su entrada es una
        // estadistica declarada (ver curves.ts), asi que pierde la mitad.
        sink.ref('derived', derived.id, derived.name, true);
      }
    }
  },

  // Personajes. La clave se queda, y sin un solo aviso: pasa a ser una clave
  // suelta que el motor sigue exponiendo como `base_<id>`.
  (t, statId, _items, sink) => {
    for (const profile of t.baseProfiles) {
      if (statId in profile.base)
        sink.ref('profile', profile.id, profile.name, false);
    }
  },

  // Restringibles. Queda un id colgando, que el motor avisa y descarta.
  (t, statId, _items, sink) => {
    if (t.constrainableStats.includes(statId)) {
      sink.ref(
        'constrainable',
        'constrainableStats',
        statName(t, statId),
        false,
      );
    }
  },

  // Presupuestos. E_PRESUPUESTO: es error, no aviso.
  (t, statId, _items, sink) => {
    for (const budget of t.budgets ?? []) {
      if (budget.statId === statId) {
        sink.ref(
          'budget',
          budget.statId,
          budget.name ?? statName(t, statId),
          true,
        );
      }
    }
  },

  // Conjuntos. E_SET_STAT: tambien es error.
  (t, statId, _items, sink) => {
    for (const set of t.sets) {
      if (set.tiers.some((tier) => statId in tier.effects)) {
        sink.ref('set', set.id, set.name, true);
      }
    }
  },

  // Niveles. Varias puertas, y solo dos de ellas rompen.
  (t, statId, _items, sink) => {
    const leveling = t.leveling;
    if (!leveling) return;

    // La clave del nivel la usan las formulas de crecimiento.
    if (leveling.levelKey === statId) {
      sink.ref('leveling', 'levelKey', statName(t, statId), true);
    }
    if (leveling.points?.attributes.includes(statId)) {
      sink.ref('leveling', 'points.attributes', statName(t, statId), false);
    }
    const baseSurvives = keepsBaseVar(t, statId);
    for (const [key, expr] of Object.entries(leveling.growth)) {
      if (key === statId)
        sink.ref('leveling', `growth.${key}`, statName(t, statId), false);
      const use = useOf(expr, statId, 'leveling', `growth.${key}`, sink);
      if (use)
        sink.ref(
          'leveling',
          `growth.${key}`,
          key,
          breaksFormula(use, baseSurvives),
        );
    }
  },

  // Habilidades: el efecto por rango se ignora si la estadistica no existe.
  (t, statId, _items, sink) => {
    for (const tree of t.skillTrees ?? []) {
      for (const node of tree.nodes) {
        if (node.effects && statId in node.effects) {
          sink.ref('skill', node.id, node.name, false);
        }
      }
    }
  },

  // Auto-tests: lo esperado y las piezas del propio caso.
  (t, statId, _items, sink) => {
    for (const test of t.selfTests ?? []) {
      const inExpected =
        test.expectStats !== undefined && statId in test.expectStats;
      const inItems = test.items.some(
        (item) =>
          statId in item.stats ||
          (item.requires !== undefined && statId in item.requires),
      );
      if (inExpected || inItems)
        sink.ref('selfTest', test.name, test.name, false);
    }
  },

  // El inventario de este navegador. No rompe: el motor ignora lo que no conoce.
  (_t, statId, items, sink) => {
    for (const item of items) {
      if (
        statId in item.stats ||
        (item.requires !== undefined && statId in item.requires)
      ) {
        sink.ref('item', item.id, item.name, false);
      }
    }
  },
];

/**
 * Todo lo que usa `statId`, en la plantilla y en el inventario que se le pase.
 *
 * Nunca lanza: una plantilla a medio editar es el caso normal aqui, no la
 * excepcion. Lo que no se puede leer sale en `unreadable`.
 */
export function statReferences(
  template: GameTemplate,
  statId: string,
  items: readonly Item[] = [],
): StatUsage {
  const refs: StatReference[] = [];
  const unreadable: { kind: ReferenceKind; where: string }[] = [];
  const seen = new Map<string, StatReference>();

  const sink: Sink = {
    ref: (kind, where, label, breaks) => {
      // Una estadistica puede salir dos veces en el mismo elemento: en dos
      // escalones de un conjunto, o en `leveling.growth`, donde la misma
      // entrada puede ser a la vez la clave que crece y la formula que la usa.
      // Al autor le interesa el elemento, no cuantas veces aparece dentro.
      //
      // Si una de las dos rompe, el elemento rompe: el aviso escala y nunca
      // baja, porque quedarse con el primero taparia el caso grave.
      const key = `${kind}:${where}`;
      const already = seen.get(key);
      if (already) {
        if (breaks) already.breaks = true;
        return;
      }
      const ref: StatReference = { kind, where, label, breaks };
      seen.set(key, ref);
      refs.push(ref);
    },
    unreadable: (kind, where) => {
      const key = `${kind}:${where}`;
      if (unreadable.some((entry) => `${entry.kind}:${entry.where}` === key))
        return;
      unreadable.push({ kind, where });
    },
  };

  for (const collect of COLLECTORS) collect(template, statId, items, sink);

  // Lo que rompe primero: es lo que decide si el borrado necesita confirmacion.
  refs.sort((a, b) => Number(b.breaks) - Number(a.breaks));
  return { refs, unreadable };
}

/**
 * Si se puede borrar sin consecuencias.
 *
 * Una formula ilegible cuenta como uso: ante la duda no se afirma que algo es
 * seguro de borrar.
 */
export function statInUse(
  template: GameTemplate,
  statId: string,
  items: readonly Item[] = [],
): boolean {
  const { refs, unreadable } = statReferences(template, statId, items);
  return refs.length > 0 || unreadable.length > 0;
}
