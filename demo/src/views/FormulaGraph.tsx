/**
 * El grafo de formulas, dibujado
 * ==============================
 * La misma informacion que el bloque de codigo, pero en la forma que tiene de
 * verdad: un grafo. Se lee de izquierda (lo que aportan las piezas) a derecha
 * (el numero que se maximiza).
 *
 * Sobre accesibilidad: un lienzo de nodos es, por defecto, invisible para un
 * lector de pantalla y para quien no usa raton. Aqui no se acepta esa perdida.
 *  · Cada nodo es un elemento enfocable con Tab, con `aria-label` que dice su
 *    nombre, su valor y de que depende — o sea, todo lo que transmite el dibujo.
 *  · Enter o Espacio lo selecciona igual que el clic.
 *  · El bloque de codigo NO desaparece: sigue estando a un clic, porque para
 *    copiar una formula el texto es mejor herramienta que un diagrama.
 *  · El color nunca es el unico portador de significado: cada tipo de nodo lleva
 *    ademas su etiqueta ("estadistica", "intermedio", "objetivo").
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background, BaseEdge, Controls, Handle, Position, ReactFlow, getSmoothStepPath,
  type Edge, type EdgeProps, type Node, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GameTemplate, ObjectiveDef } from '../core/types'
import { OBJ, buildGraph, evalGraph, type GraphNode, type NodeKind } from '../core/graph'
import { fmt } from '../ui/format'

const ANCHO = 210
const ALTO = 66
const GAP_X = 82
const GAP_Y = 16

/**
 * A partir de cuantas entradas simples se agrupa un nodo.
 *
 * `dmgBonus` de Genshin suma veintiuna variables (bonos de cada elemento y sus
 * selectores). Dibujadas una a una aplastan el resto del grafo: veintiun nodos
 * en una columna obligan a alejar tanto el lienzo que ya no se lee nada, y lo
 * que se pierde es justamente la estructura que se venia a ver. Agrupar no es
 * esconder: el paquete dice cuantas son, y se abre de un clic.
 */
const UMBRAL_PAQUETE = 6

const ETIQUETA: Record<NodeKind, string> = {
  objective: 'objetivo',
  derived: 'intermedio',
  stat: 'estadistica',
  base: 'del personaje',
  unknown: 'sin declarar',
}

/** Nodo sintetico que representa un grupo de entradas simples. */
interface Paquete { id: string; destino: string; miembros: GraphNode[] }

interface Datos extends Record<string, unknown> {
  n: GraphNode
  valor?: number
  atenuado: boolean
  resaltado: boolean
  /** Si es un paquete: cuantas entradas agrupa y si esta abierto. */
  paquete?: { cuantas: number; abierto: boolean }
  onPick: (id: string) => void
}

/** Nodo: tipo, nombre, valor y —si es intermedio— su formula. */
function NodoFormula({ data }: NodeProps) {
  const { n, valor, atenuado, resaltado, paquete, onPick } = data as unknown as Datos
  const tieneValor = valor !== undefined && Number.isFinite(valor)
  const aria = paquete
    ? `Grupo de ${paquete.cuantas} entradas simples. ${paquete.abierto ? 'Abierto' : 'Cerrado'}. ` +
      `Pulsa para ${paquete.abierto ? 'cerrarlo' : 'desplegarlas'}. Son: ${n.label}.`
    : `${ETIQUETA[n.kind]}: ${n.label}.` +
      (tieneValor ? ` Valor ${fmt(valor!, 2)}${n.unit ?? ''}.` : '') +
      (n.deps.length ? ` Depende de ${n.deps.length} entrada(s).` : ' No depende de nada: es un dato de entrada.') +
      (n.formula ? ` Formula: ${n.formula}` : '')
  return (
    <div
      className={`fnode k-${paquete ? 'bundle' : n.kind}${atenuado ? ' off' : ''}${resaltado ? ' hit' : ''}`}
      role="button" tabIndex={0} aria-label={aria}
      aria-expanded={paquete ? paquete.abierto : undefined}
      title={paquete ? n.label : n.formula ?? n.label}
      onClick={() => onPick(n.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(n.id) } }}
    >
      {(n.deps.length > 0 || paquete) && <Handle type="target" position={Position.Left} />}
      <div className="fk">{paquete ? `${paquete.cuantas} entradas` : ETIQUETA[n.kind]}</div>
      <div className="fl">{paquete ? (paquete.abierto ? 'agrupar de nuevo' : 'desplegar') : n.label}</div>
      {paquete
        ? <div className="fsub">{n.label}</div>
        : tieneValor && <div className="fv">{fmt(valor!, 2)}{n.unit ?? ''}</div>}
      {(n.users.length > 0 || paquete) && <Handle type="source" position={Position.Right} />}
    </div>
  )
}

