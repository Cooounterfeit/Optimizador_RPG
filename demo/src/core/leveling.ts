/**
 * Proyeccion por nivel (TEC-12)
 * =============================
 * Funciones puras: sin UI, sin red, sin estado. Dado un perfil y un nivel
 * objetivo, devuelve como quedarian sus valores base segun las curvas de
 * crecimiento que declaro el autor del juego.
 *
 * El nombre del Jira (`proyectarEstadisticas`) se exporta tal cual.
 */

import { compileFormula, FormulaError, formulaVariables } from './formula'
import type { BaseProfile, GameTemplate, LevelingDef } from './types'

export const levelKeyOf = (l: LevelingDef) => l.levelKey || 'nivel'

/** Nivel actual del perfil, o null si el juego no tiene niveles o el perfil no lo declara. */
export function currentLevel(t: Pick<GameTemplate, 'leveling'>, p: BaseProfile): number | null {
  if (!t.leveling) return null
  const v = p.base[levelKeyOf(t.leveling)]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Claves que crecen con el nivel y que el perfil tiene: son las "estadisticas" de la evolucion. */
export function growingKeys(t: Pick<GameTemplate, 'leveling'>, p: BaseProfile): string[] {
  if (!t.leveling) return []
  const keys = [...pointAttributes(t), ...Object.keys(t.leveling.growth ?? {})]
  return [...new Set(keys)].filter((k) => typeof p.base[k] === 'number')
}

/** Atributos en los que se reparten puntos (vacio si el juego no sube por puntos). */
export function pointAttributes(t: Pick<GameTemplate, 'leveling'>): string[] {
  const l = t.leveling
  return l?.mode === 'points' ? (l.points?.attributes ?? []) : []
}

export const isPointsMode = (t: Pick<GameTemplate, 'leveling'>) => t.leveling?.mode === 'points'

/** Puntos que da subir de `from` a `to`. */
export function pointsBetween(t: Pick<GameTemplate, 'leveling'>, from: number, to: number): number {
  if (!isPointsMode(t)) return 0
  return Math.max(0, to - from) * (t.leveling!.points?.perLevel ?? 1)
}

/** Reparto de puntos: atributo -> puntos anadidos. */
export type Allocation = Record<string, number>
export const allocated = (a: Allocation = {}) => Object.values(a).reduce((x, y) => x + (y > 0 ? y : 0), 0)

/**
 * Compila las curvas para un perfil. Variables disponibles: `nivel` y
 * `base_<clave>` de todas las claves del perfil (con su valor ACTUAL).
 */
function compileGrowth(l: LevelingDef, p: BaseProfile) {
  const keys = Object.keys(p.base)
  const varIndex = new Map<string, number>([['nivel', 0]])
  keys.forEach((k, i) => varIndex.set(`base_${k}`, i + 1))
  const vars = new Float64Array(keys.length + 1)
  keys.forEach((k, i) => { vars[i + 1] = p.base[k] })
  const fns = Object.entries(l.growth ?? {}).map(([k, f]) => ({ k, fn: compileFormula(String(f), varIndex) }))
  return { vars, fns }
}

export type Projection =
  | { ok: true; level: number; base: Record<string, number> }
  | { ok: false; error: string }

/**
 * Valores base del perfil al nivel `target`, partiendo de su nivel actual.
 * Solo hacia adelante: el pasado no se estima, se consulta en el historial
 * (SIM-03 pide registros reales, no una reconstruccion).
 */
export function projectProfile(t: Pick<GameTemplate, 'leveling'>, p: BaseProfile, target: number, alloc: Allocation = {}): Projection {
  const l = t.leveling
  if (!l) return { ok: false, error: 'Simulación futura no disponible' }
  const actual = currentLevel(t, p)
  if (actual === null || growingKeys(t, p).length === 0) {
    return { ok: false, error: 'No tienes estadísticas base para simular. Sube de nivel primero.' }
  }
  if (!Number.isInteger(target)) return { ok: false, error: 'El nivel debe ser un número entero.' }
  if (target === actual) return { ok: false, error: 'Elige un nivel superior al actual' }
  if (target < actual) return { ok: false, error: 'El nivel elegido debe ser mayor al actual' }
  if (target > l.max) return { ok: false, error: `El nivel máximo de este juego es ${l.max}.` }

  const { vars, fns } = compileGrowth(l, p)
  const base: Record<string, number> = { ...p.base }
  for (let n = actual + 1; n <= target; n++) {
    vars[0] = n
    for (const { k, fn } of fns) {
      if (typeof base[k] !== 'number') continue
      const d = fn(vars)
      if (!Number.isFinite(d)) return { ok: false, error: `La curva de "${k}" no da un número válido en el nivel ${n}.` }
      base[k] += d
    }
  }
  // Puntos repartidos por el jugador (modo por puntos).
  const disponibles = pointsBetween(t, actual, target)
  const permitidos = new Set(pointAttributes(t))
  const usados = allocated(alloc)
  for (const [k, n] of Object.entries(alloc)) {
    if (!n) continue
    if (!Number.isInteger(n) || n < 0) return { ok: false, error: 'Los puntos se reparten en números enteros positivos.' }
    if (!permitidos.has(k)) return { ok: false, error: `"${k}" no recibe puntos al subir de nivel.` }
  }
  if (usados > disponibles) {
    return { ok: false, error: `Repartiste ${usados} puntos, pero subir al nivel ${target} da ${disponibles}.` }
  }
  const tope = l.points?.maxValue
  for (const [k, n] of Object.entries(alloc)) {
    if (!n) continue
    base[k] = (base[k] ?? 0) + n
    if (tope !== undefined && base[k] > tope) return { ok: false, error: `${k} no puede pasar de ${tope}.` }
  }
  // Quita el ruido de coma flotante (20 + 5 * 1.6 = 28.000000000000007).
  for (const k of growingKeys(t, p)) if (typeof base[k] === 'number') base[k] = Math.round(base[k] * 1e9) / 1e9
  base[levelKeyOf(l)] = target
  return { ok: true, level: target, base }
}

/**
 * Nombre del Jira (TEC-12): `proyectarEstadisticas(personaje, nivelObjetivo)`.
 * `personaje` es la plantilla mas el perfil elegido.
 */
export function proyectarEstadisticas(
  personaje: { template: Pick<GameTemplate, 'leveling'>; profile: BaseProfile },
  nivelObjetivo: number,
): Projection {
  return projectProfile(personaje.template, personaje.profile, nivelObjetivo)
}

/** Niveles futuros elegibles (estrictamente mayores al actual, hasta el maximo). */
export function futureLevels(t: Pick<GameTemplate, 'leveling'>, p: BaseProfile): number[] {
  const a = currentLevel(t, p)
  if (a === null || !t.leveling) return []
  const out: number[] = []
  for (let n = a + 1; n <= t.leveling.max; n++) out.push(n)
  return out
}

/** Errores de configuracion de los niveles, para el validador de plantillas. */
export function checkLeveling(t: Pick<GameTemplate, 'leveling' | 'baseProfiles'>): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const l = t.leveling
  if (!l) return { errors, warnings }
  if (!Number.isInteger(l.min) || !Number.isInteger(l.max) || l.min < 0 || l.max <= l.min) {
    errors.push(`Los niveles deben ir de un mínimo a un máximo mayor (hoy: ${l.min} a ${l.max}).`)
  }
  if (l.mode === 'points') {
    const at = l.points?.attributes ?? []
    if (at.length === 0) errors.push('Subir de nivel da puntos, pero no hay atributos donde repartirlos.')
    if (l.points?.perLevel !== undefined && (!Number.isInteger(l.points.perLevel) || l.points.perLevel < 1)) {
      errors.push('Los puntos por nivel deben ser un entero mayor que 0.')
    }
    for (const p of t.baseProfiles) {
      for (const k of at) if (typeof p.base[k] !== 'number') warnings.push(`El perfil "${p.name}" no tiene "${k}": no podrá subirlo.`)
    }
    if (at.includes(levelKeyOf(l))) errors.push(`"${levelKeyOf(l)}" es el nivel: no puede recibir puntos.`)
  }
  const growth: Record<string, string> = l.growth && typeof l.growth === 'object' ? l.growth : {}
  if (Object.keys(growth).length === 0 && l.mode !== 'points') {
    errors.push('Los niveles no definen ninguna curva de crecimiento.')
    return { errors, warnings }
  }
  const key = levelKeyOf(l)
  for (const p of t.baseProfiles) {
    const nv = p.base[key]
    if (typeof nv !== 'number') {
      errors.push(`El perfil "${p.name}" no tiene su nivel actual ("${key}").`)
      continue
    }
    if (nv < l.min || nv > l.max) errors.push(`El perfil "${p.name}" está en el nivel ${nv}, fuera de ${l.min}–${l.max}.`)
    for (const k of Object.keys(growth)) {
      if (typeof p.base[k] !== 'number') warnings.push(`El perfil "${p.name}" no tiene "${k}": no crecerá con el nivel.`)
    }
  }
  if (Object.prototype.hasOwnProperty.call(growth, key)) errors.push(`"${key}" es el nivel: no puede tener curva propia.`)
  // Cada curva tiene que compilar con `nivel` y las claves del primer perfil.
  const p0 = t.baseProfiles[0]
  if (p0) {
    const disponibles = new Set(['nivel', ...Object.keys(p0.base).map((k) => `base_${k}`)])
    for (const [k, f] of Object.entries(growth)) {
      try {
        for (const v of formulaVariables(String(f))) {
          if (!disponibles.has(v)) errors.push(`La curva de "${k}" usa "${v}", que no existe (usa "nivel" o base_<clave>).`)
        }
      } catch (e) {
        errors.push(`La curva de "${k}" no es válida: ${e instanceof FormulaError ? e.message : String(e)}`)
      }
    }
  }
  return { errors, warnings }
}

