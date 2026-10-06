/**
 * Pruebas de la proyeccion por nivel (TEC-12). Sale con codigo 1 si algo falla.
 *   npx tsx scripts/niveles.ts
 *
 *   1. El ejemplo del Jira: Guerrero nivel 10, Fuerza 20, +1.6 por nivel ->
 *      nivel 15 = 28 (+8).
 *   2. Los mensajes de error de los criterios de aceptacion.
 *   3. Curvas que dependen del nivel, y que proyectar en dos saltos da lo mismo
 *      que en uno.
 *   4. Validacion de la configuracion de niveles.
 *   5. El ejemplo publicado valida y cambia la build optima al subir.
 *   6. Curvas por tramos: la formula generada da lo mismo que la interpolacion.
 *   7. Niveles por puntos (tipo Souls): reparto, limites y mensajes.
 *   8. Reparto automatico contra fuerza bruta, con requisitos del equipo.
 *   9. Ejemplo Souls: valida, y el reparto sugerido sube el dano.
 */
import { readFileSync } from 'node:fs'
import {
  allocatePoints, checkLeveling, currentLevel, futureLevels, maxReachable, pointsBetween, projectProfile, proyectarEstadisticas,
  type Allocation,
} from '../src/core/leveling'
import { checkCurves, curveFormula, evalCurve } from '../src/core/curves'
import { compileFormula } from '../src/core/formula'
import { scorer } from '../src/views/evaluar'
import { validateTemplate } from '../src/core/validate'
import { solve } from '../src/core/optimizer'
import type { BaseProfile, GameTemplate, Item } from '../src/core/types'

let fallos = 0
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) fallos++
  console.log(`  [${ok ? 'OK ' : 'FALLO'}] ${label}${detail ? `  ${detail}` : ''}`)
}
const close = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b))

const guerrero: BaseProfile = { id: 'g', name: 'Guerrero', base: { nivel: 10, fuerza: 20, destreza: 15, inteligencia: 12 } }
const t = { leveling: { min: 1, max: 50, growth: { fuerza: '1.6', destreza: '1', inteligencia: '0.4' } } }

console.log('1. Ejemplo del Jira')
const r = proyectarEstadisticas({ template: t, profile: guerrero }, 15)
check(r.ok, 'proyecta al nivel 15')
if (r.ok) {
  check(close(r.base.fuerza, 28), 'Fuerza 20 -> 28', String(r.base.fuerza))
  check(close(r.base.fuerza - guerrero.base.fuerza, 8), 'diferencia +8')
  check(close(r.base.destreza, 20), 'Destreza 15 -> 20')
  check(close(r.base.inteligencia, 14), 'Inteligencia 12 -> 14')
  check(r.base.nivel === 15, 'el nivel queda en 15')
}
check(guerrero.base.fuerza === 20, 'no modifica el perfil original')
check(currentLevel(t, guerrero) === 10, 'nivel actual 10')
const fut = futureLevels(t, guerrero)
check(fut[0] === 11 && fut[fut.length - 1] === 50 && !fut.includes(10), 'niveles elegibles 11..50, sin el actual')

console.log('2. Mensajes de los criterios de aceptacion')
const err = (x: ReturnType<typeof projectProfile>) => (x.ok ? '' : x.error)
check(err(projectProfile(t, guerrero, 10)) === 'Elige un nivel superior al actual', 'mismo nivel')
check(err(projectProfile(t, guerrero, 7)) === 'El nivel elegido debe ser mayor al actual', 'nivel menor')
check(err(projectProfile(t, { ...guerrero, base: { fuerza: 3 } }, 12)) === 'No tienes estadísticas base para simular. Sube de nivel primero.', 'sin nivel en el perfil')
check(err(projectProfile(t, { ...guerrero, base: { nivel: 3 } }, 12)) === 'No tienes estadísticas base para simular. Sube de nivel primero.', 'sin estadisticas que crezcan')
check(err(projectProfile({}, guerrero, 12)) === 'Simulación futura no disponible', 'juego sin niveles')
check(/máximo/.test(err(projectProfile(t, guerrero, 51))), 'por encima del maximo')
check(/entero/.test(err(projectProfile(t, guerrero, 12.5))), 'nivel no entero')

