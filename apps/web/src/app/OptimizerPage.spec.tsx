import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  GameRepository,
  InventoryRepository,
  LevelHistoryRepository,
  ProfileBaseRepository,
  SkillsRepository,
} from '@zenith/data-access';
import type { GameTemplate, Item, SolveResponse } from '@zenith/shared-types';

import { mockCatalogRepository, setCatalogRepository } from '../features/catalog/catalog-repository';
import { gameCopy } from '../features/game/copy';
import {
  setGameRepository,
  setInventoryRepository,
  setLevelHistoryRepository,
  setProfileBaseRepository,
  setSkillsRepository,
} from '../features/game/repositories';
import {
  defaultOptimizerRepository,
  setOptimizerRepository,
  type OptimizerRecord,
} from '../features/optimizer/optimizer-repository';
import type { WorkerIn, WorkerOut } from '../features/optimizer/optimizer.worker';
import { OptimizerPage } from './OptimizerPage';

/**
 * El inventario se puede mockear por test para probar que un cambio despues de
 * una busqueda descarta el resultado. Con `active` en false se usa el hook real.
 */
const inventoryMock = vi.hoisted(() => ({ active: false, items: [] as Item[] }));

vi.mock('../features/inventory/useInventory', async (importOriginal) => {
  const original = await importOriginal<typeof import('../features/inventory/useInventory')>();

  return {
    ...original,
    useInventory: (gameId: string | undefined) => {
      if (!inventoryMock.active) return original.useInventory(gameId);
      return {
        items: inventoryMock.items,
        error: null,
        reload: async () => undefined,
        add: async () => undefined,
        update: async () => undefined,
        remove: async () => undefined,
      };
    },
  };
});

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

const lastWorker = (): FakeWorker => {
  const worker = FakeWorker.instances.at(-1);
  if (!worker) throw new Error('The fake worker was not created.');
  return worker;
};

/** En jsdom `import.meta.url` no siempre es `file:`, asi que se ubica la raiz del workspace. */
const workspaceRoot = (() => {
  const cwd = process.cwd();
  const candidates = [cwd, resolve(cwd, '..'), resolve(cwd, '../..'), resolve(cwd, '../../..')];
  const found = candidates.find((candidate) =>
    existsSync(resolve(candidate, 'apps/web/public/seeds/gacha-demo.zenith.json')),
  );
  if (!found) throw new Error('Workspace root not found');
  return found;
})();

const seed = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'apps/web/public/seeds/gacha-demo.zenith.json'), 'utf8'),
) as { template: GameTemplate; items: Item[] };

/** `useGame` consulta el repositorio remoto solo si el id tiene forma de uuid. */
const GAME_ID = '11111111-1111-4111-8111-111111111111';

const record = (template: GameTemplate): OptimizerRecord => ({
  id: GAME_ID,
  name: template.name,
  gameName: template.name,
  description: template.description,
  template,
  sampleItems: seed.items,
});

const emptyResult = {
  builds: [],
  stats: { evaluated: 12, stoppedBy: 'sin-combinacion' },
} as unknown as SolveResponse;

const noopGames: GameRepository = {
  list: async () => [],
  get: async () => undefined,
  save: async (game) => ({ ...game, updatedAt: 0 }),
  remove: async () => undefined,
  clearLocalData: async () => undefined,
};

const inventoryRepo = (items: Item[]): InventoryRepository => ({
  addItem: async () => undefined,
  getAll: async () => [...items],
  getById: async (id: string) => items.find((item) => item.id === id),
  updateItem: async () => undefined,
  removeItem: async () => undefined,
  searchItems: async () => [...items],
  removeByGame: async () => undefined,
});

const levelHistoryRepo = (): LevelHistoryRepository => ({
  list: async () => [],
  recordLevel: async () => [],
  removeLevel: async () => [],
  clear: async () => undefined,
});

