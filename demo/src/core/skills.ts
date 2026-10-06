/**
 * Arboles de habilidades
 * ======================
 * El usuario los arma como quiera: nodos sueltos, varias raices, ramas que se
 * juntan, varios arboles por juego. Este modulo no impone forma de arbol; solo
 * hace cumplir las reglas que el propio autor declaro en cada nodo:
 *
 *   - rangos (0..maxRank) y coste en puntos por rango,
 *   - prerrequisitos "todos estos" (`requires`) y "al menos uno" (`requiresAny`),
 *   - puntos minimos gastados en el arbol (`requiresPoints`),
 *   - presupuesto total del arbol (`budget`).
 *
 * Como se conecta con el motor: los efectos de los nodos elegidos se suman a las
 * estadisticas exactamente igual que una pieza de equipo (respetando si la
 * estadistica acumula sumando o multiplicando), y el rango de cada nodo queda
 * disponible en las formulas como `skill_<id>`. Asi un nodo puede sumar numeros
 * o activar una mecanica: `if(skill_golpeBrutal > 0, dano * 1.3, dano)`.
 *
 * Todo aqui es puro: sin UI, sin red, sin estado.
 */

import type { GameTemplate, SkillNode, SkillSelection, SkillTreeDef } from './types'

/** Prefijo de las variables de habilidad en las formulas. */
export const SKILL_VAR_PREFIX = 'skill_'
export const skillVar = (nodeId: string) => `${SKILL_VAR_PREFIX}${nodeId}`

/** Los ids de nodo se usan como nombre de variable: tienen que ser identificadores. */
export const NODE_ID_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export const costOf = (n: SkillNode) => (n.cost ?? 1)
export const maxRankOf = (n: SkillNode) => Math.max(1, Math.floor(n.maxRank ?? 1))

export interface SkillIndex {
  trees: SkillTreeDef[]
  node: Map<string, SkillNode>
  treeOf: Map<string, SkillTreeDef>
}

export function indexSkills(template: Pick<GameTemplate, 'skillTrees'>): SkillIndex {
  const trees = template.skillTrees ?? []
  const node = new Map<string, SkillNode>()
  const treeOf = new Map<string, SkillTreeDef>()
  for (const t of trees) {
    for (const n of t.nodes ?? []) {
      if (node.has(n.id)) continue // id repetido: lo reporta el validador
      node.set(n.id, n)
      treeOf.set(n.id, t)
    }
  }
  return { trees, node, treeOf }
}

/** Todos los nodos de la plantilla, en orden de declaracion. */
export function allNodes(template: Pick<GameTemplate, 'skillTrees'>): SkillNode[] {
  return [...indexSkills(template).node.values()]
}

const rankIn = (sel: SkillSelection, id: string) => sel[id] ?? 0

/**
 * ¿Cuenta `reqId` como requisito cumplido para un nodo del arbol `tree`?
 * Con `requireFullRanks` hace falta tenerlo completo; si no, basta un rango.
 */
function satisfies(ix: SkillIndex, sel: SkillSelection, reqId: string, tree?: SkillTreeDef): boolean {
  const r = rankIn(sel, reqId)
  if (r <= 0) return false
  if (!tree?.requireFullRanks) return true
  const req = ix.node.get(reqId)
  return !req || r >= maxRankOf(req)
}

/** Otros nodos del mismo grupo de eleccion que ya tienen rangos. */
function choiceTaken(ix: SkillIndex, sel: SkillSelection, n: SkillNode): SkillNode | undefined {
  if (!n.choiceGroup) return undefined
  for (const o of ix.node.values()) {
    if (o.id !== n.id && o.choiceGroup === n.choiceGroup && rankIn(sel, o.id) > 0) return o
  }
  return undefined
}

/** Puntos gastados en un arbol. `except` excluye un nodo (para `requiresPoints`). */
export function pointsSpent(tree: SkillTreeDef, sel: SkillSelection, except?: string): number {
  let p = 0
  for (const n of tree.nodes ?? []) if (n.id !== except) p += costOf(n) * rankIn(sel, n.id)
  return p
}

// ----------------------------------------------------------------- reglas

export interface SkillProblem { nodeId?: string; treeId?: string; message: string }

/**
 * Por que un nodo con rango > 0 no puede estar elegido, o null si puede.
 * Revisa solo las reglas del propio nodo (no el presupuesto del arbol).
 */
