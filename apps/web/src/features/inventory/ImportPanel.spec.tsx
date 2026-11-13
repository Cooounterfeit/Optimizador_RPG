import { clearInventoryCatalogCache, type InventoryCatalog } from '@zenith/inventory';
import type {
  GameRepository,
  ImageMap,
  ImagesRepository,
  InventoryRepository,
} from '@zenith/data-access';
import type { GameTemplate, Item } from '@zenith/shared-types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setGameRepository, setImagesRepository, setInventoryRepository } from '../game/repositories';
import { ImportPanel } from './ImportPanel';

// jsdom no implementa File.text(); el navegador real si.
if (typeof File !== 'undefined' && typeof File.prototype.text !== 'function') {
  File.prototype.text = function text(this: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

const catalog: InventoryCatalog = {
  kind: 'inventory',
  entries: [
    {
      key: 'starlight-blade',
      name: 'Starlight Blade',
      rarity: 5,
      type: 'sword',
      slot: 'weapon',
      maxLevel: 90,
      stats: {
        weaponAtk: {
          base: 46,
          curve: 'growth',
          ascension: [0, 12, 24, 36, 48, 60, 72],
        },
        critRate_: { base: 0.072, curve: 'growth', percent: true },
      },
    },
  ],
  curves: { '1': { growth: 1 }, '90': { growth: 2.5 } },
};

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'gacha-demo',
  name: 'Astral Forge',
  description: '',
  stats: [
    { id: 'atk', name: 'Attack', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
    { id: 'critRate_', name: 'CRIT Rate', unit: 'percent' },
  ],
  slots: [
    { id: 'weapon', name: 'Weapon' },
    { id: 'flower', name: 'Flower' },
  ],
  sets: [{ id: 'astral-core', name: 'Astral Core', tiers: [] }],
  derived: [],
  objectives: [{ id: 'score', name: 'Score', description: '', kind: 'linear', formula: 'atk' }],
  baseProfiles: [{ id: 'base', name: 'Base', base: { atk: 100 } }],
  constrainableStats: [],
  extensions: {
    inventory: {
      kind: 'inventory',
      catalogUrl: '/test-catalog.json',
      rules: {
        format: 'good',
        weaponSlot: 'weapon',
        slots: { flower: 'flower' },
        stats: { hp: 'hp', critRate_: 'critRate_' },
        rarities: [1, 2, 3, 4, 5],
        artifactLevelRange: { min: 0, max: 20 },
        itemLevelRange: { min: 0, max: 90 },
        mainStats: { hp: { '5': [[0, 500], [20, 4780]] } },
        labels: { entries: 'Weapons' },
      },
    },
  },
};

const good = {
  format: 'GOOD',
  artifacts: [
    {
      setKey: 'astral-core',
      rarity: 5,
      level: 20,
      slotKey: 'flower',
      mainStatKey: 'hp',
      substats: [{ key: 'critRate_', value: 7.8 }],
    },
  ],
  weapons: [{ key: 'starlight-blade', level: 90 }],
};

const item: Item = {
  id: 'i1',
  slot: 'flower',
  setId: 'astral-core',
  name: 'Flower',
  rarity: 5,
  level: 20,
  stats: { hp: 4780 },
};

const memoryInventory = () => {
  const items = new Map<string, Item>();
  const repository: InventoryRepository = {
    async addItem(next) {
      items.set(next.id, next);
    },
    async getAll() {
      return [...items.values()];
    },
    async getById(id) {
      return items.get(id);
    },
    async updateItem(next) {
      items.set(next.id, next);
    },
    async removeItem(id) {
      items.delete(id);
    },
    async searchItems(query) {
      return [...items.values()].filter((entry) => entry.name.includes(query));
    },
    async removeByGame() {
      items.clear();
    },
  };
  return { repository, items };
};

const noopGames: GameRepository = {
  list: async () => [],
  get: async () => undefined,
  save: async (game) => ({ ...game, updatedAt: 0 }),
  remove: async () => undefined,
  clearLocalData: async () => undefined,
};

const memoryImages = () => {
  const map: ImageMap = {};
  const repository: ImagesRepository = {
    async get() {
      return { ...map };
    },
    async set(_gameId, key, data) {
      map[key] = data;
    },
    async remove(_gameId, key) {
      delete map[key];
    },
    async import(_gameId, images) {
      Object.assign(map, images);
      return Object.keys(images).length;
    },
    async removeByGame() {
      for (const key of Object.keys(map)) delete map[key];
    },
    async copy() {
      return undefined;
    },
  };
  return { repository, map };
};

const upload = (data: unknown) => {
  const file = new File([JSON.stringify(data)], 'inventory.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('Inventory file'), { target: { files: [file] } });
};

describe('ImportPanel', () => {
  let inventory: ReturnType<typeof memoryInventory>;

  beforeEach(() => {
    inventory = memoryInventory();
    setInventoryRepository(inventory.repository);
    setGameRepository(noopGames);
    setImagesRepository(memoryImages().repository);
    clearInventoryCatalogCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => catalog })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('previsualiza e importa un GOOD', async () => {
    const onImported = vi.fn();
    render(<ImportPanel template={template} onImported={onImported} />);

    upload(good);

    expect(await screen.findByText('Preview')).toBeTruthy();
    expect(screen.getByText('Recognized stats')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(inventory.items.size).toBe(2));
    expect(onImported).toHaveBeenCalled();
    expect(await screen.findByText(/Imported 2 items/)).toBeTruthy();
  });

  it('rechaza un JSON roto sin escribir nada', async () => {
    render(<ImportPanel template={template} onImported={vi.fn()} />);

    const file = new File(['{nope'], 'broken.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Inventory file'), { target: { files: [file] } });

    expect(await screen.findByText('That file is not valid JSON.')).toBeTruthy();
    expect(inventory.items.size).toBe(0);
  });

  it('rechaza un archivo que no es GOOD ni paquete', async () => {
    render(<ImportPanel template={template} onImported={vi.fn()} />);

    upload({ hello: 'world' });

    expect(
      await screen.findByText('This file is not a GOOD export or a Zenith package.'),
    ).toBeTruthy();
  });

  it('restaura un paquete del mismo juego', async () => {
    const onImported = vi.fn();
    render(<ImportPanel template={template} onImported={onImported} />);

    upload({ zenith: '0.1', exportedAt: new Date().toISOString(), template, items: [item] });

    expect(await screen.findByText('Preview')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(inventory.items.get('i1')).toEqual(item));
    expect(await screen.findByText(/Restored 1 item/)).toBeTruthy();
  });

  it('rechaza un paquete de otro juego', async () => {
    render(<ImportPanel template={template} onImported={vi.fn()} />);

    upload({
      zenith: '0.1',
      exportedAt: new Date().toISOString(),
      template: { ...template, gameId: 'otro' },
      items: [item],
    });

    expect(await screen.findByText('Preview')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByText(/El paquete es de "otro"/)).toBeTruthy();
    expect(inventory.items.size).toBe(0);
  });
});
