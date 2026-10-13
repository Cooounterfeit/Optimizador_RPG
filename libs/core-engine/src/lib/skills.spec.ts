import { describe, expect, it } from 'vitest';

import type { GameTemplate, Item, SkillSelection, SkillTreeDef } from '@zenith/shared-types';

import { solve, solveBruteForceTop } from './optimizer.js';
import {
  canLower, canRaise, checkSelection, checkSkillTrees, sanitizeSelection, skillContribution,
} from './skills.js';
import { validateTemplate } from './validate.js';

const close = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));

const arbol: SkillTreeDef = {
  id: 'guerrero', name: 'Guerrero', budget: 6,
  nodes: [
    { id: 'fuerza', name: 'Fuerza', maxRank: 3, effects: { atk: 5 } },
    { id: 'agilidad', name: 'Agilidad', maxRank: 2, effects: { crit: 2 } },
    { id: 'golpe', name: 'Golpe brutal', requires: ['fuerza'], cost: 2, effects: { more: 10 } },
    { id: 'tajo', name: 'Tajo', requiresAny: ['fuerza', 'agilidad'], effects: { atk: 1 } },
    { id: 'maestria', name: 'Maestria', requiresPoints: 4, effects: { more: 10 } },
  ],
};
const tpl = (over: Partial<GameTemplate> = {}): GameTemplate => ({
  schemaVersion: '0.1', gameId: 't', name: 't', description: '',
  stats: [
    { id: 'atk', name: 'Ataque', unit: 'flat' },
    { id: 'crit', name: 'Critico', unit: 'percent' },
    { id: 'more', name: 'Mas dano', unit: 'percent', aggregate: 'multiply' },
  ],
  slots: [{ id: 'arma', name: 'Arma' }],
  sets: [], derived: [],
  objectives: [{ id: 'o', name: 'o', description: '', kind: 'nonlinear', formula: '(base_atk + atk) * (1 + crit / 100) * more' }],
  baseProfiles: [{ id: 'p', name: 'p', base: { atk: 100, crit: 0, more: 1 } }],
  constrainableStats: [], skillTrees: [arbol], ...over,
});
const T = tpl();

describe('1. reglas de seleccion', () => {
  it('seleccion vacia es valida', () => {
    expect(checkSelection(T, {}).length).toBe(0);
  });
  it('se puede tomar un nodo sin requisitos', () => {
    expect(canRaise(T, {}, 'fuerza')).toBeNull();
  });
  it('golpe pide fuerza', () => {
    expect(canRaise(T, {}, 'golpe')?.includes('Requiere') ?? false, String(canRaise(T, {}, 'golpe'))).toBe(true);
  });
  it('con fuerza, golpe se puede', () => {
    expect(canRaise(T, { fuerza: 1 }, 'golpe')).toBeNull();
  });
  it('tajo pide fuerza O agilidad', () => {
    expect(canRaise(T, {}, 'tajo')?.includes('al menos uno') ?? false).toBe(true);
  });
  it('con agilidad basta para tajo', () => {
    expect(canRaise(T, { agilidad: 1 }, 'tajo')).toBeNull();
  });
  it('rango maximo', () => {
    expect(canRaise(T, { fuerza: 3 }, 'fuerza')).toBe('Ya esta al maximo.');
  });
  it('maestria pide 4 puntos', () => {
    expect(canRaise(T, { fuerza: 3 }, 'maestria')?.includes('puntos gastados') ?? false, String(canRaise(T, { fuerza: 3 }, 'maestria'))).toBe(true);
  });
  it('con 4 puntos, maestria se puede', () => {
    expect(canRaise(T, { fuerza: 3, agilidad: 1 }, 'maestria')).toBeNull();
  });
  it('presupuesto de 6 agotado', () => {
    expect(canRaise(T, { fuerza: 3, agilidad: 1, golpe: 1 }, 'maestria')?.includes('No quedan puntos') ?? false).toBe(true);
  });
  it('no se puede quitar fuerza si golpe depende de ella', () => {
    expect(canLower(T, { fuerza: 1, golpe: 1 }, 'fuerza')?.includes('depende') ?? false).toBe(true);
  });
  it('si queda un rango de fuerza, si se puede bajar', () => {
    expect(canLower(T, { fuerza: 2, golpe: 1 }, 'fuerza')).toBeNull();
  });
  it('bajar agilidad dejaria a maestria sin sus 4 puntos', () => {
    expect(canLower(T, { fuerza: 3, agilidad: 1, maestria: 1 }, 'agilidad')?.includes('depende') ?? false).toBe(true);
  });
  it('tajo sigue valido con solo agilidad', () => {
    expect(canLower(T, { fuerza: 1, agilidad: 1, tajo: 1 }, 'fuerza')).toBeNull();
  });
  it('seleccion con requisito faltante es invalida', () => {
    expect(checkSelection(T, { golpe: 1 }).length > 0).toBe(true);
  });
  it('seleccion sobre presupuesto es invalida', () => {
    expect(checkSelection(T, { fuerza: 3, agilidad: 2, golpe: 1 }).some((p) => p.treeId === 'guerrero')).toBe(true);
  });
  it('sanear: recorta rangos, quita lo que no existe y lo que queda sin requisito', () => {
    const san = sanitizeSelection(T, { golpe: 1, agilidad: 9, tajo: 1, fantasma: 2 } as SkillSelection);
    expect(JSON.stringify(san, Object.keys(san).sort()), JSON.stringify(san)).toBe(JSON.stringify({ agilidad: 2, tajo: 1 }));
  });
});

