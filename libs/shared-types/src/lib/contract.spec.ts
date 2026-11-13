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

  it('acepta assets y extensions sin interpretar el genero', () => {
    const parsed = GameTemplateSchema.parse({
      ...minimalTemplate(),
      assets: {
        sources: ['https://example.test/icons/', 'https://cdn.test/icons/'],
        characters: { base: 'base.png' },
        rarity: { characters: { base: 5 } },
      },
      extensions: { inventory: { kind: 'inventory', catalogUrl: '/catalog.json' } },
    });

    expect(parsed.assets?.sources).toHaveLength(2);
    expect(parsed.assets?.characters?.base).toBe('base.png');
    expect(parsed.extensions?.inventory).toEqual({
      kind: 'inventory',
      catalogUrl: '/catalog.json',
    });
  });

  it('rechaza assets con rutas que no son texto', () => {
    const result = GameTemplateSchema.safeParse({
      ...minimalTemplate(),
      assets: { characters: { base: 5 } },
    });

    expect(result.success).toBe(false);
  });

  it('acepta una calculadora declarada por el juego', () => {
    const parsed = GameTemplateSchema.parse({
      ...minimalTemplate(),
      damageCalculator: {
        title: 'Dano por golpe',
        fields: [{ id: 'ataque', label: 'Ataque', default: 0, min: 0 }],
        outputs: [{ id: 'golpe', label: 'Golpe', formula: 'max(0, ataque)' }],
      },
    });

    expect(parsed.damageCalculator?.outputs[0].formula).toBe('max(0, ataque)');
  });

  it('rechaza ids repetidos en la calculadora', () => {
    const result = GameTemplateSchema.safeParse({
      ...minimalTemplate(),
      damageCalculator: {
        title: 'Dano',
        fields: [
          { id: 'ataque', label: 'Ataque' },
          { id: 'ataque', label: 'Otro ataque' },
        ],
        outputs: [{ id: 'golpe', label: 'Golpe', formula: 'ataque' }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rechaza un valor por defecto fuera de los limites', () => {
    const result = GameTemplateSchema.safeParse({
      ...minimalTemplate(),
      damageCalculator: {
        title: 'Dano',
        fields: [{ id: 'ataque', label: 'Ataque', default: 150, max: 100 }],
        outputs: [{ id: 'golpe', label: 'Golpe', formula: 'ataque' }],
      },
    });

    expect(result.success).toBe(false);
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
