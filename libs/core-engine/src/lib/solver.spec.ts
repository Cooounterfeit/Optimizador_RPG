import { describe, expect, it } from 'vitest';

import type { Constraint, GameTemplate, Item, SolveRequest } from '@zenith/shared-types';

import { analyzeDirections, canMergeGroup, DOWN, UNKNOWN, UP } from './analysis.js';
import { compileFormula, compileFormulaInterval, FormulaError, formulaVariables } from './formula.js';
import { solve, solveBruteForceTop } from './optimizer.js';

const close = (a: number | undefined, b: number | undefined) =>
  a !== undefined && b !== undefined && (a === b || Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)));

const tpl = (over: Partial<GameTemplate>): GameTemplate => ({
  schemaVersion: '0.1', gameId: 't', name: 't', description: '', stats: [], slots: [], sets: [], derived: [],
  objectives: [], baseProfiles: [{ id: 'p', name: 'p', base: {} }], constrainableStats: [], ...over,
});
const obj = (formula: string, monotonic?: boolean) =>
  [{ id: 'o', name: 'o', description: '', kind: 'nonlinear' as const, formula, monotonic }];
const stat = (id: string, aggregate?: 'multiply') => ({ id, name: id, unit: 'flat' as const, aggregate });
const slot = (id: string, optional?: boolean) => ({ id, name: id, optional });
const item = (id: string, slotId: string, stats: Record<string, number>, extra: Partial<Item> = {}): Item =>
  ({ id, slot: slotId, setId: null, name: id, stats, ...extra });

/** Compara solve contra fuerza bruta y devuelve el resultado de solve. */
function contra(label: string, template: GameTemplate, items: Item[], constraints: Constraint[] = [], topN = 1) {
  const req: SolveRequest = { template, items, profileId: 'p', objectiveId: 'o', constraints, topN };
  const bb = solve(req);
  const bf = solveBruteForceTop(req);
  const ok = bb.stats.provenOptimal &&
    bb.builds.length === bf.length &&
    bb.builds.every((b, i) => close(b.score, bf[i].score));
  const detail = ok ? '' : `B&B=[${bb.builds.map((b) => `${b.score.toFixed(3)}:${b.itemIds}`).join(' | ')}] ` +
    `fuerza bruta=[${bf.map((b) => `${b.score.toFixed(3)}:${b.itemIds}`).join(' | ')}] proven=${bb.stats.provenOptimal}`;
  expect(ok, `${label}  ${detail}`).toBe(true);
  return bb;
}

