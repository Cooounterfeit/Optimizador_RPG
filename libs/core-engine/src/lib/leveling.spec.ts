import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { BaseProfile, GameTemplate, Item, LevelingDef } from '@zenith/shared-types';

import { checkCurves, curveFormula, evalCurve } from './curves.js';
import { scorer } from './evaluar.js';
import { compileFormula } from './formula.js';
import {
  allocatePoints, checkLeveling, currentLevel, futureLevels, maxReachable, pointsBetween, projectProfile, proyectarEstadisticas,
} from './leveling.js';
import { solve } from './optimizer.js';
import { validateTemplate } from './validate.js';

const close = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

const guerrero: BaseProfile = { id: 'g', name: 'Guerrero', base: { nivel: 10, fuerza: 20, destreza: 15, inteligencia: 12 } };
const t = { leveling: { min: 1, max: 50, growth: { fuerza: '1.6', destreza: '1', inteligencia: '0.4' } } };
const err = (x: ReturnType<typeof projectProfile>) => (x.ok ? '' : x.error);

describe('1. ejemplo del Jira', () => {
  it('proyecta al nivel 15 con el crecimiento esperado', () => {
    const r = proyectarEstadisticas({ template: t, profile: guerrero }, 15);
    expect(r.ok, 'proyecta al nivel 15').toBe(true);
    if (!r.ok) return;
    expect(close(r.base.fuerza, 28), `Fuerza 20 -> 28 (${r.base.fuerza})`).toBe(true);
    expect(close(r.base.fuerza - guerrero.base.fuerza, 8), 'diferencia +8').toBe(true);
    expect(close(r.base.destreza, 20), 'Destreza 15 -> 20').toBe(true);
    expect(close(r.base.inteligencia, 14), 'Inteligencia 12 -> 14').toBe(true);
    expect(r.base.nivel).toBe(15);
  });
  it('no modifica el perfil original', () => {
    expect(guerrero.base.fuerza).toBe(20);
  });
  it('nivel actual 10', () => {
    expect(currentLevel(t, guerrero)).toBe(10);
  });
  it('niveles elegibles 11..50, sin el actual', () => {
    const fut = futureLevels(t, guerrero);
    expect(fut[0] === 11 && fut[fut.length - 1] === 50 && !fut.includes(10)).toBe(true);
  });
});

describe('2. mensajes de los criterios de aceptacion', () => {
  it('mismo nivel', () => {
    expect(err(projectProfile(t, guerrero, 10))).toBe('Elige un nivel superior al actual');
  });
  it('nivel menor', () => {
    expect(err(projectProfile(t, guerrero, 7))).toBe('El nivel elegido debe ser mayor al actual');
  });
  it('sin nivel en el perfil', () => {
    expect(err(projectProfile(t, { ...guerrero, base: { fuerza: 3 } }, 12))).toBe('No tienes estadísticas base para simular. Sube de nivel primero.');
  });
  it('sin estadisticas que crezcan', () => {
    expect(err(projectProfile(t, { ...guerrero, base: { nivel: 3 } }, 12))).toBe('No tienes estadísticas base para simular. Sube de nivel primero.');
  });
  it('juego sin niveles', () => {
    expect(err(projectProfile({}, guerrero, 12))).toBe('Simulación futura no disponible');
  });
  it('por encima del maximo', () => {
    expect(/máximo/.test(err(projectProfile(t, guerrero, 51)))).toBe(true);
  });
  it('nivel no entero', () => {
    expect(/entero/.test(err(projectProfile(t, guerrero, 12.5)))).toBe(true);
  });
});

describe('3. curvas que dependen del nivel', () => {
  const t2 = { leveling: { min: 1, max: 99, growth: { vida: 'base_crecVida + nivel', fuerza: 'if(nivel % 5 == 0, 3, 1)' } } };
  const p2: BaseProfile = { id: 'p', name: 'p', base: { nivel: 1, vida: 100, crecVida: 10, fuerza: 5 } };
  const r2 = projectProfile(t2, p2, 10);

  it('vida acelera con el nivel', () => {
    expect(r2.ok && close(r2.base.vida, 244), r2.ok ? String(r2.base.vida) : err(r2)).toBe(true);
  });
  it('crecimiento condicional por nivel', () => {
    expect(r2.ok && close(r2.base.fuerza, 5 + 7 + 6), r2.ok ? String(r2.base.fuerza) : err(r2)).toBe(true);
  });
  it('1->6->10 igual que 1->10', () => {
    const a = projectProfile(t2, p2, 6);
    const b = a.ok ? projectProfile(t2, { ...p2, base: a.base }, 10) : a;
    expect(b.ok && r2.ok && close(b.base.vida, r2.base.vida) && close(b.base.fuerza, r2.base.fuerza)).toBe(true);
  });
});

