import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import { createLevelHistoryRepository } from './levels.repo.js';
import type { LevelHistoryRepository } from './ports.js';

describe('level history repository', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: LevelHistoryRepository;

  beforeEach(() => {
    name = `test-levels-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createLevelHistoryRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('registra niveles ordenados de menor a mayor', async () => {
    await repo.recordLevel('g1', 'base', 3, { atk: 30 });
    await repo.recordLevel('g1', 'base', 2, { atk: 20 });

    await expect(repo.list('g1', 'base')).resolves.toEqual([
      expect.objectContaining({ level: 2, base: { atk: 20 } }),
      expect.objectContaining({ level: 3, base: { atk: 30 } }),
    ]);
  });

  it('reemplaza el mismo nivel en vez de duplicarlo', async () => {
    await repo.recordLevel('g1', 'base', 2, { atk: 20 });
    await repo.recordLevel('g1', 'base', 2, { atk: 25 });

    const list = await repo.list('g1', 'base');
    expect(list).toHaveLength(1);
    expect(list[0]?.base).toEqual({ atk: 25 });
  });

  it('separa el historial por personaje', async () => {
    await repo.recordLevel('g1', 'guerrero', 2, { atk: 20 });
    await repo.recordLevel('g1', 'mago', 2, { int: 20 });

    await expect(repo.list('g1', 'guerrero')).resolves.toEqual([
      expect.objectContaining({ base: { atk: 20 } }),
    ]);
  });

  it('elimina un nivel puntual', async () => {
    await repo.recordLevel('g1', 'base', 2, { atk: 20 });
    await repo.recordLevel('g1', 'base', 3, { atk: 30 });

    await expect(repo.removeLevel('g1', 'base', 2)).resolves.toEqual([
      expect.objectContaining({ level: 3 }),
    ]);
  });

  it('limpia el historial de un personaje sin tocar al otro', async () => {
    await repo.recordLevel('g1', 'guerrero', 2, { atk: 20 });
    await repo.recordLevel('g1', 'mago', 2, { int: 20 });

    await repo.clear('g1', 'guerrero');

    await expect(repo.list('g1', 'guerrero')).resolves.toEqual([]);
    await expect(repo.list('g1', 'mago')).resolves.toHaveLength(1);
  });

  it('rechaza un nivel que no es entero', async () => {
    await expect(repo.recordLevel('g1', 'base', 1.5, {})).rejects.toBeInstanceOf(DataAccessError);
  });

  it('rechaza una estadistica que no es numero', async () => {
    await expect(
      repo.recordLevel('g1', 'base', 2, { atk: 'mucho' } as unknown as Record<string, number>),
    ).rejects.toBeInstanceOf(DataAccessError);
  });
});
