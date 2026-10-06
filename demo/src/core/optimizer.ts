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
 *  Expresividad — las formulas vienen de la plantilla (con condicionales,
 *  comparaciones, log/exp...). Cada estadistica declara ademas COMO se combinan
 *  los aportes de varias piezas: sumandose (lo habitual) o multiplicandose como
 *  factores. Sin ese segundo modo, los modificadores "more" de Path of Exile
 *  darian resultados equivocados.
 *
 *  Restricciones — minimos (llegar a X), maximos (no pasarse de X, que es como
 *  se modela un presupuesto: carga de equipo, capacidad de gemas, peso),
 *  ventanas (las dos cosas), requisitos por pieza (necesitas 40 de Fuerza,
 *  contra la base o contra la build final) y grupos de exclusion mutua.
 *
 *  Forma del problema — una pieza por ranura, con ranuras opcionales (pueden
 *  quedar vacias) y piezas que caben en varias ranuras (anillos). Elegir un
 *  subconjunto libre o un subgrafo conexo son problemas distintos y necesitan
 *  sus propios solvers detras del mismo contrato de plantilla.
 *
 * LA ESTRATEGIA, EN CUATRO CAPAS
 *
 *  0. Analisis simbolico (analysis.ts) — el motor DEMUESTRA, recorriendo la
 *     formula, de que estadisticas depende el objetivo, en que direccion se
 *     mueve con cada una y cuales entran juntas como c·(a + b) (y las fusiona).
 *     Nada de muestreo: ante la duda, la respuesta conservadora.
 *
 *  1. Filtro de dominancia — dentro de una ranura, si una pieza es peor o igual
 *     en todo lo que importa que al menos N otras intercambiables (N = top
 *     pedido), se elimina. Cada eje tiene su sentido: mas es mejor para el
 *     objetivo y los minimos, menos es mejor para los presupuestos, y si un eje
 *     tira en los dos sentidos solo cuentan las piezas identicas.
 *
 *  2. Branch and bound con cota superior — en cada nodo se acota el mejor
 *     resultado posible del subarbol. Si cada eje tiene direccion demostrada
 *     basta evaluar la esquina correcta de la caja; si alguno "depende", se
 *     evalua la formula sobre INTERVALOS.
 *     Las dos cotas son exactas: si la busqueda termina, el optimo esta
 *     demostrado.
 *
 *  3. Poda por restricciones — minimos, maximos, requisitos y exclusiones cortan
 *     ramas antes de calcularlas. Restringir ACELERA la busqueda.
 */

import { analyzeDirections, canMergeGroup, DOWN, UNKNOWN, UP } from './analysis'
import {
  compileFormula, compileFormulaInterval, formulaVariables,
  type CompiledFormula, type IntervalFormula,
} from './formula'
import { checkSelection, skillContribution, skillVariables } from './skills'
import type {
  BuildResult, Item, SkillSelection, SolveRequest, SolveResponse, SolveStats,
} from './types'

/** Modo de acumulacion de una estadistica. */
const SUM = 0
const MUL = 1

export interface SolveHooks {
  /**
   * Se llama cada `progressEvery` nodos. Lleva las mejores builds encontradas
   * HASTA AHORA, ya materializadas.
   *
   * No es un lujo de presentacion: es lo que hace que detener una busqueda no
   * cueste nada. Un worker ocupado no puede leer mensajes, asi que cancelar
   * significa matarlo, y matarlo significa que el `return` de solve() nunca
   * llega. Si el progreso no fuera cargando el resultado parcial, parar una
   * busqueda de cuatro horas devolveria exactamente nada.
   */
  onProgress?: (p: {
    evaluated: number; pruned: number; elapsedMs: number; bestScore: number
    builds: BuildResult[]
  }) => void
  /**
   * Se llama UNA vez, cuando ya se conoce la forma del problema y justo antes
   * de empezar a buscar.
   *
   * Todo lo que lleva —el espacio de busqueda, los ejes relevantes, lo que se
   * descarto por dominancia— se calcula antes del primer nodo y no cambia
   * despues. Mandarlo aparte es lo que permite que una busqueda detenida a mano
   * ensene esas cifras de verdad, en vez de ceros disfrazados de medicion.
   */
  onSetup?: (s: Pick<SolveStats,
    'totalCombinations' | 'searchSpace' | 'boundFiltered' | 'dominated' |
    'candidatesPerSlot' | 'relevantStats' | 'mergedDimensions' | 'requirementFiltered' | 'mode' |
    'bound' | 'monotonicWarning'
  >) => void
  shouldCancel?: () => boolean
  progressEvery?: number
  /**
   * Tiempo maximo de busqueda en ms. `Infinity` = sin limite, que es el modo
   * por defecto de la interfaz: quien decide cuando parar es el usuario.
   * Los usos automaticos (autopruebas de plantillas) si ponen un limite corto,
   * porque corren en el hilo principal y no pueden congelar la pantalla.
   */
  deadlineMs?: number
}

/**
 * Ordena los derivados para que cada uno se evalue despues de sus dependencias.
 * Lanza si detecta un ciclo: sin esto una referencia hacia adelante leeria el
 * valor de la evaluacion ANTERIOR y devolveria un numero incorrecto en silencio.
 *
 * Una formula que no se puede analizar se trata como sin dependencias: el error
 * de sintaxis lo informa quien la compile, con un mensaje mejor que "ciclo".
 */
