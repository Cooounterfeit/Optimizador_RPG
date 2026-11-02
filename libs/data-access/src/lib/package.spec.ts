import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item } from '@zenith/shared-types';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import { createGameRepository } from './games.repo.js';
import { createImagesRepository } from './images.repo.js';
import { createInventoryRepository } from './inventory.repo.js';
import { exportGame, importGame, makePackage, parsePackage, type PackageDeps } from './package.js';
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

describe('game package (export / import)', () => {
  let database: ZenithDatabase;
  let name: string;
  let deps: PackageDeps;

  beforeEach(() => {
    name = `test-package-${crypto.randomUUID()}`;
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

  it('exporta plantilla, objetos e imagenes de objetos', async () => {
    await deps.games.save({ id: 'g1', template: emptyTemplate('g1', 'Mi Juego') });
    await deps.inventory.addItem(item(), 'g1');
    await deps.images.set('g1', 'Espada Larga', png);
    await deps.images.set('g1', 'Retrato base', png);

    const pkg = await exportGame('g1', deps);

    expect(pkg.zenith).toBe('0.1');
    expect(pkg.template.gameId).toBe('g1');
    expect(pkg.items).toEqual([item()]);
    expect(pkg.images).toEqual({ 'espada larga': png });
  });

  it('falla al exportar un juego que no existe', async () => {
    await expect(exportGame('nope', deps)).rejects.toBeInstanceOf(DataAccessError);
  });

  it('importa un paquete como juego nuevo', async () => {
    const pkg = makePackage(emptyTemplate('origen', 'Paladin'), [item()], { espada: png });

    const result = await importGame(pkg, deps);

    expect(result).toEqual({ id: 'paladin', items: 1, images: 1 });
    await expect(deps.games.get('paladin')).resolves.toMatchObject({ id: 'paladin' });
    await expect(deps.inventory.getAll('paladin')).resolves.toEqual([item()]);
    await expect(deps.images.get('paladin')).resolves.toEqual({ espada: png });
  });

  it('renombra el juego y los objetos cuando los ids ya estan usados', async () => {
    await deps.games.save({ id: 'paladin', template: emptyTemplate('paladin', 'Paladin') });
    await deps.inventory.addItem(item(), 'paladin');
    const pkg = makePackage(emptyTemplate('origen', 'Paladin'), [item()]);

    const result = await importGame(pkg, deps);

    expect(result.id).toBe('paladin-2');
    const items = await deps.inventory.getAll('paladin-2');
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('i1-2');
    await expect(deps.inventory.getAll('paladin')).resolves.toEqual([item()]);
  });

  it('rechaza un paquete con otra version o sin objetos', () => {
    expect(() => parsePackage({ zenith: '9', template: emptyTemplate('x'), items: [] })).toThrow(
      DataAccessError,
    );
    expect(() => parsePackage({ zenith: '0.1', template: emptyTemplate('x') })).toThrow(
      DataAccessError,
    );
  });

  it('rechaza un objeto invalido dentro del paquete', () => {
    expect(() =>
      parsePackage({
        zenith: '0.1',
        exportedAt: 'x',
        template: emptyTemplate('x'),
        items: [{ id: 'roto' }],
      }),
    ).toThrow(DataAccessError);
  });

  it('rechaza importar sobre un id ocupado si se pide explicitamente', async () => {
    await deps.games.save({ id: 'paladin', template: emptyTemplate('paladin', 'Paladin') });
    const pkg = makePackage(emptyTemplate('origen', 'Paladin'), []);

    await expect(importGame(pkg, deps, { id: 'paladin' })).rejects.toBeInstanceOf(DataAccessError);
  });
});