function nodeBlocker(ix: SkillIndex, sel: SkillSelection, n: SkillNode): string | null {
  const r = rankIn(sel, n.id)
  if (r <= 0) return null
  if (!Number.isInteger(r)) return `El rango de "${n.name}" debe ser entero.`
  if (r > maxRankOf(n)) return `"${n.name}" tiene como maximo ${maxRankOf(n)} rango(s).`
  const nombre = (id: string) => ix.node.get(id)?.name ?? id
  const tree = ix.treeOf.get(n.id)
  const otra = choiceTaken(ix, sel, n)
  if (otra) return `Es una eleccion: ya elegiste "${otra.name}".`
  const completo = tree?.requireFullRanks ? ' completo' : ''
  const faltan = (n.requires ?? []).filter((id) => !satisfies(ix, sel, id, tree))
  if (faltan.length) return `Requiere ${faltan.map((x) => `"${nombre(x)}"`).join(' y ')}${completo}.`
  const any = n.requiresAny ?? []
  if (any.length && !any.some((id) => satisfies(ix, sel, id, tree))) {
    return any.length === 1
      ? `Requiere "${nombre(any[0])}"${completo}.`
      : `Requiere${completo ? ' completo' : ''} al menos uno de: ${any.map((x) => `"${nombre(x)}"`).join(', ')}.`
  }
  if (tree && (n.requiresPoints ?? 0) > 0) {
    const otros = pointsSpent(tree, sel, n.id)
    if (otros < n.requiresPoints!) return `Requiere ${n.requiresPoints} puntos gastados en "${tree.name}" (llevas ${otros}).`
  }
  return null
}

/** Todos los problemas de una seleccion. Lista vacia = seleccion valida. */
export function checkSelection(template: Pick<GameTemplate, 'skillTrees'>, sel: SkillSelection): SkillProblem[] {
  const ix = indexSkills(template)
  const out: SkillProblem[] = []
  for (const [id, r] of Object.entries(sel)) {
    if (!ix.node.has(id) && r > 0) out.push({ nodeId: id, message: `La habilidad "${id}" no existe en esta plantilla.` })
    if (r < 0) out.push({ nodeId: id, message: `El rango de "${id}" no puede ser negativo.` })
  }
  for (const n of ix.node.values()) {
    const b = nodeBlocker(ix, sel, n)
    if (b) out.push({ nodeId: n.id, message: b })
  }
  for (const t of ix.trees) {
    if (t.budget === undefined) continue
    const p = pointsSpent(t, sel)
    if (p > t.budget) out.push({ treeId: t.id, message: `"${t.name}" usa ${p} puntos y su limite es ${t.budget}.` })
  }
  return out
}

/** Por que no se puede subir un rango a este nodo, o null si se puede. */
export function canRaise(template: Pick<GameTemplate, 'skillTrees'>, sel: SkillSelection, nodeId: string): string | null {
  const ix = indexSkills(template)
  const n = ix.node.get(nodeId)
  if (!n) return 'Esa habilidad no existe.'
  if (rankIn(sel, nodeId) >= maxRankOf(n)) return 'Ya esta al maximo.'
  const next = { ...sel, [nodeId]: rankIn(sel, nodeId) + 1 }
  const b = nodeBlocker(ix, next, n)
  if (b) return b
  const tree = ix.treeOf.get(nodeId)
  if (tree?.budget !== undefined) {
    const p = pointsSpent(tree, next)
    if (p > tree.budget) return `No quedan puntos en "${tree.name}" (necesita ${costOf(n)}, quedan ${tree.budget - pointsSpent(tree, sel)}).`
  }
  return null
}

/**
 * Por que no se puede bajar un rango a este nodo, o null si se puede.
 * Bajar nunca rompe el presupuesto, pero puede dejar sin requisito a otros
 * nodos (los que lo piden, o los que necesitaban esos puntos gastados).
 */
export function canLower(template: Pick<GameTemplate, 'skillTrees'>, sel: SkillSelection, nodeId: string): string | null {
  const ix = indexSkills(template)
  const n = ix.node.get(nodeId)
  if (!n) return 'Esa habilidad no existe.'
  if (rankIn(sel, nodeId) <= 0) return 'No tiene rangos.'
  const next = { ...sel, [nodeId]: rankIn(sel, nodeId) - 1 }
  for (const other of ix.node.values()) {
    if (other.id === nodeId || rankIn(next, other.id) <= 0) continue
    if (nodeBlocker(ix, next, other)) return `"${other.name}" depende de esta habilidad.`
  }
  return null
}