describe('2. efectos', () => {
  it('sumas por rango', () => {
    const c1 = skillContribution(T, { fuerza: 3, agilidad: 2 });
    expect(c1.atk === 15 && c1.crit === 4, JSON.stringify(c1)).toBe(true);
  });
  it('dos +10% "more" multiplican: +21%, no +20%', () => {
    const c2 = skillContribution(T, { fuerza: 1, golpe: 1, agilidad: 1, maestria: 1 } as SkillSelection);
    expect(close(c2.more, 21), String(c2.more)).toBe(true);
  });
});

describe('3. con el optimizador', () => {
  const items: Item[] = [
    { id: 'espada', slot: 'arma', setId: null, name: 'Espada', stats: { atk: 50 } },
    { id: 'daga', slot: 'arma', setId: null, name: 'Daga', stats: { atk: 30, crit: 25 } },
  ];
  const req = (skills: SkillSelection, template = T) => ({ template, items, profileId: 'p', objectiveId: 'o', constraints: [], topN: 2, skills });

  it('sin habilidades: daga 130 x 1,25 = 162,5', () => {
    const r0 = solve(req({}));
    expect(r0.builds[0].itemIds.join() === 'daga' && close(r0.builds[0].score, 162.5), `${r0.builds[0].itemIds} ${r0.builds[0].score}`).toBe(true);
  });

  it('con habilidades: gana la daga y el podio coincide con la fuerza bruta', () => {
    const sel = { fuerza: 1, agilidad: 2, golpe: 1 };
    const r1 = solve(req(sel));
    const espada = (100 + 50 + 5) * 1.04 * 1.1, daga = (100 + 30 + 5) * 1.29 * 1.1;
    expect(r1.builds[0].itemIds.length === 1, JSON.stringify(r1.builds[0].itemIds)).toBe(true);
    expect(r1.builds[0].itemIds[0] === 'daga' && close(r1.builds[0].score, daga), `${r1.builds[0].itemIds} ${r1.builds[0].score} esperado ${daga}`).toBe(true);
    expect(close(r1.builds[1].score, espada), String(r1.builds[1].score)).toBe(true);
    expect(close(r1.builds[0].finalStats.atk, 135) && close(r1.builds[0].finalStats.crit, 29) && close(r1.builds[0].finalStats.more, 1.1), JSON.stringify(r1.builds[0].finalStats)).toBe(true);
    expect(!r1.stats.candidatesPerSlot.some((c) => c.slotId === '__skills')).toBe(true);
    const bf = solveBruteForceTop(req(sel));
    expect(bf.length === 2 && close(bf[0].score, r1.builds[0].score) && bf[0].itemIds.join() === 'daga').toBe(true);
  });

  it('una seleccion invalida se rechaza en vez de calcular algo falso', () => {
    let lanzo = false;
    try { solve(req({ golpe: 1 })); } catch { lanzo = true; }
    expect(lanzo).toBe(true);
  });

  it('variable skill_* en la formula: activa una mecanica', () => {
    const Tf = tpl({ objectives: [{ id: 'o', name: 'o', description: '', kind: 'nonlinear', formula: 'if(skill_tajo > 0, (base_atk + atk) * 2, base_atk + atk) + crit' }] });
    const f0 = solve(req({}, Tf)).builds[0], f1 = solve(req({ agilidad: 1, tajo: 1 }, Tf)).builds[0];
    expect(f0.itemIds[0] === 'daga' && close(f0.score, 155), `${f0.itemIds} ${f0.score}`).toBe(true);
    expect(f1.itemIds[0] === 'espada' && close(f1.score, 151 * 2 + 2), `${f1.itemIds} ${f1.score}`).toBe(true);
  });

  it('requisitos contra la build final: una habilidad de fuerza habilita un arma', () => {
    const Tr = tpl({ requirementsFrom: 'final' });
    const itemsR: Item[] = [...items, { id: 'mandoble', slot: 'arma', setId: null, name: 'Mandoble', stats: { atk: 90 }, requires: { crit: 4 } }];
    expect(solve({ ...req({}, Tr), items: itemsR }).builds[0].itemIds[0]).toBe('daga');
    expect(solve({ ...req({ agilidad: 2 }, Tr), items: itemsR }).builds[0].itemIds[0]).toBe('mandoble');
  });
});