describe('1. casos minimos', () => {
  it('dos conjuntos 2+2 que suben el mismo eje', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((s) => slot(s));
    const items: Item[] = [
      ...['a', 'b'].map((s) => item(`${s}A`, s, { atk: 10 }, { setId: 'A' })),
      ...['c', 'd'].map((s) => item(`${s}B`, s, { atk: 10 }, { setId: 'B' })),
      ...['a', 'b', 'c', 'd', 'e'].map((s) => item(`${s}X`, s, { atk: 60 })),
    ];
    contra('dos conjuntos 2+2 que suben el mismo eje', tpl({
      stats: [stat('atk')], slots: five, objectives: obj('atk', true),
      sets: [
        { id: 'A', name: 'A', tiers: [{ pieces: 2, label: '2', effects: { atk: 150 } }] },
        { id: 'B', name: 'B', tiers: [{ pieces: 2, label: '2', effects: { atk: 150 } }] },
      ],
    }), items);
  });

  it('tope maximo, ventana y top 3 sobre una stat del objetivo', () => {
    const t = tpl({ stats: [stat('crit'), stat('atk')], slots: [slot('a'), slot('b')], objectives: obj('atk + crit * 10', true) });
    const items = [
      item('a1', 'a', { crit: 20 }), item('a2', 'a', { crit: 5, atk: 1 }),
      item('b1', 'b', { crit: 20 }), item('b2', 'b', { crit: 5, atk: 1 }),
    ];
    contra('tope maximo sobre una stat del objetivo', t, items, [{ statId: 'crit', max: 30 }]);
    contra('ventana minimo + maximo', t, items, [{ statId: 'crit', min: 20, max: 30 }]);
    contra('top 3 con tope (la dominancia no puede recortar el podio)', t, items, [{ statId: 'crit', max: 45 }], 3);
  });

  it('dos presupuestos independientes', () => {
    contra('dos presupuestos independientes', tpl({
      stats: [stat('atk'), stat('peso'), stat('coste')], slots: [slot('a'), slot('b')], objectives: obj('atk', true),
      budgets: [{ statId: 'peso', max: 10 }, { statId: 'coste', max: 10 }],
    }), [
      item('a1', 'a', { atk: 10, peso: 8 }), item('a2', 'a', { atk: 1 }),
      item('b1', 'b', { atk: 10, coste: 8 }), item('b2', 'b', { atk: 1 }),
    ]);
  });

  it('conjunto de 1 pieza: podio sin repetidos y objetivo no monotono', () => {
    const t = tpl({
      stats: [stat('atk')], slots: [slot('a'), slot('b')],
      sets: [{ id: 'U', name: 'U', tiers: [{ pieces: 1, label: '1', effects: { atk: 50 } }] }],
      objectives: obj('atk', true),
    });
    const items = [item('a1', 'a', { atk: 10 }, { setId: 'U' }), item('a2', 'a', { atk: 5 }), item('b1', 'b', { atk: 10 })];
    const r = contra('conjunto de 1 pieza, top 3 sin repetidos', t, items, [], 3);
    expect(new Set(r.builds.map((b) => [...b.itemIds].sort().join())).size, 'el podio no repite builds').toBe(r.builds.length);
    contra('conjunto de 1 pieza con objetivo declarado no monotono', { ...t, objectives: obj('atk', false) }, items);
  });

  it('ranura opcional + presupuesto: ir sin casco', () => {
    const r = contra('ranura opcional + presupuesto: ir sin casco', tpl({
      stats: [stat('def'), stat('peso')], slots: [slot('pecho'), slot('casco', true)], objectives: obj('def', true),
      budgets: [{ statId: 'peso', max: 10 }],
    }), [item('p1', 'pecho', { def: 50, peso: 10 }), item('p2', 'pecho', { def: 20, peso: 2 }), item('c1', 'casco', { def: 20, peso: 5 })]);
    expect(r.builds[0]?.itemIds[1], `itemIds=${r.builds[0]?.itemIds}`).toBe('');
  });

  it('anillos en dos ranuras, top 3', () => {
    const rings = [
      item('r1', 'ring1', { atk: 30 }, { slots: ['ring2'] }), item('r2', 'ring1', { atk: 20 }, { slots: ['ring2'] }),
      item('r3', 'ring1', { atk: 10 }, { slots: ['ring2'] }),
    ];
    const r = contra('anillos en dos ranuras, top 3', tpl({
      stats: [stat('atk')], slots: [slot('ring1'), slot('ring2')], objectives: obj('atk', true),
    }), rings, [], 3);
    expect(r.builds.every((b) => b.itemIds[0] !== b.itemIds[1]), 'ningun anillo se equipa dos veces').toBe(true);
    expect(r.builds.length, r.builds.map((b) => b.itemIds.join('+')).join(' | ')).toBe(3);
  });

  it('requisito cubierto por otra pieza (requirementsFrom: final)', () => {
    const t = tpl({
      stats: [stat('fue'), stat('dmg')], slots: [slot('arma'), slot('anillo')], objectives: obj('dmg', true),
      requirementsFrom: 'final', baseProfiles: [{ id: 'p', name: 'p', base: { fue: 40 } }],
    });
    const items = [
      item('espadon', 'arma', { dmg: 100 }, { requires: { fue: 45 } }), item('daga', 'arma', { dmg: 60 }),
      item('anilloFue', 'anillo', { fue: 5 }), item('anilloDmg', 'anillo', { dmg: 30 }),
    ];
    const r = contra('requisito cubierto por otra pieza (requirementsFrom: final)', t, items);
    expect(r.builds[0]?.itemIds.join(), `${r.builds[0]?.itemIds}`).toBe('espadon,anilloFue');
    contra('mismo caso contra la base: el espadon no es equipable', { ...t, requirementsFrom: 'base' }, items);
  });

  it('objetivo NO monotono declarado monotono: exacto por intervalos', () => {
    const t = tpl({ stats: [stat('a'), stat('b')], slots: [slot('x'), slot('y'), slot('z')], objectives: obj('1000 - abs(a - 70) * 3 + b', true) });
    const items: Item[] = [];
    for (const s of ['x', 'y', 'z']) for (let i = 0; i < 5; i++) items.push(item(`${s}${i}`, s, { a: (i * 17) % 40, b: (i * 7) % 11 }));
    const r = contra('objetivo NO monotono declarado monotono: exacto por intervalos', t, items, [], 2);
    expect(r.stats.bound === 'intervalos' && !!r.stats.monotonicWarning, r.stats.monotonicWarning ?? '').toBe(true);
  });

  it('lenguaje: if, comparaciones, &&, !, notacion cientifica, .5', () => {
    const ok = (() => {
      try {
        const idx = new Map([['x', 0], ['y', 1]]);
        const f = compileFormula('if(x >= 1e2 && !(y == .5), 2.5E+1, -1) + min(x, y) * (x != y)', idx);
        return f(new Float64Array([100, 3])) === 28 && f(new Float64Array([100, 0.5])) === -0.5 &&
          formulaVariables('1e5 * x + y').join() === 'x,y';
      } catch { return false; }
    })();
    expect(ok, 'lenguaje: if, comparaciones, &&, !, notacion cientifica, .5').toBe(true);
    let chained = false;
    try { compileFormula('1 < x < 3', new Map([['x', 0]])); } catch (e) { chained = e instanceof FormulaError; }
    expect(chained, 'las comparaciones encadenadas se rechazan con un mensaje claro').toBe(true);
  });
});

