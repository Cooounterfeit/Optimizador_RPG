import { useCallback, useEffect, useRef, useState } from 'react';

import type { Evaluacion } from '@zenith/core-engine';
import type {
  BuildResult,
  Equipment,
  SolveRequest,
  SolveResponse,
  SolveStats,
} from '@zenith/shared-types';

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
  const evalWorkerRef = useRef<Worker | null>(null);
  const partialRef = useRef<PartialResult | null>(null);
  const setupRef = useRef<Setup | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  /** Peticion que produjo el resultado visible: la vista se etiqueta con ella, no con el estado actual. */
  const [ranFor, setRanFor] = useState<SolveRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Evaluacion del equipo puesto. Se recalcula sola: no se guardan sus numeros. */
  const [evaluation, setEvaluation] = useState<Evaluacion | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const stopEvaluation = useCallback(() => {
    evalWorkerRef.current?.terminate();
    evalWorkerRef.current = null;
  }, []);

  useEffect(
    () => () => {
      stopWorker();
      stopEvaluation();
    },
    [stopWorker, stopEvaluation],
  );

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

        if (message.type !== 'error') return;

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

  /**
   * Evalua el equipo puesto en el worker: mismos numeros que el optimizador y
   * sin bloquear la interfaz. Se limpia la evaluacion anterior al arrancar para
   * que la pantalla nunca muestre cifras de un equipo que ya no es el puesto.
   */
  const evaluate = useCallback(
    (request: SolveRequest, equipment: Equipment) => {
      stopEvaluation();
      setEvaluation(null);
      setEvaluationError(null);
      setEvaluating(true);

      const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), {
        type: 'module',
      });
      evalWorkerRef.current = worker;

      const isCurrent = () => evalWorkerRef.current === worker;

      worker.onmessage = (event: MessageEvent<WorkerOut>) => {
        const message = event.data;
        if (!isCurrent()) return;

        if (message.type === 'evaluated') {
          setEvaluation(message.evaluation);
          setEvaluating(false);
          stopEvaluation();
          return;
        }

        if (message.type === 'evaluateError') {
          setEvaluationError(message.message);
          setEvaluating(false);
          stopEvaluation();
        }
      };

      worker.onerror = (event) => {
        if (!isCurrent()) return;
        setEvaluationError(event.message || 'The evaluation worker failed.');
        setEvaluating(false);
        stopEvaluation();
      };

      const payload: WorkerIn = { type: 'evaluate', request, equipment };
      worker.postMessage(payload);
    },
    [stopEvaluation],
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

  return {
    phase,
    progress,
    result,
    ranFor,
    error,
    evaluation,
    evaluationError,
    evaluating,
    run,
    evaluate,
    cancel,
    reset,
  };
}
