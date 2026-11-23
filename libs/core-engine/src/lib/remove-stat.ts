import type { GameTemplate } from '@zenith/shared-types';

import { formulaVariables } from './formula.js';

/**
 * Quitar una estadistica y lo que colgaba de ella (apoya CFG-04)
 * ==============================================================
 * Borrar un id no es quitarlo de un arreglo: media plantilla puede apuntar a
 * el. Esto deja la plantilla CONSISTENTE, que es la unica forma de que el
 * borrado no se note como un error tres pantallas mas alla.
 *
 * Que se elimina entero y que solo pierde una clave no es un capricho. Un
 * objetivo cuya formula usaba la estadistica ya no se puede evaluar, asi que
 * se va. Un conjunto que ademas otorgaba esa estadistica sigue teniendo
 * sentido sin ella, asi que se queda y pierde el efecto.
 *
 * EL BORRADO ENCADENA, y es lo que se escapa al leer el criterio: si cae el
 * derivado `dps` porque usaba `atk`, un objetivo con la formula `dps * 2`
 * queda apuntando a una variable que ya no existe. Por eso primero se calcula
 * TODO lo que va a caer, y despues se aplica de una vez.
 *
 * El INVENTARIO no se toca. Las piezas son del usuario, no de la plantilla, y
 * el motor ya ignora con un aviso las estadisticas que no conoce. Borrarle sus
 * objetos por editar una plantilla seria desproporcionado.
 */

/** Una copia sin esa clave. Devuelve el mismo objeto si no la tenia. */
const withoutKey = <T>(record: Record<string, T>, key: string): Record<string, T> => {
  if (!(key in record)) return record;
  const copy = { ...record };
  delete copy[key];
  return copy;
};

/**
 * Si la formula usa alguno de los ids que se van, mirando tambien `base_`.
 *
 * Una formula ilegible se da por buena: estar a medio escribir es problema del
 * autor, no razon para borrarle un objetivo.
 */
function uses(formula: string, gone: ReadonlySet<string>): boolean {
  let names: string[];
  try {
    names = formulaVariables(formula);
  } catch {
    return false;
  }
  return names.some((name) => gone.has(name) || gone.has(name.replace(/^base_/, '')));
}

/**
 * Todo lo que desaparece al quitar `statId`: la estadistica y los derivados
 * que se quedan sin suelo, en cadena.
 */
export function cascadeOf(template: GameTemplate, statId: string): Set<string> {
  const gone = new Set<string>([statId]);

  // El tope es por seguridad frente a una plantilla rara; con una sana la
  // cadena se agota en dos o tres vueltas.
  for (let guard = 0; guard < 50; guard++) {
    const extra = template.derived.filter(
      (derived) =>
        !gone.has(derived.id) &&
        (uses(derived.formula, gone) ||
          (derived.curve !== undefined && gone.has(derived.curve.input))),
    );
    if (extra.length === 0) break;
    for (const derived of extra) gone.add(derived.id);
  }

  return gone;
}

/** Quita una estadistica y todo lo que dejaria de funcionar sin ella. */
export function removeStat(template: GameTemplate, statId: string): GameTemplate {
  const gone = cascadeOf(template, statId);

  const next: GameTemplate = {
    ...template,
    stats: template.stats.filter((stat) => stat.id !== statId),
    derived: template.derived.filter((derived) => !gone.has(derived.id)),
    objectives: template.objectives.filter((objective) => !uses(objective.formula, gone)),
    constrainableStats: template.constrainableStats.filter((id) => id !== statId),
    sets: template.sets.map((set) => ({
      ...set,
      tiers: set.tiers.map((tier) => ({ ...tier, effects: withoutKey(tier.effects, statId) })),
    })),
    baseProfiles: template.baseProfiles.map((profile) => ({
      ...profile,
      base: withoutKey(profile.base, statId),
    })),
  };

  if (template.budgets) {
    next.budgets = template.budgets.filter((budget) => budget.statId !== statId);
  }

  if (template.skillTrees) {
    next.skillTrees = template.skillTrees.map((tree) => ({
      ...tree,
      nodes: tree.nodes.map((node) =>
        node.effects ? { ...node, effects: withoutKey(node.effects, statId) } : node,
      ),
    }));
  }

  if (template.selfTests) {
    next.selfTests = template.selfTests.map((test) =>
      test.expectStats ? { ...test, expectStats: withoutKey(test.expectStats, statId) } : test,
    );
  }

  if (template.leveling) {
    if (template.leveling.levelKey === statId) {
      // La estadistica ERA la clave del nivel: el bloque entero se mide contra
      // ella, asi que sin ella no significa nada.
      delete next.leveling;
    } else {
      const growth: Record<string, string> = {};
      for (const [key, expr] of Object.entries(template.leveling.growth)) {
        if (key === statId || uses(expr, gone)) continue;
        growth[key] = expr;
      }
      next.leveling = {
        ...template.leveling,
        growth,
        ...(template.leveling.points
          ? {
              points: {
                ...template.leveling.points,
                attributes: template.leveling.points.attributes.filter((id) => id !== statId),
              },
            }
          : {}),
      };
    }
  }

  return next;
}
