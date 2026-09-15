/**
 * Inferencia de plantilla y recetas de formula
 * ============================================
 * El objetivo es que alguien pueda anadir un juego sin escribir JSON ni
 * matematicas. Dos ideas:
 *
 *  1. DATOS PRIMERO. En vez de pedir que declare 20 estadisticas y 5 ranuras,
 *     se le pide que pegue su tabla de objetos y el sistema DEDUCE la
 *     estructura: cada columna numerica es una estadistica, los valores
 *     distintos de la columna de tipo son las ranuras, los de la columna de
 *     familia son los conjuntos. El usuario revisa y corrige, no redacta.
 *
 *  2. RECETAS DE FORMULA. Las formulas de casi todos los juegos son variaciones
 *     de un punado de formas. En vez de escribir matematicas, se elige una
 *     receta y se rellenan sus huecos con menus desplegables.
 */

import type { GameTemplate, ObjectiveDef, StatDef } from '../core/types'
import type { ColumnRole, ParsedTable } from './tableImport'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const toId = (s: string): string => {
  const base = norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return base || 'campo'
}

const isNumeric = (v: string): boolean => {
  if (!v || !v.trim()) return true // vacio no descalifica
  return /^[+-]?[\d.,\s]+%?$/.test(v.trim())
}

export interface Inferred {
  stats: StatDef[]
  slots: { id: string; name: string }[]
  sets: { id: string; name: string; tiers: [] }[]
  roles: ColumnRole[]
  notes: string[]
}

/**
 * Deduce estadisticas, ranuras y conjuntos a partir de la tabla pegada.
 * `hints` permite decir que columna es el nombre, la ranura o el conjunto.
 */
export function inferTemplateFromTable(
  table: ParsedTable,
  hints: { nameCol?: number; slotCol?: number; setCol?: number } = {},
): Inferred {
  const notes: string[] = []
  const NAME_W = ['nombre', 'name', 'item', 'objeto', 'pieza']
  const SLOT_W = ['ranura', 'slot', 'tipo', 'type', 'parte', 'categoria']
  const SET_W = ['conjunto', 'set', 'familia', 'family']

  let nameCol = hints.nameCol
  let slotCol = hints.slotCol
  let setCol = hints.setCol

  table.headers.forEach((h, c) => {
    const n = norm(h)
    if (nameCol === undefined && NAME_W.some((w) => n.includes(w))) nameCol = c
    else if (slotCol === undefined && SLOT_W.some((w) => n.includes(w))) slotCol = c
    else if (setCol === undefined && SET_W.some((w) => n.includes(w))) setCol = c
  })

  // Si no hay columna de nombre, se usa la primera que no sea numerica.
  if (nameCol === undefined) {
    for (let c = 0; c < table.headers.length; c++) {
      if (c === slotCol || c === setCol) continue
      const muestras = table.rows.slice(0, 20).map((r) => r[c] ?? '')
      if (!muestras.every(isNumeric)) { nameCol = c; break }
    }
  }

  const stats: StatDef[] = []
  const roles: ColumnRole[] = table.headers.map(() => ({ kind: 'ignore' }))
  const usedIds = new Set<string>()

  table.headers.forEach((h, c) => {
    if (c === nameCol) { roles[c] = { kind: 'name' }; return }
    if (c === slotCol) { roles[c] = { kind: 'slot' }; return }
    if (c === setCol) { roles[c] = { kind: 'set' }; return }

    const muestras = table.rows.slice(0, 30).map((r) => r[c] ?? '')
    const conDatos = muestras.filter((v) => v.trim().length > 0)
    if (conDatos.length === 0 || !conDatos.every(isNumeric)) {
      notes.push(`La columna "${h}" no parece numerica; se ignora. Puedes cambiarlo abajo.`)
      return
    }
    let id = toId(h)
    let n = 2
    while (usedIds.has(id)) id = `${toId(h)}_${n++}`
    usedIds.add(id)
    const esPorcentaje = conDatos.some((v) => v.includes('%')) || /%|porcent|prob|rate|chance/.test(norm(h))
    stats.push({ id, name: h || id, unit: esPorcentaje ? 'percent' : 'flat' })
    roles[c] = { kind: 'stat', statId: id }
  })

  const distinct = (c: number | undefined): string[] => {
    if (c === undefined) return []
    const set = new Set<string>()
    for (const r of table.rows) { const v = (r[c] ?? '').trim(); if (v) set.add(v) }
    return [...set]
  }

  const slotNames = distinct(slotCol)
  const slots = slotNames.length > 0
    ? slotNames.map((v) => ({ id: toId(v), name: v }))
    : [{ id: 'unica', name: 'Ranura unica' }]
  if (slotNames.length === 0) {
    notes.push('No se detecto una columna de ranura: todos los objetos van a una sola ranura. Elige la columna correcta si no es asi.')
  }

  const sets = distinct(setCol).map((v) => ({ id: toId(v), name: v, tiers: [] as [] }))
  if (sets.length > 0) {
    notes.push(`Se detectaron ${sets.length} conjuntos. Quedan sin bonos: puedes anadirselos despues.`)
  }

  return { stats, slots, sets, roles, notes }
}

