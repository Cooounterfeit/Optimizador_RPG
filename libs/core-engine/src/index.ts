export {
  solve,
  solveBruteForceTop,
  explainBuild,
  topoSortDerived,
  findMonotonicViolation,
  SKILL_SLOT,
} from './lib/optimizer.js';
export type { SolveHooks } from './lib/optimizer.js';

export { validateTemplate } from './lib/validate.js';
export type { Issue, Severity, SelfTestResult, ValidationReport } from './lib/validate.js';

export { evaluar, scorer, conBase, conDelta } from './lib/evaluar.js';
export type { Evaluacion } from './lib/evaluar.js';

export { evaluateCalculator, clampCalculatorValue } from './lib/calculator.js';
export type { CalculatorResult, CalculatorValue } from './lib/calculator.js';

export {
  currentLevel,
  futureLevels,
  growingKeys,
  levelKeyOf,
  projectProfile,
  proyectarEstadisticas,
  isPointsMode,
  pointAttributes,
  pointsBetween,
} from './lib/leveling.js';
export type { Allocation, AllocationResult, Projection } from './lib/leveling.js';

export { planSync } from './lib/syncPlan.js';
export type { LocalMeta, RemoteMeta, SyncAction } from './lib/syncPlan.js';

export {
  SKILL_VAR_PREFIX,
  skillVar,
  allNodes,
  indexSkills,
  costOf,
  maxRankOf,
  pointsSpent,
  withSkillBudget,
  checkSelection,
  canRaise,
  canLower,
  sanitizeSelection,
  skillContribution,
  skillVariables,
  checkSkillTrees,
} from './lib/skills.js';
export type { SkillIndex, SkillProblem } from './lib/skills.js';

// `statReferences` NO se exporta todavia a proposito: su consumidor es CFG-04 y
// aun no existe. Publicar una API que no llama nadie invita a que alguien la
// use mal antes de que este decidido como se usa. Las pruebas la importan
// directo del archivo, asi que no pierde cobertura. Se exporta con CFG-04.

export { statIdProblem, IDENT_RE } from './lib/ids.js';
export type { IdProblem } from './lib/ids.js';