console.log('3. Curvas que dependen del nivel')
const t2 = { leveling: { min: 1, max: 99, growth: { vida: 'base_crecVida + nivel', fuerza: 'if(nivel % 5 == 0, 3, 1)' } } }
const p2: BaseProfile = { id: 'p', name: 'p', base: { nivel: 1, vida: 100, crecVida: 10, fuerza: 5 } }
const r2 = projectProfile(t2, p2, 10)
// vida: sum_{n=2..10} (10 + n) = 9*10 + 54 = 144 ; fuerza: 9 niveles, 2 multiplos de 5 -> 7 + 2*3 = 13
check(r2.ok && close(r2.base.vida, 244), 'vida acelera con el nivel', r2.ok ? String(r2.base.vida) : err(r2))
check(r2.ok && close(r2.base.fuerza, 5 + 7 + 6), 'crecimiento condicional por nivel', r2.ok ? String(r2.base.fuerza) : err(r2))
// Dos saltos = uno (las curvas solo usan nivel y crecimientos fijos).
const a = projectProfile(t2, p2, 6)
const b = a.ok ? projectProfile(t2, { ...p2, base: a.base }, 10) : a
check(b.ok && r2.ok && close(b.base.vida, r2.base.vida) && close(b.base.fuerza, r2.base.fuerza), '1->6->10 igual que 1->10')

console.log('4. Validacion')
const conf = (leveling: any, profiles: BaseProfile[] = [guerrero]) => checkLeveling({ leveling, baseProfiles: profiles })
check(conf({ min: 5, max: 5, growth: { fuerza: '1' } }).errors.length > 0, 'max debe ser mayor que min')
check(conf({ min: 1, max: 50, growth: {} }).errors.length > 0, 'sin curvas')
check(conf({ min: 1, max: 50, growth: { fuerza: 'base_noExiste' } }).errors.some((e) => e.includes('base_noExiste')), 'variable inexistente')
check(conf({ min: 1, max: 50, growth: { fuerza: '1 +' } }).errors.length > 0, 'formula rota')
check(conf({ min: 1, max: 50, growth: { nivel: '1' } }).errors.length > 0, 'el nivel no puede tener curva')
check(conf({ min: 11, max: 50, growth: { fuerza: '1' } }).errors.some((e) => e.includes('fuera')), 'perfil fuera de rango')
check(conf({ min: 1, max: 50, growth: { fuerza: '1' } }, [{ id: 'x', name: 'X', base: { fuerza: 1 } }]).errors.length > 0, 'perfil sin nivel')
check(conf({ min: 1, max: 50, growth: { carisma: '1' } }).warnings.length > 0, 'aviso: curva para algo que el perfil no tiene')
check(conf({ min: 1, max: 50, growth: { fuerza: 'base_fuerza * 0.05 + nivel / 10' } }).errors.length === 0, 'curva valida')

console.log('5. Ejemplo publicado (RPG clasico)')
const pkg = JSON.parse(readFileSync('public/examples/rpg.zenith.json', 'utf8'))
const tpl = pkg.template as GameTemplate
const items = pkg.items as Item[]
const v = validateTemplate(tpl)
check(v.ok, 'la plantilla valida', v.issues.filter((i) => i.level === 'error').map((i) => i.message).join(' | '))
const g = tpl.baseProfiles.find((p) => p.id === 'guerrero')!
const rj = projectProfile(tpl, g, 15)
check(rj.ok && close(rj.base.fuerza, 28), 'Guerrero: Fuerza 20 -> 28 al nivel 15')
const mejor = (p: BaseProfile) => solve({ template: { ...tpl, baseProfiles: [p] }, items, profileId: p.id, objectiveId: 'fisico', constraints: [], topN: 1 })
const hoy = mejor(g)
const p30 = projectProfile(tpl, g, 30)
const futuro = p30.ok ? mejor({ ...g, base: p30.base }) : null
const armaDe = (res: ReturnType<typeof solve> | null) => items.find((i) => i.id === res?.builds[0]?.itemIds[0])?.name
check(!!armaDe(hoy) && !!armaDe(futuro) && armaDe(hoy) !== armaDe(futuro), 'la mejor arma cambia al subir', `${armaDe(hoy)} -> ${armaDe(futuro)}`)
check((futuro?.builds[0]?.score ?? 0) > (hoy.builds[0]?.score ?? Infinity), 'el dano sube con el nivel')

