import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item } from '@zenith/shared-types';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import { createInventoryRepository } from './inventory.repo.js';
import type { InventoryRepository } from './ports.js';

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  slot: 'weapon',
  setId: null,
  name: 'Espada Larga',
  stats: { atk: 10 },
  ...overrides,
});

describe('inventory repository (local_inventory)', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: InventoryRepository;

  beforeEach(() => {
    name = `test-inventory-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createInventoryRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('agrega un objeto y lo devuelve por id', async () => {
    await repo.addItem(item(), 'game-1');

    await expect(repo.getById('i1')).resolves.toEqual(item());
  });

  it('devuelve undefined si el id no existe', async () => {
    await expect(repo.getById('nope')).resolves.toBeUndefined();
  });

  it('lista todo el inventario o solo el de un juego, ordenado por nombre', async () => {
    await repo.addItem(item({ id: 'b', name: 'Zapato' }), 'game-1');
    await repo.addItem(item({ id: 'a', name: 'Anillo' }), 'game-1');
    await repo.addItem(item({ id: 'c', name: 'Casco' }), 'game-2');

    await expect(repo.getAll()).resolves.toHaveLength(3);
    await expect(repo.getAll('game-1')).resolves.toEqual([
      item({ id: 'a', name: 'Anillo' }),
      item({ id: 'b', name: 'Zapato' }),
    ]);
  });

  it('actualiza un objeto existente', async () => {
    await repo.addItem(item(), 'game-1');
    await repo.updateItem(item({ name: 'Espada Corta', stats: { atk: 4 } }), 'game-1');

    await expect(repo.getById('i1')).resolves.toEqual(
      item({ name: 'Espada Corta', stats: { atk: 4 } }),
    );
  });

  it('rechaza actualizar un objeto que no existe', async () => {
    await expect(repo.updateItem(item(), 'game-1')).rejects.toBeInstanceOf(DataAccessError);
  });

  it('rechaza un objeto invalido y no lo guarda', async () => {
    await expect(repo.addItem({ id: 'roto' } as unknown as Item, 'game-1')).rejects.toBeInstanceOf(
      DataAccessError,
    );
    await expect(repo.getAll()).resolves.toEqual([]);
  });

  it('rechaza un id repetido', async () => {
    await repo.addItem(item(), 'game-1');
    await expect(repo.addItem(item({ name: 'Otra' }), 'game-1')).rejects.toBeInstanceOf(
      DataAccessError,
    );
  });

  it('elimina un objeto y no falla si ya no estaba', async () => {
    await repo.addItem(item(), 'game-1');
    await repo.removeItem('i1');
    await expect(repo.getById('i1')).resolves.toBeUndefined();
    await expect(repo.removeItem('i1')).resolves.toBeUndefined();
  });

  it('busca por nombre ignorando mayusculas, tildes y separadores', async () => {
    await repo.addItem(item({ id: 'e', name: 'Espada Larga' }), 'game-1');
    await repo.addItem(item({ id: 'c', name: 'Casco de Hierro' }), 'game-1');

    await expect(repo.searchItems('espada')).resolves.toEqual([item({ id: 'e', name: 'Espada Larga' })]);
    await expect(repo.searchItems('LÁRGA')).resolves.toEqual([item({ id: 'e', name: 'Espada Larga' })]);
    await expect(repo.searchItems('de_hierro')).resolves.toEqual([
      item({ id: 'c', name: 'Casco de Hierro' }),
    ]);
    await expect(repo.searchItems('')).resolves.toHaveLength(2);
  });

  it('busca solo dentro de un juego cuando se le pide', async () => {
    await repo.addItem(item({ id: 'e1', name: 'Espada' }), 'game-1');
    await repo.addItem(item({ id: 'e2', name: 'Espada' }), 'game-2');

    await expect(repo.searchItems('espada', 'game-2')).resolves.toEqual([
      item({ id: 'e2', name: 'Espada' }),
    ]);
  });

  it('borra el inventario de un juego sin tocar el de otro', async () => {
    await repo.addItem(item({ id: 'a' }), 'game-1');
    await repo.addItem(item({ id: 'b' }), 'game-2');

    await repo.removeByGame('game-1');

    await expect(repo.getAll('game-1')).resolves.toEqual([]);
    await expect(repo.getAll('game-2')).resolves.toEqual([item({ id: 'b' })]);
  });
});
