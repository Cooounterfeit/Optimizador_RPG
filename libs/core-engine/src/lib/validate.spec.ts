import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { validateTemplate } from './validate.js';

const load = (file: string) => JSON.parse(readFileSync(new URL(`../../fixtures/${file}`, import.meta.url), 'utf8'));
const errores = (r: ReturnType<typeof validateTemplate>) =>
  r.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' | ');

describe('validateTemplate sobre los fixtures', () => {
  it('Genshin Impact valida (selfTests inline, sin inventario externo)', () => {
    const r = validateTemplate(load('genshin.zenith.json').template);
    expect(r.ok, errores(r)).toBe(true);
  });
  it('Souls (simplificado) valida', () => {
    const souls = load('souls.zenith.json');
    const r = validateTemplate(souls.template, souls.items);
    expect(r.ok, errores(r)).toBe(true);
  });
  it('Terraria (simplificado) valida', () => {
    const t = load('terraria.zenith.json');
    const r = validateTemplate(t.template, t.items);
    expect(r.ok, errores(r)).toBe(true);
  });
});

describe('plantilla rota a proposito', () => {
  const rota = {
    schemaVersion: '0.2',
    gameId: 'rota', name: 'Plantilla rota', description: '',
    stats: [{ id: 'atk', name: 'atk', unit: 'flat' }, { id: 'atk', name: 'repetida', unit: 'flat' },
            { id: 'er', name: 'recarga', unit: 'percent' }],
    slots: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    sets: [{ id: 's1', name: 'Conjunto imposible', tiers: [{ pieces: 7, label: '7pz', effects: { noExiste: 10 } }] }],
    derived: [
      { id: 'x', name: 'x', formula: 'y * 2' },
      { id: 'y', name: 'y', formula: 'x + 1' },
    ],
    objectives: [{ id: 'o', name: 'o', description: '', kind: 'linear', monotonic: true, formula: 'atk * ' }],
    baseProfiles: [{ id: 'p', name: 'p', base: { atk: 100 } }],
    constrainableStats: [],
  };

  it('no se puede usar y reporta los problemas esperados', () => {
    const r = validateTemplate(rota);
    expect(r.ok).toBe(false);
    const codes = new Set(r.issues.map((i) => i.code));
    expect(codes.has('E_ID_DUP'), 'id repetido').toBe(true);
    expect(codes.has('E_CICLO'), 'ciclo de derivados').toBe(true);
    expect(codes.has('E_FORMULA'), 'formula rota').toBe(true);
    expect(codes.has('W_VERSION'), 'version desconocida').toBe(true);
  });
});

describe('objetivo no monotono declarado como monotono', () => {
  it('lo detecta y avisa', () => {
    const terraria = load('terraria.zenith.json');
    const noMonotona = {
      ...terraria.template,
      selfTests: [],
      objectives: [{
        id: 'exacto', name: 'Defensa exactamente 100', description: '',
        kind: 'nonlinear', monotonic: true,
        formula: '1000 - abs(defense - 100)',
      }],
    };
    const r = validateTemplate(noMonotona, terraria.items);
    expect(r.issues.some((i) => i.code === 'W_MONOTONIA'), errores(r)).toBe(true);
  });
});
