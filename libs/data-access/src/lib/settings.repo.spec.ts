import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import type { SettingsRepository } from './ports.js';
import { createSettingsRepository } from './settings.repo.js';

describe('settings repository (local_settings)', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: SettingsRepository;

  beforeEach(() => {
    name = `test-settings-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createSettingsRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('guarda y lee una preferencia conocida', async () => {
    await repo.set('advancedMode', true);
    await expect(repo.get<boolean>('advancedMode')).resolves.toBe(true);

    await repo.set('advancedMode', false);
    await expect(repo.get<boolean>('advancedMode')).resolves.toBe(false);
  });

  it('devuelve undefined si la preferencia no existe', async () => {
    await expect(repo.get('advancedMode')).resolves.toBeUndefined();
  });

  it('rechaza un valor del tipo equivocado', async () => {
    await expect(repo.set('advancedMode', 'si')).rejects.toBeInstanceOf(DataAccessError);
  });

  it('rechaza una clave desconocida', async () => {
    await expect(repo.set('modoDios', true)).rejects.toBeInstanceOf(DataAccessError);
  });

  it('borra una preferencia', async () => {
    await repo.set('lastGameId', 'game-1');
    await repo.remove('lastGameId');
    await expect(repo.get('lastGameId')).resolves.toBeUndefined();
  });

  it('ignora un valor corrupto al leer', async () => {
    await database.local_settings.put({ key: 'advancedMode', value: 'roto' });
    await expect(repo.get('advancedMode')).resolves.toBeUndefined();
  });
});