/**
 * Deja una seleccion valida: descarta nodos que ya no existen, recorta rangos y
 * quita, de a uno, los nodos que no cumplen sus requisitos hasta que todo cuadra.
 * Sirve para cargar una seleccion guardada despues de que el autor edito el arbol.
 */
export function sanitizeSelection(template: Pick<GameTemplate, 'skillTrees'>, sel: SkillSelection): SkillSelection {
  const ix = indexSkills(template)
  const out: SkillSelection = {}
  for (const [id, r] of Object.entries(sel)) {
    const n = ix.node.get(id)
    const rr = Math.min(Math.floor(Number(r) || 0), n ? maxRankOf(n) : 0)
    if (n && rr > 0) out[id] = rr
  }
  for (let guard = 0; guard < 10_000; guard++) {
    const bad = [...ix.node.values()].find((n) => nodeBlocker(ix, out, n))
    if (bad) { delete out[bad.id]; continue }
    const over = ix.trees.find((t) => t.budget !== undefined && pointsSpent(t, out) > t.budget)
    if (!over) break
    // Sobre presupuesto: se quita un rango del ultimo nodo declarado con rangos.
    const last = [...(over.nodes ?? [])].reverse().find((n) => rankIn(out, n.id) > 0)!
    if (out[last.id] > 1) out[last.id]--; else delete out[last.id]
  }
  return out
}

// ----------------------------------------------------------------- efectos

/**
 * Aporte total de la seleccion a cada estadistica, en el mismo formato crudo
 * que `Item.stats`: una suma para las que suman y un porcentaje equivalente
 * para las que multiplican (dos rangos de +10% "more" dan +21%, no +20%).
 */
export function skillContribution(
  template: Pick<GameTemplate, 'skillTrees' | 'stats'>,
  sel: SkillSelection,
): Record<string, number> {
  const ix = indexSkills(template)
  const mul = new Set(template.stats.filter((s) => s.aggregate === 'multiply').map((s) => s.id))
  const known = new Set(template.stats.map((s) => s.id))
  const sum: Record<string, number> = {}
  const factor: Record<string, number> = {}
  for (const [id, r] of Object.entries(sel)) {
    const n = ix.node.get(id)
    if (!n || r <= 0) continue
    for (const [k, v] of Object.entries(n.effects ?? {})) {
      if (!known.has(k) || !Number.isFinite(v)) continue
      if (mul.has(k)) factor[k] = (factor[k] ?? 1) * Math.pow(1 + v / 100, r)
      else sum[k] = (sum[k] ?? 0) + v * r
    }
  }
  const out: Record<string, number> = { ...sum }
  for (const [k, f] of Object.entries(factor)) out[k] = (f - 1) * 100
  return out
}

/** Valor de cada variable `skill_<id>` (el rango; 0 si no esta elegido). */
export function skillVariables(template: Pick<GameTemplate, 'skillTrees'>, sel: SkillSelection = {}): [string, number][] {
  return allNodes(template).map((n) => [skillVar(n.id), rankIn(sel, n.id)])
}

// ---------------------------------------------------- validacion de plantilla

/**
 * Problemas de ESTRUCTURA de los arboles (no de una seleccion). Lo usa el
 * validador de plantillas. Devuelve errores y avisos por separado.
 */
