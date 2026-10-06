import { describe, expect, it } from 'vitest';

import { GAME_SCHEMA_VERSION, GameConfigSchema } from './game-config.js';

describe('GameConfigSchema', () => {
  it('parsea una configuracion valida y aplica la version por defecto', () => {
    const parsed = GameConfigSchema.parse({ id: 'g1', name: 'Demo' });
    expect(parsed.version).toBe(GAME_SCHEMA_VERSION);
  });

  it('rechaza un id vacio', () => {
    expect(() => GameConfigSchema.parse({ id: '', name: 'Demo' })).toThrow();
  });
});
