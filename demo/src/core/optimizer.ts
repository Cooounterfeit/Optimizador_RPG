/**
 * Core Engine — optimizador combinatorio
 * =======================================
 *
 * EL PROBLEMA
 * Elegir una pieza por ranura maximizando un objetivo, respetando requisitos,
 * presupuestos y exclusiones. Con el inventario real de ejemplo el espacio
 * ronda las 10^13 combinaciones: enumerarlas tardaria decadas.
 *
 * QUE SABE HACER, POR EJES
 *
 *  Expresividad — las formulas vienen de la plantilla. Cada estadistica declara
 *  ademas COMO se combinan los aportes de varias piezas: sumandose (lo habitual)
 *  o multiplicandose como factores. Sin ese segundo modo, los modificadores
 *  "more" de Path of Exile darian resultados equivocados.
 *
 *  Restricciones — minimos (llegar a X), maximos (no pasarse de X, que es como
 *  se modela un presupuesto: carga de equipo, capacidad de gemas, peso),
 *  requisitos por pieza (necesitas 40 de Fuerza) y grupos de exclusion mutua
 *  (un solo anillo de cada tipo aunque haya varias ranuras).
 *
 *  Forma del problema — hoy: una pieza por ranura. Elegir un subconjunto bajo
 *  presupuesto o un subgrafo conexo son problemas distintos y necesitan sus
 *  propios solvers detras del mismo contrato de plantilla.
 *
 * LA ESTRATEGIA, EN CUATRO CAPAS
 *
 *  0. Deteccion numerica de relevancia — el motor descubre solo que
 *     estadisticas afectan al objetivo perturbandolas y observando el
 *     resultado. Para un DPS Geo descarta los bonos Pyro, Hydro, la curacion y
 *     la defensa sin que nadie se lo diga. Ademas fusiona ejes que entran de
 *     forma identica.
 *
 *  1. Filtro de dominancia — dentro de una ranura y un conjunto, si una pieza
 *     es peor o igual en todo lo que importa, se elimina. Para las
 *     estadisticas de COSTE la comparacion se invierte: ahi menos es mejor.
 *
 *  2. Branch and bound con cota superior optimista — en cada nodo se construye
 *     un vector utopico y, si evaluarlo ya da menos que la mejor build
 *     encontrada, el subarbol entero se descarta. Es exacto, no heuristico:
 *     requiere `monotonic: true` y entonces no puede perder el optimo.
 *
 *  3. Poda por restricciones — minimos, maximos y exclusiones cortan ramas
 *     antes de calcularlas. Restringir ACELERA la busqueda.
 */

import { compileFormula, type CompiledFormula } from './formula'
import type {
  BuildResult, Item, SolveRequest, SolveResponse, SolveStats,
} from './types'

const IDENT_RE = /[A-Za-z_][A-Za-z0-9_]*/g

/** Modo de acumulacion de una estadistica. */
const SUM = 0
const MUL = 1

export interface SolveHooks {
  onProgress?: (p: { evaluated: number; pruned: number; elapsedMs: number; bestScore: number }) => void
  shouldCancel?: () => boolean
  progressEvery?: number
  /** Tiempo maximo de busqueda en ms. Por defecto 30 s. */
  deadlineMs?: number
}

/**
 * Ordena los derivados para que cada uno se evalue despues de sus dependencias.
 * Lanza si detecta un ciclo: sin esto una referencia hacia adelante leeria el
 * valor de la evaluacion ANTERIOR y devolveria un numero incorrecto en silencio.
 */
export function topoSortDerived<T extends { id: string; formula: string }>(list: T[]): T[] {
  const byId = new Map(list.map((d) => [d.id, d]))
  const deps = new Map<string, string[]>()
  for (const d of list) {
    const found: string[] = []
    for (const m of d.formula.matchAll(IDENT_RE)) if (m[0] !== d.id && byId.has(m[0])) found.push(m[0])
    deps.set(d.id, found)
  }
  const out: T[] = []
  const state = new Map<string, 0 | 1 | 2>()
  const visit = (id: string, path: string[]): void => {
    const st = state.get(id)
    if (st === 2) return
    if (st === 1) throw new Error(`Ciclo entre valores derivados: ${[...path, id].join(' → ')}`)
    state.set(id, 1)
    for (const dep of deps.get(id) ?? []) visit(dep, [...path, id])
    state.set(id, 2)
    const d = byId.get(id)
    if (d) out.push(d)
  }
  for (const d of list) visit(d.id, [])
  return out
}

interface Layout {
  statIds: string[]
  S: number
  statIndex: Map<string, number>
  mode: Uint8Array
  neutral: Float64Array
  vars: Float64Array
  derivedCount: number
  evaluateFull: (totals: Float64Array) => number
  baseOf: (i: number) => number
  varIndex: Map<string, number>
  derivedIds: string[]
}

