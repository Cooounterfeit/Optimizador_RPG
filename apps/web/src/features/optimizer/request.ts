import { conBase, sanitizeSelection } from '@zenith/core-engine';
import type {
  Constraint,
  GameTemplate,
  Item,
  SkillSelection,
  SolveRequest,
} from '@zenith/shared-types';

interface BuildSolveRequestInput {
  template: GameTemplate;
  profileId: string;
  /** Base efectiva del perfil (con los niveles subidos), no la de la plantilla. */
  profileBase: Record<string, number>;
  items: Item[];
  objectiveId: string;
  constraints: Constraint[];
  skills: SkillSelection;
  topN?: number;
}

/**
 * Peticion al motor con el estado completo del jugador. La usan la busqueda, la
 * evaluacion de la build actual y la hoja de personaje: si cada pantalla armara
 * la suya, lo que se ve y lo que se calcula podrian separarse.
 */
export function buildSolveRequest({
  template,
  profileId,
  profileBase,
  items,
  objectiveId,
  constraints,
  skills,
  topN = 3,
}: BuildSolveRequestInput): SolveRequest | null {
  const objective =
    template.objectives.find((entry) => entry.id === objectiveId) ?? template.objectives[0];
  if (!objective) return null;

  return {
    template: conBase(template, profileId, profileBase),
    items,
    profileId,
    objectiveId: objective.id,
    constraints,
    topN,
    skills: sanitizeSelection(template, skills),
  };
}
