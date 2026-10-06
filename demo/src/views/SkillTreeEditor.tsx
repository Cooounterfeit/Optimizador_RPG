/**
 * Editor visual de arboles de habilidades
 * =======================================
 * Pensado para quien conoce el juego, no para quien programa: aqui no se
 * escribe JSON ni formulas. Se arrastran habilidades, se unen con flechas y se
 * rellenan formularios con los datos del juego.
 *
 *  - "+ Habilidad" agrega un nodo; se mueve arrastrandolo.
 *  - Una flecha de A hacia B significa "B requiere A". Se crea arrastrando
 *    desde el punto derecho de A hasta B.
 *  - Pulsar una flecha permite elegir si es obligatoria ("requiere A y B") o
 *    alternativa ("requiere A o B"), o quitarla.
 *  - Pulsar un nodo abre su ficha: nombre, rangos, coste, efectos sobre las
 *    estadisticas del juego, puntos previos.
 *  - "Probar" deja jugar con el arbol tal como lo vera el jugador.
 *
 * El id interno de cada nodo (lo que usan las formulas avanzadas) se genera
 * solo a partir del nombre y no se le muestra al usuario salvo en "Avanzado".
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background, Controls, Handle, MarkerType, Position, ReactFlow, applyNodeChanges,
  type Connection, type Edge, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GameTemplate, SkillNode, SkillSelection, SkillTreeDef } from '../core/types'
import { checkSkillTrees, costOf, maxRankOf, NODE_ID_RE, skillVar } from '../core/skills'
import { formulaVariables } from '../core/formula'
import { toId } from '../store/infer'
import SkillTreePanel, { SkillSummary } from './SkillTreePanel'

const ANCHO = 200
const COL = 300
const FILA = 140

type Upd = (p: Partial<GameTemplate>) => void

const num = (v: number) => v.toLocaleString('es-CL', { maximumFractionDigits: 2 })

// ------------------------------------------------------------ utilidades

/** Ids de nodo usados en TODOS los arboles (son unicos entre arboles). */
const usedNodeIds = (t: GameTemplate) => new Set((t.skillTrees ?? []).flatMap((tr) => tr.nodes.map((n) => n.id)))