/* ------------------------------------------------------------------ recetas */

export interface RecipeInput {
  key: string
  label: string
  help: string
  /** Que unidad encaja mejor en este hueco. */
  prefer?: 'percent' | 'flat'
  optional?: boolean
  /** Palabras que, si aparecen en el nombre de una estadistica, la hacen buena candidata. */
  match?: string[]
  /** Palabras que la descartan: sirven para no confundir "prob. critico" con "dano critico". */
  avoid?: string[]
}

export interface Recipe {
  id: string
  name: string
  summary: string
  kind: 'linear' | 'nonlinear'
  inputs: RecipeInput[]
  build: (p: Record<string, string>) => { derived: GameTemplate['derived']; objective: ObjectiveDef }
}

/** `x` si existe la estadistica, si no un neutro para la operacion. */
const or0 = (id?: string) => (id ? id : '0')

export const RECIPES: Recipe[] = [
  {
    id: 'simple',
    name: 'Maximizar una estadistica',
    summary: 'Lo mas directo: la build que da mas de una sola cosa. Vida, defensa, ataque…',
    kind: 'linear',
    inputs: [{ key: 'stat', label: 'Que quieres maximizar', help: 'La estadistica a llevar al maximo.' }],
    build: (p) => ({
      derived: [{ id: 'total', name: 'Total', formula: `base_${p.stat} + ${p.stat}` }],
      objective: {
        id: 'objetivo', name: 'Maximo total', kind: 'linear', monotonic: true, decimals: 1,
        description: 'Suma lineal pura de la estadistica elegida mas su valor base.',
        formula: 'total',
      },
    }),
  },
  {
    id: 'pesos',
    name: 'Suma con pesos',
    summary: 'Varias estadisticas, cada una con su importancia. Es como se optimiza en WoW.',
    kind: 'linear',
    inputs: [
      { key: 'a', label: 'Estadistica principal', help: 'La que mas vale. Peso 1.' },
      { key: 'b', label: 'Segunda estadistica', help: 'Vale 0,7 respecto a la principal. Vacio si no aplica.', optional: true },
      { key: 'c', label: 'Tercera estadistica', help: 'Vale 0,5 respecto a la principal. Vacio si no aplica.', optional: true },
    ],
    build: (p) => ({
      derived: [{
        id: 'puntaje', name: 'Puntaje ponderado',
        formula: `(base_${p.a} + ${p.a})` +
          (p.b ? ` + (base_${p.b} + ${p.b}) * 0.7` : '') +
          (p.c ? ` + (base_${p.c} + ${p.c}) * 0.5` : ''),
      }],
      objective: {
        id: 'objetivo', name: 'Puntaje ponderado', kind: 'linear', monotonic: true, decimals: 1,
        description: 'Suma de varias estadisticas, cada una con su peso relativo.',
        formula: 'puntaje',
      },
    }),
  },
  {
    id: 'critico',
    name: 'Dano con golpe critico',
    summary: 'Ataque multiplicado por el critico. Es la forma mas comun en RPGs y gacha, y NO es lineal: el optimo no es la suma de los mejores individuales.',
    kind: 'nonlinear',
    inputs: [
      { key: 'atk', label: 'Ataque plano', help: 'El ataque que suman las piezas.', prefer: 'flat',
        match: ['ataque', 'atk', 'attack', 'poder', 'power', 'dano', 'damage'], avoid: ['critico', 'crit'] },
      { key: 'atkPct', label: 'Ataque en %', help: 'Multiplica el ataque base. Dejalo vacio si tu juego no lo tiene.', prefer: 'percent', optional: true,
        match: ['ataque', 'atk', 'attack'], avoid: ['critico', 'crit', 'prob', 'rate'] },
      { key: 'cr', label: 'Probabilidad de critico (%)', help: 'Se limita a 100 automaticamente.', prefer: 'percent',
        match: ['prob', 'rate', 'chance', 'probabilidad'], avoid: ['dano critico', 'crit dmg', 'critical damage'] },
      { key: 'cd', label: 'Dano critico (%)', help: 'Cuanto pega de mas un critico.', prefer: 'percent',
        match: ['dano critico', 'crit dmg', 'critical damage', 'dmg critico'], avoid: ['prob', 'rate', 'chance'] },
      { key: 'bonus', label: 'Bono de dano (%)', help: 'Cualquier aumento porcentual extra. Vacio si no aplica.', prefer: 'percent', optional: true,
        match: ['bono', 'bonus', 'aumento', 'increased'], avoid: ['critico', 'crit', 'ataque', 'atk'] },
    ],
    build: (p) => ({
      derived: [
        {
          id: 'ataqueTotal', name: 'Ataque total',
          formula: p.atkPct
            ? `base_${p.atk} * (1 + ${p.atkPct}/100) + ${p.atk}`
            : `base_${p.atk} + ${p.atk}`,
        },
        { id: 'critEfectivo', name: 'Critico efectivo', formula: `min(base_${p.cr} + ${p.cr}, 100)` },
        { id: 'danoCritico', name: 'Dano critico total', formula: `base_${p.cd} + ${p.cd}` },
        { id: 'multCritico', name: 'Multiplicador critico', formula: '1 + (critEfectivo/100) * (danoCritico/100)' },
      ],
      objective: {
        id: 'objetivo', name: 'Dano por golpe', kind: 'nonlinear', monotonic: true, decimals: 1,
        description: 'Ataque x multiplicador critico' + (p.bonus ? ' x bono de dano' : '') +
          '. No lineal: el producto entre probabilidad y dano critico hace que el optimo no sea evidente.',
        formula: `ataqueTotal * multCritico${p.bonus ? ` * (1 + ${p.bonus}/100)` : ''}`,
      },
    }),
  },
  {
    id: 'tanque',
    name: 'Supervivencia',
    summary: 'Mezcla vida y defensa en un solo indice, para builds resistentes.',
    kind: 'nonlinear',
    inputs: [
      { key: 'hp', label: 'Vida plana', help: 'La vida que suman las piezas.', prefer: 'flat',
        match: ['vida', 'hp', 'life', 'salud', 'health'] },
      { key: 'hpPct', label: 'Vida en %', help: 'Multiplica la vida base. Vacio si no aplica.', prefer: 'percent', optional: true,
        match: ['vida', 'hp', 'life', 'salud'] },
      { key: 'def', label: 'Defensa', help: 'Cada punto vale como 20 de vida.', prefer: 'flat',
        match: ['defensa', 'def', 'armor', 'armadura', 'resist'] },
      { key: 'def2', label: 'Otra defensa', help: 'Si el juego separa fisica y magica. Vacio si no aplica.', prefer: 'flat', optional: true,
        match: ['defensa', 'def', 'resist', 'armor'] },
    ],
    build: (p) => ({
      derived: [
        {
          id: 'vidaTotal', name: 'Vida total',
          formula: p.hpPct ? `base_${p.hp} * (1 + ${p.hpPct}/100) + ${p.hp}` : `base_${p.hp} + ${p.hp}`,
        },
        {
          id: 'defensaTotal', name: 'Defensa total',
          formula: `base_${p.def} + ${p.def}` + (p.def2 ? ` + base_${p.def2} + ${p.def2}` : ''),
        },
      ],
      objective: {
        id: 'objetivo', name: 'Supervivencia', kind: 'nonlinear', monotonic: true, decimals: 0,
        description: 'Vida total mas defensa total valorada a 20 de vida por punto.',
        formula: 'vidaTotal + defensaTotal * 20',
      },
    }),
  },
  {
    id: 'producto',
    name: 'Producto de multiplicadores',
    summary: 'Para juegos donde varios porcentajes se multiplican entre si en vez de sumarse, como los modificadores "more" de Path of Exile.',
    kind: 'nonlinear',
    inputs: [
      { key: 'base', label: 'Valor base', help: 'El dano o valor de partida.', prefer: 'flat',
        match: ['dano', 'damage', 'ataque', 'atk', 'base'] },
      { key: 'suma', label: 'Aumentos que SE SUMAN (%)', help: 'Se acumulan sumandose entre ellos. Vacio si no aplica.', prefer: 'percent', optional: true,
        match: ['increased', 'aumento', 'suma', 'aditivo'] },
      { key: 'mult', label: 'Aumentos que SE MULTIPLICAN (%)', help: 'Cada fuente multiplica por separado. Se marcara en modo multiplicativo.', prefer: 'percent',
        match: ['more', 'multiplic', 'mult'] },
    ],
    build: (p) => ({
      derived: [{
        id: 'valorBase', name: 'Valor base', formula: `base_${p.base} + ${p.base}`,
      }],
      objective: {
        id: 'objetivo', name: 'Valor final', kind: 'nonlinear', monotonic: true, decimals: 1,
        description: 'Los aumentos aditivos se suman entre si; los multiplicativos multiplican por separado.',
        formula: `valorBase${p.suma ? ` * (1 + ${or0(p.suma)}/100)` : ''} * ${p.mult}`,
      },
    }),
  },
]