describe('4. validacion de plantillas', () => {
  const items: Item[] = [
    { id: 'espada', slot: 'arma', setId: null, name: 'Espada', stats: { atk: 50 } },
    { id: 'daga', slot: 'arma', setId: null, name: 'Daga', stats: { atk: 30, crit: 25 } },
  ];
  const sel = { fuerza: 1, agilidad: 2, golpe: 1 };
  const daga = (100 + 30 + 5) * 1.29 * 1.1;
  const n = (over: object) => ({ id: 'x', name: 'X', effects: { atk: 1 }, ...over });
  const conErr = (t: Partial<GameTemplate>, frag: string, label: string) => {
    const r = validateTemplate(tpl(t));
    const msgs = r.issues.filter((i) => i.severity === 'error').map((i) => i.message);
    expect(!r.ok && msgs.some((m) => m.includes(frag)), `${label} :: ${msgs.join(' | ').slice(0, 160)}`).toBe(true);
  };

  it('plantilla con arbol valida y autoprueba con habilidades pasa', () => {
    const ok = validateTemplate({ ...T, selfTests: [{ name: 'golpe', profileId: 'p', objectiveId: 'o', items: [items[1]], skills: sel, expectScore: daga }] });
    expect(ok.ok && ok.selfTests[0]?.passed, ok.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' | ')).toBe(true);
  });
  it('ciclo de requisitos', () => {
    conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'x', requires: ['y'] }), n({ id: 'y', requires: ['x'] })] }] }, 'nunca se puede tomar', 'ciclo de requisitos');
  });
  it('efecto sobre una estadistica que no existe', () => {
    conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ effects: { mana: 3 } })] }] }, 'no es una estadistica', 'efecto sobre una estadistica que no existe');
  });
  it('id que no sirve como variable', () => {
    conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'golpe-brutal' })] }] }, 'solo puede tener', 'id que no sirve como variable');
  });
  it('requisito que no existe', () => {
    conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ requires: ['nadie'] })] }] }, 'que no existe', 'requisito que no existe');
  });
  it('umbral de puntos imposible', () => {
    conErr({ skillTrees: [{ id: 'a', name: 'A', budget: 3, nodes: [n({ id: 'x' }), n({ id: 'y', requiresPoints: 5 })] }] }, 'nunca se puede tomar', 'umbral de puntos imposible');
  });
  it('id de nodo repetido entre arboles', () => {
    conErr({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'x' })] }, { id: 'b', name: 'B', nodes: [n({ id: 'x' })] }] }, 'repetido', 'id de nodo repetido entre arboles');
  });
  it('formula que usa una habilidad inexistente', () => {
    conErr({ objectives: [{ id: 'o', name: 'o', description: '', kind: 'linear', formula: 'atk + skill_fantasma' }] }, 'no hay ninguna habilidad', 'formula que usa una habilidad inexistente');
  });
  it('"al menos uno" circular pero con salida (r → x → y) es valido', () => {
    const anyCiclo = validateTemplate(tpl({ skillTrees: [{ id: 'a', name: 'A', nodes: [n({ id: 'r' }), n({ id: 'x', requiresAny: ['r', 'y'] }), n({ id: 'y', requiresAny: ['x'] })] }] }));
    expect(anyCiclo.ok).toBe(true);
  });
  it('informa de los nodos que no cambian el calculo', () => {
    const inutil = validateTemplate(tpl({ skillTrees: [{ id: 'a', name: 'A', nodes: [{ id: 'nada', name: 'Nada' }] }] }));
    expect(inutil.issues.some((i) => i.code === 'I_HABILIDAD_SIN_EFECTO')).toBe(true);
  });
  it('una plantilla sin arboles sigue siendo valida', () => {
    expect(checkSkillTrees(tpl({ skillTrees: undefined })).errors.length).toBe(0);
  });
});

