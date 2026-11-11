import { useCallback, useEffect, useRef, useState } from 'react';

import type { BuildResult, SolveRequest, SolveResponse, SolveStats } from '@zenith/shared-types';

import type { Setup, WorkerIn, WorkerOut } from './optimizer.worker';

export interface Progress {
  evaluated: number;
  pruned: number;
  elapsedMs: number;
  bestScore: number;
}

export type Phase = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

interface PartialResult {
  builds: BuildResult[];
  progress: Progress;
}

export function useOptimizer() {
  const workerRef = useRef<Worker | null>(null);
  const partialRef = useRef<PartialResult | null>(null);
  const setupRef = useRef<Setup | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  /** Peticion que produjo el resultado visible: la vista se etiqueta con ella, no con el estado actual. */
  const [ranFor, setRanFor] = useState<SolveRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => () => stopWorker(), [stopWorker]);

  const run = useCallback(
    (request: SolveRequest, deadlineMs?: number) => {
      stopWorker();
      partialRef.current = null;
      setupRef.current = null;
      setPhase('running');
      setProgress(null);
      setResult(null);
      setRanFor(request);
      setError(null);

      const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<WorkerOut>) => {
        const message = event.data;

        if (message.type === 'setup') {
          setupRef.current = message.setup;
          return;
        }

        if (message.type === 'progress') {
          const nextProgress: Progress = {
            evaluated: message.evaluated,
            pruned: message.pruned,
            elapsedMs: message.elapsedMs,
            bestScore: message.bestScore,
          };
          partialRef.current = { builds: message.builds, progress: nextProgress };
          setProgress(nextProgress);
          return;
        }

        if (message.type === 'done') {
          setResult(message.result);
          setPhase('done');
          stopWorker();
          return;
        }

        setError(message.message);
        setPhase('error');
        stopWorker();
      };

      worker.onerror = (event) => {
        setError(event.message || 'The optimizer worker failed.');
        setPhase('error');
        stopWorker();
      };

      const payload: WorkerIn = { type: 'solve', request, deadlineMs };
      worker.postMessage(payload);
    },
    [stopWorker],
  );

  const reset = useCallback(() => {
    stopWorker();
    partialRef.current = null;
    setupRef.current = null;
    setPhase('idle');
    setProgress(null);
    setResult(null);
    setRanFor(null);
    setError(null);
  }, [stopWorker]);

  const cancel = useCallback(() => {
    stopWorker();

    const partial = partialRef.current;
    const setup = setupRef.current;
    if (!partial || !setup) {
      setPhase('cancelled');
      return;
    }

    const stats: SolveStats = {
      ...setup,
      evaluated: partial.progress.evaluated,
      pruned: partial.progress.pruned,
      elapsedMs: partial.progress.elapsedMs,
      feasible: partial.builds.length > 0,
      provenOptimal: false,
      stoppedBy: 'usuario',
    };

    setResult({ builds: partial.builds, stats });
    setPhase('done');
  }, [stopWorker]);

  return { phase, progress, result, ranFor, error, run, cancel, reset };
}