describe('4. validacion', () => {
  const conf = (leveling: LevelingDef, profiles: BaseProfile[] = [guerrero]) => checkLeveling({ leveling, baseProfiles: profiles });

  it('max debe ser mayor que min', () => {
    expect(conf({ min: 5, max: 5, growth: { fuerza: '1' } }).errors.length > 0).toBe(true);
  });
  it('sin curvas', () => {
    expect(conf({ min: 1, max: 50, growth: {} }).errors.length > 0).toBe(true);
  });
  it('variable inexistente', () => {
    expect(conf({ min: 1, max: 50, growth: { fuerza: 'base_noExiste' } }).errors.some((e) => e.includes('base_noExiste'))).toBe(true);
  });
  it('formula rota', () => {
    expect(conf({ min: 1, max: 50, growth: { fuerza: '1 +' } }).errors.length > 0).toBe(true);
  });
  it('el nivel no puede tener curva', () => {
    expect(conf({ min: 1, max: 50, growth: { nivel: '1' } }).errors.length > 0).toBe(true);
  });
  it('perfil fuera de rango', () => {
    expect(conf({ min: 11, max: 50, growth: { fuerza: '1' } }).errors.some((e) => e.includes('fuera'))).toBe(true);
  });
  it('perfil sin nivel', () => {
    expect(conf({ min: 1, max: 50, growth: { fuerza: '1' } }, [{ id: 'x', name: 'X', base: { fuerza: 1 } }]).errors.length > 0).toBe(true);
  });
  it('aviso: curva para algo que el perfil no tiene', () => {
    expect(conf({ min: 1, max: 50, growth: { carisma: '1' } }).warnings.length > 0).toBe(true);
  });
  it('curva valida', () => {
    expect(conf({ min: 1, max: 50, growth: { fuerza: 'base_fuerza * 0.05 + nivel / 10' } }).errors.length).toBe(0);
  });
});

describe('5. ejemplo publicado (RPG clasico)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../fixtures/rpg.zenith.json', import.meta.url), 'utf8'));
  const tpl = pkg.template as GameTemplate;
  const items = pkg.items as Item[];
  const v = validateTemplate(tpl);

  it('la plantilla valida', () => {
    expect(v.ok, v.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' | ')).toBe(true);
  });
  it('Guerrero: Fuerza 20 -> 28 al nivel 15', () => {
    const g = tpl.baseProfiles.find((p) => p.id === 'guerrero')!;
    const rj = projectProfile(tpl, g, 15);
    expect(rj.ok && close(rj.base.fuerza, 28)).toBe(true);
  });
  it('la mejor arma cambia al subir y el dano sube', () => {
    const g = tpl.baseProfiles.find((p) => p.id === 'guerrero')!;
    const mejor = (p: BaseProfile) => solve({ template: { ...tpl, baseProfiles: [p] }, items, profileId: p.id, objectiveId: 'fisico', constraints: [], topN: 1 });
    const hoy = mejor(g);
    const p30 = projectProfile(tpl, g, 30);
    const futuro = p30.ok ? mejor({ ...g, base: p30.base }) : null;
    const armaDe = (res: ReturnType<typeof solve> | null) => items.find((i) => i.id === res?.builds[0]?.itemIds[0])?.name;
    expect(!!armaDe(hoy) && !!armaDe(futuro) && armaDe(hoy) !== armaDe(futuro), `${armaDe(hoy)} -> ${armaDe(futuro)}`).toBe(true);
    expect((futuro?.builds[0]?.score ?? 0) > (hoy.builds[0]?.score ?? Infinity)).toBe(true);
  });
});