describe('4b. elecciones, nodos completos y nodos gratis (estilo WoW)', () => {
  const W = tpl({ skillTrees: [{
    id: 'w', name: 'W', budget: 3, requireFullRanks: true,
    nodes: [
      { id: 'raiz', name: 'Raiz', cost: 0, effects: { atk: 1 } },
      { id: 'base2', name: 'Base', maxRank: 2, requiresAny: ['raiz'], effects: { atk: 2 } },
      { id: 'opA', name: 'Opcion A', choiceGroup: 'c1', requiresAny: ['base2'], effects: { atk: 10 } },
      { id: 'opB', name: 'Opcion B', choiceGroup: 'c1', requiresAny: ['base2'], effects: { crit: 10 } },
      { id: 'hijo', name: 'Hijo', requiresAny: ['opA', 'opB'], effects: { atk: 1 } },
    ],
  }] });
  const items: Item[] = [
    { id: 'espada', slot: 'arma', setId: null, name: 'Espada', stats: { atk: 50 } },
    { id: 'daga', slot: 'arma', setId: null, name: 'Daga', stats: { atk: 30, crit: 25 } },
  ];

  it('un nodo gratis (coste 0) se toma y no gasta puntos', () => {
    expect(canRaise(W, {}, 'raiz') === null && canRaise(W, { raiz: 1 }, 'base2') === null).toBe(true);
  });
  it('con requireFullRanks, "Base" a medias no habilita la opcion', () => {
    expect(canRaise(W, { raiz: 1, base2: 1 }, 'opA')?.includes('completo') ?? false, String(canRaise(W, { raiz: 1, base2: 1 }, 'opA'))).toBe(true);
  });
  it('con "Base" completo, si', () => {
    expect(canRaise(W, { raiz: 1, base2: 2 }, 'opA')).toBeNull();
  });
  it('eleccion: con A tomada, B queda bloqueada', () => {
    expect(canRaise(W, { raiz: 1, base2: 2, opA: 1 }, 'opB')?.includes('eleccion') ?? false, String(canRaise(W, { raiz: 1, base2: 2, opA: 1 }, 'opB'))).toBe(true);
  });
  it('una seleccion con las dos opciones es invalida', () => {
    expect(checkSelection(W, { raiz: 1, base2: 2, opA: 1, opB: 1 }).length > 0).toBe(true);
  });
  it('bajar "Base" dejaria a la opcion sin requisito completo', () => {
    expect(canLower(W, { raiz: 1, base2: 2, opA: 1 }, 'base2')?.includes('depende') ?? false).toBe(true);
  });
  it('el gratis no cuenta: 2 + 1 = 3 puntos, presupuesto agotado', () => {
    expect(canRaise(W, { raiz: 1, base2: 2, opA: 1 }, 'hijo')?.includes('No quedan puntos') ?? false).toBe(true);
  });
  it('la opcion elegida suma sus efectos y coincide con fuerza bruta', () => {
    const w1 = solve({ template: W, items, profileId: 'p', objectiveId: 'o', constraints: [], topN: 1, skills: { raiz: 1, base2: 2, opB: 1 } });
    const wbf = solveBruteForceTop({ template: W, items, profileId: 'p', objectiveId: 'o', constraints: [], topN: 1, skills: { raiz: 1, base2: 2, opB: 1 } });
    expect(close(w1.builds[0].score, wbf[0].score) && close(w1.builds[0].finalStats.crit, 35), String(w1.builds[0].finalStats.crit)).toBe(true);
  });
  it('la plantilla con elecciones y nodos gratis es valida', () => {
    expect(validateTemplate(W).ok).toBe(true);
  });
  it('avisa de una eleccion sin alternativa', () => {
    const solo = validateTemplate(tpl({ skillTrees: [{ id: 'a', name: 'A', nodes: [{ id: 'x', name: 'X', choiceGroup: 'g', effects: { atk: 1 } }] }] }));
    expect(solo.issues.some((i) => i.message.includes('no tiene alternativa'))).toBe(true);
  });
});

