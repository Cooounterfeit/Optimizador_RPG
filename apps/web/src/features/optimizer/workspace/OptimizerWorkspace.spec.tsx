import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EquipmentRepository,
  GameRepository,
  InventoryRepository,
  LevelHistoryRepository,
  ProfileBaseRepository,
  SkillsRepository,
} from '@zenith/data-access';
import type { GameTemplate, Item } from '@zenith/shared-types';

import {
  setEquipmentRepository,
  setGameRepository,
  setInventoryRepository,
  setLevelHistoryRepository,
  setProfileBaseRepository,
  setSkillsRepository,
} from '../../game/repositories';
import {
  setOptimizerRepository,
  type OptimizerRecord,
} from '../optimizer-repository';
import { renderWorkspace } from './testing';

const workspaceRoot = (() => {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    resolve(cwd, '..'),
    resolve(cwd, '../..'),
    resolve(cwd, '../../..'),
  ];
  const found = candidates.find((candidate) =>
    existsSync(
      resolve(candidate, 'apps/web/public/seeds/gacha-demo.zenith.json'),
    ),
  );
  if (!found) throw new Error('Workspace root not found');
  return found;
})();

const seed = JSON.parse(
  readFileSync(
    resolve(workspaceRoot, 'apps/web/public/seeds/gacha-demo.zenith.json'),
    'utf8',
  ),
) as { template: GameTemplate; items: Item[] };

const OPTIMIZER_ID = '33333333-3333-4333-8333-333333333333';

const record = (template: GameTemplate): OptimizerRecord => ({
  id: OPTIMIZER_ID,
  name: template.name,
  gameName: template.name,
  description: template.description,
  template,
  sampleItems: seed.items,
  published: true,
});

const games: GameRepository = {
  list: async () => [],
  get: async () => undefined,
  save: async (game) => ({ ...game, updatedAt: 0 }),
  remove: async () => undefined,
  clearLocalData: async () => undefined,
};

const inventory = (items: Item[]): InventoryRepository => ({
  addItem: async () => undefined,
  getAll: async () => [...items],
  getById: async (id: string) => items.find((item) => item.id === id),
  updateItem: async () => undefined,
  removeItem: async () => undefined,
  searchItems: async () => [...items],
  removeByGame: async () => undefined,
});

const skills: SkillsRepository = {
  load: async () => ({}),
  save: async () => undefined,
};

const levels: LevelHistoryRepository = {
  list: async () => [],
  recordLevel: async () => [],
  removeLevel: async () => [],
  clear: async () => undefined,
};

const bases: ProfileBaseRepository = {
  get: async () => undefined,
  save: async () => undefined,
  removeProfile: async () => undefined,
  removeByGame: async () => undefined,
};

const equipment: EquipmentRepository = {
  get: async () => ({}),
  save: async () => undefined,
  removeProfile: async () => undefined,
  removeByGame: async () => undefined,
};

/** Cuenta cuantas veces se resuelve la plantilla: navegar no debe volver a pedirla. */
let templateLoads = 0;

const useTemplate = (template: GameTemplate = seed.template): void => {
  templateLoads = 0;
  setOptimizerRepository({
    getOptimizer: async () => {
      templateLoads += 1;
      return record(template);
    },
  });
  setInventoryRepository(inventory(seed.items));
  setGameRepository(games);
  setSkillsRepository(skills);
  setLevelHistoryRepository(levels);
  setProfileBaseRepository(bases);
  setEquipmentRepository(equipment);
};

const rail = () => screen.getByRole('navigation', { name: 'Optimizer' });
const railLink = (name: string) => within(rail()).getByRole('link', { name });

const openWorkspace = async (path = `/optimizer/${OPTIMIZER_ID}`) => {
  renderWorkspace(path);
  await waitFor(() => expect(rail()).toBeTruthy());
};

beforeEach(() => {
  // La hoja de personaje abre un worker para evaluar el equipo puesto.
  vi.stubGlobal(
    'Worker',
    class {
      postMessage = () => undefined;
      terminate = () => undefined;
    },
  );
  useTemplate();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OptimizerWorkspace', () => {
  it('lista las secciones disponibles y marca la activa', async () => {
    await openWorkspace();

    expect(within(rail()).getAllByRole('link')).toHaveLength(7);
    for (const label of [
      'Optimize',
      'Character',
      'Inventory',
      'Skills',
      'Damage',
      'Configuration',
    ]) {
      expect(railLink(label)).toBeTruthy();
    }

    expect(railLink('Optimize').getAttribute('aria-current')).toBe('page');
    expect(railLink('Inventory').getAttribute('aria-current')).toBeNull();
    expect(railLink('All optimizers').getAttribute('href')).toBe('/');
  });

  it('esconde las secciones que la plantilla no declara', async () => {
    useTemplate({
      ...seed.template,
      damageCalculator: undefined,
      skillTrees: [],
    });

    await openWorkspace();

    // Configuration no se esconde nunca: una plantilla incompleta es justo la
    // que necesita que le digan que le falta.
    await waitFor(() =>
      expect(within(rail()).getAllByRole('link')).toHaveLength(5),
    );
    expect(within(rail()).queryByRole('link', { name: 'Damage' })).toBeNull();
    expect(within(rail()).queryByRole('link', { name: 'Skills' })).toBeNull();
  });

  it('navega entre secciones y mueve el marcador de activo', async () => {
    await openWorkspace();

    fireEvent.click(railLink('Inventory'));
    await screen.findByRole('button', { name: /Add item/ });

    expect(railLink('Inventory').getAttribute('aria-current')).toBe('page');
    expect(railLink('Optimize').getAttribute('aria-current')).toBeNull();
  });

  it('mantiene montadas las secciones: la pestaña elegida sobrevive al ir y volver', async () => {
    await openWorkspace();

    fireEvent.click(railLink('Inventory'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Catalog' }));
    expect(
      screen
        .getByRole('tab', { name: 'Catalog' })
        .getAttribute('aria-selected'),
    ).toBe('true');

    fireEvent.click(railLink('Damage'));
    await screen.findByRole('heading', { name: /damage/i, level: 1 });

    fireEvent.click(railLink('Inventory'));
    expect(
      screen
        .getByRole('tab', { name: 'Catalog' })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('no vuelve a pedir la plantilla al cambiar de seccion', async () => {
    await openWorkspace();
    await waitFor(() => expect(templateLoads).toBe(1));

    for (const label of [
      'Character',
      'Inventory',
      'Skills',
      'Damage',
      'Optimize',
    ]) {
      fireEvent.click(railLink(label));
    }

    expect(templateLoads).toBe(1);
    expect(screen.queryByText('Loading optimizer…')).toBeNull();
  });

  it('muestra una seccion desconocida con salida al optimizador', async () => {
    await openWorkspace(`/optimizer/${OPTIMIZER_ID}/loquesea`);

    expect(await screen.findByText('Page not found')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Back to optimizer' }),
    ).toBeTruthy();
  });
});
