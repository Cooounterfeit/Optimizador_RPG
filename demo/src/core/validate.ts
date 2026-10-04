/**
 * Validador de plantillas
 * =======================
 * En cuanto las plantillas las escriba gente desconocida, el motor pasa a ser
 * un interprete de contenido ajeno. Una plantilla mal hecha no "falla": devuelve
 * builds equivocadas con toda confianza, que es peor que no tener herramienta.
 *
 * Este modulo revisa una plantilla ANTES de que llegue al optimizador y separa
 * tres cosas:
 *   - errores    → la plantilla no se puede usar
 *   - avisos     → se puede usar, pero algo huele mal
 *   - informacion→ datos utiles para quien la escribe
 *
 * Lo mas valioso que hace es comprobar la MONOTONIA numericamente. Es la
 * propiedad de la que depende que la poda del branch and bound sea exacta, y
 * ningun autor de plantillas deberia tener que entenderla: el validador la mide
 * y avisa.
 */

import { compileFormula, FormulaError } from './formula'
import { solve, topoSortDerived } from './optimizer'
import type { GameTemplate, Item, SelfTest } from './types'

export type Severity = 'error' | 'warning' | 'info'

export interface Issue {
  severity: Severity
  code: string
  message: string
  where?: string
}

export interface SelfTestResult {
  name: string
  passed: boolean
  detail: string
}

export interface ValidationReport {
  ok: boolean
  issues: Issue[]
  selfTests: SelfTestResult[]
  summary: {
    stats: number
    slots: number
    sets: number
    objectives: number
    monotonicOk: number
    profiles: number
    searchSpace?: number
  }
}

const IDENT = /[A-Za-z_][A-Za-z0-9_]*/g

