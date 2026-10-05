import { useMemo } from 'react'
import type { GameTemplate, SkillNode, SkillSelection, SkillTreeDef } from '../core/types'
import {
  canLower, canRaise, costOf, indexSkills, maxRankOf, pointsSpent, skillContribution,
} from '../core/skills'
/** 5 -> "5", 2.5 -> "2,5", 21.0000001 -> "21". */
const num = (v: number) => v.toLocaleString('es-CL', { maximumFractionDigits: 2 })

/**
 * Explorar y elegir habilidades.
 *
 * Los nodos se acomodan en columnas segun su profundidad de requisitos (un nodo
 * va a la derecha de todo lo que pide), asi que cualquier forma que invente el
 * autor —una linea, un abanico, ramas que se juntan— se lee de izquierda a
 * derecha sin que el autor tenga que posicionar nada.
 *
 * Cada boton deshabilitado dice POR QUE: "requiere Fuerza", "no quedan puntos".
 */
export default function SkillTreePanel({
  template, selection, onChange,
}: {
  template: GameTemplate
  selection: SkillSelection
  onChange: (sel: SkillSelection) => void
}) {
  const trees = template.skillTrees ?? []
  const set = (id: string, r: number) => {
    const next = { ...selection }
    if (r <= 0) delete next[id]; else next[id] = r
    onChange(next)
  }
  return (
    <div className="skill-trees">
      {trees.map((t) => (
        <TreeView key={t.id} tree={t} template={template} selection={selection} set={set}
          onReset={() => {
            const next = { ...selection }
            for (const n of t.nodes) delete next[n.id]
            onChange(next)
          }} />
      ))}
    </div>
  )
}

/** Columna de cada nodo: 0 si no pide nada; si no, una mas que el mas profundo que pide. */
function depths(tree: SkillTreeDef, template: GameTemplate): Map<string, number> {
  const ix = indexSkills(template)
  const memo = new Map<string, number>()
  const go = (id: string, pila: Set<string>): number => {
    const m = memo.get(id)
    if (m !== undefined) return m
    const n = ix.node.get(id)
    if (!n || pila.has(id)) return 0
    pila.add(id)
    // Solo cuentan los requisitos del MISMO arbol para la columna.
    const reqs = [...(n.requires ?? []), ...(n.requiresAny ?? [])].filter((r) => ix.treeOf.get(r) === tree)
    const d = reqs.length ? Math.max(...reqs.map((r) => go(r, pila) + 1)) : 0
    pila.delete(id)
    memo.set(id, d)
    return d
  }
  for (const n of tree.nodes) go(n.id, new Set())
  return memo
}

function TreeView({ tree, template, selection, set, onReset }: {
  tree: SkillTreeDef; template: GameTemplate; selection: SkillSelection
  set: (id: string, r: number) => void; onReset: () => void
}) {
  const cols = useMemo(() => {
    const d = depths(tree, template)
    const out: SkillNode[][] = []
    for (const n of tree.nodes) (out[d.get(n.id) ?? 0] ??= []).push(n)
    return out.filter(Boolean)
  }, [tree, template])
  const gastados = pointsSpent(tree, selection)
  return (
    <section className="skill-tree">
      <header>
        <h3>{tree.name}</h3>
        <span className={`chip ${tree.budget !== undefined && gastados >= tree.budget ? 'g' : 'n'}`}>
          {gastados}{tree.budget !== undefined ? ` / ${tree.budget}` : ''} puntos
        </span>
        <div style={{ flex: 1 }} />
        {gastados > 0 && <button className="mini" onClick={onReset}>reiniciar</button>}
      </header>
      {tree.description && <p className="hint" style={{ marginTop: 0 }}>{tree.description}</p>}
      {tree.nodes.length > 0 && tree.nodes.every((n) => n.x !== undefined && n.y !== undefined)
        ? <PositionedTree tree={tree} template={template} selection={selection} set={set} />
        : (
          <div className="skill-cols">
            {cols.map((col, i) => (
              <div className="skill-col" key={i}>
                {col.map((n) => <NodeCard key={n.id} n={n} template={template} selection={selection} set={set} />)}
              </div>
            ))}
          </div>
        )}
    </section>
  )
}

