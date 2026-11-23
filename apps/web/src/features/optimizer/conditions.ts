import type { Constraint, GameTemplate } from '@zenith/shared-types';

/** Una condicion de la corrida, contrastada con las stats finales de una build. */
export interface ConditionResult {
  statId: string;
  name: string;
  kind: 'min' | 'max';
  limit: number;
  unit: string;
  actual: number;
  met: boolean;
}

/**
 * Condiciones con las que corrio la busqueda, comparadas contra las stats de una
 * build. Se usa la peticion que produjo el resultado (`ranFor.constraints`), no
 * el estado actual de la pagina: si el jugador ya cambio una condicion, el
 * podio viejo se explica con las reglas con las que se calculo.
 */
export function conditionResults(
  template: GameTemplate,
  constraints: Constraint[] | undefined,
  finalStats: Record<string, number>,
): ConditionResult[] {
  return (constraints ?? []).map((constraint) => {
    const stat = template.stats.find((entry) => entry.id === constraint.statId);
    const kind: 'min' | 'max' = constraint.max !== undefined ? 'max' : 'min';
    const limit = (kind === 'max' ? constraint.max : constraint.min) ?? 0;
    const actual = finalStats[constraint.statId] ?? 0;

    return {
      statId: constraint.statId,
      name: stat?.name ?? constraint.statId,
      kind,
      limit,
      unit: stat?.aggregate === 'multiply' ? '×' : stat?.unit === 'percent' ? '%' : '',
      actual,
      met: kind === 'max' ? actual <= limit : actual >= limit,
    };
  });
}
