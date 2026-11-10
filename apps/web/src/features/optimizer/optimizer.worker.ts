import { solve, type SolveHooks } from '@zenith/core-engine';
import type { BuildResult, SolveRequest, SolveResponse } from '@zenith/shared-types';

/** Cifras que el motor conoce antes de empezar la busqueda. */
export type Setup = Parameters<NonNullable<SolveHooks['onSetup']>>[0];

export type WorkerIn = {
  type: 'solve';
  request: SolveRequest;
  deadlineMs?: number;
};

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
  | { type: 'error'; message: string };

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerIn>) => void) | null;
  postMessage: (message: WorkerOut) => void;
};

workerScope.onmessage = (event: MessageEvent<WorkerIn>) => {
  const message = event.data;
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
