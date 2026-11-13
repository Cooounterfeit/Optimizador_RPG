import { evaluar, solve, type Evaluacion, type SolveHooks } from '@zenith/core-engine';
import type { BuildResult, Equipment, SolveRequest, SolveResponse } from '@zenith/shared-types';

/** Cifras que el motor conoce antes de empezar la busqueda. */
export type Setup = Parameters<NonNullable<SolveHooks['onSetup']>>[0];

export type WorkerIn =
  | {
      type: 'solve';
      request: SolveRequest;
      deadlineMs?: number;
    }
  /** Evalua el equipo puesto sin buscar: la "build actual" del jugador. */
  | { type: 'evaluate'; request: SolveRequest; equipment: Equipment };

export type WorkerOut =
  | { type: 'setup'; setup: Setup }
  | {
      type: 'progress';
      evaluated: number;
      pruned: number;
      elapsedMs: number;
      bestScore: number;
      builds: BuildResult[];
    }
  | { type: 'done'; result: SolveResponse }
  | { type: 'evaluated'; evaluation: Evaluacion }
  | { type: 'evaluateError'; message: string }
  | { type: 'error'; message: string };

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerIn>) => void) | null;
  postMessage: (message: WorkerOut) => void;
};

workerScope.onmessage = (event: MessageEvent<WorkerIn>) => {
  const message = event.data;

  if (message.type === 'evaluate') {
    try {
      // La peticion ya trae la base efectiva del perfil: el motor no relee la plantilla.
      const evaluation = evaluar(
        message.request.template,
        message.request.items,
        message.equipment,
        message.request.profileId,
        message.request.skills ?? {},
      );
      if (typeof evaluation === 'string') {
        workerScope.postMessage({ type: 'evaluateError', message: evaluation } satisfies WorkerOut);
      } else {
        workerScope.postMessage({ type: 'evaluated', evaluation } satisfies WorkerOut);
      }
    } catch (cause) {
      const messageText = cause instanceof Error ? cause.message : String(cause);
      workerScope.postMessage({ type: 'evaluateError', message: messageText } satisfies WorkerOut);
    }
    return;
  }

  if (message.type !== 'solve') return;

  try {
    const result = solve(message.request, {
      deadlineMs: message.deadlineMs,
      onSetup: (setup) => {
        workerScope.postMessage({ type: 'setup', setup } satisfies WorkerOut);
      },
      onProgress: (progress) => {
        workerScope.postMessage({ type: 'progress', ...progress } satisfies WorkerOut);
      },
    });

    workerScope.postMessage({ type: 'done', result } satisfies WorkerOut);
  } catch (cause) {
    const messageText = cause instanceof Error ? cause.message : String(cause);
    workerScope.postMessage({ type: 'error', message: messageText } satisfies WorkerOut);
  }
};