console.log('6. Curvas por tramos')
{
  const pts: [number, number][] = [[1, 300], [10, 580], [27, 1000], [50, 1400], [99, 1650]]
  const f = curveFormula({ stats: [] }, { input: 'vigor', points: pts })
  const fn = compileFormula(f, new Map([['base_vigor', 0]]))
  let max = 0
  for (let x = -5; x <= 120; x += 0.5) max = Math.max(max, Math.abs(fn(new Float64Array([x])) - evalCurve(pts, x)))
  check(max < 1e-6, 'formula generada = interpolacion (de -5 a 120)', `error max ${max}`)
  check(evalCurve(pts, 27) === 1000 && evalCurve(pts, 0) === 300 && evalCurve(pts, 150) === 1650, 'puntos exactos y extremos planos')
  check(close(evalCurve(pts, 38.5), 1200), 'interpola entre puntos')
  check(curveFormula({ stats: [{ id: 'vigor', name: 'v', unit: 'flat' }] }, { input: 'vigor', points: pts }).includes('(base_vigor + vigor)'),
    'si el atributo tambien es estadistica, suma lo que da el equipo')
  const mal = (points: [number, number][], formula = 'x') => checkCurves({ stats: [], baseProfiles: [guerrero], derived: [{ id: 'c', name: 'C', formula, curve: { input: 'fuerza', points } }] })
  check(mal([[1, 2]]).errors.length > 0, 'una curva necesita dos puntos')
  check(mal([[1, 2], [5, 9]]).warnings.some((w) => w.includes('no coincide')), 'aviso si la formula no coincide con la curva')
  check(mal([[1, 2], [5, 9]], curveFormula({ stats: [] }, { input: 'fuerza', points: [[1, 2], [5, 9]] })).warnings.length === 0, 'curva sincronizada sin avisos')
}

console.log('7. Niveles por puntos')
const ts = { leveling: { min: 1, max: 99, mode: 'points' as const, points: { attributes: ['vigor', 'fuerza'], perLevel: 1, maxValue: 40 }, growth: {} } }
const pj: BaseProfile = { id: 'c', name: 'Caballero', base: { nivel: 10, vigor: 12, fuerza: 14, fe: 9 } }
check(pointsBetween(ts, 10, 15) === 5, '5 niveles dan 5 puntos')
const r7 = projectProfile(ts, pj, 15, { vigor: 3, fuerza: 2 })
check(r7.ok && r7.base.vigor === 15 && r7.base.fuerza === 16 && r7.base.nivel === 15 && r7.base.fe === 9, 'reparto 3 + 2 aplicado; lo demas no se toca')
check(projectProfile(ts, pj, 15, { vigor: 6 }).ok === false, 'no deja repartir mas puntos de los que hay')
check(/da 5/.test(err(projectProfile(ts, pj, 15, { vigor: 6 }))), 'el mensaje dice cuantos puntos da')
check(projectProfile(ts, pj, 15, { fe: 1 }).ok === false, 'no deja subir un atributo que no recibe puntos')
check(projectProfile(ts, pj, 50, { vigor: 30 }).ok === false, 'respeta el tope del atributo')
check(projectProfile(ts, pj, 15, { vigor: 1.5 }).ok === false, 'los puntos son enteros')
check(projectProfile(ts, pj, 15).ok, 'proyectar sin repartir es valido (puntos pendientes)')
const mr = maxReachable(ts, pj)
check(mr.vigor === 40 && mr.fuerza === 40, 'techo alcanzable = tope del atributo')
check(checkLeveling({ leveling: { ...ts.leveling, points: { attributes: [] } }, baseProfiles: [pj] }).errors.length > 0, 'modo puntos sin atributos es error')
check(checkLeveling({ leveling: ts.leveling, baseProfiles: [pj] }).errors.length === 0, 'modo puntos sin curvas de crecimiento es valido')

