/**
 * El grafo de la plantilla
 * ========================
 * Un bloque de quince formulas encadenadas es correcto y es ilegible. Para
 * entender de donde sale el DPS de Genshin hay que leer `dps`, encontrar
 * `totalAtk`, subir a buscarlo, encontrar `critMult`, volver a subir… La
 * informacion esta toda ahi, pero la RELACION entre las piezas —que es lo que
 * de verdad se quiere entender— hay que reconstruirla en la cabeza.
 *
 * Esa relacion es un grafo dirigido aciclico, y el codigo ya lo conoce: es
 * exactamente el que `topoSortDerived` recorre para saber en que orden evaluar.
 * Este modulo lo extrae y lo deja explicito para que se pueda dibujar.
 *
 * No duplica logica del motor: reutiliza el mismo IDENT_RE y el mismo compilador
 * de formulas. Si el grafo dijera algo distinto de lo que calcula el optimizador,
 * seria un grafo que miente, y eso es peor que no tenerlo.
 */

import { explainBuild } from './optimizer'
import type { GameTemplate, ObjectiveDef } from './types'

const IDENT = /[A-Za-z_][A-Za-z0-9_]*/g

/** Nombres reservados del lenguaje de formulas: no son variables. */
const FUNCS = new Set(['min', 'max', 'floor', 'ceil', 'round', 'abs', 'sqrt', 'clamp'])

export type NodeKind = 'objective' | 'derived' | 'stat' | 'base' | 'unknown'

export interface GraphNode {
  id: string
  kind: NodeKind
  /** Etiqueta legible: el nombre de la estadistica, no su id. */
  label: string
  /** Formula, solo en derivados y objetivo. */
  formula?: string
  unit?: string
  /** Profundidad: 0 son las hojas, el objetivo es el mayor. */
  layer: number
  /** De quien depende directamente. */
  deps: string[]
  /** Aporta a: quien lo usa. */
  users: string[]
}

export interface Graph {
  nodes: GraphNode[]
  edges: { from: string; to: string }[]
  /** Numero de capas, para el ancho del lienzo. */
  layers: number
}

/** Variables que aparecen en una formula, sin funciones ni duplicados. */
export function varsOf(formula: string): string[] {
  const out = new Set<string>()
  for (const m of formula.matchAll(IDENT)) if (!FUNCS.has(m[0])) out.add(m[0])
  return [...out]
}

/**
 * Construye el grafo de dependencias del objetivo elegido.
 *
 * Solo incluye lo que el objetivo alcanza de verdad: una plantilla puede
 * declarar veinte derivados y un objetivo usar tres. Dibujar los diecisiete que
 * no intervienen seria ruido presentado como informacion.
 */
/**
 * Id del nodo objetivo.
 *
 * Lleva prefijo a proposito. Nada impide que un objetivo se llame `maxLife` y
 * que exista ademas una estadistica `maxLife` —Terraria lo hace—, y en ese caso
 * el nodo del objetivo y el de la estadistica se fundian en uno, produciendo un
 * ciclo falso y una flecha que iba hacia atras. Para el motor no hay conflicto
 * (el objetivo es una expresion, no una variable), asi que el grafo tampoco
 * debe tratarlo como tal.
 */
export const OBJ = (id: string) => `objetivo:${id}`

export function buildGraph(template: GameTemplate, objective: ObjectiveDef): Graph {
  const derived = new Map((template.derived ?? []).map((d) => [d.id, d]))
  const stats = new Map(template.stats.map((s) => [s.id, s]))

  const nodes = new Map<string, GraphNode>()
  const edges: { from: string; to: string }[] = []

  /** Clasifica un identificador segun donde este declarado. */
  function clasificar(id: string): { kind: NodeKind; label: string; unit?: string; formula?: string } {
    const d = derived.get(id)
    if (d) return { kind: 'derived', label: d.name || d.id, formula: d.formula }
    const s = stats.get(id)
    if (s) return { kind: 'stat', label: s.name, unit: s.unit === 'percent' ? '%' : '' }
    if (id.startsWith('base_')) {
      const b = stats.get(id.slice(5))
      return { kind: 'base', label: b ? `${b.name} base` : id, unit: b?.unit === 'percent' ? '%' : '' }
    }
    return { kind: 'unknown', label: id }
  }

  // Recorrido en profundidad desde el objetivo. El visitado corta los ciclos:
  // el validador ya los rechaza, pero dibujar no deberia colgarse nunca.
  const visto = new Set<string>()
  function visitar(id: string, kind?: NodeKind): GraphNode {
    const ya = nodes.get(id)
    if (ya) return ya
    const info = kind === 'objective'
      ? { kind: 'objective' as NodeKind, label: objective.name, formula: objective.formula, unit: objective.unit }
      : clasificar(id)
    const n: GraphNode = { id, ...info, layer: 0, deps: [], users: [] }
    nodes.set(id, n)
    if (visto.has(id)) return n
    visto.add(id)

    if (info.formula) {
      for (const v of varsOf(info.formula)) {
        if (v === id) continue
        n.deps.push(v)
        edges.push({ from: v, to: id })
        visitar(v).users.push(id)
      }
    }
    return n
  }

  visitar(OBJ(objective.id), 'objective')

  // Capas por camino mas largo desde las hojas. El camino mas largo (y no el
  // mas corto) evita que una flecha vaya hacia atras: si A depende de B y de
  // algo que a su vez depende de B, B tiene que quedar a la izquierda de ambos.
  const memo = new Map<string, number>()
  function capa(id: string, pila = new Set<string>()): number {
    const m = memo.get(id)
    if (m !== undefined) return m
    if (pila.has(id)) return 0
    pila.add(id)
    const n = nodes.get(id)
    const v = !n || n.deps.length === 0 ? 0 : Math.max(...n.deps.map((d) => capa(d, pila) + 1))
    pila.delete(id)
    memo.set(id, v)
    return v
  }
  for (const n of nodes.values()) n.layer = capa(n.id)

  // El objetivo siempre al final, aunque una rama corta lo empatase con otro.
  const maxCapa = Math.max(...[...nodes.values()].map((n) => n.layer))
  const obj = nodes.get(OBJ(objective.id))
  if (obj) obj.layer = maxCapa

  return { nodes: [...nodes.values()], edges, layers: maxCapa + 1 }
}

/**
 * Evalua el grafo con los numeros de una build concreta.
 *
 * Es lo que convierte el diagrama en una explicacion: no "el DPS depende del
 * ATQ total", sino "este DPS de 9.340 sale de estos 2.687 de ATQ total y este
 * multiplicador de 2,89".
 *
 * Delega en `explainBuild`, que vive dentro del motor y usa su mismo indice de
 * variables. La primera version de esto reimplementaba la evaluacion aqui y
 * daba 8.923 donde el motor daba 9.340: se comia los selectores de elemento del
 * perfil (`base_sel_cryo` y compania), que no son estadisticas declaradas y por
 * tanto no aparecian en el indice. Un diagrama que contradice al motor es peor
 * que no tener diagrama, asi que ahora solo hay una implementacion.
 */
export function evalGraph(
  template: GameTemplate,
  objective: ObjectiveDef,
  finalStats: Record<string, number>,
  profileId: string,
): Map<string, number> {
  try {
    return explainBuild(template, profileId, objective.id, finalStats)
  } catch {
    return new Map()
  }
}
