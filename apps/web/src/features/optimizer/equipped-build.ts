import type { Evaluacion } from '@zenith/core-engine';
import type { BuildResult, Equipment, GameTemplate } from '@zenith/shared-types';

/**
 * La build puesta, con la forma de un resultado del motor, para que la lista
 * pueda tratarla como una fila mas: mismo puntaje, mismas stats y mismos
 * conjuntos, sin guardar nada.
 *
 * Devuelve `null` mientras no haya evaluacion resuelta: mostrar una fila con
 * numeros de un objetivo anterior seria peor que no mostrarla.
 */
export function equippedBuild(
  template: GameTemplate,
  equipment: Equipment,
  evaluation: Evaluacion | null,
  objectiveId: string,
): BuildResult | null {
  if (!evaluation) return null;
  const score = evaluation.objetivos[objectiveId];
  if (score === undefined) return null;

  return {
    score,
    itemIds: template.slots.map((slot) => equipment[slot.id] ?? ''),
    finalStats: evaluation.finalStats,
    activeSets: evaluation.conjuntos.map((set) => ({
      setId: template.sets.find((entry) => entry.name === set.name)?.id ?? set.name,
      name: set.name,
      pieces: set.pieces,
      tiers: set.tiers,
    })),
  };
}

/** `true` cuando hay al menos una ranura con pieza. */
export const hasEquipped = (equipment: Equipment): boolean =>
  Object.values(equipment).some((itemId) => itemId !== '');