describe('1b. analisis simbolico (dependencia, direccion, fusion)', () => {
  // Variables: a, b, c (estadisticas 0..2) y base_sel (constante).
  const box = (formula: string, lo = [0, 0, 0], hi = [100, 100, 100], sel = 0) => ({
    varIndex: new Map([['a', 0], ['b', 1], ['c', 2], ['base_sel', 3]]), statCount: 3,
    derived: [], objective: formula,
    lo: Float64Array.from([...lo, sel]), hi: Float64Array.from([...hi, sel]),
  });
  const dirs = (f: string, sel = 0) => analyzeDirections(box(f, undefined, undefined, sel));

  it('un selector que vale 0 anula la dependencia', () => {
    expect(!dirs('b * base_sel + a').has(1)).toBe(true);
  });
  it('el mismo selector en 1 la mantiene', () => {
    expect(dirs('b * base_sel + a', 1).get(1)).toBe(UP);
  });
  it('x / (x + 1400) sube con x (derivada sobre intervalos)', () => {
    expect(dirs('a / (a + 1400) * 1000').get(0)).toBe(UP);
  });
  it('un optimo interior queda como "depende"', () => {
    expect(dirs('1000 - abs(a - 70)').get(0)).toBe(UNKNOWN);
  });
  it('una penalizacion por peso baja con el peso', () => {
    expect(dirs('b * max(1 - a / 130, 0.25)').get(0)).toBe(DOWN);
  });
  it('un umbral que premia sube con la stat', () => {
    expect(dirs('a + if(b > 90, 200, 0)').get(1)).toBe(UP);
  });
  it('un umbral que castiga baja con la stat', () => {
    expect(dirs('a - (b > 60) * 100').get(1)).toBe(DOWN);
  });
  it('a y b entran como 2(a+b): se fusionan', () => {
    expect(canMergeGroup(box('(a * 2 + b * 2) * c'), [0, 1])).toBe(true);
  });
  it('a y b con distinto peso: no se fusionan', () => {
    expect(!canMergeGroup(box('(a * 2 + b) * c'), [0, 1])).toBe(true);
  });
  it('a con tope y b sin tope: no se fusionan', () => {
    expect(!canMergeGroup(box('min(a, 50) + b'), [0, 1])).toBe(true);
  });
});