/** Ensambla la plantilla completa a partir de lo inferido y la receta elegida. */
export function assembleTemplate(opts: {
  name: string
  gameId: string
  inferred: Inferred
  recipe: Recipe
  picks: Record<string, string>
  profileName: string
  profileBase: Record<string, number>
}): GameTemplate {
  const { derived, objective } = opts.recipe.build(opts.picks)
  const stats = opts.inferred.stats.map((s) =>
    opts.recipe.id === 'producto' && s.id === opts.picks.mult
      ? { ...s, aggregate: 'multiply' as const }
      : s)

  const base: Record<string, number> = {}
  for (const s of stats) base[s.id] = opts.profileBase[s.id] ?? (s.aggregate === 'multiply' ? 1 : 0)

  return {
    schemaVersion: '0.1',
    gameId: opts.gameId,
    name: opts.name,
    description: `Plantilla creada desde una tabla de objetos. ${stats.length} estadisticas, ${opts.inferred.slots.length} ranuras.`,
    stats,
    slots: opts.inferred.slots,
    sets: opts.inferred.sets,
    derived,
    objectives: [objective],
    baseProfiles: [{ id: 'base', name: opts.profileName || 'Personaje base', base }],
    constrainableStats: stats.map((s) => s.id).slice(0, 8),
    notes: 'Generada con el asistente. Las estadisticas y ranuras se dedujeron de la tabla pegada.',
  }
}


