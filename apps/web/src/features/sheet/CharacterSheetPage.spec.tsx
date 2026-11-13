import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EquipmentRepository, InventoryRepository } from '@zenith/data-access';
import type { Equipment, GameTemplate, Item } from '@zenith/shared-types';

import {
  setEquipmentRepository,
  setGameRepository,
  setInventoryRepository,
  setLevelHistoryRepository,
  setProfileBaseRepository,
  setSkillsRepository,
} from '../game/repositories';
import { setOptimizerRepository } from '../optimizer/optimizer-repository';
import type { WorkerIn, WorkerOut } from '../optimizer/optimizer.worker';
import { CharacterSheetPage } from './CharacterSheetPage';
import { sheetCopy } from './copy';

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

/** Ultimo worker que recibio una evaluacion (la hoja no corre busquedas). */
const evaluateWorker = (): FakeWorker | undefined =>
  FakeWorker.instances.filter((worker) => worker.sent?.type === 'evaluate').at(-1);

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

const GAME_ID = '22222222-2222-4222-8222-222222222222';

const inventoryRepo = (items: Item[]): InventoryRepository => ({
  addItem: async () => undefined,
  getAll: async () => [...items],
  getById: async (id: string) => items.find((item) => item.id === id),
  updateItem: async () => undefined,
  removeItem: async () => undefined,
  searchItems: async () => [...items],
  removeByGame: async () => undefined,
});

const saved: Equipment[] = [];

const equipmentRepo = (initial: Equipment = {}): EquipmentRepository => ({
  get: async () => ({ ...initial }),
  save: async (_gameId: string, _profileId: string, slots: Equipment) => {
    saved.push({ ...slots });
  },
  removeProfile: async () => undefined,
  removeByGame: async () => undefined,
});