describe('2. aritmetica de intervalos (contencion)', () => {
  it('el valor puntual siempre cae dentro del intervalo', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
    const gen = (depth: number): string => {
      if (depth <= 0 || rnd() < 0.25) return rnd() < 0.5 ? pick(['x', 'y', 'z']) : String(Math.round((rnd() * 20 - 5) * 10) / 10);
      const a = () => gen(depth - 1);
      switch (Math.floor(rnd() * 9)) {
        case 0: return `(${a()} ${pick(['+', '-', '*', '/'])} ${a()})`;
        case 1: return `(${a()} ${pick(['<', '<=', '>', '>=', '==', '!='])} ${a()})`;
        case 2: return `${pick(['min', 'max'])}(${a()}, ${a()}, ${a()})`;
        case 3: return `${pick(['floor', 'ceil', 'round', 'abs', 'sqrt', 'log', 'exp'])}(${a()})`;
        case 4: return `if(${a()}, ${a()}, ${a()})`;
        case 5: return `clamp(${a()}, ${a()}, ${a()})`;
        case 6: return `(${a()} ^ ${pick(['2', '3', '0.5', a()])})`;
        case 7: return `(${a()} ${pick(['&&', '||'])} ${a()})`;
        default: return `-(${a()} % ${a()})`;
      }
    };
    const idx = new Map([['x', 0], ['y', 1], ['z', 2]]);
    let casos = 0, malos = 0, ejemplo = '';
    for (let f = 0; f < 1500; f++) {
      const expr = gen(4);
      const point = compileFormula(expr, idx);
      const interval = compileFormulaInterval(expr, idx);
      for (let b = 0; b < 6; b++) {
        const lo = new Float64Array(3), hi = new Float64Array(3);
        for (let i = 0; i < 3; i++) { const u = rnd() * 30 - 10, w = rnd() < 0.2 ? 0 : rnd() * 15; lo[i] = u; hi[i] = u + w; }
        const out = { hi: 0, nan: false };
        const L = interval(lo, hi, out), H = out.hi;
        for (let s = 0; s < 12; s++) {
          const x = new Float64Array(3);
          for (let i = 0; i < 3; i++) x[i] = s === 0 ? lo[i] : s === 1 ? hi[i] : lo[i] + rnd() * (hi[i] - lo[i]);
          const v = point(x);
          if (Number.isNaN(v)) continue;
          casos++;
          const tol = Number.isFinite(v) ? 1e-9 * Math.max(1, Math.abs(v)) : 0;
          if (!(v >= L - tol && v <= H + tol)) { malos++; if (!ejemplo) ejemplo = `${expr} en [${lo}]..[${hi}] punto ${x} = ${v} fuera de [${L}, ${H}]`; }
        }
      }
    }
    expect(malos, `${casos.toLocaleString('es-CL')} evaluaciones dentro de su intervalo ${ejemplo}`).toBe(0);
  });
});

