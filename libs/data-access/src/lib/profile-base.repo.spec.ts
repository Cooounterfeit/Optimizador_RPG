import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import { createProfileBaseRepository } from './profile-base.repo.js';

describe('profile base repository', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: ReturnType<typeof createProfileBaseRepository>;

  beforeEach(() => {
    name = `test-profile-base-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createProfileBaseRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('guarda y lee la base de un perfil', async () => {
    await repo.save('g1', 'nova', { nivel: 3, atk: 30 });

    await expect(repo.get('g1', 'nova')).resolves.toEqual({ nivel: 3, atk: 30 });
  });

  it('separa los perfiles y elimina solo el pedido', async () => {
    await repo.save('g1', 'nova', { atk: 30 });
    await repo.save('g1', 'orion', { atk: 40 });

    await repo.removeProfile('g1', 'nova');

    await expect(repo.get('g1', 'nova')).resolves.toBeUndefined();
    await expect(repo.get('g1', 'orion')).resolves.toEqual({ atk: 40 });
  });

  it('rechaza valores que no son numeros', async () => {
    await expect(
      repo.save('g1', 'nova', { atk: 'mucho' } as unknown as Record<string, number>),
    ).rejects.toBeInstanceOf(DataAccessError);
  });
});