function NodeCard({ n, template, selection, set, compact }: {
  n: SkillNode; template: GameTemplate; selection: SkillSelection; set: (id: string, r: number) => void
  /** Version reducida para los arboles con posiciones (los detalles van en el tooltip). */
  compact?: boolean
}) {
  const rank = selection[n.id] ?? 0
  const max = maxRankOf(n)
  const subir = canRaise(template, selection, n.id)
  const bajar = canLower(template, selection, n.id)
  const bloqueado = rank === 0 && subir !== null
  const ix = indexSkills(template)
  const nombre = (id: string) => ix.node.get(id)?.name ?? id
  const stat = (id: string) => template.stats.find((s) => s.id === id)
  const efectos = Object.entries(n.effects ?? {}).map(([k, v]) => {
    const s = stat(k)
    const signo = v >= 0 ? '+' : ''
    return `${signo}${num(v)}${s?.unit === 'percent' || s?.aggregate === 'multiply' ? '%' : ''} ${s?.name ?? k}`
  })
  const reglas: string[] = []
  if (n.requires?.length) reglas.push(`pide ${n.requires.map(nombre).join(' y ')}`)
  if (n.requiresAny?.length) reglas.push(`pide ${n.requiresAny.map(nombre).join(' o ')}`)
  if (n.requiresPoints) reglas.push(`${n.requiresPoints} pts en el arbol`)
  if (costOf(n) === 0) reglas.push('gratis')
  else if (costOf(n) !== 1) reglas.push(`cuesta ${costOf(n)}`)
  if (n.choiceGroup) {
    const otras = [...indexSkills(template).node.values()].filter((o) => o.id !== n.id && o.choiceGroup === n.choiceGroup)
    if (otras.length) reglas.push(`eleccion con ${otras.map((o) => o.name).join(' / ')}`)
  }

  if (compact) {
    const tip = [n.name, efectos.join(' · '), n.description, reglas.join(' · '), bloqueado ? subir : null].filter(Boolean).join('\n')
    return (
      <div className={`skill-node compact${rank > 0 ? ' on' : ''}${bloqueado ? ' locked' : ''}${n.choiceGroup ? ' choice' : ''}`} title={tip}>
        <div className="sn-top">
          <b>{n.name}</b>
          <span className="sn-rank">{rank}/{max}</span>
        </div>
        <div className={`sn-eff${efectos.length ? '' : ' dim'}`}>
          {efectos.length ? efectos.join(' · ') : [costOf(n) === 0 ? 'gratis' : '', n.choiceGroup ? 'eleccion' : ''].filter(Boolean).join(' · ')}
        </div>
        <div className="sn-btns">
          <button className="mini" disabled={bajar !== null} title={bajar ?? 'Quitar un rango'}
            aria-label={`Quitar un rango de ${n.name}`} onClick={() => set(n.id, rank - 1)}>−</button>
          <button className="mini" disabled={subir !== null} title={subir ?? 'Agregar un rango'}
            aria-label={`Agregar un rango a ${n.name}`} onClick={() => set(n.id, rank + 1)}>+</button>
        </div>
      </div>
    )
  }
  return (
    <div className={`skill-node${rank > 0 ? ' on' : ''}${bloqueado ? ' locked' : ''}`}
      title={bloqueado ? subir! : n.description ?? n.name}>
      <div className="sn-top">
        <b>{n.name}</b>
        <span className="sn-rank">{rank}/{max}</span>
      </div>
      {efectos.length > 0 && <div className="sn-eff">{efectos.join(' · ')}{max > 1 ? ' por rango' : ''}</div>}
      {efectos.length === 0 && <div className="sn-eff dim">Activa una mecanica (skill_{n.id})</div>}
      {n.description && <div className="sn-desc">{n.description}</div>}
      {reglas.length > 0 && <div className="sn-rules">{reglas.join(' · ')}</div>}
      {bloqueado && <div className="sn-why">{subir}</div>}
      <div className="sn-btns">
        <button className="mini" disabled={bajar !== null} title={bajar ?? 'Quitar un rango'}
          aria-label={`Quitar un rango de ${n.name}`} onClick={() => set(n.id, rank - 1)}>−</button>
        <button className="mini" disabled={subir !== null} title={subir ?? 'Agregar un rango'}
          aria-label={`Agregar un rango a ${n.name}`} onClick={() => set(n.id, rank + 1)}>+</button>
      </div>
    </div>
  )
}