const useTemplate = (
  template: GameTemplate = seed.template,
  items: Item[] = seed.items,
  equipment: Equipment = {},
): void => {
  setOptimizerRepository({
    getOptimizer: async () => ({
      id: GAME_ID,
      name: template.name,
      gameName: template.name,
      description: template.description,
      template,
      sampleItems: items,
    }),
  });
  setInventoryRepository(inventoryRepo(items));
  setGameRepository({
    list: async () => [],
    get: async () => undefined,
    save: async (game) => ({ ...game, updatedAt: 0 }),
    remove: async () => undefined,
    clearLocalData: async () => undefined,
  });
  setSkillsRepository({ load: async () => ({}), save: async () => undefined });
  setLevelHistoryRepository({
    list: async () => [],
    recordLevel: async () => [],
    removeLevel: async () => [],
    clear: async () => undefined,
  });
  setProfileBaseRepository({
    get: async () => undefined,
    save: async () => undefined,
    removeProfile: async () => undefined,
    removeByGame: async () => undefined,
  });
  setEquipmentRepository(equipmentRepo(equipment));
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/optimizer/${GAME_ID}/personaje`]}>
      <Routes>
        <Route path="optimizer/:id/personaje" element={<CharacterSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );

const evaluation = (overrides: Partial<Record<string, number>> = {}) => ({
  finalStats: { atk: 1, ...overrides },
  vars: new Map<string, number>(),
  objetivos: { damage: 123 },
  conjuntos: [],
});

beforeEach(() => {
  saved.length = 0;
  FakeWorker.reset();
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  FakeWorker.reset();
  setInventoryRepository(inventoryRepo([]));
  setEquipmentRepository(equipmentRepo());
  setSkillsRepository({ load: async () => ({}), save: async () => undefined });
  setLevelHistoryRepository({
    list: async () => [],
    recordLevel: async () => [],
    removeLevel: async () => [],
    clear: async () => undefined,
  });
  setProfileBaseRepository({
    get: async () => undefined,
    save: async () => undefined,
    removeProfile: async () => undefined,
    removeByGame: async () => undefined,
  });
});

describe('CharacterSheetPage', () => {
  it('muestra las ranuras y la pieza que el personaje tiene puesta', async () => {
    useTemplate(seed.template, seed.items, { weapon: 'sample-weapon-astral' });

    renderPage();

    expect(
      await screen.findByRole('button', { name: `Weapon: Astral Edge` }, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: `Flower: ${sheetCopy.emptySlot}` })).toBeTruthy();
  });

  it('muestra el nivel guardado y evalua con la base del jugador', async () => {
    useTemplate();
    setProfileBaseRepository({
      get: async () => ({ nivel: 90 }),
      save: async () => undefined,
      removeProfile: async () => undefined,
      removeByGame: async () => undefined,
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/Level 90/)).toBeTruthy());

    await waitFor(() => expect(evaluateWorker()).toBeTruthy());
    const sent = evaluateWorker()?.sent;
    if (sent?.type !== 'evaluate') throw new Error('Expected an evaluate message.');
    const base = sent.request.template.baseProfiles.find((entry) => entry.id === 'nova')?.base;
    expect(base?.nivel).toBe(90);
  });

  it('elegir una pieza en una ranura la guarda y vuelve a evaluar', async () => {
    useTemplate();

    renderPage();
    await screen.findByRole('button', { name: `Weapon: ${sheetCopy.emptySlot}` });

    fireEvent.click(screen.getByRole('button', { name: `Weapon: ${sheetCopy.emptySlot}` }));
    expect(screen.getByText(sheetCopy.picker.title('Weapon'))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Astral Edge/ }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({ weapon: 'sample-weapon-astral' });

    await waitFor(() => {
      const sent = evaluateWorker()?.sent;
      expect(sent?.type).toBe('evaluate');
      if (sent?.type === 'evaluate') {
        expect(sent.equipment).toEqual({ weapon: 'sample-weapon-astral' });
      }
    });
  });

  it('no ofrece piezas que no caben en la ranura', async () => {
    useTemplate();

    renderPage();
    await screen.findByRole('button', { name: `Weapon: ${sheetCopy.emptySlot}` });
    fireEvent.click(screen.getByRole('button', { name: `Weapon: ${sheetCopy.emptySlot}` }));

    expect(screen.getByRole('button', { name: /Astral Edge/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Astral Bloom/ })).toBeNull();
  });

  it('mueve una pieza que ya estaba en otra ranura', async () => {
    const template: GameTemplate = {
      ...seed.template,
      slots: [
        { id: 'weapon', name: 'Weapon' },
        { id: 'offhand', name: 'Offhand' },
      ],
      sets: [],
    };
    const items = [
      {
        id: 'dual',
        slot: 'weapon',
        slots: ['offhand'],
        setId: null,
        name: 'Dual Blade',
        rarity: 5,
        stats: { atk: 10 },
      },
    ] as unknown as Item[];
    useTemplate(template, items, { weapon: 'dual' });

    renderPage();
    await screen.findByRole('button', { name: 'Offhand: Empty' }, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: 'Offhand: Empty' }));
    fireEvent.click(screen.getByRole('button', { name: /ATK 10/ }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({ offhand: 'dual' });
  });

  it('quitar todo deja el equipo vacio', async () => {
    useTemplate(seed.template, seed.items, { weapon: 'sample-weapon-astral' });

    renderPage();
    await screen.findByRole('button', { name: `Weapon: Astral Edge` }, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: sheetCopy.removeAll }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({});
  });

  it('avisa cuando el personaje no cumple el requisito de una pieza', async () => {
    useTemplate(seed.template, seed.items, { goblet: 'sample-goblet-void' });

    renderPage();

    expect(
      await screen.findByText('Void Goblet requires 60 CRIT DMG'),
    ).toBeTruthy();
  });

  it('avisa cuando el equipo se pasa del presupuesto', async () => {
    const template: GameTemplate = {
      ...seed.template,
      budgets: [{ statId: 'critRate', max: 1 }],
    };
    useTemplate(template);

    renderPage();
    await waitFor(() => expect(evaluateWorker()).toBeTruthy());
    act(() => evaluateWorker()?.emit({ type: 'evaluated', evaluation: evaluation({ critRate: 40 }) }));

    expect(await screen.findByText('CRIT Rate: 35 of 1')).toBeTruthy();
  });

  it('muestra el puntaje del equipo puesto', async () => {
    useTemplate();

    renderPage();
    await waitFor(() => expect(evaluateWorker()).toBeTruthy());
    act(() => evaluateWorker()?.emit({ type: 'evaluated', evaluation: evaluation() }));

    expect(await screen.findByText('123')).toBeTruthy();
  });

  it('invita a cargar piezas cuando el inventario esta vacio', async () => {
    useTemplate(seed.template, []);

    renderPage();

    expect(await screen.findByText(sheetCopy.emptyInventoryTitle)).toBeTruthy();
    expect(screen.getByRole('link', { name: sheetCopy.openInventory }).getAttribute('href')).toBe(
      `/optimizer/${GAME_ID}/inventario`,
    );
  });

  it('explica cuando el juego no define personajes', async () => {
    useTemplate({ ...seed.template, baseProfiles: [] });

    renderPage();

    expect(await screen.findByText(sheetCopy.noProfiles)).toBeTruthy();
  });
});
