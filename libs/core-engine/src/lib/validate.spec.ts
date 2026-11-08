import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { validateTemplate } from './validate.js';

const load = (file: string) =>
  JSON.parse(readFileSync(new URL(`../../../../demo/public/examples/${file}`, import.meta.url), 'utf8'));
const errores = (r: ReturnType<typeof validateTemplate>) =>
  r.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' | ');

describe('validateTemplate sobre los fixtures', () => {
  it('la plantilla gacha valida (selfTests inline, sin inventario externo)', () => {
    const r = validateTemplate(load('gacha.zenith.json').template);
    expect(r.ok, errores(r)).toBe(true);
  });
  it('la plantilla ARPG (simplificada) valida', () => {
    const arpg = load('arpg.zenith.json');
    const r = validateTemplate(arpg.template, arpg.items);
    expect(r.ok, errores(r)).toBe(true);
  });
  it('la plantilla sandbox (simplificada) valida', () => {
    const t = load('sandbox.zenith.json');
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
    const sandbox = load('sandbox.zenith.json');
    const noMonotona = {
      ...sandbox.template,
      selfTests: [],
      objectives: [{
        id: 'exacto', name: 'Defensa exactamente 100', description: '',
        kind: 'nonlinear', monotonic: true,
        formula: '1000 - abs(defense - 100)',
      }],
    };
    const r = validateTemplate(noMonotona, sandbox.items);
    expect(r.issues.some((i) => i.code === 'W_MONOTONIA'), errores(r)).toBe(true);
  });
});