/**
 * Arbol con las posiciones que dibujo su autor en el editor (o que trae un
 * juego importado, como los arboles de World of Warcraft). Cada nodo va donde
 * el autor lo puso y las lineas unen requisitos.
 */
const PW = 176   // ancho de un nodo compacto
const PH = 96    // alto de un nodo compacto
const ESCALA = 0.86

function PositionedTree({ tree, template, selection, set }: {
  tree: SkillTreeDef; template: GameTemplate; selection: SkillSelection; set: (id: string, r: number) => void
}) {
  const minX = Math.min(...tree.nodes.map((n) => n.x!))
  const minY = Math.min(...tree.nodes.map((n) => n.y!))
  const pos = new Map(tree.nodes.map((n) => [n.id, { x: (n.x! - minX) * ESCALA, y: (n.y! - minY) * ESCALA }]))
  const ancho = Math.max(...[...pos.values()].map((p) => p.x)) + PW + 8
  const alto = Math.max(...[...pos.values()].map((p) => p.y)) + PH + 8
  const lineas = tree.nodes.flatMap((n) => [...(n.requires ?? []), ...(n.requiresAny ?? [])]
    .filter((r) => pos.has(r))
    .map((r) => ({ from: pos.get(r)!, to: pos.get(n.id)!, on: (selection[r] ?? 0) > 0 && (selection[n.id] ?? 0) > 0, key: `${r}-${n.id}` })))
  return (
    <div className="skill-pos-wrap">
      <div className="skill-pos" style={{ width: ancho, height: alto }}>
        <svg width={ancho} height={alto} aria-hidden="true">
          {lineas.map((l) => {
            // Si el requisito esta arriba, la linea baja del borde inferior al superior
            // (como en los arboles de WoW); si no, une los centros.
            const abajo = l.to.y >= l.from.y + PH
            return (
              <line key={l.key} x1={l.from.x + PW / 2} y1={l.from.y + (abajo ? PH : PH / 2)}
                x2={l.to.x + PW / 2} y2={l.to.y + (abajo ? 0 : PH / 2)} className={l.on ? 'on' : ''} />
            )
          })}
        </svg>
        {tree.nodes.map((n) => (
          <div key={n.id} className="skill-pos-node" style={{ left: pos.get(n.id)!.x, top: pos.get(n.id)!.y, width: PW, height: PH }}>
            <NodeCard n={n} template={template} selection={selection} set={set} compact />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Resumen de lo que aportan las habilidades elegidas, para mostrar fuera del panel. */
export function SkillSummary({ template, selection }: { template: GameTemplate; selection: SkillSelection }) {
  const c = skillContribution(template, selection)
  const partes = Object.entries(c).filter(([, v]) => Math.abs(v) > 1e-9).map(([k, v]) => {
    const s = template.stats.find((x) => x.id === k)
    return `${v >= 0 ? '+' : ''}${num(v)}${s?.unit === 'percent' || s?.aggregate === 'multiply' ? '%' : ''} ${s?.name ?? k}`
  })
  const mecanicas = Object.keys(selection).filter((id) => {
    const n = indexSkills(template).node.get(id)
    return n && Object.keys(n.effects ?? {}).length === 0
  }).map((id) => indexSkills(template).node.get(id)!.name)
  if (partes.length === 0 && mecanicas.length === 0) return <span className="hint">Ninguna habilidad elegida.</span>
  return (
    <span className="hint">
      {partes.join(' · ')}
      {mecanicas.length > 0 && <>{partes.length > 0 && ' · '}activa: {mecanicas.join(', ')}</>}
    </span>
  )
}
