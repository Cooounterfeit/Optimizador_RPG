import { describe, expect, it } from 'vitest';

import { GameTemplateSchema } from './game-template.js';
import { ItemSchema } from './item.js';

const minimalTemplate = () => ({
  schemaVersion: '0.1',
  gameId: 'demo',
  name: 'Demo',
  description: 'Plantilla minima',
  stats: [{ id: 'atk', name: 'Ataque', unit: 'flat' }],
  slots: [{ id: 'weapon', name: 'Arma' }],
  sets: [],
  derived: [],
  objectives: [
    {
      id: 'dano',
      name: 'Dano',
      description: 'Dano total',
      kind: 'linear',
      formula: 'atk',
    },
  ],
  baseProfiles: [{ id: 'base', name: 'Base', base: { atk: 10 } }],
  constrainableStats: ['atk'],
});

describe('GameTemplateSchema', () => {
  it('acepta una plantilla minima valida', () => {
    expect(GameTemplateSchema.safeParse(minimalTemplate()).success).toBe(true);
  });

  it('rechaza stats como objeto e indica la ruta', () => {
    const result = GameTemplateSchema.safeParse({
      ...minimalTemplate(),
      stats: { atk: { id: 'atk', name: 'Ataque', unit: 'flat' } },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'stats')).toBe(true);
    }
  });

  it('rechaza un objetivo sin formula', () => {
    const result = GameTemplateSchema.safeParse({
      ...minimalTemplate(),
      objectives: [
        {
          id: 'dano',
          name: 'Dano',
          description: 'Dano total',
          kind: 'linear',
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'objectives')).toBe(true);
    }
  });

  it('no rompe cuando faltan los campos opcionales', () => {
    const parsed = GameTemplateSchema.parse(minimalTemplate());

    expect(parsed.selfTests).toBeUndefined();
    expect(parsed.skillTrees).toBeUndefined();
    expect(parsed.leveling).toBeUndefined();
    expect(parsed.budgets).toBeUndefined();
  });
});

describe('ItemSchema', () => {
  it('rechaza un item con stats como texto', () => {
    const result = ItemSchema.safeParse({
      id: 'i1',
      slot: 'weapon',
      setId: null,
      name: 'Espada',
      stats: '10',
    });

    expect(result.success).toBe(false);
  });
});