// ------------------------------------------------------------ reparto automatico

export interface AllocationResult {
  alloc: Allocation
  /** Puntos que no mejoran nada: quedan para que el jugador decida. */
  leftover: number
  /** Minimos (requisitos del equipo) que no se alcanzan con los puntos disponibles. */
  unmet: string[]
}

/**
 * Reparte los puntos de subir del nivel actual a `target` para maximizar
 * `score` (por ejemplo, el dano con el equipo puesto).
 *
 *  1. Primero cubre los `minimums` (requisitos de las piezas puestas).
 *  2. Despues, paso a paso: compara subir un punto en cada atributo con
 *     saltos de hasta 15 puntos (umbrales: un efecto que aparece a los 4
 *     puntos) y elige lo que mas rinde por punto.
 *  3. Al final, busqueda local: mueve un punto de un atributo a otro mientras
 *     mejore. Corrige los errores tipicos del paso voraz con topes blandos.
 *
 * Es una heuristica (el problema general es NP-dificil), pero en curvas con
 * rendimientos decrecientes —el caso de los Souls— el paso voraz ya es
 * optimo, y las pruebas lo comparan con fuerza bruta.
 */
export function allocatePoints(
  t: Pick<GameTemplate, 'leveling'>,
  p: BaseProfile,
  target: number,
  score: (base: Record<string, number>) => number,
  minimums: Record<string, number> = {},
): AllocationResult {
  const actual = currentLevel(t, p) ?? 0
  const total = pointsBetween(t, actual, target)
  const attrs = pointAttributes(t).filter((k) => typeof p.base[k] === 'number')
  const tope = t.leveling?.points?.maxValue ?? Infinity
  // Base ya proyectada sin puntos (lo que sube solo).
  const sin = projectProfile(t, p, target)
  const base0 = sin.ok ? sin.base : { ...p.base }
  const alloc: Allocation = Object.fromEntries(attrs.map((k) => [k, 0]))
  let restantes = total
  const unmet: string[] = []

  for (const [k, need] of Object.entries(minimums)) {
    if (!attrs.includes(k)) continue
    const falta = Math.max(0, Math.ceil(need - base0[k]))
    const pone = Math.min(falta, restantes, tope - base0[k])
    alloc[k] += Math.max(0, pone)
    restantes -= Math.max(0, pone)
    if (pone < falta) unmet.push(k)
  }

  const conAlloc = (a: Allocation) => {
    const b = { ...base0 }
    for (const k of attrs) b[k] += a[k]
    return b
  }
  const cabe = (k: string, n: number) => base0[k] + alloc[k] + n <= tope
  let actualScore = score(conAlloc(alloc))
  const EPS = 1e-9

  while (restantes > 0) {
    let mejor: { k: string; n: number; rate: number; s: number } | null = null
    for (const k of attrs) {
      if (!cabe(k, 1)) continue
      alloc[k]++
      const s1 = score(conAlloc(alloc))
      alloc[k]--
      const rate = s1 - actualScore
      if (rate > EPS && (!mejor || rate > mejor.rate)) mejor = { k, n: 1, rate, s: s1 }
    }
    {
      // Saltos: a veces un punto suelto no da nada (un umbral a 4 puntos) y
      // varios juntos rinden mas por punto que cualquier paso de a uno.
      for (const k of attrs) {
        for (let n = 2; n <= Math.min(restantes, 15); n++) {
          if (!cabe(k, n)) break
          alloc[k] += n
          const sn = score(conAlloc(alloc))
          alloc[k] -= n
          const rate = (sn - actualScore) / n
          if (rate > EPS && (!mejor || rate > mejor.rate)) mejor = { k, n, rate, s: sn }
        }
      }
    }
    if (!mejor) break
    alloc[mejor.k] += mejor.n
    restantes -= mejor.n
    actualScore = mejor.s
  }

  // Busqueda local: mover un punto de a hacia b mientras mejore.
  const piso = (k: string) => Math.max(0, Math.ceil((minimums[k] ?? -Infinity) - base0[k]))
  for (let iter = 0; iter < 400; iter++) {
    let movido = false
    for (const a of attrs) {
      if (alloc[a] <= piso(a)) continue
      for (const b of attrs) {
        if (a === b || !cabe(b, 1)) continue
        alloc[a]--; alloc[b]++
        const s = score(conAlloc(alloc))
        if (s > actualScore + EPS) { actualScore = s; movido = true; break }
        alloc[a]++; alloc[b]--
      }
      if (movido) break
    }
    if (!movido) break
  }

  for (const k of attrs) if (alloc[k] === 0) delete alloc[k]
  return { alloc, leftover: restantes, unmet }
}

/**
 * Lo maximo que puede llegar a valer cada clave del perfil subiendo de nivel:
 * todos los puntos a esa clave (hasta su tope) o la proyeccion al nivel maximo.
 * Sirve para no avisar de "requisito imposible" cuando basta con subir.
 */
export function maxReachable(t: Pick<GameTemplate, 'leveling'>, p: BaseProfile): Record<string, number> {
  const out: Record<string, number> = {}
  const l = t.leveling
  const actual = l ? currentLevel(t, p) : null
  if (!l || actual === null || actual >= l.max) return out
  const sin = projectProfile(t, p, l.max)
  if (sin.ok) for (const k of growingKeys(t, p)) out[k] = sin.base[k]
  const pts = pointsBetween(t, actual, l.max)
  for (const k of pointAttributes(t)) {
    if (typeof p.base[k] !== 'number') continue
    out[k] = Math.min((sin.ok ? sin.base[k] : p.base[k]) + pts, l.points?.maxValue ?? Infinity)
  }
  return out
}