function buildLayout(req: SolveRequest): Layout {
  const { template, profileId, objectiveId } = req
  const objective = template.objectives.find((o) => o.id === objectiveId)
  if (!objective) throw new Error(`Objetivo desconocido: ${objectiveId}`)
  const profile = template.baseProfiles.find((p) => p.id === profileId)
  if (!profile) throw new Error(`Perfil base desconocido: ${profileId}`)

  const statIds = template.stats.map((s) => s.id)
  const S = statIds.length
  const statIndex = new Map(statIds.map((id, i) => [id, i]))
  const mode = new Uint8Array(S)
  const neutral = new Float64Array(S)
  template.stats.forEach((s, i) => {
    mode[i] = s.aggregate === 'multiply' ? MUL : SUM
    neutral[i] = mode[i] === MUL ? 1 : 0
  })

  const derived = topoSortDerived(template.derived ?? [])

  const varIndex = new Map<string, number>()
  statIds.forEach((id, i) => varIndex.set(id, i))
  statIds.forEach((id, i) => varIndex.set(`base_${id}`, S + i))
  derived.forEach((d, i) => varIndex.set(d.id, 2 * S + i))

  const D = derived.length
  const extraKeys = Object.keys(profile.base).filter((k) => !statIndex.has(k))
  extraKeys.forEach((k, i) => varIndex.set(`base_${k}`, 2 * S + D + i))

  const vars = new Float64Array(2 * S + D + extraKeys.length)
  for (let i = 0; i < S; i++) vars[S + i] = profile.base[statIds[i]] ?? neutral[i]
  extraKeys.forEach((k, i) => { vars[2 * S + D + i] = profile.base[k] ?? 0 })

  const derivedFns: CompiledFormula[] = derived.map((d) => compileFormula(d.formula, varIndex))
  const objectiveFn = compileFormula(objective.formula, varIndex)

  const evaluateFull = (totals: Float64Array): number => {
    for (let i = 0; i < S; i++) vars[i] = totals[i]
    for (let i = 0; i < D; i++) vars[2 * S + i] = derivedFns[i](vars)
    return objectiveFn(vars)
  }

  return {
    statIds, S, statIndex, mode, neutral, vars, derivedCount: D, evaluateFull,
    baseOf: (i: number) => vars[S + i],
    varIndex, derivedIds: derived.map((d) => d.id),
  }
}

/**
 * Reconstruye TODAS las variables de una build ya resuelta.
 *
 * Existe para que el diagrama de formulas pueda anotar cada nodo con su valor
 * real. Es deliberado que viva aqui y no en la capa de presentacion: usa
 * `buildLayout`, el mismo indice de variables y el mismo orden topologico que
 * el optimizador, asi que es imposible que el dibujo diga una cosa y el motor
 * calcule otra. Reimplementarlo por fuera habria sido una segunda verdad
 * esperando a divergir de la primera.
 *
 * `finalStats` viene con la base ya sumada (o multiplicada, segun el modo), asi
 * que primero hay que deshacer esa combinacion para recuperar el aporte neto de
 * las piezas, que es lo que las formulas llaman `atk`, `critRate_`, etc.
 */
export function explainBuild(
  template: SolveRequest['template'],
  profileId: string,
  objectiveId: string,
  finalStats: Record<string, number>,
): Map<string, number> {
  const L = buildLayout({ template, items: [], profileId, objectiveId, constraints: [], topN: 1 })
  const totals = new Float64Array(L.S)
  for (let i = 0; i < L.S; i++) {
    const fin = finalStats[L.statIds[i]]
    const base = L.baseOf(i)
    if (fin === undefined) { totals[i] = L.neutral[i]; continue }
    totals[i] = L.mode[i] === MUL ? (base !== 0 ? fin / base : fin) : fin - base
  }
  const score = L.evaluateFull(totals)
  const out = new Map<string, number>()
  for (const [name, i] of L.varIndex) out.set(name, L.vars[i])
  out.set(objectiveId, score)
  return out
}