describe('3. fuzz contra fuerza bruta', () => {
  // La demo corre 2000 instancias por defecto; aca 300 con semilla fija para que la suite sea rapida y reproducible.
  const N = 300;

  it(`${N} instancias coinciden con la fuerza bruta (top N completo)`, () => {
    let seed = 20260926;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
    const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
    const FORMULAS = [
      'a + b * 2', 'a * (1 + b / 100) + c', 'min(a, 60) + b + c', '(a + base_a) * (1 + min(b, 100) / 100 * 0.5) * m',
      '1000 - abs(a - 70) * 3 + b', 'if(a > 40, b * 2, b) + c', 'a * m + c', 'b - max(0, a - 50) * 2 + c',
      'sqrt(a + 1) * log(2 + b) + c / 10', 'a * b / (1 + c)', 'clamp(a, 20, 80) * m - c * 0.5', 'a + b + c',
      'a + if(b + c > 90, 200, 0)', 'a * (c >= 40) + b', 'min(a, b) + floor(c / 25) * 30', 'a / (a + 50) * 1000 + b',
      'pow(1.01, a) + b * m', 'a - (b > 60) * 100 + c', '(a + b) * 2 + c * m', 'if(a >= 30 && b < 40, c * 3, c) + a',
    ];
    let malos = 0, primero = '';
    for (let inst = 0; inst < N; inst++) {
      const nSlots = int(2, 4);
      const slots = Array.from({ length: nSlots }, (_, i) => slot(`s${i}`, rnd() < 0.2));
      const stats = [stat('a'), stat('b'), stat('c'), stat('m', 'multiply')];
      const sets = Array.from({ length: int(0, 3) }, (_, i) => ({
        id: `set${i}`, name: `set${i}`,
        tiers: [1, 2, 4].filter(() => rnd() < 0.5).map((p) => ({
          pieces: p, label: `${p}`, effects: { [pick(['a', 'b', 'c', 'm'])]: int(-10, 40) },
        })),
      }));
      const finalReqs = rnd() < 0.3;
      const items: Item[] = [];
      let nid = 0;
      for (const sl of slots) {
        for (let k = int(1, 4); k > 0; k--) {
          const st: Record<string, number> = {};
          for (const s of ['a', 'b', 'c', 'm']) if (rnd() < 0.7) st[s] = int(s === 'c' ? -10 : 0, 50);
          const piece: Item = { id: `i${nid++}`, slot: sl.id, setId: sets.length && rnd() < 0.5 ? pick(sets).id : null, name: '', stats: st };
          if (rnd() < 0.15) piece.exclusiveGroup = pick(['g1', 'g2']);
          if (rnd() < 0.15 && nSlots > 1) piece.slots = [pick(slots).id];
          if (rnd() < 0.12) piece.requires = { [pick(['a', 'b', 'nivel'])]: int(5, 60) };
          items.push(piece);
        }
      }
      const constraints: Constraint[] = [];
      if (rnd() < 0.35) {
        const s = pick(['a', 'b', 'c', 'm']);
        const r = rnd();
        const v = s === 'm' ? 1 + rnd() : int(10, 120);
        constraints.push(r < 0.4 ? { statId: s, min: v } : r < 0.8 ? { statId: s, max: v } : { statId: s, min: v * 0.5, max: v });
      }
      const template = tpl({
        stats, slots, sets,
        objectives: obj(pick(FORMULAS), pick([true, false, undefined])),
        baseProfiles: [{ id: 'p', name: 'p', base: { a: 10, c: 5, nivel: 30 } }],
        budgets: rnd() < 0.2 ? [{ statId: pick(['b', 'c']), max: int(20, 120) }] : undefined,
        requirementsFrom: finalReqs ? 'final' : undefined,
      });
      const req: SolveRequest = { template, items, profileId: 'p', objectiveId: 'o', constraints, topN: int(1, 3) };
      const bb = solve(req);
      const bf = solveBruteForceTop(req);
      const ok = bb.stats.provenOptimal && bb.builds.length === bf.length && bb.builds.every((b, i) => close(b.score, bf[i].score));
      if (!ok) {
        malos++;
        if (!primero) {
          primero = `instancia ${inst}: B&B=[${bb.builds.map((b) => b.score.toFixed(4)).join(', ')}] ` +
            `fuerza bruta=[${bf.map((b) => b.score.toFixed(4)).join(', ')}]\n      ${JSON.stringify(req)}`;
        }
      }
    }
    expect(malos, `${N - malos} de ${N} instancias coinciden con la fuerza bruta (top N completo) ${primero}`).toBe(0);
  });
});