export function checkSkillTrees(template: Pick<GameTemplate, 'skillTrees' | 'stats'>): {
  errors: SkillProblem[]; warnings: SkillProblem[]
} {
  const errors: SkillProblem[] = []
  const warnings: SkillProblem[] = []
  const trees = template.skillTrees
  if (trees === undefined) return { errors, warnings }
  if (!Array.isArray(trees)) { errors.push({ message: '"skillTrees" deberia ser una lista.' }); return { errors, warnings } }

  const statIds = new Set(template.stats.map((s) => s.id))
  const treeIds = new Set<string>()
  const nodeIds = new Set<string>()
  for (const t of trees) {
    if (!t?.id) { errors.push({ message: 'Hay un arbol de habilidades sin id.' }); continue }
    if (treeIds.has(t.id)) errors.push({ treeId: t.id, message: `El arbol "${t.id}" esta repetido.` })
    treeIds.add(t.id)
    if (!Array.isArray(t.nodes)) { errors.push({ treeId: t.id, message: `El arbol "${t.name ?? t.id}" no tiene lista de nodos.` }); continue }
    if (t.budget !== undefined && !(Number.isFinite(t.budget) && t.budget >= 0)) {
      errors.push({ treeId: t.id, message: `El presupuesto de "${t.name ?? t.id}" debe ser un numero >= 0.` })
    }
    for (const n of t.nodes) {
      if (!n?.id) { errors.push({ treeId: t.id, message: `Hay un nodo sin id en "${t.name ?? t.id}".` }); continue }
      if (!NODE_ID_RE.test(n.id)) {
        errors.push({ nodeId: n.id, message: `El id "${n.id}" solo puede tener letras sin tilde, numeros y _ (y no empezar con numero): se usa en las formulas como ${skillVar('id')}.` })
      }
      if (nodeIds.has(n.id)) errors.push({ nodeId: n.id, message: `El nodo "${n.id}" esta repetido (los ids son unicos entre todos los arboles).` })
      nodeIds.add(n.id)
      if (n.cost !== undefined && !(Number.isFinite(n.cost) && n.cost >= 0)) {
        errors.push({ nodeId: n.id, message: `El coste de "${n.name ?? n.id}" no puede ser negativo.` })
      }
      if (n.maxRank !== undefined && !(Number.isInteger(n.maxRank) && n.maxRank >= 1)) {
        errors.push({ nodeId: n.id, message: `maxRank de "${n.name ?? n.id}" debe ser un entero >= 1.` })
      }
      for (const [k, v] of Object.entries(n.effects ?? {})) {
        if (!statIds.has(k)) errors.push({ nodeId: n.id, message: `"${n.name ?? n.id}" otorga "${k}", que no es una estadistica declarada.` })
        else if (!Number.isFinite(v)) errors.push({ nodeId: n.id, message: `"${n.name ?? n.id}" da un valor no numerico a "${k}".` })
      }
    }
  }
  if (errors.length) return { errors, warnings }

  // Referencias a nodos inexistentes.
  const ix = indexSkills(template)
  for (const n of ix.node.values()) {
    for (const r of [...(n.requires ?? []), ...(n.requiresAny ?? [])]) {
      if (r === n.id) errors.push({ nodeId: n.id, message: `"${n.name}" se pide a si mismo como requisito.` })
      else if (!ix.node.has(r)) errors.push({ nodeId: n.id, message: `"${n.name}" requiere "${r}", que no existe.` })
    }
  }
  if (errors.length) return { errors, warnings }

  // Alcanzabilidad: que nodos se pueden llegar a tomar alguna vez. Se va
  // ampliando el conjunto "posible" hasta que no cambia. Lo que queda fuera es
  // un ciclo de requisitos (A pide B y B pide A) o un umbral de puntos que el
  // arbol no puede pagar.
  const posible = new Set<string>()
  for (let cambio = true; cambio;) {
    cambio = false
    for (const n of ix.node.values()) {
      if (posible.has(n.id)) continue
      if (!(n.requires ?? []).every((r) => posible.has(r))) continue
      const any = n.requiresAny ?? []
      if (any.length && !any.some((r) => posible.has(r))) continue
      const tree = ix.treeOf.get(n.id)!
      const need = n.requiresPoints ?? 0
      if (need > 0) {
        let disponible = 0
        for (const o of tree.nodes) if (o.id !== n.id && posible.has(o.id)) disponible += costOf(o) * maxRankOf(o)
        if (disponible < need) continue
      }
      if (tree.budget !== undefined && need + costOf(n) > tree.budget) continue
      // Si el umbral de puntos se paga con nodos que se excluyen entre si
      // (elecciones), el calculo de arriba es optimista; basta para detectar
      // lo imposible sin falsos errores.
      posible.add(n.id); cambio = true
    }
  }
  for (const n of ix.node.values()) {
    if (!posible.has(n.id)) {
      errors.push({ nodeId: n.id, message: `"${n.name}" nunca se puede tomar: sus requisitos forman un ciclo o piden mas puntos de los que el arbol permite.` })
    }
  }

  for (const t of ix.trees) {
    if (t.nodes.length === 0) warnings.push({ treeId: t.id, message: `El arbol "${t.name}" no tiene nodos.` })
  }
  const grupos = new Map<string, SkillNode[]>()
  for (const n of ix.node.values()) if (n.choiceGroup) grupos.set(n.choiceGroup, [...(grupos.get(n.choiceGroup) ?? []), n])
  for (const [g, ns] of grupos) {
    if (ns.length < 2) warnings.push({ nodeId: ns[0].id, message: `"${ns[0].name}" es una eleccion (${g}) pero no tiene alternativa.` })
  }
  return { errors, warnings }
}
