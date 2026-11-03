import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import { createGameRepository } from './games.repo.js';
import { createInventoryRepository } from './inventory.repo.js';
import type { GameRepository, InventoryRepository } from './ports.js';
import { createSettingsRepository } from './settings.repo.js';
import { createSkillsRepository } from './skills.repo.js';
import { emptyTemplate } from './template.js';

describe('games repository', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: GameRepository;
  let inventory: InventoryRepository;

  beforeEach(() => {
    name = `test-games-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createGameRepository(database);
    inventory = createInventoryRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('guarda y lee un juego', async () => {
    await repo.save({ id: 'g1', template: emptyTemplate('g1') });

    await expect(repo.get('g1')).resolves.toMatchObject({ id: 'g1', template: emptyTemplate('g1') });
  });

  it('lista por updatedAt descendente', async () => {
    const template = emptyTemplate('g1');
    await database.games.put({ id: 'g1', template, updatedAt: 1 });
    await database.games.put({ id: 'g2', template: { ...template, gameId: 'g2' }, updatedAt: 2 });

    await expect(repo.list()).resolves.toEqual([
      expect.objectContaining({ id: 'g2' }),
      expect.objectContaining({ id: 'g1' }),
    ]);
  });

  it('rechaza una plantilla invalida', async () => {
    const broken = { ...emptyTemplate('g1'), stats: 'nada' } as unknown as ReturnType<
      typeof emptyTemplate
    >;
    await expect(repo.save({ id: 'g1', template: broken })).rejects.toBeInstanceOf(DataAccessError);
  });

  it('rechaza un id que no coincide con la plantilla', async () => {
    await expect(repo.save({ id: 'otro', template: emptyTemplate('g1') })).rejects.toBeInstanceOf(
      DataAccessError,
    );
  });

  it('conserva las marcas de nube al volver a guardar', async () => {
    await repo.save({ id: 'g1', template: emptyTemplate('g1'), cloud: true, syncedAt: 10 });
    await repo.save({ id: 'g1', template: emptyTemplate('g1') });

    await expect(repo.get('g1')).resolves.toMatchObject({ cloud: true, syncedAt: 10 });
  });

  it('borra solo la cache del optimizador, sin tocar tus datos', async () => {
    await repo.save({ id: 'g1', template: emptyTemplate('g1') });
    await inventory.addItem(
      { id: 'i1', slot: 'weapon', setId: null, name: 'Espada', stats: {} },
      'g1',
    );

    await repo.remove('g1');

    await expect(repo.get('g1')).resolves.toBeUndefined();
    await expect(inventory.getAll('g1')).resolves.toEqual([
      { id: 'i1', slot: 'weapon', setId: null, name: 'Espada', stats: {} },
    ]);
  });

  it('borra tus datos de un juego sin tocar la cache ni otros juegos', async () => {
    await repo.save({ id: 'g1', template: emptyTemplate('g1') });
    await repo.save({ id: 'g2', template: emptyTemplate('g2') });
    await inventory.addItem(
      { id: 'i1', slot: 'weapon', setId: null, name: 'Espada', stats: {} },
      'g1',
    );
    await inventory.addItem(
      { id: 'i2', slot: 'weapon', setId: null, name: 'Hacha', stats: {} },
      'g2',
    );
    await database.equipment.put({ gameId: 'g1', profileId: 'base', slots: { weapon: 'i1' }, updatedAt: 1 });
    await database.level_history.put({ gameId: 'g1', profileId: 'base', level: 2, base: {}, at: 'x' });
    await createSkillsRepository(database).save('g1', { golpe: 1 });
    await database.images.put({ id: 'g1::espada', gameId: 'g1', key: 'espada', data: 'x', updatedAt: 1 });
    await createSettingsRepository(database).set('lastGameId', 'g1');

    await repo.clearLocalData('g1');

    await expect(repo.get('g1')).resolves.toBeDefined();
    await expect(inventory.getAll('g1')).resolves.toEqual([]);
    await expect(database.equipment.count()).resolves.toBe(0);
    await expect(database.level_history.count()).resolves.toBe(0);
    await expect(database.skills.count()).resolves.toBe(0);
    await expect(database.images.count()).resolves.toBe(0);
    await expect(inventory.getAll('g2')).resolves.toEqual([
      { id: 'i2', slot: 'weapon', setId: null, name: 'Hacha', stats: {} },
    ]);
    await expect(createSettingsRepository(database).get('lastGameId')).resolves.toBe('g1');
  });
});