/** Arista propia: la de serie no permite atenuar las que no vienen al caso. */
function Arista({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const [d] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 10 })
  const act = (data as { act?: boolean } | undefined)?.act
  return <BaseEdge path={d} style={{
    stroke: act ? 'var(--accent)' : 'var(--line-2)',
    strokeWidth: act ? 1.9 : 1.2,
    opacity: act === false ? 0.2 : 1,
  }} />
}

const TIPOS = { f: NodoFormula }
const TIPOS_E = { f: Arista }

export default function FormulaGraph({
  template, objective, finalStats, profileId,
}: {
  template: GameTemplate
  objective: ObjectiveDef
  /** Estadisticas de la mejor build, si ya se optimizo. */
  finalStats?: Record<string, number>
  profileId: string
}) {
  const [sel, setSel] = useState<string | null>(null)
  useEffect(() => setSel(null), [objective.id, finalStats])

  const g = useMemo(() => buildGraph(template, objective), [template, objective])

  const valores = useMemo(
    () => (finalStats ? evalGraph(template, objective, finalStats, profileId) : null),
    [template, objective, finalStats, profileId],
  )

  /**
   * Al seleccionar un nodo se marca su LINAJE COMPLETO: todo lo que entra en el
   * y todo a lo que acaba afectando. Marcar solo los vecinos inmediatos
   * responderia "quien lo toca", cuando la pregunta que trae a alguien a un
   * grafo asi es "de donde sale esto" y "a que afecta si lo cambio".
   */
  const linaje = useMemo(() => {
    if (!sel) return null
    const byId = new Map(g.nodes.map((n) => [n.id, n]))
    const marcados = new Set<string>([sel])
    const subir = (id: string) => { for (const d of byId.get(id)?.deps ?? []) if (!marcados.has(d)) { marcados.add(d); subir(d) } }
    const bajar = (id: string) => { for (const u of byId.get(id)?.users ?? []) if (!marcados.has(u)) { marcados.add(u); bajar(u) } }
    subir(sel); bajar(sel)
    return marcados
  }, [sel, g])

  /**
   * Que paquetes hay y cuales estan abiertos.
   *
   * Se agrupan solo las entradas SIMPLES (las que no dependen de nada): un
   * intermedio nunca se esconde, porque es precisamente la estructura que el
   * diagrama viene a mostrar.
   */
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  useEffect(() => setAbiertos(new Set()), [objective.id])

  const paquetes = useMemo<Paquete[]>(() => {
    const byId = new Map(g.nodes.map((n) => [n.id, n]))
    const out: Paquete[] = []
    for (const n of g.nodes) {
      const hojas = n.deps
        .map((d) => byId.get(d))
        .filter((d): d is GraphNode => !!d && d.deps.length === 0 && d.users.length === 1)
      if (hojas.length >= UMBRAL_PAQUETE) out.push({ id: `pkg:${n.id}`, destino: n.id, miembros: hojas })
    }
    return out
  }, [g])

  const onPick = useCallback((id: string) => {
    if (id.startsWith('pkg:')) {
      setAbiertos((s) => {
        const n = new Set(s)
        if (n.has(id)) n.delete(id); else n.add(id)
        return n
      })
      return
    }
    setSel((s) => (s === id ? null : id))
  }, [])

  const { nodes, edges, alto } = useMemo(() => {
    // Nodos ocultos tras un paquete cerrado.
    const oculto = new Map<string, Paquete>()
    for (const p of paquetes) {
      if (abiertos.has(p.id)) continue
      for (const m of p.miembros) oculto.set(m.id, p)
    }
    const visibles = g.nodes.filter((n) => !oculto.has(n.id))

    // Reparto por capas: dentro de cada columna, orden estable por nombre para
    // que dos renders del mismo grafo se dibujen igual.
    const porCapa = new Map<number, { id: string; label: string; layer: number; n: GraphNode; pkg?: Paquete }[]>()
    const meter = (capa: number, x: { id: string; label: string; layer: number; n: GraphNode; pkg?: Paquete }) =>
      porCapa.set(capa, [...(porCapa.get(capa) ?? []), x])

    for (const n of visibles) meter(n.layer, { id: n.id, label: n.label, layer: n.layer, n })
    for (const p of paquetes) {
      if (abiertos.has(p.id)) continue
      const capa = Math.max(0, (g.nodes.find((n) => n.id === p.destino)?.layer ?? 1) - 1)
      const resumen: GraphNode = {
        id: p.id, kind: 'stat', layer: capa,
        label: p.miembros.slice(0, 4).map((m) => m.label).join(', ') +
          (p.miembros.length > 4 ? ` y ${p.miembros.length - 4} mas` : ''),
        deps: [], users: [p.destino],
      }
      meter(capa, { id: p.id, label: 'zzz', layer: capa, n: resumen, pkg: p })
    }
    for (const arr of porCapa.values()) arr.sort((a, b) => a.label.localeCompare(b.label))

    const altoMax = Math.max(1, ...[...porCapa.values()].map((a) => a.length)) * (ALTO + GAP_Y)

    const ns: Node[] = []
    for (const [capa, arr] of porCapa) {
      const h = arr.length * (ALTO + GAP_Y)
      arr.forEach((x, i) => {
        ns.push({
          id: x.id,
          type: 'f',
          position: { x: capa * (ANCHO + GAP_X), y: (altoMax - h) / 2 + i * (ALTO + GAP_Y) },
          data: {
            n: x.n,
            valor: x.pkg ? undefined : valores?.get(x.id === OBJ(objective.id) ? objective.id : x.id),
            atenuado: !!linaje && !x.pkg && !linaje.has(x.id),
            resaltado: x.id === sel,
            paquete: x.pkg ? { cuantas: x.pkg.miembros.length, abierto: false } : undefined,
            onPick,
          } satisfies Datos,
          draggable: true, selectable: false, width: ANCHO, height: ALTO,
        })
      })
    }

    const visiblesIds = new Set(ns.map((n) => n.id))
    const es: Edge[] = []
    for (const e of g.edges) {
      const p = oculto.get(e.from)
      const desde = p ? p.id : e.from
      if (!visiblesIds.has(desde) || !visiblesIds.has(e.to)) continue
      const id = `${desde}->${e.to}`
      if (es.some((x) => x.id === id)) continue
      es.push({
        id, source: desde, target: e.to, type: 'f',
        data: { act: linaje ? (linaje.has(e.from) && linaje.has(e.to)) : undefined },
      })
    }
    return { nodes: ns, edges: es, alto: altoMax }
  }, [g, valores, linaje, sel, onPick, paquetes, abiertos])

  const elegido = sel ? g.nodes.find((n) => n.id === sel) : null
  /** Nombre legible de un id: en el detalle no deben verse ids internos. */
  const nombre = (id: string) => g.nodes.find((n) => n.id === id)?.label ?? id

  return (
    <div>
      <div className="fgraph" style={{ height: Math.min(700, Math.max(320, alto + 40)) }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          nodeTypes={TIPOS} edgeTypes={TIPOS_E}
          fitView fitViewOptions={{ padding: 0.16 }}
          minZoom={0.25} maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
          onPaneClick={() => setSel(null)}
          aria-label={`Grafo de la formula ${objective.name}: ${g.nodes.length} nodos en ${g.layers} niveles.`}
        >
          <Background gap={22} size={1} color="#1d2433" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="fleyenda">
        {(['stat', 'base', 'derived', 'objective'] as NodeKind[]).map((k) => (
          <span key={k} className={`fchip k-${k}`}>{ETIQUETA[k]}</span>
        ))}
        {paquetes.length > 0 && <span className="fchip k-bundle">grupo desplegable</span>}
        <div style={{ flex: 1 }} />
        {elegido
          ? <button className="mini" onClick={() => setSel(null)}>quitar el foco de «{elegido.label}»</button>
          : <span className="fhint">Pulsa un nodo para seguir su rastro completo, de la pieza al resultado.</span>}
      </div>

      {elegido && (
        <div className="fdetalle">
          <b>{elegido.label}</b> <span className={`fchip k-${elegido.kind}`}>{ETIQUETA[elegido.kind]}</span>
          {(() => {
            const v = valores?.get(elegido.id === OBJ(objective.id) ? objective.id : elegido.id)
            return v !== undefined && <> · vale <b>{fmt(v, 2)}{elegido.unit ?? ''}</b> en la mejor build</>
          })()}
          {elegido.formula && <pre className="code wrap" style={{ marginTop: 8 }}>{elegido.id} = {elegido.formula}</pre>}
          <div className="fhint" style={{ marginTop: 7 }}>
            {elegido.deps.length > 0
              ? <>Entra desde: {elegido.deps.map(nombre).join(', ')}.</>
              : <>Es un dato de entrada: lo aportan las piezas o el personaje.</>}
            {elegido.users.length > 0 && <> Alimenta a: {elegido.users.map(nombre).join(', ')}.</>}
          </div>
        </div>
      )}
    </div>
  )
}