const skillsRepo = (): SkillsRepository => ({
  load: async () => ({}),
  save: async () => undefined,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const baseRepo = (
  byProfile: Record<string, Record<string, number> | undefined> = {},
  pending?: Promise<unknown>,
  save: ProfileBaseRepository['save'] = async () => undefined,
): ProfileBaseRepository => ({
  get: async (_gameId: string, profileId: string) => {
    if (pending) await pending;
    return byProfile[profileId];
  },
  save,
  removeProfile: async () => undefined,
  removeByGame: async () => undefined,
});

const useTemplate = (
  template: GameTemplate = seed.template,
  items: Item[] = seed.items,
): void => {
  setOptimizerRepository({ getOptimizer: async () => record(template) });
  setInventoryRepository(inventoryRepo(items));
  setGameRepository(noopGames);
  setSkillsRepository(skillsRepo());
  setLevelHistoryRepository(levelHistoryRepo());
  setProfileBaseRepository(baseRepo());
};

const page = (id: string = GAME_ID) => (
  <MemoryRouter initialEntries={[`/optimizer/${id}`]}>
    <Routes>
      <Route path="optimizer/:id" element={<OptimizerPage />} />
    </Routes>
  </MemoryRouter>
);

const renderPage = (id: string = GAME_ID) => render(page(id));

const optimizeButton = () => screen.getByRole('button', { name: gameCopy.cockpit.optimize });
const optimizeDisabled = (): boolean => (optimizeButton() as HTMLButtonElement).disabled;

const runAndFinish = async (): Promise<void> => {
  await waitFor(() => expect(optimizeDisabled()).toBe(false));
  fireEvent.click(optimizeButton());
  act(() => lastWorker().emit({ type: 'done', result: emptyResult }));
  expect(screen.getByText(gameCopy.cockpit.noFeasible)).toBeTruthy();
};

afterEach(() => {
  inventoryMock.active = false;
  inventoryMock.items = [];
  setCatalogRepository(mockCatalogRepository);
  setOptimizerRepository(defaultOptimizerRepository);
  setGameRepository(noopGames);
  setInventoryRepository(inventoryRepo([]));
  setProfileBaseRepository(baseRepo());
  setSkillsRepository(skillsRepo());
  setLevelHistoryRepository(levelHistoryRepo());
  vi.unstubAllGlobals();
  FakeWorker.reset();
});

describe('OptimizerPage', () => {
  it('muestra la ficha de una tarjeta demo sin plantilla en vez de un error', async () => {
    setCatalogRepository(mockCatalogRepository);
    setOptimizerRepository(defaultOptimizerRepository);
    setGameRepository(noopGames);

    renderPage('neon-drift');

    expect(await screen.findByText('Overdrive anomaly solver')).toBeTruthy();
    expect(screen.getByText('Demo optimizer')).toBeTruthy();
    expect(screen.queryByText('Could not load this optimizer')).toBeNull();
  });

  it('da error cuando el id no existe ni en el catalogo', async () => {
    setCatalogRepository(mockCatalogRepository);
    setOptimizerRepository(defaultOptimizerRepository);
    setGameRepository(noopGames);

    renderPage('no-existe');

    expect(await screen.findByText('Could not load this optimizer')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

describe('OptimizerPage con juego real', () => {
  it('no deja optimizar hasta que la base guardada del perfil esta lista', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();

    const gate = deferred<void>();
    const profileId = seed.template.baseProfiles[0].id;
    setProfileBaseRepository(baseRepo({ [profileId]: { atk: 999 } }, gate.promise));

    renderPage();

    await screen.findByRole('heading', { name: seed.template.name, level: 1 });
    expect(optimizeDisabled()).toBe(true);

    await act(async () => {
      gate.resolve(undefined);
    });

    await waitFor(() => expect(optimizeDisabled()).toBe(false));
    fireEvent.click(optimizeButton());

    const request = lastWorker().sent?.request;
    expect(request?.profileId).toBe(profileId);
    const sentProfile = request?.template.baseProfiles.find(
      (entry) => entry.id === request.profileId,
    );
    expect(sentProfile?.base.atk).toBe(999);
  });

  it('manda la base efectiva y no toca la base publicada de la plantilla', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();

    const profileId = seed.template.baseProfiles[0].id;
    setProfileBaseRepository(baseRepo({ [profileId]: { atk: 999 } }));

    renderPage();
    await runAndFinish();

    const request = lastWorker().sent?.request;
    const sentProfile = request?.template.baseProfiles.find((entry) => entry.id === request.profileId);
    const published = seed.template.baseProfiles.find((entry) => entry.id === request?.profileId);

    expect(sentProfile?.base.atk).toBe(999);
    expect(published?.base.atk).not.toBe(999);
  });

  it('limpia el resultado al cambiar de objetivo', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate({
      ...seed.template,
      objectives: [
        ...seed.template.objectives,
        {
          id: 'hp-score',
          name: 'HP score',
          description: 'A second objective so the test can switch.',
          kind: 'linear',
          formula: 'hp',
        },
      ],
    });

    renderPage();
    await runAndFinish();

    fireEvent.click(screen.getAllByRole('radio')[1]);

    await waitFor(() => expect(screen.queryByText(gameCopy.cockpit.noFeasible)).toBeNull());
  });

  it('limpia el resultado al cambiar de perfil y usa la base del perfil nuevo', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();

    const [first, second] = seed.template.baseProfiles;
    expect(second).toBeTruthy();
    setProfileBaseRepository(baseRepo({ [first.id]: { atk: 111 }, [second.id]: { atk: 777 } }));

    renderPage();
    await runAndFinish();

    fireEvent.change(screen.getByLabelText(gameCopy.cockpit.character, { exact: true }), {
      target: { value: second.id },
    });

    await waitFor(() => expect(screen.queryByText(gameCopy.cockpit.noFeasible)).toBeNull());
    await waitFor(() => expect(optimizeDisabled()).toBe(false));
    fireEvent.click(optimizeButton());

    const request = lastWorker().sent?.request;
    expect(request?.profileId).toBe(second.id);
    const sentProfile = request?.template.baseProfiles.find((entry) => entry.id === second.id);
    expect(sentProfile?.base.atk).toBe(777);
  });

  it('limpia el resultado cuando cambia el inventario', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();

    inventoryMock.active = true;
    inventoryMock.items = [seed.items[0]];

    const view = renderPage();
    await runAndFinish();

    inventoryMock.items = [seed.items[0], seed.items[1]];
    view.rerender(page());

    await waitFor(() => expect(screen.queryByText(gameCopy.cockpit.noFeasible)).toBeNull());
  });

  it('limpia el resultado cuando un objeto cambia de stats sin cambiar de id', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();

    inventoryMock.active = true;
    const base = seed.items[0];
    inventoryMock.items = [base];

    const view = renderPage();
    await runAndFinish();

    inventoryMock.items = [{ ...base, stats: { ...base.stats, atk: 9999 } }];
    view.rerender(page());

    await waitFor(() => expect(screen.queryByText(gameCopy.cockpit.noFeasible)).toBeNull());
  });

  it('limpia el resultado aunque el guardado de la subida de nivel falle', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();
    const save = vi.fn(async () => {
      throw new Error('save failed');
    });
    setProfileBaseRepository(baseRepo({}, undefined, save));

    renderPage();
    await runAndFinish();

    fireEvent.click(screen.getByRole('button', { name: gameCopy.cockpit.recordCurrentLevel }));
    await screen.findByText(gameCopy.cockpit.recordedLevel);

    fireEvent.change(screen.getByLabelText(gameCopy.cockpit.historyFutureLevel), {
      target: { value: '2' },
    });
    const levelUp = screen.getByRole('button', {
      name: gameCopy.cockpit.levelUpTo(2),
    }) as HTMLButtonElement;
    await waitFor(() => expect(levelUp.disabled).toBe(false));
    fireEvent.click(levelUp);

    await waitFor(() => expect(save).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(gameCopy.cockpit.noFeasible)).toBeNull());
  });

  it('pasa el limite de tiempo escrito en segundos y ninguno cuando es 0', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();

    renderPage();
    await runAndFinish();
    expect(lastWorker().sent?.deadlineMs).toBeUndefined();

    const timeLimit = () => screen.getByLabelText(gameCopy.cockpit.timeLimit);
    fireEvent.change(timeLimit(), { target: { value: '15' } });
    fireEvent.click(optimizeButton());
    expect(lastWorker().sent?.deadlineMs).toBe(15000);

    act(() => lastWorker().emit({ type: 'done', result: emptyResult }));
    fireEvent.change(timeLimit(), { target: { value: '0' } });
    fireEvent.click(optimizeButton());
    expect(lastWorker().sent?.deadlineMs).toBeUndefined();
  });

  it('avisa cuando se cancela antes del primer progreso', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate();

    renderPage();
    await waitFor(() => expect(optimizeDisabled()).toBe(false));
    fireEvent.click(optimizeButton());
    fireEvent.click(screen.getByRole('button', { name: gameCopy.cockpit.stop }));

    expect(await screen.findByText(gameCopy.cockpit.cancelled)).toBeTruthy();
    expect(screen.queryByText(gameCopy.cockpit.noFeasible)).toBeNull();
  });

  it('explica que falta el objetivo en vez de solo deshabilitar el boton', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate({ ...seed.template, objectives: [] });

    renderPage();

    expect(await screen.findByText(gameCopy.cockpit.missingObjectives)).toBeTruthy();
    expect(optimizeDisabled()).toBe(true);
  });

  it('explica que faltan los perfiles y no rompe sin ellos', async () => {
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
    useTemplate({ ...seed.template, baseProfiles: [] });

    renderPage();

    expect(await screen.findByText(gameCopy.cockpit.missingProfiles)).toBeTruthy();
    expect(optimizeDisabled()).toBe(true);
  });

  it('no rompe mientras la plantilla todavia esta cargando', () => {
    setOptimizerRepository({ getOptimizer: () => new Promise<never>(() => undefined) });
    setGameRepository(noopGames);
    setInventoryRepository(inventoryRepo([]));
    setSkillsRepository(skillsRepo());
    setLevelHistoryRepository(levelHistoryRepo());
    setProfileBaseRepository(baseRepo());

    renderPage();

    expect(screen.getByText(gameCopy.loading)).toBeTruthy();
  });
});