/** Identificador valido y libre a partir de un nombre: "Golpe brutal" -> "golpe_brutal". */
function freeNodeId(name: string, taken: Set<string>): string {
  let base = toId(name)
  if (!NODE_ID_RE.test(base)) base = `h_${base}`
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}_${n}`
  return id
}

/** Formulas de la plantilla que mencionan una habilidad (para no romperlas al renombrar). */
function formulasThatUse(t: GameTemplate, nodeId: string): string[] {
  const v = skillVar(nodeId)
  const out: string[] = []
  for (const f of [...(t.derived ?? []), ...t.objectives]) {
    try { if (formulaVariables(f.formula).includes(v)) out.push(f.name || f.id) } catch { /* formula rota */ }
  }
  return out
}

/** ¿Llegar de `from` a `to` siguiendo requisitos? (para no crear ciclos). */
function reaches(tree: SkillTreeDef, from: string, to: string): boolean {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]))
  const pila = [from]
  const visto = new Set<string>()
  while (pila.length) {
    const id = pila.pop()!
    if (id === to) return true
    if (visto.has(id)) continue
    visto.add(id)
    const n = byId.get(id)
    for (const r of [...(n?.requires ?? []), ...(n?.requiresAny ?? [])]) pila.push(r)
  }
  return false
}

/** Columnas por profundidad de requisitos, para "Ordenar". */
function autoLayout(tree: SkillTreeDef): SkillTreeDef {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]))
  const memo = new Map<string, number>()
  const depth = (id: string, pila = new Set<string>()): number => {
    if (memo.has(id)) return memo.get(id)!
    if (pila.has(id)) return 0
    pila.add(id)
    const n = byId.get(id)
    const reqs = [...(n?.requires ?? []), ...(n?.requiresAny ?? [])].filter((r) => byId.has(r))
    const d = reqs.length ? Math.max(...reqs.map((r) => depth(r, pila) + 1)) : 0
    memo.set(id, d)
    return d
  }
  const filas = new Map<number, number>()
  return {
    ...tree,
    nodes: tree.nodes.map((n) => {
      const d = depth(n.id)
      const f = filas.get(d) ?? 0
      filas.set(d, f + 1)
      return { ...n, x: d * COL, y: f * FILA }
    }),
  }
}

// ------------------------------------------------------------ nodo del lienzo

interface DatosNodo extends Record<string, unknown> {
  n: SkillNode
  efectos: string[]
  error: boolean
  /** Formulas del juego en las que esta habilidad activa algo. */
  mecanica: string[]
}

function NodoHabilidad({ data, selected }: NodeProps) {
  const { n, efectos, error, mecanica } = data as unknown as DatosNodo
  return (
    <div className={`ste-node${selected ? ' sel' : ''}${error ? ' err' : ''}`} style={{ width: ANCHO }}>
      <Handle type="target" position={Position.Left} />
      <div className="ste-top">
        <b>{n.name || 'Sin nombre'}</b>
        <span>{maxRankOf(n) > 1 ? `${maxRankOf(n)} rangos` : '1 rango'}</span>
      </div>
      <div className="ste-eff">
        {efectos.length ? efectos.join(' · ') : mecanica.length ? null : <i>sin efectos todavia</i>}
      </div>
      {mecanica.length > 0 && <div className="ste-mec">activa una mecanica en {mecanica.join(', ')}</div>}
      <div className="ste-meta">
        {costOf(n) === 0 ? 'gratis' : `cuesta ${num(costOf(n))}`}{n.requiresPoints ? ` · pide ${n.requiresPoints} pts` : ''}{n.choiceGroup ? ' · eleccion' : ''}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
const TIPOS = { hab: NodoHabilidad }

// ------------------------------------------------------------ editor

export default function SkillTreeEditor({ t, upd }: { t: GameTemplate; upd: Upd }) {
  const trees = t.skillTrees ?? []
  const [treeId, setTreeId] = useState<string | null>(trees[0]?.id ?? null)
  const tree = trees.find((x) => x.id === treeId) ?? trees[0] ?? null
  const [selNode, setSelNode] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<{ from: string; to: string } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [probando, setProbando] = useState(false)
  const [prueba, setPrueba] = useState<SkillSelection>({})

  useEffect(() => { if (!tree && trees[0]) setTreeId(trees[0].id) }, [tree, trees])

  const setTrees = (next: SkillTreeDef[]) => upd({ skillTrees: next })
  const setTree = (next: SkillTreeDef) => setTrees(trees.map((x) => (x.id === next.id ? next : x)))
  const setNode = (id: string, patch: Partial<SkillNode>) =>
    tree && setTree({ ...tree, nodes: tree.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })

  const statName = (id: string) => t.stats.find((s) => s.id === id)?.name ?? id
  const esPct = (id: string) => {
    const s = t.stats.find((x) => x.id === id)
    return s?.unit === 'percent' || s?.aggregate === 'multiply'
  }
  const efectosDe = (n: SkillNode) => Object.entries(n.effects ?? {})
    .map(([k, v]) => `${v >= 0 ? '+' : ''}${num(v)}${esPct(k) ? '%' : ''} ${statName(k)}`)

  // Problemas de estructura, para marcar en rojo los nodos afectados.
  const problemas = useMemo(() => checkSkillTrees(t), [t])
  const conError = useMemo(() => new Set(problemas.errors.map((p) => p.nodeId).filter(Boolean)), [problemas])

  // ---------------------------------------------------- arboles
  function nuevoArbol() {
    const taken = new Set(trees.map((x) => x.id))
    let id = 'arbol'
    for (let n = 2; taken.has(id); n++) id = `arbol_${n}`
    const nuevo: SkillTreeDef = { id, name: trees.length ? `Arbol ${trees.length + 1}` : 'Habilidades', budget: 10, nodes: [] }
    setTrees([...trees, nuevo])
    setTreeId(id); setSelNode(null); setSelEdge(null)
  }

  function borrarArbol() {
    if (!tree) return
    const usadas = tree.nodes.flatMap((n) => formulasThatUse(t, n.id))
    if (usadas.length) { setAviso(`No se puede borrar: las formulas ${usadas.join(', ')} usan habilidades de este arbol.`); return }
    if (!confirm(`Borrar el arbol "${tree.name}" y sus ${tree.nodes.length} habilidades?`)) return
    const resto = trees.filter((x) => x.id !== tree.id)
    upd({ skillTrees: resto.length ? resto : undefined })
    setTreeId(resto[0]?.id ?? null); setSelNode(null); setSelEdge(null)
  }

  // ---------------------------------------------------- nodos
  function nuevaHabilidad() {
    if (!tree) return
    const nombre = `Habilidad ${tree.nodes.length + 1}`
    const id = freeNodeId(nombre, usedNodeIds(t))
    // Aparece a la derecha del nodo elegido, o al final de la primera columna.
    const ref = tree.nodes.find((n) => n.id === selNode)
    const pos = (n: SkillNode) => (n.x !== undefined && n.y !== undefined ? { x: n.x, y: n.y } : autoLayout(tree).nodes.find((m) => m.id === n.id)!)
    const x = ref ? pos(ref).x! + COL : 0
    const y = ref ? pos(ref).y! : Math.max(-FILA, ...tree.nodes.map((n) => (pos(n).x === 0 ? pos(n).y! : -FILA))) + FILA
    const nodo: SkillNode = { id, name: nombre, maxRank: 1, cost: 1, effects: {}, x, y,
      ...(ref ? { requires: [ref.id] } : {}) }
    setTree({ ...tree, nodes: [...tree.nodes, nodo] })
    setSelNode(id); setSelEdge(null)
  }

  /** Renombrar: el id interno sigue al nombre mientras ninguna formula lo use. */
  function renombrar(n: SkillNode, name: string) {
    if (!tree) return
    if (formulasThatUse(t, n.id).length) { setNode(n.id, { name }); return }
    const taken = usedNodeIds(t); taken.delete(n.id)
    const nuevoId = freeNodeId(name || 'habilidad', taken)
    if (nuevoId === n.id) { setNode(n.id, { name }); return }
    const cambia = (l?: string[]) => l?.map((r) => (r === n.id ? nuevoId : r))
    setTrees(trees.map((tr) => ({
      ...tr,
      nodes: tr.nodes.map((m) => ({
        ...m,
        ...(m.id === n.id ? { id: nuevoId, name } : {}),
        requires: cambia(m.requires), requiresAny: cambia(m.requiresAny),
      })),
    })))
    setSelNode(nuevoId)
  }

  const borrarNodos = useCallback((ids: string[]) => {
    if (!tree || ids.length === 0) return
    const usadas = ids.flatMap((id) => formulasThatUse(t, id))
    if (usadas.length) { setAviso(`No se puede borrar: lo usan las formulas ${usadas.join(', ')}.`); return }
    const fuera = new Set(ids)
    const limpia = (l?: string[]) => {
      const r = (l ?? []).filter((x) => !fuera.has(x))
      return r.length ? r : undefined
    }
    setTrees(trees.map((tr) => ({
      ...tr,
      nodes: tr.nodes.filter((n) => !fuera.has(n.id))
        .map((n) => ({ ...n, requires: limpia(n.requires), requiresAny: limpia(n.requiresAny) })),
    })))
    setSelNode(null); setSelEdge(null)
  }, [tree, trees, t])

  // ---------------------------------------------------- conexiones
  function conectar(c: Connection) {
    if (!tree || !c.source || !c.target) return
    const { source: from, target: to } = c
    if (from === to) return
    const destino = tree.nodes.find((n) => n.id === to)
    if (!destino) return
    if ([...(destino.requires ?? []), ...(destino.requiresAny ?? [])].includes(from)) return
    if (reaches(tree, from, to)) {
      setAviso('Esa flecha crearia un ciclo: una habilidad terminaria pidiendose a si misma.')
      return
    }
    setNode(to, { requires: [...(destino.requires ?? []), from] })
    setAviso(null)
    setSelEdge({ from, to }); setSelNode(null)
  }

  function tipoFlecha(from: string, to: string, tipo: 'all' | 'any') {
    const n = tree?.nodes.find((x) => x.id === to)
    if (!n) return
    const req = (n.requires ?? []).filter((r) => r !== from)
    const any = (n.requiresAny ?? []).filter((r) => r !== from)
    if (tipo === 'all') req.push(from); else any.push(from)
    setNode(to, { requires: req.length ? req : undefined, requiresAny: any.length ? any : undefined })
  }

  function quitarFlecha(from: string, to: string) {
    const n = tree?.nodes.find((x) => x.id === to)
    if (!n) return
    const req = (n.requires ?? []).filter((r) => r !== from)
    const any = (n.requiresAny ?? []).filter((r) => r !== from)
    setNode(to, { requires: req.length ? req : undefined, requiresAny: any.length ? any : undefined })
    setSelEdge(null)
  }

  /**
   * Hace que `id` y `otro` sean una eleccion excluyente. Si `otro` ya estaba en
   * un grupo, `id` se suma a ese grupo (eleccion entre tres o mas). Con '' se
   * saca a `id` de su grupo.
   */
  function parejaEleccion(id: string, otro: string) {
    if (!tree) return
    const yo = tree.nodes.find((n) => n.id === id)
    if (!otro) {
      const g = yo?.choiceGroup
      const resto = tree.nodes.filter((n) => n.id !== id && g && n.choiceGroup === g)
      setTree({ ...tree, nodes: tree.nodes.map((n) => {
        if (n.id === id) return { ...n, choiceGroup: undefined }
        // Un grupo que se queda con un solo nodo deja de ser eleccion.
        if (resto.length === 1 && n.id === resto[0].id) return { ...n, choiceGroup: undefined }
        return n
      }) })
      return
    }
    const pareja = tree.nodes.find((n) => n.id === otro)
    const g = pareja?.choiceGroup ?? yo?.choiceGroup ?? `eleccion_${id}`
    setTree({ ...tree, nodes: tree.nodes.map((n) => (n.id === id || n.id === otro ? { ...n, choiceGroup: g } : n)) })
  }

  // ---------------------------------------------------- lienzo
  // Nodos sin posicion (un arbol importado, o hecho a mano): se ubican por
  // columnas de requisitos hasta que el usuario los mueva.
  const auto = useMemo(() => new Map((tree ? autoLayout(tree).nodes : []).map((n) => [n.id, n])), [tree])
  const construidos = useMemo<Node[]>(() => (tree?.nodes ?? []).map((n) => ({
    id: n.id, type: 'hab',
    position: n.x !== undefined && n.y !== undefined ? { x: n.x, y: n.y } : { x: auto.get(n.id)?.x ?? 0, y: auto.get(n.id)?.y ?? 0 },
    selected: n.id === selNode,
    data: { n, efectos: efectosDe(n), error: conError.has(n.id), mecanica: formulasThatUse(t, n.id) } satisfies DatosNodo,
  })), [tree, auto, selNode, conError, t.stats, t.derived, t.objectives])   // eslint-disable-line react-hooks/exhaustive-deps
  const [nodos, setNodos] = useState<Node[]>(construidos)
  useEffect(() => setNodos(construidos), [construidos])
  const onNodesChange = useCallback((ch: NodeChange[]) => setNodos((ns) => applyNodeChanges(ch, ns)), [])

  const flechas = useMemo<Edge[]>(() => (tree?.nodes ?? []).flatMap((n) => [
    ...(n.requires ?? []).map((r) => ({ r, any: false })),
    // Una "alternativa" solo es tal si hay mas de una: con un unico requisito
    // "al menos uno de" equivale a obligatorio y se dibuja como tal.
    ...(n.requiresAny ?? []).map((r) => ({ r, any: (n.requiresAny ?? []).length > 1 })),
  ].map(({ r, any }) => {
    const sel = selEdge?.from === r && selEdge?.to === n.id
    return {
      id: `${r}->${n.id}`, source: r, target: n.id, selected: sel, type: 'smoothstep',
      label: any ? 'o' : undefined,
      markerEnd: { type: MarkerType.ArrowClosed, color: sel ? '#7c8cff' : '#5b6376' },
      style: { stroke: sel ? '#7c8cff' : any ? '#d8a860' : '#5b6376', strokeWidth: sel ? 2.2 : 1.6, strokeDasharray: any ? '6 4' : undefined },
      labelStyle: { fill: '#d8a860', fontWeight: 700 },
      labelBgStyle: { fill: '#0c0f16' },
    } satisfies Edge
  })), [tree, selEdge])

  const nodoSel = tree?.nodes.find((n) => n.id === selNode) ?? null
  const flechaSel = selEdge && tree
    ? { from: tree.nodes.find((n) => n.id === selEdge.from), to: tree.nodes.find((n) => n.id === selEdge.to) }
    : null

  // ---------------------------------------------------- sin arboles
  if (!tree) {
    return (
      <div className="card">
        <h2>Arboles de habilidades</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Este juego todavia no tiene arbol de habilidades. Crea uno y arma las habilidades
          arrastrando y uniendo con flechas: no hace falta escribir nada tecnico.
        </p>
        {t.stats.length === 0 && (
          <p className="hint" style={{ color: 'var(--warn)' }}>
            Primero define las estadisticas del juego: las habilidades las modifican.
          </p>
        )}
        <button className="mini on" onClick={nuevoArbol}>+ Crear un arbol de habilidades</button>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Arboles de habilidades</h2>

      {/* ---------- arbol activo y sus datos */}
      <div className="ste-bar">
        {trees.map((x) => (
          <button key={x.id} className={`mini${x.id === tree.id ? ' on' : ''}`}
            onClick={() => { setTreeId(x.id); setSelNode(null); setSelEdge(null); setPrueba({}) }}>
            {x.name || 'Sin nombre'} ({x.nodes.length})
          </button>
        ))}
        <button className="mini" onClick={nuevoArbol}>+ arbol</button>
      </div>
      <div className="ste-tree-fields">
        <label className="field">
          <span>Nombre del arbol</span>
          <input type="text" value={tree.name} onChange={(e) => setTree({ ...tree, name: e.target.value })} />
        </label>
        <label className="field">
          <span>Puntos disponibles</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" min={0} value={tree.budget ?? ''} disabled={tree.budget === undefined}
              style={{ width: 90 }}
              onChange={(e) => setTree({ ...tree, budget: Math.max(0, Number(e.target.value) || 0) })} />
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="checkbox" checked={tree.budget === undefined}
                onChange={(e) => setTree({ ...tree, budget: e.target.checked ? undefined : 10 })} />
              sin limite
            </label>
          </div>
        </label>
        <label style={{ gridColumn: '1 / -1', fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 7, alignItems: 'center', marginBottom: 10 }}>
          <input type="checkbox" checked={!!tree.requireFullRanks}
            onChange={(e) => setTree({ ...tree, requireFullRanks: e.target.checked || undefined })} />
          Para desbloquear la siguiente, la habilidad anterior tiene que estar completa (todos sus rangos), como en World of Warcraft
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Descripcion (opcional) — la ve el jugador</span>
          <input type="text" value={tree.description ?? ''}
            onChange={(e) => setTree({ ...tree, description: e.target.value || undefined })} />
        </label>
      </div>

      {/* ---------- barra de herramientas */}
      <div className="ste-bar">
        <button className="mini on" onClick={nuevaHabilidad} disabled={t.stats.length === 0}>
          + Habilidad{nodoSel ? ` despues de "${nodoSel.name}"` : ''}
        </button>
        <button className="mini" onClick={() => setTree(autoLayout(tree))} disabled={tree.nodes.length === 0}>Ordenar</button>
        <button className={`mini${probando ? ' on' : ''}`} onClick={() => setProbando(!probando)} disabled={tree.nodes.length === 0}>
          {probando ? 'Volver a editar' : 'Probar como jugador'}
        </button>
        <div style={{ flex: 1 }} />
        <button className="mini" onClick={borrarArbol}>borrar arbol</button>
      </div>
      {aviso && <p className="ste-aviso" role="alert">{aviso} <button className="mini" onClick={() => setAviso(null)}>ok</button></p>}

      {probando ? (
        <div style={{ marginTop: 6 }}>
          <p style={{ margin: '0 0 10px' }}><SkillSummary template={t} selection={prueba} /></p>
          <SkillTreePanel template={{ ...t, skillTrees: [tree] }} selection={prueba} onChange={setPrueba} />
        </div>
      ) : (
        <div className="ste-work">
          <div className="fgraph ste-canvas">
            <ReactFlow
              nodes={nodos} edges={flechas} nodeTypes={TIPOS}
              onNodesChange={onNodesChange}
              onNodeDragStop={(_, n) => setNode(n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) })}
              onNodeClick={(_, n) => { setSelNode(n.id); setSelEdge(null) }}
              onEdgeClick={(_, e) => { setSelEdge({ from: e.source, to: e.target }); setSelNode(null) }}
              onPaneClick={() => { setSelNode(null); setSelEdge(null) }}
              onConnect={conectar}
              onNodesDelete={(ns) => borrarNodos(ns.map((n) => n.id))}
              onEdgesDelete={(es) => es.forEach((e) => quitarFlecha(e.source, e.target))}
              deleteKeyCode={['Delete', 'Backspace']}
              fitView fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
              minZoom={0.3} maxZoom={1.6}
              proOptions={{ hideAttribution: true }}
              aria-label={`Editor del arbol ${tree.name}: ${tree.nodes.length} habilidades.`}
            >
              <Background gap={22} size={1} color="#1d2433" />
              <Controls showInteractive={false} />
            </ReactFlow>
            {tree.nodes.length === 0 && (
              <div className="ste-empty">Pulsa <b>+ Habilidad</b> para empezar.</div>
            )}
          </div>

          {/* ---------- ficha lateral */}
          <aside className="ste-side">
            {nodoSel ? (
              <FichaNodo key={nodoSel.id} t={t} tree={tree} n={nodoSel}
                setNode={(p) => setNode(nodoSel.id, p)}
                renombrar={(name) => renombrar(nodoSel, name)}
                borrar={() => borrarNodos([nodoSel.id])}
                quitarReq={(from) => quitarFlecha(from, nodoSel.id)}
                tipoReq={(from, tipo) => tipoFlecha(from, nodoSel.id, tipo)}
                elegirPareja={(otro) => parejaEleccion(nodoSel.id, otro)} />
            ) : flechaSel?.from && flechaSel?.to ? (
              <div>
                <h3>Requisito</h3>
                <p className="hint" style={{ marginTop: 0 }}>
                  Para tomar <b>{flechaSel.to.name}</b> hace falta <b>{flechaSel.from.name}</b>.
                </p>
                <TipoReq
                  any={(flechaSel.to.requiresAny ?? []).includes(flechaSel.from.id)}
                  onChange={(tipo) => tipoFlecha(flechaSel.from!.id, flechaSel.to!.id, tipo)} />
                <button className="mini" style={{ marginTop: 12 }}
                  onClick={() => quitarFlecha(flechaSel.from!.id, flechaSel.to!.id)}>quitar esta flecha</button>
              </div>
            ) : (
              <div className="hint">
                <h3 style={{ color: 'var(--text)' }}>Como se usa</h3>
                <ul className="ste-help">
                  <li><b>+ Habilidad</b> agrega una. Arrastrala para moverla.</li>
                  <li>Para decir que una habilidad <b>requiere</b> otra, arrastra desde el punto derecho de la primera hasta la segunda.</li>
                  <li>Pulsa una flecha para elegir si es <b>obligatoria</b> o una <b>alternativa</b> (linea punteada, "o").</li>
                  <li>Pulsa una habilidad para editar su nombre, sus rangos y lo que suma a tus estadisticas.</li>
                  <li>Para borrar, seleccionala y pulsa <b>Supr</b>.</li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}

      {problemas.errors.length > 0 && !probando && (
        <ul className="ste-errors">
          {problemas.errors.slice(0, 6).map((p, i) => <li key={i}>{p.message}</li>)}
        </ul>
      )}
    </div>
  )
}

// ------------------------------------------------------------ ficha de nodo

function TipoReq({ any, onChange }: { any: boolean; onChange: (t: 'all' | 'any') => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Tipo de requisito">
      <button className={!any ? 'on' : ''} role="radio" aria-checked={!any} onClick={() => onChange('all')}
        title="Hace falta esta y todas las demas obligatorias">obligatorio</button>
      <button className={any ? 'on' : ''} role="radio" aria-checked={any} onClick={() => onChange('any')}
        title="Basta con tener una de las alternativas">alternativa (o)</button>
    </div>
  )
}

function FichaNodo({ t, tree, n, setNode, renombrar, borrar, quitarReq, tipoReq, elegirPareja }: {
  t: GameTemplate; tree: SkillTreeDef; n: SkillNode
  setNode: (p: Partial<SkillNode>) => void
  /** Vuelve excluyente este nodo con otro ('' = quitar la eleccion). */
  elegirPareja: (otroId: string) => void
  renombrar: (name: string) => void
  borrar: () => void
  quitarReq: (from: string) => void
  tipoReq: (from: string, tipo: 'all' | 'any') => void
}) {
  // El nombre se confirma al salir del campo: renombrar puede cambiar el id
  // interno, y hacerlo en cada tecla moveria la seleccion mientras se escribe.
  const [nombre, setNombre] = useState(n.name)
  const efectos = Object.entries(n.effects ?? {})
  const setEfectos = (next: [string, number][]) => setNode({ effects: Object.fromEntries(next) })
  const nombreDe = (id: string) => tree.nodes.find((x) => x.id === id)?.name ?? id
  const reqs = [
    ...(n.requires ?? []).map((id) => ({ id, any: false })),
    ...(n.requiresAny ?? []).map((id) => ({ id, any: true })),
  ]
  const unidad = (id: string) => {
    const s = t.stats.find((x) => x.id === id)
    return s?.aggregate === 'multiply' ? '% (multiplica)' : s?.unit === 'percent' ? '%' : ''
  }
  return (
    <div>
      <h3>Habilidad</h3>
      <label className="field">
        <span>Nombre</span>
        <input type="text" value={nombre} maxLength={60}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => { if (nombre.trim() && nombre !== n.name) renombrar(nombre.trim()) }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
      </label>
      <label className="field">
        <span>Descripcion (opcional)</span>
        <input type="text" value={n.description ?? ''} onChange={(e) => setNode({ description: e.target.value || undefined })} />
      </label>
      <div className="ste-grid3">
        <label className="field">
          <span>Rangos</span>
          <input type="number" min={1} value={maxRankOf(n)}
            onChange={(e) => setNode({ maxRank: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
        </label>
        <label className="field">
          <span>Puntos por rango</span>
          <input type="number" min={0} value={costOf(n)}
            onChange={(e) => { const v = Number(e.target.value); setNode({ cost: Number.isFinite(v) && v >= 0 ? v : 1 }) }} />
        </label>
        <label className="field" title="Puntos que hay que haber gastado en otras habilidades de este arbol antes de poder tomar esta">
          <span>Pide pts previos</span>
          <input type="number" min={0} value={n.requiresPoints ?? 0}
            onChange={(e) => { const v = Math.max(0, Math.floor(Number(e.target.value) || 0)); setNode({ requiresPoints: v || undefined }) }} />
        </label>
      </div>

      <h4>Suma a tus estadisticas, por rango</h4>
      {efectos.length === 0 && <p className="hint" style={{ marginTop: 0 }}>Todavia no modifica nada.</p>}
      {efectos.map(([k, v], i) => (
        <div className="ste-eff-row" key={k}>
          <select value={k} onChange={(e) => setEfectos(efectos.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))}>
            {t.stats.filter((s) => s.id === k || !(s.id in (n.effects ?? {}))).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="number" value={v} step="any"
            onChange={(e) => setEfectos(efectos.map((x, j) => (j === i ? [x[0], Number(e.target.value) || 0] : x)))} />
          <span className="ste-unit">{unidad(k)}</span>
          <button className="mini" aria-label="quitar efecto" onClick={() => setEfectos(efectos.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {t.stats.some((s) => !(s.id in (n.effects ?? {}))) && (
        <button className="mini" onClick={() => {
          const libre = t.stats.find((s) => !(s.id in (n.effects ?? {})))!
          setEfectos([...efectos, [libre.id, 1]])
        }}>+ efecto</button>
      )}

      <h4>Eleccion</h4>
      <label className="field">
        <span>Excluyente con (el jugador solo puede tomar una)</span>
        <select value={tree.nodes.find((o) => o.id !== n.id && n.choiceGroup && o.choiceGroup === n.choiceGroup)?.id ?? ''}
          onChange={(e) => elegirPareja(e.target.value)}>
          <option value="">— ninguna, se puede tomar libremente —</option>
          {tree.nodes.filter((o) => o.id !== n.id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>

      <h4>Requisitos</h4>
      {reqs.length === 0
        ? <p className="hint" style={{ marginTop: 0 }}>Ninguno: se puede tomar desde el principio. Para agregar uno, une otra habilidad con esta mediante una flecha.</p>
        : reqs.map((r) => (
          <div className="ste-req" key={r.id}>
            <span>{nombreDe(r.id)}</span>
            <TipoReq any={r.any} onChange={(tipo) => tipoReq(r.id, tipo)} />
            <button className="mini" aria-label={`quitar requisito ${nombreDe(r.id)}`} onClick={() => quitarReq(r.id)}>×</button>
          </div>
        ))}

      {formulasThatUse(t, n.id).length > 0 && (
        <p className="hint ste-mec-note">
          Ademas de sumar estadisticas, esta habilidad <b>activa una mecanica</b> en:{' '}
          {formulasThatUse(t, n.id).join(', ')}.
        </p>
      )}

      <details className="ste-adv">
        <summary>Avanzado</summary>
        <p className="hint">
          Nombre interno para las formulas: <code>{skillVar(n.id)}</code> (vale el rango elegido). Sirve
          para habilidades que activan una mecanica en la pestana Formulas. Si no lo necesitas,
          ignoralo.
        </p>
      </details>

      <button className="mini" style={{ marginTop: 12 }} onClick={borrar}>borrar habilidad</button>
    </div>
  )
}