console.log('8. Reparto automatico')
{
  // Topes blandos: rendimientos decrecientes en tres atributos con pesos distintos.
  const soft = (x: number, a: number, b: number) => Math.min(x, a) * 3 + Math.max(0, Math.min(x, b) - a) * 1 + Math.max(0, x - b) * 0.2
  const t8 = { leveling: { min: 1, max: 99, mode: 'points' as const, points: { attributes: ['a', 'b', 'c'] }, growth: {} } }
  const p8: BaseProfile = { id: 'x', name: 'X', base: { nivel: 1, a: 5, b: 8, c: 2 } }
  let peor = 0
  for (let caso = 0; caso < 30; caso++) {
    const w = [1 + (caso % 3), 1 + ((caso * 7) % 5) / 2, 0.5 + ((caso * 3) % 4)]
    const lim = [10 + (caso % 5), 12 + (caso % 3) * 4, 6 + (caso % 7)]
    const f = (b: Record<string, number>) => w[0] * soft(b.a, lim[0], lim[0] + 8) + w[1] * soft(b.b, lim[1], lim[1] + 5) + w[2] * soft(b.c, lim[2], lim[2] + 10)
    const N = 6 + (caso % 10)
    let mejor = -Infinity
    for (let i = 0; i <= N; i++) for (let j = 0; i + j <= N; j++) {
      mejor = Math.max(mejor, f({ ...p8.base, a: p8.base.a + i, b: p8.base.b + j, c: p8.base.c + N - i - j }))
    }
    const r = allocatePoints(t8, p8, 1 + N, f)
    const pr = projectProfile(t8, p8, 1 + N, r.alloc)
    const v = pr.ok ? f(pr.base) : -Infinity
    peor = Math.max(peor, mejor - v)
  }
  check(peor < 1e-9, 'igual a la fuerza bruta en 30 casos con topes blandos', `peor diferencia ${peor}`)

  // Umbral: el arma solo sirve con fuerza >= 20. Un punto suelto no mejora nada.
  const umbral = (b: Record<string, number>) => (b.a >= 20 ? 100 : 0) + b.b
  const r2 = allocatePoints(t8, { ...p8, base: { ...p8.base, a: 16 } }, 9, umbral)
  check((r2.alloc.a ?? 0) === 4 && (r2.alloc.b ?? 0) === 4, 'salta la meseta: 4 a fuerza para el umbral y el resto a lo que suma', JSON.stringify(r2.alloc))

  // Requisitos del equipo: primero se cubren, aunque no sumen.
  const r3 = allocatePoints(t8, p8, 6, (b) => b.b, { c: 5 })
  check((r3.alloc.c ?? 0) === 3 && (r3.alloc.b ?? 0) === 2 && r3.unmet.length === 0, 'cubre el requisito (c 2 -> 5) y reparte lo que sobra', JSON.stringify(r3.alloc))
  const r4 = allocatePoints(t8, p8, 3, (b) => b.b, { c: 10 })
  check(r4.unmet.includes('c'), 'avisa si los puntos no alcanzan para el requisito')
  const r5 = allocatePoints(t8, p8, 6, () => 1)
  check(r5.leftover === 5 && Object.keys(r5.alloc).length === 0, 'si nada mejora, deja los puntos sin repartir')
}

console.log('9. Ejemplo Souls (niveles por puntos y curvas)')
{
  const souls = JSON.parse(readFileSync('public/examples/souls.zenith.json', 'utf8'))
  const ts9 = souls.template as GameTemplate
  const it9 = souls.items as Item[]
  const v9 = validateTemplate(ts9, it9)
  check(v9.ok && !v9.issues.some((i) => i.code === 'W_CURVA' || i.code === 'W_NIVELES'), 'valida sin avisos de curvas ni niveles')
  const g9 = ts9.baseProfiles.find((p) => p.id === 'guerrero')!
  check(currentLevel(ts9, g9) === 80, 'Guerrero nivel 80')
  // Espadon Gigante (fuerza 54) puesto: el reparto cubre el requisito y sube el dano.
  const espadon = it9.find((i) => i.name === 'Espadon Gigante')!
  const eq = { weapon: espadon.id }
  const t0 = performance.now()
  const sc = scorer(ts9, it9, eq, 'guerrero', {}, 'dano')!
  const r9 = allocatePoints(ts9, g9, 90, sc, espadon.requires)
  const ms = performance.now() - t0
  const p9 = projectProfile(ts9, g9, 90, r9.alloc)
  check(p9.ok && p9.base.fuerza >= 54, 'cumple el requisito de fuerza del Espadon', JSON.stringify(r9.alloc))
  check(p9.ok && sc(p9.base) > sc(g9.base), 'el dano sube con el reparto')
  check(r9.leftover === 0, 'reparte los 10 puntos')
  // Vida por Vigor: 27 -> 1000, 50 -> 1400.
  const vida = (b: Record<string, number>) => scorer(ts9, it9, {}, 'guerrero', {}, 'tanque')!(b)
  check(vida({ ...g9.base, vigor: 50 }) > vida(g9.base), 'subir vigor sube la supervivencia')
  check(ms < 3000, 'reparto en menos de 3 s', `${ms.toFixed(0)} ms`)
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
