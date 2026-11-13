import { afterEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { createInventoryRepository } from './inventory.repo.js';
import { emptyTemplate } from './template.js';

describe('database (esquema, persistencia y concurrencia)', () => {
  const names: string[] = [];
  const opened: ZenithDatabase[] = [];

  const open = (name: string): ZenithDatabase => {
    const database = createDb(name);
    names.push(name);
    opened.push(database);
    return database;
  };

  afterEach(async () => {
    for (const database of opened.splice(0)) database.close();
    for (const name of names.splice(0)) await indexedDB.deleteDatabase(name);
  });

  it('usa los nombres de tabla que pide Jira, mas las tiendas de la app', () => {
    const database = open(`test-schema-${crypto.randomUUID()}`);
    const tables = database.tables.map((table) => table.name).sort();

    expect(tables).toEqual(
      ['equipment', 'games', 'images', 'level_history', 'local_inventory', 'local_settings', 'profile_base', 'skills'].sort(),
    );
  });

  it('conserva los datos al cerrar y reabrir la base', async () => {
    const name = `test-persist-${crypto.randomUUID()}`;
    const first = open(name);
    const repo = createInventoryRepository(first);
    await repo.addItem({ id: 'i1', slot: 'weapon', setId: null, name: 'Espada', stats: {} }, 'g1');
    first.close();

    const second = open(name);
    const reopened = createInventoryRepository(second);

    await expect(reopened.getById('i1')).resolves.toMatchObject({ id: 'i1', name: 'Espada' });
  });

  it('deja la ultima escritura cuando se escribe dos veces el mismo id', async () => {
    const database = open(`test-concurrent-${crypto.randomUUID()}`);
    const repo = createInventoryRepository(database);

    await repo.addItem({ id: 'i1', slot: 'weapon', setId: null, name: 'Primera', stats: {} }, 'g1');
    await Promise.all([
      repo.updateItem({ id: 'i1', slot: 'weapon', setId: null, name: 'Segunda', stats: {} }, 'g1'),
      repo.updateItem({ id: 'i1', slot: 'weapon', setId: null, name: 'Tercera', stats: {} }, 'g1'),
    ]);

    const all = await repo.getAll('g1');
    expect(all).toHaveLength(1);
    expect(['Segunda', 'Tercera']).toContain(all[0]?.name);
  });

  it('guarda solo la plantilla en games y los objetos en local_inventory', async () => {
    const database = open(`test-shape-${crypto.randomUUID()}`);
    await database.games.put({ id: 'g1', template: emptyTemplate('g1'), updatedAt: 1 });

    const row = await database.games.get('g1');
    expect(row).not.toHaveProperty('items');
    await expect(database.local_inventory.count()).resolves.toBe(0);
  });
});
