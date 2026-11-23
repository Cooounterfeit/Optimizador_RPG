import { pointsSpent } from '@zenith/core-engine';
import type { GameTemplate, SkillSelection } from '@zenith/shared-types';

export interface SkillPoints {
  spent: number;
  /** `undefined` cuando algun arbol no declara presupuesto (sin tope). */
  budget?: number;
  free?: number;
}

/**
 * Puntos gastados y disponibles. Se derivan de la seleccion y de la plantilla:
 * no se guardan, igual que el resto de las consecuencias.
 */
export function skillPoints(
  template: GameTemplate,
  selection: SkillSelection | undefined,
): SkillPoints {
  const trees = template.skillTrees ?? [];
  const spent = trees.reduce((total, tree) => total + pointsSpent(tree, selection ?? {}), 0);
  const bounded = trees.every((tree) => typeof tree.budget === 'number');

  if (!bounded || trees.length === 0) return { spent };
  const budget = trees.reduce((total, tree) => total + (tree.budget ?? 0), 0);
  return { spent, budget, free: Math.max(0, budget - spent) };
}

/** La seleccion se pasa del presupuesto: devuelve las dos cifras para avisar. */
export const overBudget = (
  points: SkillPoints | undefined,
): { spent: number; budget: number } | null =>
  points && points.budget !== undefined && points.spent > points.budget
    ? { spent: points.spent, budget: points.budget }
    : null;