/* ------------------------------------------------- autocompletado de recetas */

/**
 * Propone que estadistica va en cada hueco de la receta.
 *
 * Es mas delicado de lo que parece: "Prob. Critico" y "Dano Critico" son las dos
 * porcentajes y las dos hablan de criticos, asi que elegir por unidad no basta.
 * Cada hueco declara palabras que suman y palabras que restan, y la asignacion
 * es golosa por mejor puntaje, sin repetir estadisticas. Los huecos opcionales
 * solo se rellenan si hay una coincidencia clara por nombre: es preferible
 * dejarlos vacios a meter algo equivocado.
 */
export function autofillRecipe(recipe: Recipe, stats: StatDef[]): Record<string, string> {
  const texto = (s: StatDef) => `${norm(s.name)} ${norm(s.id).replace(/_/g, ' ')}`
  const puntaje = (inp: RecipeInput, s: StatDef): number => {
    const t = texto(s)
    let p = 0
    for (const w of inp.match ?? []) if (t.includes(norm(w))) p += 4
    for (const w of inp.avoid ?? []) if (t.includes(norm(w))) p -= 7
    if (inp.prefer) p += s.unit === inp.prefer ? 2 : -3
    return p
  }

  const pares: { key: string; id: string; p: number }[] = []
  for (const inp of recipe.inputs) {
    for (const s of stats) pares.push({ key: inp.key, id: s.id, p: puntaje(inp, s) })
  }
  pares.sort((a, b) => b.p - a.p)

  const out: Record<string, string> = {}
  const usados = new Set<string>()
  for (const { key, id, p } of pares) {
    if (out[key] !== undefined || usados.has(id)) continue
    const inp = recipe.inputs.find((i) => i.key === key)!
    // Un hueco opcional solo se rellena con una coincidencia por nombre.
    if (inp.optional && p < 4) continue
    out[key] = id
    usados.add(id)
  }
  // Los obligatorios que quedaron sin nada toman la primera libre.
  for (const inp of recipe.inputs) {
    if (out[inp.key] !== undefined) continue
    if (inp.optional) { out[inp.key] = ''; continue }
    const libre = stats.find((s) => !usados.has(s.id))
    out[inp.key] = libre?.id ?? stats[0]?.id ?? ''
    if (libre) usados.add(libre.id)
  }
  return out
}
