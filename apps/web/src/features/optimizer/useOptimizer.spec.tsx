import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Evaluacion } from '@zenith/core-engine';
import type { BuildResult, SolveRequest, SolveResponse } from '@zenith/shared-types';

import { useOptimizer } from './useOptimizer';
import type { Setup, WorkerIn, WorkerOut } from './optimizer.worker';

class FakeWorker {
  static instances: FakeWorker[] = [];
  static reset() {
    FakeWorker.instances = [];
  }

  onmessage: ((event: MessageEvent<WorkerOut>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  sent: WorkerIn | null = null;
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: WorkerIn) {
    this.sent = message;
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: WorkerOut) {
    this.onmessage?.({ data: message } as MessageEvent<WorkerOut>);
  }
}

const setup: Setup = {
  totalCombinations: 10,
  searchSpace: 10,
  boundFiltered: 0,
  dominated: 0,
  candidatesPerSlot: [],
  relevantStats: ['atk'],
  mergedDimensions: 0,
  requirementFiltered: 0,
  mode: 'exacto',
  bound: 'monotono',
};

const build: BuildResult = {
  score: 42,
  itemIds: ['weapon'],
  finalStats: { atk: 42 },
  activeSets: [],
};

const result: SolveResponse = {
  builds: [build],
  stats: {
    ...setup,
    evaluated: 10,
    pruned: 0,
    elapsedMs: 12,
    feasible: true,
    provenOptimal: true,
  },
};

const request = { objectiveId: 'damage' } as SolveRequest;

const evaluation: Evaluacion = {
  finalStats: { atk: 12 },
  vars: new Map(),
  objetivos: { damage: 80 },
  conjuntos: [],
};

const lastWorker = (): FakeWorker => {
  const worker = FakeWorker.instances.at(-1);
  if (!worker) throw new Error('The fake worker was not created.');
  return worker;
};

function Probe() {
  const optimizer = useOptimizer();

  return (
    <div>
      <span data-testid="phase">{optimizer.phase}</span>
      <span data-testid="progress">{optimizer.progress?.evaluated ?? 0}</span>
      <span data-testid="result">{optimizer.result?.builds.length ?? 0}</span>
      <span data-testid="optimal">{String(optimizer.result?.stats.provenOptimal ?? false)}</span>
      <span data-testid="ranFor">{optimizer.ranFor?.objectiveId ?? ''}</span>
      <span data-testid="error">{optimizer.error ?? ''}</span>
      <span data-testid="evaluating">{String(optimizer.evaluating)}</span>
      <span data-testid="evaluation">{optimizer.evaluation?.objetivos.damage ?? ''}</span>
      <span data-testid="evaluationError">{optimizer.evaluationError ?? ''}</span>
      <button onClick={() => optimizer.run(request)}>run</button>
      <button onClick={() => optimizer.evaluate(request, { weapon: 'w1' })}>evaluate</button>
      <button onClick={optimizer.cancel}>cancel</button>
    </div>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.reset();
});

describe('useOptimizer', () => {
  it('recibe setup, progreso y resultado', () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    render(<Probe />);

    fireEvent.click(screen.getByText('run'));
    expect(screen.getByTestId('phase').textContent).toBe('running');

    const worker = FakeWorker.instances.at(-1);
    expect(worker?.sent?.type).toBe('solve');

    act(() => worker?.emit({ type: 'setup', setup }));
    act(() =>
      worker?.emit({
        type: 'progress',
        evaluated: 4,
        pruned: 1,
        elapsedMs: 8,
        bestScore: 42,
        builds: [build],
      }),
    );
    expect(screen.getByTestId('progress').textContent).toBe('4');

    act(() => worker?.emit({ type: 'done', result }));
    expect(screen.getByTestId('phase').textContent).toBe('done');
    expect(screen.getByTestId('result').textContent).toBe('1');
    expect(screen.getByTestId('optimal').textContent).toBe('true');
    expect(worker?.terminated).toBe(true);
  });

  it('cancelar conserva la mejor build parcial', () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    render(<Probe />);

    fireEvent.click(screen.getByText('run'));
    const worker = lastWorker();

    act(() => worker.emit({ type: 'setup', setup }));
    act(() =>
      worker.emit({
        type: 'progress',
        evaluated: 3,
        pruned: 2,
        elapsedMs: 5,
        bestScore: 42,
        builds: [build],
      }),
    );
    fireEvent.click(screen.getByText('cancel'));

    expect(screen.getByTestId('phase').textContent).toBe('done');
    expect(screen.getByTestId('result').textContent).toBe('1');
    expect(screen.getByTestId('optimal').textContent).toBe('false');
    expect(worker.terminated).toBe(true);
  });

  it('cancelar antes del primer progreso deja la busqueda cancelada', () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    render(<Probe />);

    fireEvent.click(screen.getByText('run'));
    fireEvent.click(screen.getByText('cancel'));

    expect(screen.getByTestId('phase').textContent).toBe('cancelled');
    expect(screen.getByTestId('result').textContent).toBe('0');
  });

  it('limpia el resultado anterior y recuerda la peticion que lo produjo', () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    render(<Probe />);

    fireEvent.click(screen.getByText('run'));
    act(() => lastWorker().emit({ type: 'done', result }));
    expect(screen.getByTestId('result').textContent).toBe('1');
    expect(screen.getByTestId('ranFor').textContent).toBe('damage');

    fireEvent.click(screen.getByText('run'));
    expect(screen.getByTestId('phase').textContent).toBe('running');
    expect(screen.getByTestId('result').textContent).toBe('0');
  });

  it('propaga el error del worker', () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    render(<Probe />);

    fireEvent.click(screen.getByText('run'));
    const worker = lastWorker();
    act(() => worker.emit({ type: 'error', message: 'boom' }));

    expect(screen.getByTestId('phase').textContent).toBe('error');
    expect(screen.getByTestId('error').textContent).toBe('boom');
  });

  it('evalua el equipo puesto en su propio worker', () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    render(<Probe />);

    fireEvent.click(screen.getByText('evaluate'));

    const sent = lastWorker().sent;
    expect(sent?.type).toBe('evaluate');
    if (!sent || sent.type !== 'evaluate') throw new Error('Expected an evaluate message.');
    expect(sent.equipment).toEqual({ weapon: 'w1' });
    expect(screen.getByTestId('evaluating').textContent).toBe('true');

    act(() => lastWorker().emit({ type: 'evaluated', evaluation }));

    expect(screen.getByTestId('evaluation').textContent).toBe('80');
    expect(screen.getByTestId('evaluating').textContent).toBe('false');
    expect(lastWorker().terminated).toBe(true);
  });

  it('informa el error de la evaluacion sin tocar la busqueda', () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    render(<Probe />);

    fireEvent.click(screen.getByText('evaluate'));
    act(() => lastWorker().emit({ type: 'evaluateError', message: 'sin equipo valido' }));

    expect(screen.getByTestId('evaluationError').textContent).toBe('sin equipo valido');
    expect(screen.getByTestId('evaluating').textContent).toBe('false');
    expect(screen.getByTestId('phase').textContent).toBe('idle');
  });
});
