/**
 * Evalua un equipo concreto con el motor (solve + explainBuild), para la hoja
 * de personaje y la evolucion por nivel. Mismos numeros que el optimizador.
 */
import type { GameTemplate, Item, SkillSelection } from '../core/types'
import { explainBuild, solve } from '../core/optimizer'
import type { Equipment } from '../store/equipment'

export interface Evaluacion {
  /** Estadisticas finales (base + equipo + conjuntos + habilidades). */
  finalStats: Record<string, number>
  /** Todas las variables: estadisticas, base_*, derivados, skill_*. */
  vars: Map<string, number>
  /** Valor de cada objetivo. */
  objetivos: Record<string, number>
  conjuntos: { name: string; pieces: number; tiers: string[] }[]
}

/** Evalua un equipo concreto con el motor. Cada ranura lleva su pieza o va vacia. */
export function evaluar(t: GameTemplate, items: Item[], eq: Equipment, profileId: string, skills: SkillSelection): Evaluacion | string {
  const byId = new Map(items.map((i) => [i.id, i]))
  // Cada pieza solo puede ir en la ranura donde el jugador la puso; las ranuras sin
  // pieza se vuelven opcionales. Sin presupuestos ni requisitos: la hoja muestra lo
  // que hay puesto (los requisitos se avisan aparte).
  const tpl: GameTemplate = { ...t, budgets: [], slots: t.slots.map((s) => ({ ...s, optional: !byId.get(eq[s.id] ?? '') })) }
  const piezas: Item[] = []
  for (const s of t.slots) {
    const it = byId.get(eq[s.id] ?? '')
    if (it) piezas.push({ ...it, id: `${it.id}@${s.id}`, slot: s.id, slots: undefined, exclusiveGroup: undefined, requires: undefined })
  }
  try {
    const objetivos: Record<string, number> = {}
    let primera: ReturnType<typeof solve>['builds'][number] | undefined
    for (const o of t.objectives) {
      const r = solve({ template: tpl, items: piezas, profileId, objectiveId: o.id, constraints: [], topN: 1, skills }, { deadlineMs: 2000 })
      const b = r.builds[0]
      if (!b) continue
      objetivos[o.id] = b.score
      primera ??= b
    }
    if (!primera) return 'No se pudo evaluar este equipo.'
    const vars = explainBuild(tpl, profileId, t.objectives[0].id, primera.finalStats, skills)
    return { finalStats: primera.finalStats, vars, objetivos, conjuntos: primera.activeSets }
  } catch (e) {
    return (e as Error).message
  }
}

export const conDelta = (t: GameTemplate, profileId: string, delta: Record<string, number>): GameTemplate => ({
  ...t,
  baseProfiles: t.baseProfiles.map((p) => (p.id !== profileId ? p : {
    ...p, base: Object.fromEntries(Object.entries(p.base).map(([k, v]) => [k, v + (delta[k] ?? 0)])),
  })),
})

/** La plantilla con los valores base de un perfil reemplazados (perfil proyectado o historico). */
export const conBase = (t: GameTemplate, profileId: string, base: Record<string, number>): GameTemplate => ({
  ...t,
  baseProfiles: t.baseProfiles.map((p) => (p.id !== profileId ? p : { ...p, base: { ...base } })),
})

/**
 * Puntaje de un objetivo con el equipo puesto, en funcion de los valores base
 * del perfil. Para repartir puntos de nivel: el equipo se resuelve una vez y
 * despues solo se recalculan las formulas con cada reparto candidato.
 */
export function scorer(
  t: GameTemplate, items: Item[], eq: Equipment, profileId: string, skills: SkillSelection, objectiveId: string,
): ((base: Record<string, number>) => number) | null {
  const e = evaluar(t, items, eq, profileId, skills)
  if (typeof e === 'string') return null
  const p0 = t.baseProfiles.find((p) => p.id === profileId)
  if (!p0) return null
  const statIds = new Set(t.stats.map((s) => s.id))
  return (base) => {
    // Si un atributo es tambien una estadistica, su valor final se mueve con la base.
    const fin = { ...e.finalStats }
    for (const k of Object.keys(base)) if (statIds.has(k)) fin[k] = (fin[k] ?? 0) + (base[k] - (p0.base[k] ?? 0))
    const v = explainBuild(conBase(t, profileId, base), profileId, objectiveId, fin, skills).get(objectiveId)
    return v === undefined || !Number.isFinite(v) ? -Infinity : v
  }
}