describe('6. curvas por tramos', () => {
  it('formula generada = interpolacion y puntos exactos', () => {
    const pts: [number, number][] = [[1, 300], [10, 580], [27, 1000], [50, 1400], [99, 1650]];
    const f = curveFormula({ stats: [] }, { input: 'vigor', points: pts });
    const fn = compileFormula(f, new Map([['base_vigor', 0]]));
    let max = 0;
    for (let x = -5; x <= 120; x += 0.5) max = Math.max(max, Math.abs(fn(new Float64Array([x])) - evalCurve(pts, x)));
    expect(max < 1e-6, `error max ${max}`).toBe(true);
    expect(evalCurve(pts, 27) === 1000 && evalCurve(pts, 0) === 300 && evalCurve(pts, 150) === 1650).toBe(true);
    expect(close(evalCurve(pts, 38.5), 1200)).toBe(true);
    expect(curveFormula({ stats: [{ id: 'vigor', name: 'v', unit: 'flat' }] }, { input: 'vigor', points: pts }).includes('(base_vigor + vigor)')).toBe(true);
  });
  it('avisos de curvas mal armadas', () => {
    const mal = (points: [number, number][], formula = 'x') => checkCurves({ stats: [], baseProfiles: [guerrero], derived: [{ id: 'c', name: 'C', formula, curve: { input: 'fuerza', points } }] });
    expect(mal([[1, 2]]).errors.length > 0).toBe(true);
    expect(mal([[1, 2], [5, 9]]).warnings.some((w) => w.includes('no coincide'))).toBe(true);
    expect(mal([[1, 2], [5, 9]], curveFormula({ stats: [] }, { input: 'fuerza', points: [[1, 2], [5, 9]] })).warnings.length).toBe(0);
  });
});

describe('7. niveles por puntos', () => {
  const ts = { leveling: { min: 1, max: 99, mode: 'points' as const, points: { attributes: ['vigor', 'fuerza'], perLevel: 1, maxValue: 40 }, growth: {} } };
  const pj: BaseProfile = { id: 'c', name: 'Caballero', base: { nivel: 10, vigor: 12, fuerza: 14, fe: 9 } };

  it('5 niveles dan 5 puntos', () => {
    expect(pointsBetween(ts, 10, 15)).toBe(5);
  });
  it('reparto 3 + 2 aplicado; lo demas no se toca', () => {
    const r7 = projectProfile(ts, pj, 15, { vigor: 3, fuerza: 2 });
    expect(r7.ok && r7.base.vigor === 15 && r7.base.fuerza === 16 && r7.base.nivel === 15 && r7.base.fe === 9).toBe(true);
  });
  it('no deja repartir mas puntos de los que hay', () => {
    expect(projectProfile(ts, pj, 15, { vigor: 6 }).ok).toBe(false);
  });
  it('el mensaje dice cuantos puntos da', () => {
    expect(/da 5/.test(err(projectProfile(ts, pj, 15, { vigor: 6 })))).toBe(true);
  });
  it('no deja subir un atributo que no recibe puntos', () => {
    expect(projectProfile(ts, pj, 15, { fe: 1 }).ok).toBe(false);
  });
  it('respeta el tope del atributo', () => {
    expect(projectProfile(ts, pj, 50, { vigor: 30 }).ok).toBe(false);
  });
  it('los puntos son enteros', () => {
    expect(projectProfile(ts, pj, 15, { vigor: 1.5 }).ok).toBe(false);
  });
  it('proyectar sin repartir es valido (puntos pendientes)', () => {
    expect(projectProfile(ts, pj, 15).ok).toBe(true);
  });
  it('techo alcanzable = tope del atributo', () => {
    const mr = maxReachable(ts, pj);
    expect(mr.vigor === 40 && mr.fuerza === 40).toBe(true);
  });
  it('modo puntos sin atributos es error', () => {
    expect(checkLeveling({ leveling: { ...ts.leveling, points: { attributes: [] } }, baseProfiles: [pj] }).errors.length > 0).toBe(true);
  });
  it('modo puntos sin curvas de crecimiento es valido', () => {
    expect(checkLeveling({ leveling: ts.leveling, baseProfiles: [pj] }).errors.length).toBe(0);
  });
});