export function solve(req: SolveRequest, hooks: SolveHooks = {}): SolveResponse {
  const t0 = Date.now()
  const deadline = t0 + (hooks.deadlineMs ?? 30_000)
  const { template, items, objectiveId, constraints, topN, profileId } = req

  const L = buildLayout(req)
  const { S, statIds, statIndex, mode, neutral, evaluateFull } = L
  const objective = template.objectives.find((o) => o.id === objectiveId)!
  const profile = template.baseProfiles.find((p) => p.id === profileId)!

  /**
   * Un objetivo monotono permite podar por cota superior sin perder el optimo.
   * Uno que NO lo es (por ejemplo "recarga exacta 200%", donde pasarse es
   * desperdicio, o una supervivencia que penaliza el peso) rompe esa garantia:
   * el vector utopico deja de acotar por arriba y podar podria descartar la
   * mejor build.
   *
   * En vez de prohibir esos objetivos —que son perfectamente legitimos en un
   * juego real— el motor cambia de modo: desactiva la poda por cota, se apoya
   * solo en las restricciones y en una busqueda local con reinicios, y lo dice
   * claramente marcando provenOptimal en false. Se puede calcular; no se puede
   * demostrar.
   */
  const exact = objective.monotonic !== false

  /** Convierte el aporte crudo de una pieza a la representacion del modo. */
  const asContribution = (i: number, raw: number) => (mode[i] === MUL ? 1 + raw / 100 : raw)

  // ---- Capa 0: que estadisticas mueven realmente la aguja -------------------
  const probeMax = new Float64Array(S)
  for (let i = 0; i < S; i++) probeMax[i] = neutral[i]
  const bump = (i: number, v: number) => { if (v > probeMax[i]) probeMax[i] = v }
  for (const it of items) {
    for (const [k, v] of Object.entries(it.stats)) {
      const i = statIndex.get(k)
      if (i !== undefined) bump(i, asContribution(i, v))
    }
  }
  for (const set of template.sets ?? []) {
    for (const tier of set.tiers) {
      for (const [k, v] of Object.entries(tier.effects)) {
        const i = statIndex.get(k)
        if (i !== undefined) bump(i, asContribution(i, v))
      }
    }
  }

  const probe = new Float64Array(S)
  const relevantSet = new Set<number>()
  const setProbe = (scale: number) => {
    for (let i = 0; i < S; i++) probe[i] = neutral[i] + (probeMax[i] - neutral[i]) * scale
  }
  for (const scale of [0, 0.5, 2, 5]) {
    setProbe(scale)
    const baseValue = evaluateFull(probe)
    for (let i = 0; i < S; i++) {
      if (relevantSet.has(i)) continue
      const step = Math.max(Math.abs(probeMax[i] - neutral[i]), mode[i] === MUL ? 0.25 : 1)
      probe[i] += step
      const v = evaluateFull(probe)
      probe[i] -= step
      if (Math.abs(v - baseValue) > 1e-9) relevantSet.add(i)
    }
  }
  for (const c of constraints) {
    const i = statIndex.get(c.statId)
    if (i !== undefined) relevantSet.add(i)
  }
  for (const b of template.budgets ?? []) {
    const i = statIndex.get(b.statId)
    if (i !== undefined) relevantSet.add(i)
  }

  const relIdxRaw = [...relevantSet].sort((a, b) => a - b)
  if (relIdxRaw.length === 0) for (let i = 0; i < S; i++) relIdxRaw.push(i)

  // Fusion de ejes equivalentes: si dos estadisticas entran en el objetivo
  // exactamente igual (bono de dano general y bono Geo para un personaje Geo),
  // se colapsan en un unico eje. Solo aplica a las que se suman.
  const mergeInto = new Map<number, number>()
  const constrained = new Set(constraints.map((c) => statIndex.get(c.statId)))
  for (let a = 0; a < relIdxRaw.length; a++) {
    const ia = relIdxRaw[a]
    if (mergeInto.has(ia) || mode[ia] === MUL || constrained.has(ia)) continue
    for (let b = a + 1; b < relIdxRaw.length; b++) {
      const ib = relIdxRaw[b]
      if (mergeInto.has(ib) || mode[ib] === MUL || constrained.has(ib)) continue
      let additive = true
      for (const scale of [0, 0.4, 1.5]) {
        setProbe(scale)
        const unit = Math.max(probeMax[ia] - neutral[ia], probeMax[ib] - neutral[ib], 1)
        for (const [x, y] of [[unit, 0], [0, unit], [unit * 0.5, unit * 0.5]]) {
          probe[ia] += x; probe[ib] += y
          const v = evaluateFull(probe)
          probe[ia] -= x; probe[ib] -= y
          probe[ia] += unit
          const ref = evaluateFull(probe)
          probe[ia] -= unit
          if (Math.abs(v - ref) > Math.max(1e-9, Math.abs(ref) * 1e-12)) { additive = false; break }
        }
        if (!additive) break
      }
      if (additive) mergeInto.set(ib, ia)
    }
  }

  const relIdx = relIdxRaw.filter((i) => !mergeInto.has(i))
  const R = relIdx.length
  const relPos = new Map<number, number>()
  relIdx.forEach((full, k) => relPos.set(full, k))
  for (const [from, to] of mergeInto) {
    const pos = relPos.get(to)
    if (pos !== undefined) relPos.set(from, pos)
  }
  const mergedCount = mergeInto.size

  const rMode = new Uint8Array(R)
  const rNeutral = new Float64Array(R)
  relIdx.forEach((full, k) => { rMode[k] = mode[full]; rNeutral[k] = neutral[full] })

  const fullScratch = new Float64Array(S)
  function evalCompact(compact: Float64Array): number {
    for (let i = 0; i < S; i++) fullScratch[i] = neutral[i]
    for (let k = 0; k < R; k++) fullScratch[relIdx[k]] = compact[k]
    return evaluateFull(fullScratch)
  }

  // ---- Restricciones en forma compacta -------------------------------------
  // Un maximo convierte a la estadistica en un COSTE: menos es mejor, y eso
  // invierte tanto la dominancia como el sentido de la cota.
  const budgets = (template.budgets ?? []).map((b) => ({ statId: b.statId, min: undefined, max: b.max }))
  const allCons = [...budgets, ...constraints]
  interface Cons { pos: number; min?: number; max?: number; base: number; mul: boolean }
  const cons: Cons[] = []
  for (const c of allCons) {
    const full = statIndex.get(c.statId)
    const pos = full === undefined ? undefined : relPos.get(full)
    if (pos === undefined || full === undefined) continue
    const isMul = mode[full] === MUL
    cons.push({
      pos,
      min: c.min,
      max: c.max,
      base: isMul ? 1 : L.baseOf(full),
      mul: isMul,
    })
  }
  const isCost = new Uint8Array(R)
  for (const c of cons) if (c.max !== undefined) isCost[c.pos] = 1
  const total = (c: Cons, v: number) => (c.mul ? v * c.base : v + c.base)

  // ---- Conjuntos ------------------------------------------------------------
  const nSlots = template.slots.length
  const sets = template.sets ?? []
  const setIdx = new Map(sets.map((s, i) => [s.id, i]))
  const nSets = sets.length

  const setEffect: Float64Array[][] = sets.map((set) => {
    const byPieces: Float64Array[] = []
    for (let p = 0; p <= nSlots; p++) {
      const v = new Float64Array(R)
      for (let k = 0; k < R; k++) v[k] = rNeutral[k]
      for (const tier of set.tiers) {
        if (p < tier.pieces) continue
        for (const [k, val] of Object.entries(tier.effects)) {
          const full = statIndex.get(k)
          const pos = full === undefined ? undefined : relPos.get(full)
          if (pos === undefined || full === undefined) continue
          if (rMode[pos] === MUL) v[pos] *= 1 + val / 100
          else v[pos] += val
        }
      }
      byPieces.push(v)
    }
    return byPieces
  })

  /**
   * Cota superior del bono de conjunto disponible con como mucho p piezas.
   * Con 5 ranuras caben dos conjuntos de 2 piezas a la vez, asi que no basta
   * con tomar el mejor conjunto suelto: se resuelve con una mochila 0/1 por
   * eje. Para los ejes multiplicativos, la mochila trabaja en logaritmos.
   */
  const bestSetByPieces: Float64Array[] = Array.from({ length: nSlots + 1 }, () => {
    const v = new Float64Array(R)
    for (let k = 0; k < R; k++) v[k] = rNeutral[k]
    return v
  })
  for (let k = 0; k < R; k++) {
    if (isCost[k]) continue // los bonos no aumentan un coste; la cota inferior es el neutro
    const dp = new Float64Array(nSlots + 1)
    for (let s = 0; s < nSets; s++) {
      for (let j = nSlots; j >= 1; j--) {
        for (let c = 1; c <= j; c++) {
          const raw = setEffect[s][c][k]
          const val = rMode[k] === MUL ? Math.log(Math.max(raw, 1e-12)) : raw
          if (val > 0 && dp[j - c] + val > dp[j]) dp[j] = dp[j - c] + val
        }
      }
    }
    for (let j = 1; j <= nSlots; j++) if (dp[j - 1] > dp[j]) dp[j] = dp[j - 1]
    for (let j = 0; j <= nSlots; j++) bestSetByPieces[j][k] = rMode[k] === MUL ? Math.exp(dp[j]) : dp[j]
  }

  // ---- Candidatos por ranura ------------------------------------------------
  type Cand = { id: string; set: number; group: number; v: Float64Array }
  const slotIds = template.slots.map((s) => s.id)
  const bySlot: Cand[][] = slotIds.map(() => [])
  const beforeCounts: number[] = slotIds.map(() => 0)
  const groupIdx = new Map<string, number>()
  let requirementFiltered = 0

  for (const it of items) {
    const si = slotIds.indexOf(it.slot)
    if (si < 0) continue
    beforeCounts[si]++

    // Requisitos: si el perfil no los cumple, la pieza no existe para esta busqueda.
    let usable = true
    for (const [k, need] of Object.entries(it.requires ?? {})) {
      const have = profile.base[k] ?? 0
      if (have < need) { usable = false; break }
    }
    if (!usable) { requirementFiltered++; continue }

    const v = new Float64Array(R)
    for (let k = 0; k < R; k++) v[k] = rNeutral[k]
    for (const [k, val] of Object.entries(it.stats)) {
      const full = statIndex.get(k)
      const pos = full === undefined ? undefined : relPos.get(full)
      if (pos === undefined || full === undefined) continue
      if (rMode[pos] === MUL) v[pos] *= 1 + val / 100
      else v[pos] += val
    }
    const s = it.setId != null ? setIdx.get(it.setId) : undefined
    let g = -1
    if (it.exclusiveGroup) {
      if (!groupIdx.has(it.exclusiveGroup)) groupIdx.set(it.exclusiveGroup, groupIdx.size)
      g = groupIdx.get(it.exclusiveGroup)!
    }
    bySlot[si].push({ id: it.id, set: s === undefined ? -1 : s, group: g, v })
  }
  const nGroups = groupIdx.size

  // ---- Capa 1: dominancia ---------------------------------------------------
  let dominated = 0
  for (let s = 0; s < bySlot.length; s++) {
    const groups = new Map<string, Cand[]>()
    for (const c of bySlot[s]) {
      // Solo se comparan piezas intercambiables: mismo conjunto y mismo grupo.
      const key = `${c.set}|${c.group}`
      const g = groups.get(key)
      if (g) g.push(c); else groups.set(key, [c])
    }
    const kept: Cand[] = []
    for (const group of groups.values()) {
      group.sort((a, b) => {
        let sa = 0, sb = 0
        for (let k = 0; k < R; k++) {
          const wa = isCost[k] ? -a.v[k] : a.v[k]
          const wb = isCost[k] ? -b.v[k] : b.v[k]
          sa += wa; sb += wb
        }
        return sb - sa
      })
      const survivors: Cand[] = []
      outer: for (const cand of group) {
        for (const other of survivors) {
          let isDominated = true
          for (let k = 0; k < R; k++) {
            // Para un coste, "peor" es tener MAS.
            const worse = isCost[k] ? cand.v[k] >= other.v[k] : cand.v[k] <= other.v[k]
            if (!worse) { isDominated = false; break }
          }
          if (isDominated) { dominated++; continue outer }
        }
        survivors.push(cand)
      }
      kept.push(...survivors)
    }
    bySlot[s] = kept
  }

  const candidatesPerSlot = slotIds.map((id, i) => ({
    slotId: id, before: beforeCounts[i], after: bySlot[i].length,
  }))

  const emptyStats = (): SolveStats => ({
    totalCombinations: 0, searchSpace: 0, boundFiltered: 0, evaluated: 0, pruned: 0,
    dominated, candidatesPerSlot, elapsedMs: Date.now() - t0, feasible: false,
    provenOptimal: true, mode: exact ? 'exacto' : 'heuristico',
    relevantStats: relIdx.map((i) => statIds[i]),
    mergedDimensions: mergedCount, requirementFiltered,
  })
  if (bySlot.some((c) => c.length === 0)) return { builds: [], stats: emptyStats() }

  let totalCombinations = 1
  for (const c of bySlot) totalCombinations *= c.length

  // ---- Cotas y orden de exploracion ----------------------------------------
  const n = bySlot.length
  const scratch = new Float64Array(R)

  const extremes = (cands: Cand[], best: boolean): Float64Array => {
    const m = new Float64Array(R)
    for (let k = 0; k < R; k++) m[k] = rNeutral[k]
    let first = true
    for (const c of cands) {
      for (let k = 0; k < R; k++) {
        const better = isCost[k] === (best ? 1 : 0) ? c.v[k] < m[k] : c.v[k] > m[k]
        if (first || better) m[k] = c.v[k]
      }
      first = false
    }
    return m
  }

  let slots: Cand[][] = []
  let order: number[] = []
  let remBest: Float64Array[] = []

  const combine = (out: Float64Array, a: Float64Array, b: Float64Array) => {
    for (let k = 0; k < R; k++) out[k] = rMode[k] === MUL ? a[k] * b[k] : a[k] + b[k]
  }

  const slotBest = bySlot.map((c) => extremes(c, true))
  function optimisticWith(slot: number, cand: Cand): number {
    for (let k = 0; k < R; k++) scratch[k] = cand.v[k]
    for (let j = 0; j < n; j++) {
      if (j === slot) continue
      for (let k = 0; k < R; k++) scratch[k] = rMode[k] === MUL ? scratch[k] * slotBest[j][k] : scratch[k] + slotBest[j][k]
    }
    for (let k = 0; k < R; k++) {
      const sb = bestSetByPieces[nSlots][k]
      scratch[k] = rMode[k] === MUL ? scratch[k] * sb : scratch[k] + sb
    }
    return evalCompact(scratch)
  }

  const spread = bySlot.map((cands, s) => {
    let lo = Infinity, hi = -Infinity
    for (const c of cands) {
      const key = optimisticWith(s, c)
      if (key < lo) lo = key
      if (key > hi) hi = key
    }
    return hi - lo
  })
  order = Array.from({ length: n }, (_, i) => i).sort((a, b) => spread[b] - spread[a])
  slots = order.map((s) => {
    const cands = bySlot[s].slice()
    const keys = new Map<Cand, number>()
    for (const c of cands) keys.set(c, optimisticWith(s, c))
    cands.sort((a, b) => (keys.get(b) ?? 0) - (keys.get(a) ?? 0))
    return cands
  })

  /** remBest[d] = mejor caso acumulado de las ranuras d..n-1 (segun coste o no). */
  function recomputeRem(): void {
    remBest = Array.from({ length: n + 1 }, () => {
      const v = new Float64Array(R)
      for (let k = 0; k < R; k++) v[k] = rNeutral[k]
      return v
    })
    for (let d = n - 1; d >= 0; d--) {
      const m = extremes(slots[d], true)
      combine(remBest[d], remBest[d + 1], m)
    }
  }
  /** remLow[d] = minimo alcanzable de las ranuras d..n-1, para las cotas de maximo. */
  let remLow: Float64Array[] = []
  function recomputeRemLow(): void {
    remLow = Array.from({ length: n + 1 }, () => {
      const v = new Float64Array(R)
      for (let k = 0; k < R; k++) v[k] = rNeutral[k]
      return v
    })
    for (let d = n - 1; d >= 0; d--) {
      const m = new Float64Array(R)
      for (let k = 0; k < R; k++) m[k] = rNeutral[k]
      let first = true
      for (const c of slots[d]) {
        for (let k = 0; k < R; k++) if (first || c.v[k] < m[k]) m[k] = c.v[k]
        first = false
      }
      combine(remLow[d], remLow[d + 1], m)
    }
  }
  recomputeRem(); recomputeRemLow()

  let slotBestOrdered: Float64Array[] = []
  const recomputeSlotBest = () => { slotBestOrdered = slots.map((c) => extremes(c, true)) }
  recomputeSlotBest()

  function optimisticInOrder(d: number, cand: Cand): number {
    for (let k = 0; k < R; k++) {
      let acc = cand.v[k]
      if (rMode[k] === MUL) {
        acc *= remBest[0][k] / (slotBestOrdered[d][k] || 1)
        acc *= bestSetByPieces[nSlots][k]
      } else {
        acc += remBest[0][k] - slotBestOrdered[d][k]
        acc += bestSetByPieces[nSlots][k]
      }
      scratch[k] = acc
    }
    return evalCompact(scratch)
  }

  // ---- Estado de busqueda ---------------------------------------------------
  const acc = new Float64Array(R)
  for (let k = 0; k < R; k++) acc[k] = rNeutral[k]
  const setCounts = new Int32Array(nSets)
  const groupCounts = new Int32Array(Math.max(nGroups, 1))
  const activeSets: number[] = []
  const chosen: Cand[] = new Array(n)
  const optimistic = new Float64Array(R)
  const finalTotals = new Float64Array(R)

  let evaluated = 0
  let pruned = 0
  let cancelled = false
  let timedOut = false
  const progressEvery = hooks.progressEvery ?? 40_000
  let sinceProgress = 0

  type Found = { score: number; ids: string[] }
  const best: Found[] = []
  const cutoff = () => (best.length >= topN ? best[best.length - 1].score : -Infinity)

  function record(score: number, ids: string[]): void {
    if (best.length >= topN && score <= best[best.length - 1].score) return
    for (const b of best) if (b.score === score) return
    let at = best.length
    while (at > 0 && best[at - 1].score < score) at--
    best.splice(at, 0, { score, ids: ids.slice() })
    if (best.length > topN) best.pop()
  }

  // ---- Arranque en caliente: greedy + ascenso de colina ---------------------
  const warmCombo = new Float64Array(R)
  const warmSets = new Int32Array(nSets)
  const warmGroups = new Int32Array(Math.max(nGroups, 1))

  function scoreCombo(picks: Cand[]): number {
    for (let k = 0; k < R; k++) warmCombo[k] = rNeutral[k]
    warmSets.fill(0); warmGroups.fill(0)
    for (const c of picks) {
      for (let k = 0; k < R; k++) warmCombo[k] = rMode[k] === MUL ? warmCombo[k] * c.v[k] : warmCombo[k] + c.v[k]
      if (c.set >= 0) warmSets[c.set]++
      if (c.group >= 0) { warmGroups[c.group]++; if (warmGroups[c.group] > 1) return -Infinity }
    }
    for (let s = 0; s < nSets; s++) {
      if (warmSets[s] < 2) continue
      const e = setEffect[s][Math.min(warmSets[s], nSlots)]
      for (let k = 0; k < R; k++) warmCombo[k] = rMode[k] === MUL ? warmCombo[k] * e[k] : warmCombo[k] + e[k]
    }
    for (const c of cons) {
      const t = total(c, warmCombo[c.pos])
      if (c.min !== undefined && t < c.min - 1e-9) return -Infinity
      if (c.max !== undefined && t > c.max + 1e-9) return -Infinity
    }
    return evalCompact(warmCombo)
  }

  function warmStart(): void {
    const picks: Cand[] = slots.map((cands) => cands[0])
    let currentScore = scoreCombo(picks)
    if (currentScore > -Infinity) record(currentScore, picks.map((p) => p.id))
    for (let pass = 0; pass < 8; pass++) {
      let improved = false
      for (let d = 0; d < n; d++) {
        const original = picks[d]
        let bestCand = original
        let bestScore = currentScore
        const limit = Math.min(slots[d].length, 220)
        for (let i = 0; i < limit; i++) {
          const cand = slots[d][i]
          if (cand === original) continue
          picks[d] = cand
          const sc = scoreCombo(picks)
          if (sc > bestScore) { bestScore = sc; bestCand = cand }
          if (sc > -Infinity) record(sc, picks.map((p) => p.id))
        }
        picks[d] = bestCand
        if (bestScore > currentScore) { currentScore = bestScore; improved = true }
      }
      if (!improved) break
    }
  }
  warmStart()
  if (!exact) {
    // Sin poda por cota, la calidad depende de la busqueda local. Se reinicia
    // desde varios puntos de partida distintos para no quedarse en un optimo local.
    let seed = 987654321
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    for (let restart = 0; restart < 24 && Date.now() < deadline; restart++) {
      const picks = slots.map((cands) => cands[Math.floor(rnd() * cands.length)])
      let cur = scoreCombo(picks)
      for (let pass = 0; pass < 6; pass++) {
        let improved = false
        for (let d = 0; d < n; d++) {
          const original = picks[d]
          let bestCand = original, bestScore = cur
          const limit = Math.min(slots[d].length, 160)
          for (let i = 0; i < limit; i++) {
            const cand = slots[d][i]
            if (cand === original) continue
            picks[d] = cand
            const sc = scoreCombo(picks)
            if (sc > bestScore) { bestScore = sc; bestCand = cand }
            if (sc > -Infinity) record(sc, picks.map((p) => p.id))
          }
          picks[d] = bestCand
          if (bestScore > cur) { cur = bestScore; improved = true }
        }
        if (!improved) break
      }
    }
  }

  // ---- Filtro por cota ------------------------------------------------------
  let boundFiltered = 0
  for (let round = 0; exact && round < 3; round++) {
    const threshold = cutoff()
    if (!Number.isFinite(threshold)) break
    let removed = 0
    for (let d = 0; d < n; d++) {
      const keep = slots[d].filter((c) => optimisticInOrder(d, c) > threshold)
      if (keep.length && keep.length < slots[d].length) {
        removed += slots[d].length - keep.length
        slots[d] = keep
      }
    }
    boundFiltered += removed
    if (!removed) break
    recomputeRem(); recomputeRemLow(); recomputeSlotBest()
  }

  let searchSpace = 1
  for (const c of slots) searchSpace *= c.length

  // ---- Busqueda -------------------------------------------------------------
  function dfs(depth: number): void {
    if (cancelled || timedOut) return

    if (depth === n) {
      for (let k = 0; k < R; k++) finalTotals[k] = acc[k]
      for (const s of activeSets) {
        const e = setEffect[s][Math.min(setCounts[s], nSlots)]
        for (let k = 0; k < R; k++) finalTotals[k] = rMode[k] === MUL ? finalTotals[k] * e[k] : finalTotals[k] + e[k]
      }
      evaluated++
      for (const c of cons) {
        const t = total(c, finalTotals[c.pos])
        if (c.min !== undefined && t < c.min - 1e-9) return
        if (c.max !== undefined && t > c.max + 1e-9) return
      }
      const score = evalCompact(finalTotals)
      if (best.length >= topN && score <= best[best.length - 1].score) return
      record(score, chosen.map((c) => c.id))
      return
    }

    if (++sinceProgress >= progressEvery) {
      sinceProgress = 0
      const now = Date.now()
      if (now > deadline) { timedOut = true; return }
      if (hooks.shouldCancel?.()) { cancelled = true; return }
      hooks.onProgress?.({
        evaluated, pruned, elapsedMs: now - t0,
        bestScore: best.length ? best[0].score : 0,
      })
    }

    // Vector utopico del subarbol.
    const remaining = n - depth
    const bestNew = bestSetByPieces[Math.min(remaining, nSlots)]
    for (let k = 0; k < R; k++) {
      optimistic[k] = rMode[k] === MUL
        ? acc[k] * remBest[depth][k] * bestNew[k]
        : acc[k] + remBest[depth][k] + bestNew[k]
    }
    for (const s of activeSets) {
      const e = setEffect[s][Math.min(setCounts[s] + remaining, nSlots)]
      for (let k = 0; k < R; k++) {
        const cand = rMode[k] === MUL ? acc[k] * remBest[depth][k] * e[k] : acc[k] + remBest[depth][k] + e[k]
        if (cand > optimistic[k]) optimistic[k] = cand
      }
    }

    for (const c of cons) {
      if (c.min !== undefined && total(c, optimistic[c.pos]) < c.min - 1e-9) { pruned++; return }
      if (c.max !== undefined) {
        // Para un maximo la cota util es el MINIMO alcanzable: si ni siquiera
        // eligiendo lo mas barato se cabe en el presupuesto, no hay solucion.
        const low = rMode[c.pos] === MUL ? acc[c.pos] * remLow[depth][c.pos] : acc[c.pos] + remLow[depth][c.pos]
        if (total(c, low) > c.max + 1e-9) { pruned++; return }
      }
    }

    if (exact && evalCompact(optimistic) <= cutoff()) { pruned++; return }

    for (const cand of slots[depth]) {
      if (cand.group >= 0 && groupCounts[cand.group] > 0) continue
      chosen[depth] = cand
      for (let k = 0; k < R; k++) acc[k] = rMode[k] === MUL ? acc[k] * cand.v[k] : acc[k] + cand.v[k]
      let pushed = false
      if (cand.set >= 0) {
        if (setCounts[cand.set] === 0) { activeSets.push(cand.set); pushed = true }
        setCounts[cand.set]++
      }
      if (cand.group >= 0) groupCounts[cand.group]++
      dfs(depth + 1)
      if (cand.group >= 0) groupCounts[cand.group]--
      if (cand.set >= 0) {
        setCounts[cand.set]--
        if (pushed) activeSets.pop()
      }
      for (let k = 0; k < R; k++) acc[k] = rMode[k] === MUL ? acc[k] / cand.v[k] : acc[k] - cand.v[k]
      if (cancelled || timedOut) return
    }
  }

  if (exact) dfs(0)

  // ---- Resultado ------------------------------------------------------------
  const idToItem = new Map(items.map((i) => [i.id, i]))
  const builds: BuildResult[] = best.map((b) => {
    const totals = new Float64Array(S)
    for (let i = 0; i < S; i++) totals[i] = neutral[i]
    const counts = new Map<string, number>()
    for (const id of b.ids) {
      const it = idToItem.get(id)
      if (!it) continue
      for (const [k, v] of Object.entries(it.stats)) {
        const i = statIndex.get(k)
        if (i === undefined) continue
        if (mode[i] === MUL) totals[i] *= 1 + v / 100
        else totals[i] += v
      }
      if (it.setId) counts.set(it.setId, (counts.get(it.setId) ?? 0) + 1)
    }
    const active: BuildResult['activeSets'] = []
    for (const [setId, pieces] of counts) {
      const def = sets.find((s) => s.id === setId)
      if (!def) continue
      const tiers: string[] = []
      for (const tier of def.tiers) {
        if (pieces < tier.pieces) continue
        tiers.push(tier.label)
        for (const [k, v] of Object.entries(tier.effects)) {
          const i = statIndex.get(k)
          if (i === undefined) continue
          if (mode[i] === MUL) totals[i] *= 1 + v / 100
          else totals[i] += v
        }
      }
      if (tiers.length) active.push({ setId, name: def.name, pieces, tiers })
    }
    active.sort((a, b2) => b2.pieces - a.pieces)

    const finalStats: Record<string, number> = {}
    statIds.forEach((id, i) => {
      finalStats[id] = mode[i] === MUL ? totals[i] * L.baseOf(i) : totals[i] + L.baseOf(i)
    })

    const ordered = new Array<string>(n)
    b.ids.forEach((id, k) => { ordered[order[k]] = id })
    return { score: b.score, itemIds: ordered, finalStats, activeSets: active }
  })

  void objective
  return {
    builds,
    stats: {
      totalCombinations, searchSpace, boundFiltered, evaluated, pruned, dominated,
      candidatesPerSlot, elapsedMs: Date.now() - t0, feasible: builds.length > 0,
      provenOptimal: exact && !timedOut && !cancelled,
      mode: exact ? 'exacto' : 'heuristico',
      relevantStats: relIdx.map((i) => statIds[i]),
      mergedDimensions: mergedCount, requirementFiltered,
    },
  }
}

