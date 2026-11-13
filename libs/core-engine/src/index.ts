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
  checkSelection,
  canRaise,
  canLower,
  sanitizeSelection,
  skillContribution,
  skillVariables,
  checkSkillTrees,
} from './lib/skills.js';
export type { SkillIndex, SkillProblem } from './lib/skills.js';