describe('5. fuzz contra fuerza bruta', () => {
  // La demo corre 400 instancias; aca 200 con semilla fija para que la suite sea rapida y reproducible.
  const N = 200;

  it(`${N} instancias coinciden con la fuerza bruta (top 3)`, () => {
    let seed = 987654;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
    let coinciden = 0;
    for (let k = 0; k < N; k++) {
      const nodes = Array.from({ length: ri(2, 7) }, (_, i) => {
        const prev = i > 0 && rnd() < 0.5 ? [`n${ri(0, i - 1)}`] : [];
        const eff: Record<string, number> = {};
        for (const s of ['atk', 'crit', 'more']) if (rnd() < 0.5) eff[s] = ri(-5, 20);
        return { id: `n${i}`, name: `n${i}`, maxRank: ri(1, 3), cost: ri(1, 2), requires: prev, effects: eff };
      });
      const t = tpl({
        slots: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b', optional: rnd() < 0.3 }],
        skillTrees: [{ id: 'z', name: 'z', budget: ri(2, 8), nodes }],
        objectives: [{ id: 'o', name: 'o', description: '', kind: 'nonlinear',
          formula: rnd() < 0.5 ? '(base_atk + atk) * (1 + crit / 100) * more' : `if(skill_n0 > 0, atk * 2, atk) + crit * ${ri(1, 4)} - abs(crit - 10)` }],
      });
      // Seleccion aleatoria valida: subir rangos al azar mientras se pueda.
      let s: SkillSelection = {};
      for (let i = 0; i < 10; i++) {
        const id = `n${ri(0, nodes.length - 1)}`;
        if (canRaise(t, s, id) === null) s = { ...s, [id]: (s[id] ?? 0) + 1 };
      }
      const its: Item[] = Array.from({ length: ri(2, 6) }, (_, i) => ({
        id: `i${i}`, slot: rnd() < 0.5 ? 'a' : 'b', setId: null, name: `i${i}`,
        stats: { atk: ri(0, 40), crit: ri(0, 20), ...(rnd() < 0.3 ? { more: ri(-20, 30) } : {}) },
      }));
      if (!its.some((i) => i.slot === 'a')) its.push({ id: 'ia', slot: 'a', setId: null, name: 'ia', stats: { atk: 1 } });
      if (!its.some((i) => i.slot === 'b')) its.push({ id: 'ib', slot: 'b', setId: null, name: 'ib', stats: { crit: 1 } });
      const rq = { template: t, items: its, profileId: 'p', objectiveId: 'o', constraints: [], topN: 3, skills: s };
      const a = solve(rq).builds.map((b) => b.score);
      const b = solveBruteForceTop(rq).map((x) => x.score);
      if (a.length === b.length && a.every((x, i) => close(x, b[i]))) coinciden++;
    }
    expect(coinciden, `${coinciden} de ${N} instancias coinciden con la fuerza bruta (top 3)`).toBe(N);
  });
});