/**
 * Fuerza bruta exhaustiva. Solo para verificar en pruebas que el branch and
 * bound devuelve exactamente el mismo optimo. Inutilizable a escala real.
 */
export function solveBruteForce(req: SolveRequest): { score: number; itemIds: string[] } | null {
  const { template, items, constraints, profileId } = req
  const L = buildLayout(req)
  const { S, statIndex, mode, neutral, evaluateFull } = L
  const profile = template.baseProfiles.find((p) => p.id === profileId)!

  const usable = items.filter((it) =>
    Object.entries(it.requires ?? {}).every(([k, need]) => (profile.base[k] ?? 0) >= need))

  const slotIds = template.slots.map((s) => s.id)
  const bySlot: Item[][] = slotIds.map((sid) => usable.filter((i) => i.slot === sid))
  if (bySlot.some((b) => b.length === 0)) return null

  const allCons = [...(template.budgets ?? []).map((b) => ({ statId: b.statId, min: undefined, max: b.max })), ...constraints]
  let bestScore = -Infinity
  let bestIds: string[] | null = null
  const pick: Item[] = new Array(slotIds.length)
  const totals = new Float64Array(S)

  const rec = (d: number): void => {
    if (d === slotIds.length) {
      const groups = new Set<string>()
      for (const it of pick) {
        if (!it.exclusiveGroup) continue
        if (groups.has(it.exclusiveGroup)) return
        groups.add(it.exclusiveGroup)
      }
      for (let i = 0; i < S; i++) totals[i] = neutral[i]
      const counts = new Map<string, number>()
      for (const it of pick) {
        for (const [k, v] of Object.entries(it.stats)) {
          const i = statIndex.get(k)
          if (i === undefined) continue
          if (mode[i] === MUL) totals[i] *= 1 + v / 100; else totals[i] += v
        }
        if (it.setId) counts.set(it.setId, (counts.get(it.setId) ?? 0) + 1)
      }
      for (const [sid, cnt] of counts) {
        const def = (template.sets ?? []).find((s) => s.id === sid)
        if (!def) continue
        for (const tier of def.tiers) {
          if (cnt < tier.pieces) continue
          for (const [k, v] of Object.entries(tier.effects)) {
            const i = statIndex.get(k)
            if (i === undefined) continue
            if (mode[i] === MUL) totals[i] *= 1 + v / 100; else totals[i] += v
          }
        }
      }
      for (const c of allCons) {
        const i = statIndex.get(c.statId)
        if (i === undefined) continue
        const t = mode[i] === MUL ? totals[i] * L.baseOf(i) : totals[i] + L.baseOf(i)
        if (c.min !== undefined && t < c.min - 1e-9) return
        if (c.max !== undefined && t > c.max + 1e-9) return
      }
      const score = evaluateFull(totals)
      if (score > bestScore) { bestScore = score; bestIds = pick.map((p) => p.id) }
      return
    }
    for (const it of bySlot[d]) { pick[d] = it; rec(d + 1) }
  }
  rec(0)
  return bestIds ? { score: bestScore, itemIds: bestIds } : null
}
