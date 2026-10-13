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

export { planSync } from './lib/syncPlan.js';
export type { LocalMeta, RemoteMeta, SyncAction } from './lib/syncPlan.js';
