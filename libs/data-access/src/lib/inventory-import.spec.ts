import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item } from '@zenith/shared-types';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import { createGameRepository } from './games.repo.js';
import { createImagesRepository } from './images.repo.js';
import { addItems, importInventory } from './inventory-import.js';
import { createInventoryRepository } from './inventory.repo.js';
import { makePackage, type PackageDeps } from './package.js';
import { emptyTemplate } from './template.js';

const png = 'data:image/png;base64,iVBORw0KGgo=';

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  slot: 'weapon',
  setId: null,
  name: 'Espada Larga',
  stats: { atk: 10 },
  ...overrides,
});

describe('inventory import', () => {
  let database: ZenithDatabase;
  let name: string;
  let deps: PackageDeps;

  beforeEach(() => {
    name = `test-inventory-import-${crypto.randomUUID()}`;
    database = createDb(name);
    deps = {
      games: createGameRepository(database),
      inventory: createInventoryRepository(database),
      images: createImagesRepository(database),
    };
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('agrega objetos al juego actual sin tocar otros juegos', async () => {
    await deps.inventory.addItem(item({ id: 'otro' }), 'g2');
    const pkg = makePackage(emptyTemplate('g1', 'G1'), [item()]);

    const result = await importInventory(pkg, 'g1', deps);

    expect(result.items).toBe(1);
    await expect(deps.inventory.getAll('g1')).resolves.toEqual([item()]);
    await expect(deps.inventory.getAll('g2')).resolves.toEqual([item({ id: 'otro' })]);
  });

  it('renombra los ids repetidos en modo merge', async () => {
    await deps.inventory.addItem(item(), 'g1');
    const pkg = makePackage(emptyTemplate('g1', 'G1'), [item()]);

    const result = await importInventory(pkg, 'g1', deps);

    expect(result.items).toBe(1);
    const items = await deps.inventory.getAll('g1');
    expect(items.map((entry) => entry.id).sort()).toEqual(['i1', 'i1-2']);
  });

  it('reemplaza solo el inventario del juego destino', async () => {
    await deps.inventory.addItem(item({ id: 'viejo' }), 'g1');
    await deps.inventory.addItem(item({ id: 'ajeno' }), 'g2');
    const pkg = makePackage(emptyTemplate('g1', 'G1'), [item({ id: 'nuevo' })]);

    const result = await importInventory(pkg, 'g1', deps, { mode: 'replace' });

    expect(result.items).toBe(1);
    await expect(deps.inventory.getAll('g1')).resolves.toEqual([item({ id: 'nuevo' })]);
    await expect(deps.inventory.getAll('g2')).resolves.toEqual([item({ id: 'ajeno' })]);
  });

  it('rechaza un paquete de otro juego sin escribir nada', async () => {
    const pkg = makePackage(emptyTemplate('otro', 'Otro'), [item()]);

    await expect(importInventory(pkg, 'g1', deps)).rejects.toBeInstanceOf(DataAccessError);
    await expect(deps.inventory.getAll('g1')).resolves.toEqual([]);
  });

  it('importa las imagenes del paquete', async () => {
    const pkg = makePackage(emptyTemplate('g1', 'G1'), [item()], { 'espada larga': png });

    const result = await importInventory(pkg, 'g1', deps);

    expect(result.images).toBe(1);
    await expect(deps.images.get('g1')).resolves.toEqual({ 'espada larga': png });
  });

  it('rechaza un objeto invalido y no guarda el lote', async () => {
    const invalid = { ...item(), stats: undefined } as unknown as Item;

    await expect(addItems([invalid], 'g1', deps)).rejects.toBeInstanceOf(DataAccessError);
    await expect(deps.inventory.getAll('g1')).resolves.toEqual([]);
  });
});