export function topoSortDerived<T extends { id: string; formula: string }>(list: T[]): T[] {
  const byId = new Map(list.map((d) => [d.id, d]))
  const deps = new Map<string, string[]>()
  for (const d of list) {
    let vars: string[] = []
    try { vars = formulaVariables(d.formula) } catch { /* lo informa el compilador */ }
    deps.set(d.id, vars.filter((v) => v !== d.id && byId.has(v)))
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

/**
 * Busca numericamente un contraejemplo de monotonia: un punto de la caja
 * [lo, hi] donde subir una coordenada BAJA el resultado.
 *
 * Es la propiedad de la que depende la cota rapida (el vector utopico). La
 * usan el optimizador —sobre los rangos reales del inventario— y el validador
 * de plantillas, asi que las dos opiniones no pueden divergir.
 *
 * Devuelve el indice de la coordenada culpable, 'nan' si la funcion produce
 * valores no finitos dentro de la caja, o null si no encontro nada.
 */
export function findMonotonicViolation(
  evaluate: (x: Float64Array) => number,
  lo: Float64Array,
  hi: Float64Array,
  samples = 200,
  seed = 1234567,
): number | 'nan' | null {
  const n = lo.length
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const x = new Float64Array(n)
  for (let s = 0; s < samples; s++) {
    for (let i = 0; i < n; i++) x[i] = lo[i] + rnd() * (hi[i] - lo[i])
    const base = evaluate(x)
    if (!Number.isFinite(base)) return 'nan'
    for (let i = 0; i < n; i++) {
      const width = hi[i] - lo[i]
      if (!(width > 0)) continue
      const old = x[i]
      x[i] = old + width * (0.005 + 0.25 * rnd())
      const up = evaluate(x)
      x[i] = old
      if (!Number.isFinite(up)) return 'nan'
      if (up < base - 1e-9 * Math.max(1, Math.abs(base))) return i
    }
  }
  return null
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
  /** Maximo del objetivo cuando cada estadistica puede estar en [lo, hi]. */
  evaluateUpper: (lo: Float64Array, hi: Float64Array) => number
  fillAllDerived: () => void
  baseOf: (i: number) => number
  varIndex: Map<string, number>
  derivedIds: string[]
  /** Derivados en orden topologico. */
  derived: { id: string; formula: string }[]
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

  // Rango de cada habilidad (`skill_<id>`): constantes durante la busqueda.
  // Se registran TODAS las de la plantilla, elegidas o no, para que una formula
  // que menciona una habilidad sin elegir compile y valga 0.
  const skillVars = skillVariables(template, req.skills)
  const skillBase = 2 * S + D + extraKeys.length
  skillVars.forEach(([name], j) => varIndex.set(name, skillBase + j))

  const vars = new Float64Array(skillBase + skillVars.length)
  for (let i = 0; i < S; i++) vars[S + i] = profile.base[statIds[i]] ?? neutral[i]
  extraKeys.forEach((k, i) => { vars[2 * S + D + i] = profile.base[k] ?? 0 })
  skillVars.forEach(([, rank], j) => { vars[skillBase + j] = rank })

  const derivedFns: CompiledFormula[] = derived.map((d) => compileFormula(d.formula, varIndex))
  const objectiveFn = compileFormula(objective.formula, varIndex)

  // Solo se evaluan los derivados que el objetivo alcanza: una plantilla puede
  // declarar diez y un objetivo usar uno, y esto corre en cada hoja del arbol.
  const derivedIdx = new Map(derived.map((d, i) => [d.id, i]))
  const reached = new Set<number>()
  const pending = [...formulaVariables(objective.formula)]
  while (pending.length) {
    const i = derivedIdx.get(pending.pop()!)
    if (i === undefined || reached.has(i)) continue
    reached.add(i)
    pending.push(...formulaVariables(derived[i].formula))
  }
  const active = Int32Array.from([...reached].sort((a, b) => a - b))

  const evaluateFull = (totals: Float64Array): number => {
    for (let i = 0; i < S; i++) vars[i] = totals[i]
    for (let q = 0; q < active.length; q++) { const i = active[q]; vars[2 * S + i] = derivedFns[i](vars) }
    return objectiveFn(vars)
  }

  // Version por intervalos: mismas variables, dos arreglos (extremo inferior y
  // superior). La base es un punto, asi que va igual en los dos.
  const derivedI: IntervalFormula[] = derived.map((d) => compileFormulaInterval(d.formula, varIndex))
  const objectiveI = compileFormulaInterval(objective.formula, varIndex)
  const varsLo = vars.slice()
  const varsHi = vars.slice()
  // Que derivados pueden valer NaN en la caja: los que dependen de ellos lo
  // tienen que saber (una comparacion con NaN da 0, no NaN).
  const varNaN = new Uint8Array(vars.length)
  const box = { hi: 0, nan: false, varNaN }
  const evaluateUpper = (lo: Float64Array, hi: Float64Array): number => {
    for (let i = 0; i < S; i++) { varsLo[i] = lo[i]; varsHi[i] = hi[i] }
    for (let q = 0; q < active.length; q++) {
      const i = active[q]
      varsLo[2 * S + i] = derivedI[i](varsLo, varsHi, box)
      varsHi[2 * S + i] = box.hi
      varNaN[2 * S + i] = box.nan ? 1 : 0
    }
    objectiveI(varsLo, varsHi, box)
    return box.hi
  }

  /** Evalua TODOS los derivados con los totales actuales (para explicar una build). */
  const fillAllDerived = () => { for (let i = 0; i < D; i++) vars[2 * S + i] = derivedFns[i](vars) }

  return {
    statIds, S, statIndex, mode, neutral, vars, derivedCount: D, evaluateFull, evaluateUpper, fillAllDerived,
    baseOf: (i: number) => vars[S + i],
    varIndex, derivedIds: derived.map((d) => d.id), derived,
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
  skills?: SkillSelection,
): Map<string, number> {
  const L = buildLayout({ template, items: [], profileId, objectiveId, constraints: [], topN: 1, skills })
  const totals = new Float64Array(L.S)
  for (let i = 0; i < L.S; i++) {
    const fin = finalStats[L.statIds[i]]
    const base = L.baseOf(i)
    if (fin === undefined) { totals[i] = L.neutral[i]; continue }
    totals[i] = L.mode[i] === MUL ? (base !== 0 ? fin / base : fin) : fin - base
  }
  const score = L.evaluateFull(totals)
  L.fillAllDerived()
  const out = new Map<string, number>()
  for (const [name, i] of L.varIndex) out.set(name, L.vars[i])
  out.set(objectiveId, score)
  return out
}

/** Ranuras donde cabe una pieza: la principal mas las adicionales, sin repetir. */
function allowedSlotsOf(it: Item, slotPos: Map<string, number>): number[] {
  const out: number[] = []
  for (const id of [it.slot, ...(it.slots ?? [])]) {
    const p = slotPos.get(id)
    if (p !== undefined && !out.includes(p)) out.push(p)
  }
  return out
}

/** Clave de una build que no depende de en que ranura quedo cada pieza. */
const buildKey = (ids: string[]) => ids.filter((x) => x !== '').sort().join('\u0001')

/** Intervalo del producto de [a, b] por [c, d]. */
function mulRange(a: number, b: number, c: number, d: number): [number, number] {
  const p = [a * c, a * d, b * c, b * d]
  return [Math.min(...p), Math.max(...p)]
}

/** Ranura y pieza sinteticas que llevan los efectos de las habilidades. */
export const SKILL_SLOT = '__skills'
const SKILL_ITEM = '__skills'

/**
 * Prepara una peticion con habilidades: los efectos de los nodos elegidos se
 * convierten en UNA pieza fija, en una ranura extra que solo la admite a ella.
 *
 * Es deliberado no tocar el branch and bound: una ranura con un unico candidato
 * entra en todas las cotas, la dominancia y los requisitos contra la build final
 * exactamente igual que cualquier pieza, asi que las garantias del motor
 * (optimo demostrado, contraste con fuerza bruta) siguen valiendo sin cambios.
 * Luego `strip` quita esa ranura del resultado.
 */
function withSkills(req: SolveRequest): { req: SolveRequest; strip: <T extends { itemIds: string[] }>(b: T) => T; active: boolean } {
  const none = { req, strip: <T,>(b: T) => b, active: false }
  if (!req.skills || Object.keys(req.skills).length === 0) return none
  const problemas = checkSelection(req.template, req.skills)
  if (problemas.length) throw new Error(`Seleccion de habilidades invalida: ${problemas[0].message}`)
  const stats = skillContribution(req.template, req.skills)
  if (Object.keys(stats).length === 0) return none
  const template = { ...req.template, slots: [...req.template.slots, { id: SKILL_SLOT, name: 'Habilidades' }] }
  const items: Item[] = [...req.items, { id: SKILL_ITEM, slot: SKILL_SLOT, setId: null, name: 'Habilidades', stats }]
  const k = req.template.slots.length
  return {
    req: { ...req, template, items },
    strip: (b) => ({ ...b, itemIds: b.itemIds.filter((_, i) => i !== k) }),
    active: true,
  }
}

export function solve(req: SolveRequest, hooks: SolveHooks = {}): SolveResponse {
  const w = withSkills(req)
  if (!w.active) return solveCore(w.req, hooks)
  const sinRanura = <T extends { slotId: string }>(l: T[]) => l.filter((c) => c.slotId !== SKILL_SLOT)
  const r = solveCore(w.req, {
    ...hooks,
    onProgress: hooks.onProgress && ((p) => hooks.onProgress!({ ...p, builds: p.builds.map(w.strip) })),
    onSetup: hooks.onSetup && ((s) => hooks.onSetup!({ ...s, candidatesPerSlot: sinRanura(s.candidatesPerSlot) })),
  })
  return {
    builds: r.builds.map(w.strip),
    stats: { ...r.stats, candidatesPerSlot: sinRanura(r.stats.candidatesPerSlot) },
  }
}

function solveCore(req: SolveRequest, hooks: SolveHooks = {}): SolveResponse {
  const t0 = Date.now()
  // Sin limite salvo que quien llama pida uno. `t0 + Infinity` es Infinity, y
  // `now > Infinity` nunca es cierto, asi que la comprobacion del bucle sigue
  // funcionando sin un solo caso especial.
  const deadline = t0 + (hooks.deadlineMs ?? Infinity)
  const { template, items, objectiveId, constraints, profileId } = req
  const topN = Math.max(1, Math.floor(req.topN || 1))

  const L = buildLayout(req)
  const { S, statIds, statIndex, mode, neutral, evaluateFull } = L
  const objective = template.objectives.find((o) => o.id === objectiveId)!
  const profile = template.baseProfiles.find((p) => p.id === profileId)!
  const finalReqs = template.requirementsFrom === 'final'

  /** Convierte el aporte crudo de una pieza a la representacion del modo. */
  const asContribution = (i: number, raw: number) => (mode[i] === MUL ? 1 + raw / 100 : raw)

  // ---- Ranuras y requisitos -------------------------------------------------
  const slotIds = template.slots.map((s) => s.id)
  const slotPos = new Map(slotIds.map((id, i) => [id, i]))
  const nSlots = slotIds.length
  const optional = template.slots.map((s) => s.optional === true)
  const beforeCounts: number[] = slotIds.map(() => 0)
  const sets = template.sets ?? []

  /** Requisitos que se miran contra la build final (y no contra la base). */
  const isFinalReq = (k: string) => finalReqs && statIndex.has(k)

  let requirementFiltered = 0
  const usable: { it: Item; allowed: number[] }[] = []
  for (const it of items) {
    const allowed = allowedSlotsOf(it, slotPos)
    if (allowed.length === 0) continue
    for (const s of allowed) beforeCounts[s]++
    let ok = true
    for (const [k, need] of Object.entries(it.requires ?? {})) {
      if (isFinalReq(k)) continue
      if ((profile.base[k] ?? 0) < need) { ok = false; break }
    }
    if (!ok) { requirementFiltered++; continue }
    usable.push({ it, allowed })
  }

  /** Aporte de una pieza a la estadistica i, ya en la representacion del modo. */
  const contributionOf = (it: Item, i: number) => {
    const raw = it.stats[statIds[i]]
    return raw === undefined ? neutral[i] : asContribution(i, raw)
  }
  /** Efecto acumulado de un conjunto con p piezas sobre la estadistica i. */
  const setEffectFull = (setI: number, p: number, i: number) => {
    let v = neutral[i]
    for (const tier of sets[setI].tiers) {
      if (p < tier.pieces) continue
      const raw = tier.effects[statIds[i]]
      if (raw === undefined) continue
      v = mode[i] === MUL ? v * (1 + raw / 100) : v + raw
    }
    return v
  }

  // ---- Rangos alcanzables de cada estadistica ------------------------------
  // Una caja que contiene seguro los totales de CUALQUIER build. Sirve para
  // muestrear (relevancia, monotonia), para acotar los requisitos contra la
  // build final y para recortar las cotas del arbol.
  const rangeLo = new Float64Array(S)
  const rangeHi = new Float64Array(S)
  for (let i = 0; i < S; i++) { rangeLo[i] = neutral[i]; rangeHi[i] = neutral[i] }
  const accumulateRange = (i: number, lo: number, hi: number) => {
    if (mode[i] === MUL) [rangeLo[i], rangeHi[i]] = mulRange(rangeLo[i], rangeHi[i], lo, hi)
    else { rangeLo[i] += lo; rangeHi[i] += hi }
  }
  for (let s = 0; s < nSlots; s++) {
    const inSlot = usable.filter((u) => u.allowed.includes(s))
    if (inSlot.length === 0) continue
    for (let i = 0; i < S; i++) {
      let lo = optional[s] ? neutral[i] : Infinity
      let hi = optional[s] ? neutral[i] : -Infinity
      for (const u of inSlot) {
        const v = contributionOf(u.it, i)
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
      accumulateRange(i, lo, hi)
    }
  }
  for (let st = 0; st < sets.length; st++) {
    for (let i = 0; i < S; i++) {
      let lo = neutral[i], hi = neutral[i]
      for (let p = 1; p <= nSlots; p++) {
        const v = setEffectFull(st, p, i)
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
      accumulateRange(i, lo, hi)
    }
  }

  // Un factor multiplicativo cero o negativo invierte o anula productos, y las
  // cotas de los ejes que multiplican suponen factores positivos. Es un caso
  // rarisimo (un "-100% more"), asi que se rechaza con un mensaje claro en vez
  // de calcular algo que no se puede garantizar.
  for (let i = 0; i < S; i++) {
    if (mode[i] !== MUL) continue
    const bad = usable.some((u) => contributionOf(u.it, i) <= 0) ||
      sets.some((_, s) => Array.from({ length: nSlots }, (_, p) => setEffectFull(s, p + 1, i)).some((v) => v <= 0))
    if (bad) {
      throw new Error(`La estadistica "${statIds[i]}" acumula multiplicando y alguna pieza o conjunto la deja en un factor <= 0 (un aporte de -100% o menos). El motor no puede garantizar el optimo en ese caso: revisa la plantilla o el inventario.`)
    }
  }

  // ---- Capa 0: que estadisticas mueven realmente la aguja -------------------
  // Se DEMUESTRA con el analisis simbolico de la formula (analysis.ts), no se
  // muestrea: una estadistica solo se descarta si la formula prueba que no
  // influye (por ejemplo, porque va multiplicada por un selector que vale 0).
  const analysisBox = (statLo: (i: number) => number, statHi: (i: number) => number) => {
    const lo = L.vars.slice(), hi = L.vars.slice()
    for (let i = 0; i < S; i++) { lo[i] = statLo(i); hi[i] = statHi(i) }
    return { varIndex: L.varIndex, statCount: S, derived: L.derived, objective: objective.formula, lo, hi }
  }
  const fullBox = analysisBox(
    (i) => Math.min(rangeLo[i], neutral[i]),
    (i) => Math.max(rangeHi[i], neutral[i]),
  )
  const objectiveRelevant = new Set<number>(analyzeDirections(fullBox).keys())

  // Estadisticas que importan por algo que no es el objetivo. Nunca se fusionan:
  // cada una tiene su propio limite.
  const pinned = new Set<number>()
  const pin = (k: string) => { const i = statIndex.get(k); if (i !== undefined) pinned.add(i) }
  for (const c of constraints) pin(c.statId)
  for (const b of template.budgets ?? []) pin(b.statId)
  if (finalReqs) for (const u of usable) for (const k of Object.keys(u.it.requires ?? {})) pin(k)

  const relevantSet = new Set<number>([...objectiveRelevant, ...pinned])
  const relIdxRaw = [...relevantSet].sort((a, b) => a - b)

  // Fusion de ejes equivalentes: si el objetivo depende de varias estadisticas
  // solo a traves de su suma (bono de dano general y bono Geo para un personaje
  // Geo), se colapsan en un unico eje. Tambien se demuestra, no se muestrea.
  // Solo aplica a las que se suman y a las que no tienen un limite propio.
  const mergeInto = new Map<number, number>()
  for (let a = 0; a < relIdxRaw.length; a++) {
    const ia = relIdxRaw[a]
    if (mergeInto.has(ia) || mode[ia] === MUL || pinned.has(ia)) continue
    const group = [ia]
    for (let b = a + 1; b < relIdxRaw.length; b++) {
      const ib = relIdxRaw[b]
      if (mergeInto.has(ib) || mode[ib] === MUL || pinned.has(ib)) continue
      if (canMergeGroup(fullBox, [...group, ib])) { group.push(ib); mergeInto.set(ib, ia) }
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

  // Caja alcanzable en forma compacta. Un eje fusionado suma los rangos de las
  // estadisticas que lo forman.
  const cLo = new Float64Array(R)
  const cHi = new Float64Array(R)
  for (let k = 0; k < R; k++) { cLo[k] = rNeutral[k]; cHi[k] = rNeutral[k] }
  for (const [full, pos] of relPos) {
    if (rMode[pos] === MUL) { cLo[pos] = rangeLo[full]; cHi[pos] = rangeHi[full]; continue }
    cLo[pos] += rangeLo[full] - neutral[full]
    cHi[pos] += rangeHi[full] - neutral[full]
  }

  const fullScratch = new Float64Array(S)
  const fullLo = new Float64Array(S)
  const fullHi = new Float64Array(S)
  function evalCompact(compact: Float64Array): number {
    for (let i = 0; i < S; i++) fullScratch[i] = neutral[i]
    for (let k = 0; k < R; k++) fullScratch[relIdx[k]] = compact[k]
    return evaluateFull(fullScratch)
  }
  function upperCompact(lo: Float64Array, hi: Float64Array): number {
    for (let i = 0; i < S; i++) { fullLo[i] = neutral[i]; fullHi[i] = neutral[i] }
    for (let k = 0; k < R; k++) { fullLo[relIdx[k]] = lo[k]; fullHi[relIdx[k]] = hi[k] }
    return L.evaluateUpper(fullLo, fullHi)
  }

  // ---- Direccion del objetivo en cada eje -----------------------------------
  // Sobre la caja compacta, que es exactamente donde se evaluaran las cotas.
  // Si cada eje tiene una direccion demostrada (sube o baja), el maximo de la
  // caja esta en una esquina conocida y la cota es UNA evaluacion puntual. Si
  // alguno "depende", se acota por intervalos: mas lento, igual de exacto.
  const compactDirs = analyzeDirections(analysisBox(
    (i) => { const k = relIdx.indexOf(i); return k >= 0 ? cLo[k] : neutral[i] },
    (i) => { const k = relIdx.indexOf(i); return k >= 0 ? cHi[k] : neutral[i] },
  ))
  const axisDir = new Int8Array(R)
  relIdx.forEach((full, k) => { axisDir[k] = compactDirs.get(full) ?? 0 })
  const monotone = axisDir.every((d) => d !== UNKNOWN)
  const boundKind: 'monotono' | 'intervalos' = monotone ? 'monotono' : 'intervalos'

  // La plantilla dice "monotono" y el analisis no lo demuestra: se busca un
  // contraejemplo concreto para avisar al autor con la estadistica culpable.
  let monotonicWarning: string | undefined
  if (objective.monotonic === true && axisDir.some((d) => d !== 0 && d !== UP)) {
    const bad = findMonotonicViolation(evalCompact, cLo, cHi, 150)
    if (bad === 'nan') {
      monotonicWarning = 'El objetivo produce NaN o infinito con valores alcanzables por el inventario.'
    } else if (bad !== null) {
      monotonicWarning = `El objetivo esta declarado monotono pero BAJA cuando sube "${statIds[relIdx[bad]]}". El motor lo tiene en cuenta y el resultado sigue siendo exacto; conviene declararlo monotonic: false.`
    }
  }

  /** Cota superior del objetivo sobre la caja [lo, hi] (compacta). */
  const corner = new Float64Array(R)
  const boundOf = (lo: Float64Array, hi: Float64Array) => {
    if (!monotone) return upperCompact(lo, hi)
    for (let k = 0; k < R; k++) corner[k] = axisDir[k] === DOWN ? lo[k] : hi[k]
    return evalCompact(corner)
  }

  // ---- Restricciones en forma compacta -------------------------------------
  const budgets = (template.budgets ?? []).map((b) => ({ statId: b.statId, min: undefined as number | undefined, max: b.max as number | undefined }))
  const allCons = [...budgets, ...constraints]
  interface Cons { pos: number; min?: number; max?: number; base: number; mul: boolean }
  const cons: Cons[] = []
  for (const c of allCons) {
    const full = statIndex.get(c.statId)
    const pos = full === undefined ? undefined : relPos.get(full)
    if (pos === undefined || full === undefined) continue
    cons.push({ pos, min: c.min, max: c.max, base: L.baseOf(full), mul: mode[full] === MUL })
  }
  const total = (c: { base: number; mul: boolean }, v: number) => (c.mul ? v * c.base : v + c.base)

  // Sentido de cada eje para la dominancia:
  //  up    → mas es mejor (el objetivo sube con el eje, minimos, requisitos)
  //  down  → menos es mejor (el objetivo baja con el eje, maximos, presupuestos)
  //  exact → tira en los dos sentidos, o su efecto "depende": solo una pieza
  //          IDENTICA puede reemplazar a otra sin riesgo.
  const up = new Uint8Array(R)
  const down = new Uint8Array(R)
  const exactAxis = new Uint8Array(R)
  for (let k = 0; k < R; k++) {
    if (axisDir[k] === UP) up[k] = 1
    else if (axisDir[k] === DOWN) down[k] = 1
    else if (axisDir[k] === UNKNOWN) exactAxis[k] = 1
  }
  for (const c of cons) {
    if (c.min !== undefined) up[c.pos] = 1
    if (c.max !== undefined) down[c.pos] = 1
  }
  // Un requisito contra la build final es un minimo mas: tener mas de esa
  // estadistica nunca estorba (el anillo de +Fuerza no es "peor" por no dar dano).
  if (finalReqs) {
    for (const u of usable) {
      for (const k of Object.keys(u.it.requires ?? {})) {
        const full = statIndex.get(k)
        const pos = full === undefined ? undefined : relPos.get(full)
        if (pos !== undefined) up[pos] = 1
      }
    }
  }
  for (let k = 0; k < R; k++) if (up[k] && down[k]) exactAxis[k] = 1

  // Semilla de la busqueda local con reinicios (solo con cota por intervalos).
  let seed = 424242
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648

  // ---- Conjuntos ------------------------------------------------------------
  // Un conjunto sin efecto sobre ningun eje relevante no cambia nada: sus piezas
  // se tratan como sueltas, lo que ademas deja que la dominancia las compare con
  // las del resto.
  const setEffectRaw: Float64Array[][] = sets.map((set) => {
    const byPieces: Float64Array[] = []
    for (let p = 0; p <= nSlots; p++) {
      const v = new Float64Array(R)
      for (let k = 0; k < R; k++) v[k] = rNeutral[k]
      for (const tier of set.tiers) {
        if (p < tier.pieces) continue
        for (const [k, val] of Object.entries(tier.effects)) {
          const full = statIndex.get(k)
          const pos = full === undefined ? undefined : relPos.get(full)
          if (pos === undefined) continue
          if (rMode[pos] === MUL) v[pos] *= 1 + val / 100
          else v[pos] += val
        }
      }
      byPieces.push(v)
    }
    return byPieces
  })
  const setMap = new Map<string, number>()
  const setEffect: Float64Array[][] = []
  sets.forEach((set, s) => {
    const matters = setEffectRaw[s].some((v) => v.some((x, k) => x !== rNeutral[k]))
    if (matters) { setMap.set(set.id, setEffect.length); setEffect.push(setEffectRaw[s]) }
  })
  const nSets = setEffect.length

  const combineInto = (out: Float64Array, a: Float64Array, b: Float64Array) => {
    for (let k = 0; k < R; k++) out[k] = rMode[k] === MUL ? a[k] * b[k] : a[k] + b[k]
  }
  const neutralVec = () => { const v = new Float64Array(R); for (let k = 0; k < R; k++) v[k] = rNeutral[k]; return v }

  /**
   * Cota superior del bono de conjuntos NUEVOS con como mucho p piezas.
   * Con 5 ranuras caben dos conjuntos de 2 piezas a la vez, asi que no basta
   * con tomar el mejor conjunto suelto: se resuelve con una mochila 0/1 por
   * eje. Para los ejes multiplicativos, la mochila trabaja en logaritmos. Los
   * efectos negativos no suben nada, asi que se ignoran (la cota sigue valida).
   */
  const bestSetByPieces: Float64Array[] = Array.from({ length: nSlots + 1 }, neutralVec)
  for (let k = 0; k < R; k++) {
    const dp = new Float64Array(nSlots + 1)
    for (let s = 0; s < nSets; s++) {
      for (let j = nSlots; j >= 1; j--) {
        for (let c = 1; c <= j; c++) {
          const raw = setEffect[s][c][k]
          const val = rMode[k] === MUL ? Math.log(Math.max(raw, 1e-12)) : raw - rNeutral[k]
          if (val > 0 && dp[j - c] + val > dp[j]) dp[j] = dp[j - c] + val
        }
      }
    }
    for (let j = 1; j <= nSlots; j++) if (dp[j - 1] > dp[j]) dp[j] = dp[j - 1]
    for (let j = 0; j <= nSlots; j++) bestSetByPieces[j][k] = rMode[k] === MUL ? Math.exp(dp[j]) : rNeutral[k] + dp[j]
  }

  /**
   * setUp[s][c][r] = lo maximo que puede aportar el conjunto s, que ya tiene c
   * piezas, si se le suman hasta r mas. Cada conjunto activo SUMA su cota:
   * dos conjuntos de 2 piezas que dan ATQ% se acumulan, no compiten.
   */
  const setUp: Float64Array[][][] = setEffect.map((eff) => {
    const byC: Float64Array[][] = []
    for (let c = 0; c <= nSlots; c++) {
      const byR: Float64Array[] = []
      const run = eff[c].slice()
      byR.push(run.slice())
      for (let r = 1; r <= nSlots; r++) {
        const e = eff[Math.min(c + r, nSlots)]
        for (let k = 0; k < R; k++) if (e[k] > run[k]) run[k] = e[k]
        byR.push(run.slice())
      }
      byC.push(byR)
    }
    return byC
  })

  // Las mismas cotas en "espacio de ganancia": suma sobre el neutro para los
  // ejes que suman, logaritmo para los que multiplican. Asi la mochila del
  // nodo (ver `addSetBound`) solo tiene que sumar.
  const gainOf = (k: number, x: number) => (rMode[k] === MUL ? Math.log(Math.max(x, 1e-300)) : x - rNeutral[k])
  const bestGain: Float64Array[] = bestSetByPieces.map((v) => v.map((x, k) => gainOf(k, x)))
  const setUpGain: Float64Array[][][] = setUp.map((byC) => byC.map((byR) => byR.map((v) => v.map((x, k) => gainOf(k, x)))))

  /** Cota inferior del aporte de TODOS los conjuntos: cada uno, en su peor escalon. */
  const setLowAll = neutralVec()
  for (let s = 0; s < nSets; s++) {
    for (let k = 0; k < R; k++) {
      let m = rNeutral[k]
      for (let p = 1; p <= nSlots; p++) if (setEffect[s][p][k] < m) m = setEffect[s][p][k]
      setLowAll[k] = rMode[k] === MUL ? setLowAll[k] * m : setLowAll[k] + (m - rNeutral[k])
    }
  }

  // ---- Candidatos por ranura ------------------------------------------------
  interface Req { pos: number; need: number; base: number; mul: boolean }
  interface Cand {
    id: string
    /** Orden global de la pieza, para romper simetrias entre ranuras gemelas. */
    rank: number
    set: number
    groups: number[]
    v: Float64Array
    reqs: Req[]
    /** Solo se comparan por dominancia piezas con la misma clave. */
    domKey: string
    /** Cuantas piezas mejores hacen falta para descartar esta sin perder el top N. */
    domNeed: number
    /**
     * Dominada para el top 1 pero conservada para el top N: solo puede aparecer
     * del segundo puesto en adelante. La primera fase de la busqueda la ignora.
     */
    weak: boolean
  }
  const groupIdx = new Map<string, number>()
  const groupOf = (key: string) => {
    let g = groupIdx.get(key)
    if (g === undefined) { g = groupIdx.size; groupIdx.set(key, g) }
    return g
  }
  const bySlot: Cand[][] = slotIds.map(() => [])
  let hasReqs = false

  usable.forEach(({ it, allowed }, rank) => {
    const reqs: Req[] = []
    let reachable = true
    for (const [k, need] of Object.entries(it.requires ?? {})) {
      if (!isFinalReq(k)) continue
      const full = statIndex.get(k)!
      const base = L.baseOf(full)
      const mul = mode[full] === MUL
      // Ni con el mejor equipo posible se llega: la pieza no existe.
      if (total({ base, mul }, rangeHi[full]) < need - 1e-9) { reachable = false; break }
      reqs.push({ pos: relPos.get(full)!, need, base, mul })
    }
    if (!reachable) { requirementFiltered++; return }
    if (reqs.length) hasReqs = true

    const v = neutralVec()
    for (const [k, val] of Object.entries(it.stats)) {
      const full = statIndex.get(k)
      const pos = full === undefined ? undefined : relPos.get(full)
      if (pos === undefined) continue
      if (rMode[pos] === MUL) v[pos] *= 1 + val / 100
      else v[pos] += val
    }
    const set = it.setId != null ? setMap.get(it.setId) ?? -1 : -1
    const groups: number[] = []
    if (it.exclusiveGroup) groups.push(groupOf(`g:${it.exclusiveGroup}`))
    // Una pieza que cabe en varias ranuras se puede equipar UNA vez.
    if (allowed.length > 1) groups.push(groupOf(`i:${it.id}`))
    const domKey = `${set}|${it.exclusiveGroup ?? ''}|${allowed.join(',')}`
    const cand: Cand = { id: it.id, rank, set, groups, v, reqs, domKey, domNeed: topN + allowed.length - 1, weak: false }
    for (const s of allowed) bySlot[s].push(cand)
  })
  for (let s = 0; s < nSlots; s++) {
    if (!optional[s]) continue
    bySlot[s].push({ id: '', rank: -1, set: -1, groups: [], v: neutralVec(), reqs: [], domKey: '', domNeed: Infinity, weak: false })
  }
  const nGroups = groupIdx.size

  // ---- Capa 1: dominancia ---------------------------------------------------
  /** true si `other` es al menos tan buena como `cand` en todo lo que importa. */
  const dominates = (other: Cand, cand: Cand): boolean => {
    for (let k = 0; k < R; k++) {
      const a = other.v[k], b = cand.v[k]
      if (exactAxis[k]) { if (a !== b) return false }
      else if (up[k]) { if (a < b) return false }
      else if (down[k]) { if (a > b) return false }
    }
    // Requisitos: la que domina no puede exigir mas que la dominada.
    for (const q of other.reqs) {
      const mine = cand.reqs.find((x) => x.pos === q.pos)
      if (!mine || mine.need < q.need) return false
    }
    return true
  }
  const weight = (c: Cand) => {
    let s = 0
    for (let k = 0; k < R; k++) if (!exactAxis[k]) s += up[k] ? c.v[k] : down[k] ? -c.v[k] : 0
    return s
  }

  let dominated = 0
  let hasWeak = false
  for (let s = 0; s < nSlots; s++) {
    const groups = new Map<string, Cand[]>()
    const kept: Cand[] = []
    for (const c of bySlot[s]) {
      if (c.id === '') { kept.push(c); continue }
      const g = groups.get(c.domKey)
      if (g) g.push(c); else groups.set(c.domKey, [c])
    }
    for (const group of groups.values()) {
      group.sort((a, b) => weight(b) - weight(a))
      const survivors: Cand[] = []
      for (const cand of group) {
        let count = 0
        for (const other of survivors) {
          if (dominates(other, cand) && ++count >= cand.domNeed) break
        }
        if (count >= cand.domNeed) { dominated++; continue }
        if (count >= cand.domNeed - topN + 1) { cand.weak = true; hasWeak = true }
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
    provenOptimal: true, mode: 'exacto', bound: boundKind, monotonicWarning,
    relevantStats: relIdx.map((i) => statIds[i]),
    mergedDimensions: mergedCount, requirementFiltered,
  })
  if (bySlot.some((c) => c.length === 0)) return { builds: [], stats: emptyStats() }

  // Las piezas debiles no entran al arbol: solo a la expansion final del podio.
  const weakBySlot = bySlot.map((c) => c.filter((x) => x.weak))
  for (let s = 0; s < nSlots; s++) bySlot[s] = bySlot[s].filter((x) => !x.weak)

  let totalCombinations = 1
  for (const c of bySlot) totalCombinations *= c.length

  // ---- Cotas y orden de exploracion ----------------------------------------
  const n = nSlots
  const maxOf = (cands: Cand[]) => {
    const m = new Float64Array(R).fill(-Infinity)
    for (const c of cands) for (let k = 0; k < R; k++) if (c.v[k] > m[k]) m[k] = c.v[k]
    return m
  }
  const minOf = (cands: Cand[]) => {
    const m = new Float64Array(R).fill(Infinity)
    for (const c of cands) for (let k = 0; k < R; k++) if (c.v[k] < m[k]) m[k] = c.v[k]
    return m
  }
  const clampBox = (lo: Float64Array, hi: Float64Array) => {
    for (let k = 0; k < R; k++) {
      if (hi[k] > cHi[k]) hi[k] = cHi[k]
      if (lo[k] < cLo[k]) lo[k] = cLo[k]
    }
  }

  const boxLo = new Float64Array(R)
  const boxHi = new Float64Array(R)
  /** Cota del mejor resultado posible si la ranura `d` lleva `cand`. */
  function candidateBound(d: number, cand: Cand, high: Float64Array[], low: Float64Array[]): number {
    for (let k = 0; k < R; k++) { boxLo[k] = cand.v[k]; boxHi[k] = cand.v[k] }
    for (let j = 0; j < high.length; j++) {
      if (j === d) continue
      combineInto(boxHi, boxHi, high[j])
      combineInto(boxLo, boxLo, low[j])
    }
    combineInto(boxHi, boxHi, bestSetByPieces[nSlots])
    combineInto(boxLo, boxLo, setLowAll)
    clampBox(boxLo, boxHi)
    return boundOf(boxLo, boxHi)
  }

  const high0 = bySlot.map(maxOf)
  const low0 = bySlot.map(minOf)
  const spread = bySlot.map((cands, s) => {
    let lo = Infinity, hi = -Infinity
    for (const c of cands) {
      const key = candidateBound(s, c, high0, low0)
      if (key < lo) lo = key
      if (key > hi) hi = key
    }
    return hi - lo
  })
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => (spread[b] || 0) - (spread[a] || 0))
  const weakSlots: Cand[][] = order.map((s) => weakBySlot[s])
  /** Todas las piezas de cada ranura (en orden de busqueda), antes de cualquier filtro por cota. */
  const candByDepth = order.map((s) => new Map([...bySlot[s], ...weakBySlot[s]].map((c) => [c.id, c])))
  const slots: Cand[][] = order.map((s) => {
    const keys = new Map<Cand, number>()
    for (const c of bySlot[s]) keys.set(c, candidateBound(s, c, high0, low0))
    return bySlot[s].slice().sort((a, b) => (keys.get(b) ?? 0) - (keys.get(a) ?? 0))
  })

  let slotHigh: Float64Array[] = []
  let slotLow: Float64Array[] = []
  /** remHigh[d] / remLow[d] = mejor y peor caso acumulado de las ranuras d..n-1. */
  let remHigh: Float64Array[] = []
  let remLow: Float64Array[] = []
  /**
   * Presupuestos (maximos sobre ejes que suman). Para cada presupuesto y cada
   * eje se precalcula una mochila de eleccion multiple sobre las ranuras que
   * faltan: table[d][k][m] = lo maximo que las ranuras d..n-1 pueden sumar en el
   * eje k gastando, entre todas, como mucho m unidades de "exceso" (lo que cada
   * pieza gasta por encima de la mas barata de su ranura).
   *
   * Sin esto, la cota suponia que cada ranura aportaba su mejor pieza aunque la
   * suma no cupiera en la carga, y el arbol no se podaba. El exceso se redondea
   * HACIA ABAJO a una rejilla de BUDGET_GRID pasos: las piezas parecen algo mas
   * baratas de lo que son, asi que la cota sigue siendo valida.
   */
  const BUDGET_GRID = 256
  const budgetCons = cons.filter((c) => c.max !== undefined && !c.mul)
  let budgetUnit: number[] = []
  let budgetTable: Float64Array[][][] = []
  function recomputeBounds(): void {
    slotHigh = slots.map(maxOf)
    slotLow = slots.map(minOf)
    remHigh = Array.from({ length: n + 1 }, neutralVec)
    remLow = Array.from({ length: n + 1 }, neutralVec)
    for (let d = n - 1; d >= 0; d--) {
      combineInto(remHigh[d], remHigh[d + 1], slotHigh[d])
      combineInto(remLow[d], remLow[d + 1], slotLow[d])
    }
    budgetUnit = []
    budgetTable = budgetCons.map((c) => {
      let span = 0
      for (let d = 0; d < n; d++) span += slotHigh[d][c.pos] - slotLow[d][c.pos]
      const unit = Math.max(span / BUDGET_GRID, 1e-12)
      budgetUnit.push(unit)
      const G = BUDGET_GRID
      const table: Float64Array[][] = Array.from({ length: n + 1 }, () =>
        Array.from({ length: R }, () => new Float64Array(G + 1)))
      for (let d = n - 1; d >= 0; d--) {
        const cost = slots[d].map((x) => Math.floor((x.v[c.pos] - slotLow[d][c.pos]) / unit))
        const gains = slots[d].map((x) => x.v.map((v, k) => (rMode[k] === MUL ? Math.log(Math.max(v, 1e-300)) : v)))
        for (let k = 0; k < R; k++) {
          const cur = table[d][k], nxt = table[d + 1][k]
          for (let m = 0; m <= G; m++) {
            let bestV = -Infinity
            for (let i = 0; i < cost.length; i++) {
              if (cost[i] > m) continue
              const v = gains[i][k] + nxt[m - cost[i]]
              if (v > bestV) bestV = v
            }
            cur[m] = bestV
          }
        }
      }
      return table
    })
  }
  recomputeBounds()

  // ---- Estado de busqueda ---------------------------------------------------
  // El acumulado vive en una pila por profundidad en vez de sumarse y restarse:
  // deshacer un factor 0 dividiendo daria NaN, y restar mil veces acumula error.
  const accStack = Array.from({ length: n + 1 }, neutralVec)
  const upStack = Array.from({ length: n + 1 }, () => new Float64Array(R))
  const lowStack = Array.from({ length: n + 1 }, () => new Float64Array(R))
  const slackStack = Array.from({ length: n + 1 }, () => new Float64Array(budgetCons.length))
  const budgetTmp = new Float64Array(R)
  const setCounts = new Int32Array(Math.max(nSets, 1))
  const groupCounts = new Int32Array(Math.max(nGroups, 1))
  const activeSets: number[] = []
  const chosen: Cand[] = new Array(n)
  const finalTotals = new Float64Array(R)

  /**
   * Suma a `hi` la cota del bono de conjuntos con `r` ranuras por llenar.
   *
   * Las r piezas que faltan se reparten: unas completan conjuntos YA activos
   * (el 2pz que puede llegar a 4pz) y el resto forma conjuntos nuevos. Cada
   * pieza va a un solo sitio, asi que se resuelve con una mochila pequena por
   * eje: conjuntos activos como grupos (t piezas → setUp[s][c][t]) sobre la
   * mochila ya precalculada de conjuntos nuevos. Sumar las dos cotas por
   * separado contaria dos veces las mismas piezas y dejaria la cota tan holgada
   * que el arbol explotaria.
   */
  const knap = new Float64Array(nSlots + 1)
  function addSetBound(r: number, hi: Float64Array): void {
    r = Math.min(r, nSlots)
    const a = activeSets.length
    for (let k = 0; k < R; k++) {
      let gain: number
      if (a === 0) gain = bestGain[r][k]
      else {
        for (let j = 0; j <= r; j++) knap[j] = bestGain[j][k]
        for (let q = 0; q < a; q++) {
          const s = activeSets[q]
          const u = setUpGain[s][setCounts[s]]
          for (let j = r; j >= 0; j--) {
            let m = -Infinity
            for (let t = 0; t <= j; t++) {
              const v = knap[j - t] + u[t][k]
              if (v > m) m = v
            }
            knap[j] = m
          }
        }
        gain = knap[r]
      }
      hi[k] = rMode[k] === MUL ? hi[k] * Math.exp(gain) : hi[k] + gain
    }
  }

  let evaluated = 0
  let pruned = 0
  let cancelled = false
  let timedOut = false
  const progressEvery = hooks.progressEvery ?? 40_000
  let sinceProgress = 0
  let progressVersion = -1
  let progressBuilds: BuildResult[] = []

  type Found = { score: number; ids: string[]; key: string }
  const best: Found[] = []
  const cutoff = () => (best.length >= topN ? best[best.length - 1].score : -Infinity)
  /**
   * Linea de poda: el corte menos un margen relativo minimo. La cota y la hoja
   * suman los mismos numeros en distinto orden, y el redondeo de coma flotante
   * podria dejar la cota una millonesima por debajo de una hoja que en realidad
   * la iguala; con el margen, ese empate nunca se poda por error.
   */
  const pruneLine = () => { const c = cutoff(); return c - 1e-9 * Math.max(1, Math.abs(c)) }

  // Version del podio: solo cambia cuando entra una build nueva. Sirve para no
  // reconstruir el resultado parcial en cada aviso de progreso si nada mejoro.
  let bestVersion = 0

  /**
   * Anota una build en el podio. Dos builds son la misma si llevan las mismas
   * piezas, esten en la ranura que esten: el puntaje no depende de la ranura.
   * Deduplicar por puntaje (como antes) perdia empates legitimos y dejaba pasar
   * la misma build dos veces si se habia calculado de dos maneras.
   */
  function record(score: number, picks: Cand[]): void {
    if (!(score === score)) return
    if (best.length >= topN && score <= best[best.length - 1].score) return
    const ids = picks.map((p) => p.id)
    const key = buildKey(ids)
    for (const b of best) if (b.key === key) return
    let at = best.length
    while (at > 0 && best[at - 1].score < score) at--
    best.splice(at, 0, { score, ids, key })
    if (best.length > topN) best.pop()
    bestVersion++
  }

  const idToItem = new Map(items.map((i) => [i.id, i]))

  /** Reconstruye las builds completas (estadisticas finales y conjuntos activos). */
  function materializar(found: Found[]): BuildResult[] {
    return found.map((b) => {
      const totals = new Float64Array(S)
      for (let i = 0; i < S; i++) totals[i] = neutral[i]
      const counts = new Map<string, number>()
      for (const id of b.ids) {
        const it = id === '' ? undefined : idToItem.get(id)
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
        const def = sets.find((s2) => s2.id === setId)
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

      const ordered = new Array<string>(n).fill('')
      b.ids.forEach((id, k) => { ordered[order[k]] = id })
      return { score: b.score, itemIds: ordered, finalStats, activeSets: active }
    })
  }

  /** Comprueba restricciones y requisitos sobre unos totales compactos completos. */
  function feasible(totals: Float64Array, picks: Cand[]): boolean {
    for (const c of cons) {
      const t = total(c, totals[c.pos])
      if (c.min !== undefined && t < c.min - 1e-9) return false
      if (c.max !== undefined && t > c.max + 1e-9) return false
    }
    if (hasReqs) {
      for (const p of picks) for (const q of p.reqs) if (total(q, totals[q.pos]) < q.need - 1e-9) return false
    }
    return true
  }

  // ---- Arranque en caliente: greedy + ascenso de colina ---------------------
  const warmCombo = new Float64Array(R)
  const warmSets = new Int32Array(Math.max(nSets, 1))
  const warmGroups = new Int32Array(Math.max(nGroups, 1))

  function scoreCombo(picks: Cand[]): number {
    for (let k = 0; k < R; k++) warmCombo[k] = rNeutral[k]
    warmSets.fill(0); warmGroups.fill(0)
    for (const c of picks) {
      combineInto(warmCombo, warmCombo, c.v)
      if (c.set >= 0) warmSets[c.set]++
      for (const g of c.groups) if (++warmGroups[g] > 1) return -Infinity
    }
    for (let s = 0; s < nSets; s++) {
      if (warmSets[s] === 0) continue
      combineInto(warmCombo, warmCombo, setEffect[s][Math.min(warmSets[s], nSlots)])
    }
    if (!feasible(warmCombo, picks)) return -Infinity
    const score = evalCompact(warmCombo)
    return score === score ? score : -Infinity
  }

  function hillClimb(picks: Cand[], passes: number, width: number): void {
    let current = scoreCombo(picks)
    if (current > -Infinity) record(current, picks)
    for (let pass = 0; pass < passes; pass++) {
      let improved = false
      for (let d = 0; d < n; d++) {
        const original = picks[d]
        let bestCand = original
        let bestScore = current
        const limit = Math.min(slots[d].length, width)
        for (let i = 0; i < limit; i++) {
          const cand = slots[d][i]
          if (cand === original) continue
          picks[d] = cand
          const sc = scoreCombo(picks)
          if (sc > bestScore) { bestScore = sc; bestCand = cand }
          if (sc > -Infinity) record(sc, picks)
        }
        picks[d] = bestCand
        if (bestScore > current) { current = bestScore; improved = true }
      }
      if (!improved) break
    }
  }

  // Greedy: en cada ranura, el mejor candidato que no choque con lo ya elegido.
  {
    const used = new Set<number>()
    const picks = slots.map((cands) => {
      const c = cands.find((x) => x.groups.every((g) => !used.has(g))) ?? cands[0]
      for (const g of c.groups) used.add(g)
      return c
    })
    hillClimb(picks, 8, 220)
  }
  if (!monotone) {
    // Con la cota por intervalos, mas holgada, conviene llegar al arbol con un
    // corte exigente: se reinicia la busqueda local desde varios puntos.
    for (let restart = 0; restart < 24 && Date.now() < deadline; restart++) {
      hillClimb(slots.map((cands) => cands[Math.floor(rnd() * cands.length)]), 6, 160)
    }
  }

  // ---- Filtro por cota ------------------------------------------------------
  let boundFiltered = 0
  for (let round = 0; round < 3; round++) {
    const threshold = cutoff()
    if (!Number.isFinite(threshold)) break
    let removed = 0
    for (let d = 0; d < n; d++) {
      const keep = slots[d].filter((c) => candidateBound(d, c, slotHigh, slotLow) > pruneLine())
      if (keep.length && keep.length < slots[d].length) {
        removed += slots[d].length - keep.length
        slots[d] = keep
      }
    }
    boundFiltered += removed
    if (!removed) break
    recomputeBounds()
  }

  // ---- Ruptura de simetria --------------------------------------------------
  // Dos ranuras con exactamente los mismos candidatos (Anillo 1 y Anillo 2) son
  // intercambiables: {A, B} y {B, A} son la misma build. Se explora solo la
  // asignacion canonica, con las piezas en orden creciente de `rank`.
  const symPrev = new Int32Array(n).fill(-1)
  {
    const lastWithKey = new Map<string, number>()
    for (let d = 0; d < n; d++) {
      const key = slots[d].map((c) => c.id).sort().join('\u0001')
      const prev = lastWithKey.get(key)
      if (prev !== undefined) symPrev[d] = prev
      lastWithKey.set(key, d)
    }
  }

  let searchSpace = 1
  for (const c of slots) searchSpace *= c.length

  hooks.onSetup?.({
    totalCombinations, searchSpace, boundFiltered, dominated, candidatesPerSlot,
    relevantStats: relIdx.map((i) => statIds[i]),
    mergedDimensions: mergedCount, requirementFiltered,
    mode: 'exacto', bound: boundKind, monotonicWarning,
  })

  // ---- Busqueda -------------------------------------------------------------
  function dfs(depth: number): void {
    if (cancelled || timedOut) return
    const acc = accStack[depth]

    if (depth === n) {
      for (let k = 0; k < R; k++) finalTotals[k] = acc[k]
      for (const s of activeSets) combineInto(finalTotals, finalTotals, setEffect[s][Math.min(setCounts[s], nSlots)])
      evaluated++
      if (!feasible(finalTotals, chosen)) return
      const score = evalCompact(finalTotals)
      if (!(score === score)) return
      if (best.length >= topN && score <= best[best.length - 1].score) return
      record(score, chosen)
      return
    }

    if (++sinceProgress >= progressEvery) {
      sinceProgress = 0
      const now = Date.now()
      if (now > deadline) { timedOut = true; return }
      if (hooks.shouldCancel?.()) { cancelled = true; return }
      if (hooks.onProgress) {
        if (bestVersion !== progressVersion) {
          progressVersion = bestVersion
          progressBuilds = materializar(best)
        }
        hooks.onProgress({
          evaluated, pruned, elapsedMs: now - t0,
          bestScore: best.length ? best[0].score : 0,
          builds: progressBuilds,
        })
      }
    }

    // Caja del subarbol: [peor caso, mejor caso] de cada eje.
    const remaining = n - depth
    const hi = upStack[depth]
    const lo = lowStack[depth]
    combineInto(hi, acc, remHigh[depth])
    addSetBound(remaining, hi)
    combineInto(lo, acc, remLow[depth])
    combineInto(lo, lo, setLowAll)
    clampBox(lo, hi)

    // Presupuestos: lo maximo que las ranuras restantes pueden sumar en cada
    // eje sin pasarse, entre todas, del margen que queda.
    const slack = slackStack[depth]
    for (let b = 0; b < budgetCons.length; b++) {
      const c = budgetCons[b]
      // Sin el recorte a la caja alcanzable: ese recorte acota el total, no el
      // exceso que las ranuras restantes pueden gastar.
      const m = c.max! + 1e-9 - total(c, acc[c.pos] + remLow[depth][c.pos] + setLowAll[c.pos])
      if (m < 0) { pruned++; return }
      slack[b] = m
      const cell = Math.min(BUDGET_GRID, Math.floor(m / budgetUnit[b]))
      const table = budgetTable[b][depth]
      for (let k = 0; k < R; k++) {
        const g = table[k][cell]
        if (g === -Infinity) { pruned++; return }
        budgetTmp[k] = rMode[k] === MUL ? acc[k] * Math.exp(g) : acc[k] + g
      }
      addSetBound(remaining, budgetTmp)
      for (let k = 0; k < R; k++) if (budgetTmp[k] < hi[k]) hi[k] = budgetTmp[k]
    }

    for (const c of cons) {
      if (c.min !== undefined && total(c, hi[c.pos]) < c.min - 1e-9) { pruned++; return }
      // Para un maximo la cota util es el MINIMO alcanzable: si ni siquiera
      // eligiendo lo mas barato se cabe en el presupuesto, no hay solucion.
      if (c.max !== undefined && total(c, lo[c.pos]) > c.max + 1e-9) { pruned++; return }
    }

    if (boundOf(lo, hi) <= pruneLine()) { pruned++; return }

    const prev = symPrev[depth] >= 0 ? chosen[symPrev[depth]] : undefined
    const next = accStack[depth + 1]
    outer: for (const cand of slots[depth]) {
      for (const g of cand.groups) if (groupCounts[g] > 0) continue outer
      for (let b = 0; b < budgetCons.length; b++) {
        const pos = budgetCons[b].pos
        if (cand.v[pos] - slotLow[depth][pos] > slack[b]) continue outer
      }
      if (prev && cand.rank <= prev.rank && !(cand.rank === -1 && prev.rank === -1)) continue
      // Un requisito que ni el mejor caso del subarbol alcanza descarta la pieza.
      for (const q of cand.reqs) if (total(q, hi[q.pos]) < q.need - 1e-9) continue outer

      chosen[depth] = cand
      combineInto(next, acc, cand.v)
      let pushed = false
      if (cand.set >= 0) {
        if (setCounts[cand.set] === 0) { activeSets.push(cand.set); pushed = true }
        setCounts[cand.set]++
      }
      for (const g of cand.groups) groupCounts[g]++
      dfs(depth + 1)
      for (const g of cand.groups) groupCounts[g]--
      if (cand.set >= 0) {
        setCounts[cand.set]--
        if (pushed) activeSets.pop()
      }
      if (cancelled || timedOut) return
    }
  }

  dfs(0)

  // ---- Expansion del podio con las piezas debiles ---------------------------
  // Si una build con la pieza debil X esta en el top N, la misma build con la
  // pieza que domina a X tambien lo esta (y con puntaje mayor o igual). Asi que
  // el top N completo se obtiene buscando solo con las piezas fuertes y luego
  // cambiando, en cada build del podio, una pieza por una debil a la que ella
  // domina — repitiendo mientras entren builds nuevas. Es exacto y cuesta un
  // punado de evaluaciones, en vez de meter miles de piezas al arbol.
  if (hasWeak) {
    const expanded = new Set<string>()
    for (let changed = true; changed;) {
      changed = false
      for (const b of best.slice()) {
        if (expanded.has(b.key)) continue
        expanded.add(b.key)
        const picks = b.ids.map((id, d) => candByDepth[d].get(id)!)
        for (let d = 0; d < n; d++) {
          const original = picks[d]
          for (const w of weakSlots[d]) {
            if (!dominates(original, w)) continue
            picks[d] = w
            const before = bestVersion
            const sc = scoreCombo(picks)
            if (sc > -Infinity) record(sc, picks)
            if (bestVersion !== before) changed = true
          }
          picks[d] = original
        }
      }
    }
  }

  // ---- Resultado ------------------------------------------------------------
  // `materializar` convierte la lista interna de ganadores (puntuacion + ids)
  // en BuildResult completos. Se llama desde DOS sitios: al terminar, y en cada
  // aviso de progreso — es lo que permite que detener a mano no pierda el
  // trabajo hecho.
  const builds = materializar(best)

  return {
    builds,
    stats: {
      totalCombinations, searchSpace, boundFiltered, evaluated, pruned, dominated,
      candidatesPerSlot, elapsedMs: Date.now() - t0, feasible: builds.length > 0,
      provenOptimal: !timedOut && !cancelled,
      stoppedBy: timedOut ? 'tiempo' : cancelled ? 'usuario' : undefined,
      mode: 'exacto', bound: boundKind, monotonicWarning,
      relevantStats: relIdx.map((i) => statIds[i]),
      mergedDimensions: mergedCount, requirementFiltered,
    },
  }
}

/**
 * Fuerza bruta exhaustiva, con el top N completo. Solo para verificar en
 * pruebas que el branch and bound devuelve exactamente los mismos resultados.
 * Inutilizable a escala real.
 *
 * Es deliberadamente ingenua: no comparte con `solve` nada mas que la
 * evaluacion de formulas, para que un error en las cotas, la dominancia o la
 * fusion de ejes no pueda esconderse en las dos implementaciones a la vez.
 */
export function solveBruteForceTop(req: SolveRequest): { score: number; itemIds: string[] }[] {
  const w = withSkills(req)
  return bruteForceCore(w.req).map(w.strip)
}

function bruteForceCore(req: SolveRequest): { score: number; itemIds: string[] }[] {
  const { template, items, constraints, profileId } = req
  const topN = Math.max(1, Math.floor(req.topN || 1))
  const L = buildLayout(req)
  const { S, statIndex, mode, neutral, evaluateFull } = L
  const profile = template.baseProfiles.find((p) => p.id === profileId)!
  const finalReqs = template.requirementsFrom === 'final'

  const usable = items.filter((it) =>
    Object.entries(it.requires ?? {}).every(([k, need]) =>
      (finalReqs && statIndex.has(k)) || (profile.base[k] ?? 0) >= need))

  const slotIds = template.slots.map((s) => s.id)
  const bySlot: (Item | null)[][] = template.slots.map((slot) => {
    const list: (Item | null)[] = usable.filter((i) => i.slot === slot.id || (i.slots ?? []).includes(slot.id))
    if (slot.optional) list.push(null)
    return list
  })
  if (bySlot.some((b) => b.length === 0)) return []

  const allCons = [...(template.budgets ?? []).map((b) => ({ statId: b.statId, min: undefined as number | undefined, max: b.max as number | undefined })), ...constraints]
  const found = new Map<string, { score: number; itemIds: string[] }>()
  const pick: (Item | null)[] = new Array(slotIds.length)
  const totals = new Float64Array(S)
  const finalOf = (i: number) => (mode[i] === MUL ? totals[i] * L.baseOf(i) : totals[i] + L.baseOf(i))

  const rec = (d: number): void => {
    if (d === slotIds.length) {
      const ids = new Set<string>()
      const groups = new Set<string>()
      for (const it of pick) {
        if (!it) continue
        if (ids.has(it.id)) return
        ids.add(it.id)
        if (!it.exclusiveGroup) continue
        if (groups.has(it.exclusiveGroup)) return
        groups.add(it.exclusiveGroup)
      }
      for (let i = 0; i < S; i++) totals[i] = neutral[i]
      const counts = new Map<string, number>()
      for (const it of pick) {
        if (!it) continue
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
        const t = finalOf(i)
        if (c.min !== undefined && t < c.min - 1e-9) return
        if (c.max !== undefined && t > c.max + 1e-9) return
      }
      if (finalReqs) {
        for (const it of pick) {
          for (const [k, need] of Object.entries(it?.requires ?? {})) {
            const i = statIndex.get(k)
            if (i !== undefined && finalOf(i) < need - 1e-9) return
          }
        }
      }
      const score = evaluateFull(totals)
      if (!(score === score)) return
      const itemIds = pick.map((p) => p?.id ?? '')
      const key = buildKey(itemIds)
      const prev = found.get(key)
      if (!prev || score > prev.score) found.set(key, { score, itemIds })
      return
    }
    for (const it of bySlot[d]) { pick[d] = it; rec(d + 1) }
  }
  rec(0)
  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, topN)
}

/** Fuerza bruta del mejor resultado (atajo de `solveBruteForceTop`). */
export function solveBruteForce(req: SolveRequest): { score: number; itemIds: string[] } | null {
  return solveBruteForceTop({ ...req, topN: 1 })[0] ?? null
}