export function validateTemplate(raw: unknown, items?: Item[]): ValidationReport {
  const issues: Issue[] = []
  const selfTests: SelfTestResult[] = []
  const err = (code: string, message: string, where?: string) => issues.push({ severity: 'error', code, message, where })
  const warn = (code: string, message: string, where?: string) => issues.push({ severity: 'warning', code, message, where })
  const info = (code: string, message: string, where?: string) => issues.push({ severity: 'info', code, message, where })

  const t = raw as GameTemplate
  const empty: ValidationReport = {
    ok: false, issues, selfTests,
    summary: { stats: 0, slots: 0, sets: 0, objectives: 0, monotonicOk: 0, profiles: 0 },
  }

  // ---------------------------------------------------------- 1. estructura
  if (!t || typeof t !== 'object') { err('E_ROOT', 'La plantilla no es un objeto JSON.'); return empty }
  for (const f of ['gameId', 'name', 'stats', 'slots', 'objectives', 'baseProfiles'] as const) {
    if (t[f] === undefined) err('E_FALTA', `Falta el campo obligatorio "${f}".`)
  }
  if (issues.some((i) => i.severity === 'error')) return empty

  for (const f of ['stats', 'slots', 'sets', 'derived', 'objectives', 'baseProfiles'] as const) {
    if (t[f] !== undefined && !Array.isArray(t[f])) err('E_TIPO', `"${f}" deberia ser una lista.`)
  }
  if (issues.some((i) => i.severity === 'error')) return empty

  const sets = t.sets ?? []
  const derivedRaw = t.derived ?? []
  if (t.schemaVersion !== '0.1') {
    warn('W_VERSION', `schemaVersion es "${t.schemaVersion}"; este motor entiende "0.1".`)
  }

  const dup = (list: { id: string }[], label: string) => {
    const seen = new Set<string>()
    for (const x of list) {
      if (!x?.id) { err('E_SIN_ID', `Hay un ${label} sin id.`); continue }
      if (seen.has(x.id)) err('E_ID_DUP', `El id "${x.id}" esta repetido en ${label}.`, x.id)
      seen.add(x.id)
    }
  }
  // Los ids repetidos son un error, pero NO se corta aqui: a quien escribe una
  // plantilla le sirve mucho mas recibir la lista completa de problemas de una
  // vez que ir descubriendolos de a uno.
  dup(t.stats, 'stats'); dup(t.slots, 'slots'); dup(sets, 'sets')
  dup(derivedRaw, 'derived'); dup(t.objectives, 'objectives'); dup(t.baseProfiles, 'baseProfiles')

  const statIds = new Set(t.stats.map((s) => s.id))
  const derivedIds = new Set(derivedRaw.map((d) => d.id))
  for (const id of derivedIds) {
    if (statIds.has(id)) err('E_COLISION', `"${id}" es a la vez estadistica y valor derivado.`, id)
  }
  if (t.slots.length === 0) err('E_SIN_RANURAS', 'La plantilla no declara ninguna ranura.')
  if (t.objectives.length === 0) err('E_SIN_OBJETIVOS', 'La plantilla no declara ningun objetivo.')
  if (t.baseProfiles.length === 0) err('E_SIN_PERFILES', 'La plantilla no declara ningun perfil base.')
  // Sin ranuras, objetivos o perfiles no queda nada que analizar.
  if (t.slots.length === 0 || t.objectives.length === 0 || t.baseProfiles.length === 0) {
    return { ...empty, issues, selfTests }
  }

  // ------------------------------------------------- 2. orden y ciclos
  let derived = derivedRaw
  try {
    derived = topoSortDerived(derivedRaw)
    const declared = derivedRaw.map((d) => d.id).join(',')
    const sorted = derived.map((d) => d.id).join(',')
    if (declared !== sorted) {
      info('I_ORDEN', 'Hay derivados que usan otros declarados mas abajo. El motor los reordena solo, pero se lee mejor en orden de dependencia.')
    }
  } catch (e) {
    err('E_CICLO', (e as Error).message)
    // Sin un orden valido no se pueden evaluar formulas; se informa lo demas
    // que si se puede revisar sin evaluar.
    derived = []
  }

  // ------------------------------------------------- 3. indice de variables
  const profile = t.baseProfiles[0]
  const S = t.stats.length
  const varIndex = new Map<string, number>()
  t.stats.forEach((s, i) => varIndex.set(s.id, i))
  t.stats.forEach((s, i) => varIndex.set(`base_${s.id}`, S + i))
  derived.forEach((d, i) => varIndex.set(d.id, 2 * S + i))
  const extraKeys = Object.keys(profile.base ?? {}).filter((k) => !statIds.has(k))
  extraKeys.forEach((k, i) => varIndex.set(`base_${k}`, 2 * S + derived.length + i))
  const total = 2 * S + derived.length + extraKeys.length

  // Perfiles con claves distintas entre si -> formulas que fallan solo para algunos.
  for (const p of t.baseProfiles.slice(1)) {
    for (const k of Object.keys(p.base ?? {})) {
      if (!varIndex.has(`base_${k}`)) {
        warn('W_PERFIL', `El perfil "${p.id}" declara "${k}", que el primer perfil no tiene. Las formulas que lo usen se romperan en los demas perfiles.`, p.id)
      }
    }
    for (const k of extraKeys) {
      if (p.base?.[k] === undefined) {
        warn('W_PERFIL_FALTA', `El perfil "${p.id}" no declara "${k}"; se usara 0.`, p.id)
      }
    }
  }

  // ------------------------------------------------------- 4. compilacion
  const compiled = new Map<string, (v: Float64Array) => number>()
  const tryCompile = (id: string, formula: string, kind: string) => {
    try {
      compiled.set(id, compileFormula(formula, varIndex))
      return true
    } catch (e) {
      err('E_FORMULA', e instanceof FormulaError ? e.message : String(e), `${kind} "${id}"`)
      return false
    }
  }
  for (const d of derived) tryCompile(d.id, d.formula, 'derivado')
  for (const o of t.objectives) tryCompile(o.id, o.formula, 'objetivo')

  // Identificadores que no son ni variables ni funciones conocidas.
  const KNOWN_FN = new Set(['min', 'max', 'floor', 'ceil', 'round', 'abs', 'sqrt', 'clamp'])
  for (const { id, formula, kind } of [
    ...derived.map((d) => ({ id: d.id, formula: d.formula, kind: 'derivado' })),
    ...t.objectives.map((o) => ({ id: o.id, formula: o.formula, kind: 'objetivo' })),
  ]) {
    for (const m of formula.matchAll(IDENT)) {
      if (!varIndex.has(m[0]) && !KNOWN_FN.has(m[0])) {
        err('E_VAR', `Usa "${m[0]}", que no es una estadistica, ni base_*, ni un derivado, ni una funcion.`, `${kind} "${id}"`)
      }
    }
  }

  // ------------------------------- 4b. modos, presupuestos y requisitos
  for (const st of t.stats) {
    if (st.aggregate !== undefined && st.aggregate !== 'sum' && st.aggregate !== 'multiply') {
      err('E_AGREGADO', `aggregate debe ser "sum" o "multiply", no "${st.aggregate}".`, st.id)
    }
  }
  const mulStats = new Set(t.stats.filter((x) => x.aggregate === 'multiply').map((x) => x.id))
  if (mulStats.size > 0) {
    info('I_MULTIPLICA', `Acumulan multiplicando: ${[...mulStats].join(', ')}. En las formulas llegan ya como multiplicador (1,69), no como porcentaje.`)
  }
  for (const b of t.budgets ?? []) {
    if (!statIds.has(b.statId)) {
      err('E_PRESUPUESTO', `El presupuesto apunta a "${b.statId}", que no es una estadistica declarada.`)
    } else if (mulStats.has(b.statId)) {
      warn('W_PRESUPUESTO_MUL', `"${b.statId}" acumula multiplicando; un presupuesto sobre ella se compara contra el multiplicador, no contra una suma.`, b.statId)
    }
    if (!(b.max > 0)) warn('W_PRESUPUESTO_CERO', `El presupuesto de "${b.statId}" es ${b.max}.`, b.statId)
    if (!t.constrainableStats.includes(b.statId)) {
      info('I_PRESUPUESTO_UI', `"${b.statId}" tiene presupuesto pero no esta en constrainableStats, asi que la interfaz no deja ajustarlo.`, b.statId)
    }
  }

  // ------------------------------------------------------ 5. conjuntos
  for (const s of sets) {
    if (!Array.isArray(s.tiers) || s.tiers.length === 0) {
      warn('W_SET_VACIO', `El conjunto "${s.name ?? s.id}" no otorga ningun bono.`, s.id)
      continue
    }
    let prev = 0
    for (const tier of s.tiers) {
      if (tier.pieces > t.slots.length) {
        err('E_SET_PIEZAS', `Pide ${tier.pieces} piezas pero el juego solo tiene ${t.slots.length} ranuras.`, s.id)
      }
      if (tier.pieces <= prev) {
        warn('W_SET_ORDEN', `Los escalones de "${s.name ?? s.id}" no van de menos a mas piezas.`, s.id)
      }
      prev = tier.pieces
      for (const k of Object.keys(tier.effects ?? {})) {
        if (!statIds.has(k)) err('E_SET_STAT', `Otorga "${k}", que no es una estadistica declarada.`, s.id)
      }
    }
  }

  // ------------------------------------- 6. sanidad numerica y monotonia
  const objectiveFns = t.objectives.filter((o) => compiled.has(o.id))
  const derivedOk = derived.every((d) => compiled.has(d.id))
  let monotonicOk = 0

  if (derivedOk && objectiveFns.length > 0) {
    const vars = new Float64Array(total)
    for (let i = 0; i < S; i++) vars[S + i] = profile.base?.[t.stats[i].id] ?? 0
    extraKeys.forEach((k, i) => { vars[2 * S + derived.length + i] = profile.base?.[k] ?? 0 })

    const evalObj = (o: string, x: Float64Array): number => {
      for (let i = 0; i < S; i++) vars[i] = x[i]
      for (let i = 0; i < derived.length; i++) vars[2 * S + i] = compiled.get(derived[i].id)!(vars)
      return compiled.get(o)!(vars)
    }

    let seed = 1234567
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648

    for (const o of objectiveFns) {
      const x = new Float64Array(S)
      let bad = ''
      let nan = false
      for (let iter = 0; iter < 1500 && !bad && !nan; iter++) {
        for (let i = 0; i < S; i++) x[i] = rnd() * 200
        const base = evalObj(o.id, x)
        if (!Number.isFinite(base)) { nan = true; break }
        for (let i = 0; i < S; i++) {
          const old = x[i]
          x[i] = old + 1 + rnd() * 40
          const up = evalObj(o.id, x)
          x[i] = old
          if (!Number.isFinite(up)) { nan = true; break }
          if (up < base - 1e-9) { bad = t.stats[i].id; break }
        }
      }

      if (nan) {
        err('E_NAN', 'Produce NaN o infinito con valores normales. Suele ser una division por cero.', `objetivo "${o.id}"`)
      } else if (bad) {
        if (o.monotonic) {
          err('E_MONOTONIA', `Esta declarado como monotonic: true pero BAJA cuando sube "${bad}". El optimizador podaria mal y podria perder el optimo. Declaralo monotonic: false.`, `objetivo "${o.id}"`)
        } else {
          warn('W_NO_MONOTONO', `No es monotono (baja con "${bad}"). Se puede calcular, pero el motor actual no puede DEMOSTRAR el optimo sobre el.`, `objetivo "${o.id}"`)
        }
      } else {
        monotonicOk++
        if (!o.monotonic) {
          info('I_MONOTONO', 'Parece monotono. Si lo declaras monotonic: true, el optimizador podra demostrar el optimo.', `objetivo "${o.id}"`)
        }
      }
    }
  }

  // ------------------------------------------------ 7. cobertura de items
  let searchSpace: number | undefined
  if (items && items.length > 0) {
    searchSpace = 1
    for (const slot of t.slots) {
      const n = items.filter((i) => i.slot === slot.id).length
      if (n === 0) err('E_RANURA_VACIA', `Ninguna pieza del inventario ocupa la ranura "${slot.name}".`, slot.id)
      searchSpace *= Math.max(n, 1)
    }
    const unknownStats = new Set<string>()
    const unknownSets = new Set<string>()
    const unknownReqs = new Set<string>()
    const groupSlots = new Map<string, Set<string>>()
    let unmeetable = 0
    const baseKeys = new Set([...Object.keys(profile.base ?? {}), ...statIds])
    for (const it of items) {
      for (const k of Object.keys(it.stats)) if (!statIds.has(k)) unknownStats.add(k)
      if (it.setId && !sets.some((s) => s.id === it.setId)) unknownSets.add(it.setId)
      for (const [k, need] of Object.entries(it.requires ?? {})) {
        if (!baseKeys.has(k)) unknownReqs.add(k)
        else if (t.baseProfiles.every((p) => (p.base?.[k] ?? 0) < need)) unmeetable++
      }
      if (it.exclusiveGroup) {
        const g = groupSlots.get(it.exclusiveGroup) ?? new Set<string>()
        g.add(it.slot); groupSlots.set(it.exclusiveGroup, g)
      }
    }
    if (unknownReqs.size > 0) {
      err('E_REQUISITO', `Hay piezas que exigen "${[...unknownReqs].slice(0, 5).join(', ')}", que ningun perfil declara. Esas piezas nunca se podran equipar.`)
    }
    if (unmeetable > 0) {
      warn('W_REQUISITO_IMPOSIBLE', `${unmeetable} requisito(s) que NINGUN perfil de la plantilla alcanza. Esas piezas son inalcanzables para todos.`)
    }
    const solitarios = [...groupSlots.entries()].filter(([, sl]) => sl.size < 2).length
    if (solitarios > 0) {
      info('I_GRUPO_SOLO', `${solitarios} grupo(s) de exclusion solo aparecen en una ranura, asi que no impiden nada. La exclusion sirve cuando varias ranuras comparten inventario.`)
    }
    if (unknownStats.size > 0) {
      warn('W_STAT_DESCONOCIDA', `El inventario trae estadisticas que la plantilla no declara y que se ignoran: ${[...unknownStats].slice(0, 8).join(', ')}${unknownStats.size > 8 ? '…' : ''}`)
    }
    if (unknownSets.size > 0) {
      warn('W_SET_DESCONOCIDO', `Hay conjuntos en el inventario sin definir en la plantilla (no daran bono): ${[...unknownSets].slice(0, 6).join(', ')}${unknownSets.size > 6 ? '…' : ''}`)
    }
    if (searchSpace > 1e14) {
      warn('W_ESPACIO', `El espacio de busqueda es de ~${searchSpace.toExponential(1)} combinaciones. Puede que no de tiempo a demostrar el optimo.`)
    }
  }

  // ---------------------------------------------------- 8. autopruebas
  const tests: SelfTest[] = t.selfTests ?? []
  if (tests.length === 0 && !issues.some((i) => i.severity === 'error')) {
    warn('W_SIN_PRUEBAS', 'La plantilla no trae autopruebas. En un catalogo comunitario, una plantilla sin pruebas no deberia poder publicarse: es la unica forma automatica de distinguir una plantilla correcta de una que devuelve numeros equivocados con total confianza.')
  }
  for (const test of tests) {
    try {
      const r = solve({
        template: { ...t, derived },
        items: test.items,
        profileId: test.profileId,
        objectiveId: test.objectiveId,
        constraints: [],
        topN: 1,
      }, { deadlineMs: 4000 })
      if (r.builds.length === 0) {
        selfTests.push({ name: test.name, passed: false, detail: 'No devolvio ninguna build.' })
        continue
      }
      const b = r.builds[0]
      const tol = test.tolerance ?? 0.01
      const fails: string[] = []
      if (test.expectScore !== undefined && Math.abs(b.score - test.expectScore) > tol) {
        fails.push(`puntaje ${b.score.toFixed(4)} ≠ ${test.expectScore}`)
      }
      for (const [k, v] of Object.entries(test.expectStats ?? {})) {
        const got = b.finalStats[k]
        if (got === undefined || Math.abs(got - v) > tol) fails.push(`${k} ${got?.toFixed(2) ?? '—'} ≠ ${v}`)
      }
      selfTests.push({
        name: test.name,
        passed: fails.length === 0,
        detail: fails.length === 0 ? 'correcto' : fails.join(' · '),
      })
    } catch (e) {
      selfTests.push({ name: test.name, passed: false, detail: (e as Error).message })
    }
  }
  const failed = selfTests.filter((s) => !s.passed).length
  if (failed > 0) err('E_PRUEBAS', `${failed} de ${selfTests.length} autopruebas fallan.`)

  return {
    ok: !issues.some((i) => i.severity === 'error'),
    issues,
    selfTests,
    summary: {
      stats: t.stats.length, slots: t.slots.length, sets: sets.length,
      objectives: t.objectives.length, monotonicOk, profiles: t.baseProfiles.length,
      searchSpace,
    },
  }
}
