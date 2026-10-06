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

import { compileFormula, formulaVariables, FormulaError } from './formula'
import { findMonotonicViolation, SKILL_SLOT, solve, topoSortDerived } from './optimizer'
import { checkSelection, checkSkillTrees, skillVariables } from './skills'
import { checkLeveling, maxReachable } from './leveling'
import { checkCurves } from './curves'
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
  if (t.slots.some((s) => s?.id === SKILL_SLOT)) err('E_RANURA_RESERVADA', `"${SKILL_SLOT}" es un id reservado para las habilidades.`, SKILL_SLOT)
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
  // Niveles y curvas de crecimiento.
  const niveles = checkLeveling(t)
  for (const m of niveles.errors) err('E_NIVELES', m)
  for (const m of niveles.warnings) warn('W_NIVELES', m)
  const curvas = checkCurves(t)
  for (const m of curvas.errors) err('E_CURVA', m)
  for (const m of curvas.warnings) warn('W_CURVA', m)

  // Habilidades: `skill_<id>` vale el rango elegido (0 en la validacion).
  const arboles = checkSkillTrees(t)
  for (const p of arboles.errors) err('E_HABILIDAD', p.message, p.nodeId ?? p.treeId)
  for (const p of arboles.warnings) warn('W_HABILIDAD', p.message, p.nodeId ?? p.treeId)
  const skillVars = arboles.errors.length ? [] : skillVariables(t)
  skillVars.forEach(([name], j) => varIndex.set(name, 2 * S + derived.length + extraKeys.length + j))
  const total = 2 * S + derived.length + extraKeys.length + skillVars.length

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

  // Identificadores que no son variables conocidas. Las formulas que no se
  // pudieron analizar ya tienen su E_FORMULA; no se repite el error.
  for (const { id, formula, kind } of [
    ...derived.map((d) => ({ id: d.id, formula: d.formula, kind: 'derivado' })),
    ...t.objectives.map((o) => ({ id: o.id, formula: o.formula, kind: 'objetivo' })),
  ]) {
    let vars: string[] = []
    try { vars = formulaVariables(formula) } catch { continue }
    for (const v of vars) {
      if (!varIndex.has(v)) {
        err('E_VAR', v.startsWith('skill_')
          ? `Usa "${v}", pero no hay ninguna habilidad con id "${v.slice(6)}".`
          : `Usa "${v}", que no es una estadistica, ni base_*, ni un derivado, ni una habilidad (skill_*), ni una funcion.`, `${kind} "${id}"`)
      }
    }
  }

  // Un nodo sin efectos que ninguna formula menciona no hace nada.
  if (!arboles.errors.length && t.skillTrees?.length) {
    const usadas = new Set<string>()
    for (const f of [...derived.map((d) => d.formula), ...t.objectives.map((o) => o.formula)]) {
      try { for (const v of formulaVariables(f)) usadas.add(v) } catch { /* ya informado */ }
    }
    // Es normal en juegos reales (un hechizo de control no cambia estadisticas),
    // asi que va como informacion agrupada, no como un aviso por nodo.
    const sinEfecto = t.skillTrees.flatMap((tree) => tree.nodes)
      .filter((n) => Object.keys(n.effects ?? {}).length === 0 && !usadas.has(`skill_${n.id}`))
    if (sinEfecto.length > 0) {
      info('I_HABILIDAD_SIN_EFECTO', `${sinEfecto.length} habilidad(es) no cambian estadisticas ni las usa ninguna formula, asi que no afectan al calculo: ${sinEfecto.slice(0, 5).map((n) => n.name).join(', ')}${sinEfecto.length > 5 ? '…' : ''}.`)
    }
  }

  // ------------------------------- 4b. modos, presupuestos y requisitos
  for (const st of t.stats) {
    if (st.aggregate !== undefined && st.aggregate !== 'sum' && st.aggregate !== 'multiply') {
      err('E_AGREGADO', `aggregate debe ser "sum" o "multiply", no "${st.aggregate}".`, st.id)
    }
  }
  const mulStats = new Set(t.stats.filter((x) => x.aggregate === 'multiply').map((x) => x.id))
  if (t.requirementsFrom !== undefined && t.requirementsFrom !== 'base' && t.requirementsFrom !== 'final') {
    err('E_REQUISITOS_MODO', `requirementsFrom debe ser "base" o "final", no "${t.requirementsFrom}".`)
  }
  for (const s of sets) {
    for (const tier of s.tiers ?? []) {
      for (const [k, v] of Object.entries(tier.effects ?? {})) {
        if (mulStats.has(k) && v <= -100) {
          warn('W_MULTIPLICA_NEGATIVO', `Otorga ${v}% a "${k}", que acumula multiplicando: el factor queda en cero o negativo y el motor no puede acotarlo bien.`, s.id)
        }
      }
    }
  }
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

    // Misma prueba que corre el optimizador, aqui sobre una caja generica
    // (0..200 por estadistica) porque la plantilla se valida sin inventario.
    const lo = new Float64Array(S)
    const hi = new Float64Array(S).fill(200)

    for (const o of objectiveFns) {
      const bad = findMonotonicViolation((x) => evalObj(o.id, x), lo, hi, 1500)
      if (bad === 'nan') {
        err('E_NAN', 'Produce NaN o infinito con valores normales. Suele ser una division por cero.', `objetivo "${o.id}"`)
      } else if (bad !== null) {
        const stat = t.stats[bad].id
        if (o.monotonic === true) {
          warn('W_MONOTONIA', `Esta declarado como monotonic: true pero BAJA cuando sube "${stat}". El optimizador no se fia de la declaracion (analiza la formula) y el resultado sigue siendo exacto, pero conviene declararlo monotonic: false.`, `objetivo "${o.id}"`)
        } else {
          info('I_NO_MONOTONO', `No es monotono (baja con "${stat}"). El optimizador lo tiene en cuenta: si cada estadistica tiene una direccion fija (sube o baja) usa la cota rapida, y si alguna \"depende\" acota por intervalos. En los dos casos el optimo se demuestra.`, `objetivo "${o.id}"`)
        }
      } else {
        monotonicOk++
        if (o.monotonic === false) {
          info('I_MONOTONO', 'Parece monotono. Si lo declaras monotonic: true, el optimizador podra usar la cota rapida.', `objetivo "${o.id}"`)
        }
      }
    }
  }

  // ------------------------------------------------ 7. cobertura de items
  let searchSpace: number | undefined
  if (items && items.length > 0) {
    searchSpace = 1
    const fits = (i: Item, slotId: string) => i.slot === slotId || (i.slots ?? []).includes(slotId)
    for (const slot of t.slots) {
      const n = items.filter((i) => fits(i, slot.id)).length + (slot.optional ? 1 : 0)
      if (n === 0) err('E_RANURA_VACIA', `Ninguna pieza del inventario ocupa la ranura "${slot.name}" y no es opcional.`, slot.id)
      searchSpace *= Math.max(n, 1)
    }
    const slotIdSet = new Set(t.slots.map((s) => s.id))
    const badSlots = new Set<string>()
    for (const it of items) for (const sl of [it.slot, ...(it.slots ?? [])]) if (!slotIdSet.has(sl)) badSlots.add(sl)
    if (badSlots.size > 0) {
      warn('W_RANURA_DESCONOCIDA', `Hay piezas que apuntan a ranuras que la plantilla no declara (se ignoran esas ranuras): ${[...badSlots].slice(0, 6).join(', ')}`)
    }
    const negMul = items.filter((it) => Object.entries(it.stats).some(([k, v]) => mulStats.has(k) && v <= -100)).length
    if (negMul > 0) {
      warn('W_MULTIPLICA_NEGATIVO', `${negMul} pieza(s) dan -100% o menos a una estadistica que acumula multiplicando: el factor queda en cero o negativo y el motor no puede acotarlo bien.`)
    }
    const unknownStats = new Set<string>()
    const unknownSets = new Set<string>()
    const unknownReqs = new Set<string>()
    const groupSlots = new Map<string, Set<string>>()
    let unmeetable = 0
    const techos = new Map(t.baseProfiles.map((p) => [p.id, maxReachable(t, p)]))
    const techo = (p: { id: string }, k: string) => techos.get(p.id)?.[k] ?? -Infinity
    const baseKeys = new Set([...Object.keys(profile.base ?? {}), ...statIds])
    for (const it of items) {
      for (const k of Object.keys(it.stats)) if (!statIds.has(k)) unknownStats.add(k)
      if (it.setId && !sets.some((s) => s.id === it.setId)) unknownSets.add(it.setId)
      for (const [k, need] of Object.entries(it.requires ?? {})) {
        if (!baseKeys.has(k)) unknownReqs.add(k)
        // Contra la build final, el equipo puede cubrir lo que la base no alcanza.
        else if (t.requirementsFrom === 'final' && statIds.has(k)) continue
        // Con niveles cuenta lo que el perfil puede alcanzar subiendo, no solo lo que tiene hoy.
        else if (t.baseProfiles.every((p) => Math.max(p.base?.[k] ?? 0, techo(p, k)) < need)) unmeetable++
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
      warn('W_REQUISITO_IMPOSIBLE', `${unmeetable} requisito(s) que NINGUN perfil de la plantilla alcanza${t.leveling ? ' ni subiendo al nivel máximo' : ''}. Esas piezas son inalcanzables para todos.`)
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
      if (test.skills) {
        const malas = checkSelection(t, test.skills)
        if (malas.length) { selfTests.push({ name: test.name, passed: false, detail: `Habilidades invalidas: ${malas[0].message}` }); continue }
      }
      const r = solve({
        template: { ...t, derived },
        items: test.items,
        profileId: test.profileId,
        objectiveId: test.objectiveId,
        constraints: [],
        topN: 1,
        skills: test.skills,
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