describe('8. reparto automatico', () => {
  const soft = (x: number, a: number, b: number) => Math.min(x, a) * 3 + Math.max(0, Math.min(x, b) - a) * 1 + Math.max(0, x - b) * 0.2;
  const t8 = { leveling: { min: 1, max: 99, mode: 'points' as const, points: { attributes: ['a', 'b', 'c'] }, growth: {} } };
  const p8: BaseProfile = { id: 'x', name: 'X', base: { nivel: 1, a: 5, b: 8, c: 2 } };

  it('igual a la fuerza bruta en 30 casos con topes blandos', () => {
    let peor = 0;
    for (let caso = 0; caso < 30; caso++) {
      const w = [1 + (caso % 3), 1 + ((caso * 7) % 5) / 2, 0.5 + ((caso * 3) % 4)];
      const lim = [10 + (caso % 5), 12 + (caso % 3) * 4, 6 + (caso % 7)];
      const f = (b: Record<string, number>) => w[0] * soft(b.a, lim[0], lim[0] + 8) + w[1] * soft(b.b, lim[1], lim[1] + 5) + w[2] * soft(b.c, lim[2], lim[2] + 10);
      const N = 6 + (caso % 10);
      let mejor = -Infinity;
      for (let i = 0; i <= N; i++) for (let j = 0; i + j <= N; j++) {
        mejor = Math.max(mejor, f({ ...p8.base, a: p8.base.a + i, b: p8.base.b + j, c: p8.base.c + N - i - j }));
      }
      const r = allocatePoints(t8, p8, 1 + N, f);
      const pr = projectProfile(t8, p8, 1 + N, r.alloc);
      const v = pr.ok ? f(pr.base) : -Infinity;
      peor = Math.max(peor, mejor - v);
    }
    expect(peor < 1e-9, `peor diferencia ${peor}`).toBe(true);
  });
  it('salta la meseta: 4 a fuerza para el umbral y el resto a lo que suma', () => {
    const umbral = (b: Record<string, number>) => (b.a >= 20 ? 100 : 0) + b.b;
    const r2 = allocatePoints(t8, { ...p8, base: { ...p8.base, a: 16 } }, 9, umbral);
    expect((r2.alloc.a ?? 0) === 4 && (r2.alloc.b ?? 0) === 4, JSON.stringify(r2.alloc)).toBe(true);
  });
  it('cubre el requisito (c 2 -> 5) y reparte lo que sobra', () => {
    const r3 = allocatePoints(t8, p8, 6, (b) => b.b, { c: 5 });
    expect((r3.alloc.c ?? 0) === 3 && (r3.alloc.b ?? 0) === 2 && r3.unmet.length === 0, JSON.stringify(r3.alloc)).toBe(true);
  });
  it('avisa si los puntos no alcanzan para el requisito', () => {
    const r4 = allocatePoints(t8, p8, 3, (b) => b.b, { c: 10 });
    expect(r4.unmet.includes('c')).toBe(true);
  });
  it('si nada mejora, deja los puntos sin repartir', () => {
    const r5 = allocatePoints(t8, p8, 6, () => 1);
    expect(r5.leftover === 5 && Object.keys(r5.alloc).length === 0).toBe(true);
  });
});

describe('9. ejemplo Souls (niveles por puntos y curvas)', () => {
  it('valida sin avisos de curvas ni niveles, cumple el requisito y sube el dano', () => {
    const souls = JSON.parse(readFileSync(new URL('../../fixtures/souls.zenith.json', import.meta.url), 'utf8'));
    const ts9 = souls.template as GameTemplate;
    const it9 = souls.items as Item[];
    const v9 = validateTemplate(ts9, it9);
    expect(v9.ok && !v9.issues.some((i) => i.code === 'W_CURVA' || i.code === 'W_NIVELES')).toBe(true);
    const g9 = ts9.baseProfiles.find((p) => p.id === 'guerrero')!;
    expect(currentLevel(ts9, g9)).toBe(80);
    // Espadon Gigante (fuerza 54) puesto: el reparto cubre el requisito y sube el dano.
    const espadon = it9.find((i) => i.name === 'Espadon Gigante')!;
    const eq = { weapon: espadon.id };
    const t0 = performance.now();
    const sc = scorer(ts9, it9, eq, 'guerrero', {}, 'dano')!;
    const r9 = allocatePoints(ts9, g9, 90, sc, espadon.requires);
    const ms = performance.now() - t0;
    const p9 = projectProfile(ts9, g9, 90, r9.alloc);
    expect(p9.ok && p9.base.fuerza >= 54, JSON.stringify(r9.alloc)).toBe(true);
    expect(p9.ok && sc(p9.base) > sc(g9.base)).toBe(true);
    expect(r9.leftover).toBe(0);
    // Vida por Vigor: 27 -> 1000, 50 -> 1400.
    const vida = (b: Record<string, number>) => scorer(ts9, it9, {}, 'guerrero', {}, 'tanque')!(b);
    expect(vida({ ...g9.base, vigor: 50 }) > vida(g9.base)).toBe(true);
    expect(ms < 3000, `${ms.toFixed(0)} ms`).toBe(true);
  });
});
