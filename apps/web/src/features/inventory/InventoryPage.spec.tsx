import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { inventoryRepository, type GameRepository, type InventoryRepository } from '@zenith/data-access';
import type { GameTemplate, Item } from '@zenith/shared-types';

import { setGameRepository, setInventoryRepository } from '../game/repositories';
import {
  defaultOptimizerRepository,
  setOptimizerRepository,
} from '../optimizer/optimizer-repository';
import { InventoryPage } from './InventoryPage';

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'genshin',
  name: 'Genshin Impact',
  description: '',
  stats: [
    { id: 'atk', name: 'Attack', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
  ],
  slots: [
    { id: 'weapon', name: 'Weapon' },
    { id: 'flower', name: 'Flower' },
  ],
  sets: [{ id: 'gladiator', name: 'Gladiator', tiers: [] }],
  derived: [],
  objectives: [{ id: 'score', name: 'Score', description: '', kind: 'linear', formula: 'atk' }],
  baseProfiles: [{ id: 'base', name: 'Base', base: { atk: 100 } }],
  constrainableStats: [],
};

const item: Item = {
  id: 'item-1',
  slot: 'weapon',
  setId: null,
  name: 'Sword',
  rarity: 5,
  level: 90,
  stats: { atk: 100 },
};

const flower: Item = {
  id: 'item-2',
  slot: 'flower',
  setId: 'gladiator',
  name: 'Flower',
  rarity: 5,
  level: 0,
  stats: { hp: 4780 },
};

const noopGames: GameRepository = {
  list: async () => [],
  get: async () => undefined,
  save: async (game) => ({ ...game, updatedAt: 0 }),
  remove: async () => undefined,
  clearLocalData: async () => undefined,
};

const memoryInventory = (seed: Item[] = []) => {
  const items = new Map(seed.map((entry) => [entry.id, entry]));

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
      if (!items.has(next.id)) throw new Error('missing item');
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

const OPTIMIZER_ID = 'a8af21aa-cfef-4975-87f8-d1f43d411a70';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/optimizer/${OPTIMIZER_ID}/inventario`]}>
      <Routes>
        <Route path="optimizer/:id/inventario" element={<InventoryPage />} />
      </Routes>
    </MemoryRouter>,
  );

const setup = (seed: Item[] = []) => {
  const inventory = memoryInventory(seed);
  setGameRepository(noopGames);
  setInventoryRepository(inventory.repository);
  setOptimizerRepository({
    getOptimizer: async () => ({
      id: OPTIMIZER_ID,
      name: 'Genshin Impact optimizer',
      gameName: 'Genshin Impact',
      description: '',
      template,
      sampleItems: [],
    }),
  });
  return inventory;
};

afterEach(() => {
  setOptimizerRepository(defaultOptimizerRepository);
  setGameRepository(noopGames);
  setInventoryRepository(inventoryRepository);
});

describe('InventoryPage', () => {
  it('muestra el estado vacio', async () => {
    setup();
    renderPage();

    expect(await screen.findByText('Your inventory is empty')).toBeTruthy();
    expect(screen.getByText('0 items')).toBeTruthy();
  });

  it('agrega un objeto y lo muestra en la lista', async () => {
    const inventory = setup();
    renderPage();
    await screen.findByText('Your inventory is empty');

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sword' } });
    fireEvent.change(screen.getByLabelText('Slot'), { target: { value: 'weapon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    expect(await screen.findByText('Sword')).toBeTruthy();
    expect(inventory.items.size).toBe(1);
    expect(screen.getByText('1 item')).toBeTruthy();
  });

  it('edita el nombre del objeto', async () => {
    const inventory = setup([item]);
    renderPage();
    await screen.findByText('Sword');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Greatsword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    expect(await screen.findByText('Greatsword')).toBeTruthy();
    await waitFor(() => expect(inventory.items.get('item-1')?.name).toBe('Greatsword'));
  });

  it('pide confirmacion antes de borrar y luego desaparece', async () => {
    const inventory = setup([item]);
    renderPage();
    await screen.findByText('Sword');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeTruthy();
    expect(inventory.items.size).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(await screen.findByText('Your inventory is empty')).toBeTruthy();
    expect(inventory.items.size).toBe(0);
  });

  it('cambia a la pestaña de personajes', async () => {
    setup();
    renderPage();
    await screen.findByText('Your inventory is empty');

    fireEvent.click(screen.getByRole('tab', { name: /Characters/ }));

    expect(await screen.findByText('Base')).toBeTruthy();
    expect(screen.getByLabelText('Search characters')).toBeTruthy();
    expect(screen.getByText(/base profiles from the template/)).toBeTruthy();
  });

  it('filtra el inventario por ranura', async () => {
    setup([item, flower]);
    renderPage();
    await screen.findByText('Sword');

    fireEvent.change(screen.getByLabelText('Slot filter'), { target: { value: 'flower' } });

    const list = screen.getByRole('list', { name: 'Items' });
    expect(within(list).getByText('Flower', { selector: 'p' })).toBeTruthy();
    expect(within(list).queryByText('Sword', { selector: 'p' })).toBeNull();
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  it('muestra el estado sin coincidencias y limpia los filtros', async () => {
    setup([item, flower]);
    renderPage();
    await screen.findByText('Sword');

    fireEvent.change(screen.getByLabelText('Search items'), { target: { value: 'no-existe' } });

    expect(await screen.findByText('No items match those filters')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    const list = await screen.findByRole('list', { name: 'Items' });
    expect(within(list).getByText('Sword', { selector: 'p' })).toBeTruthy();
    expect(within(list).getByText('Flower', { selector: 'p' })).toBeTruthy();
  });

  it('permite cancelar el borrado', async () => {
    const inventory = setup([item]);
    renderPage();
    await screen.findByText('Sword');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Sword')).toBeTruthy();
    expect(inventory.items.size).toBe(1);
  });
});
