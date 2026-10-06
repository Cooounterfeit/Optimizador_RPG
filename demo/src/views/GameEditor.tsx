import { useMemo, useState } from 'react'
import type {
  GameTemplate, Item, ObjectiveDef, SetDef, SlotDef, StatDef,
} from '../core/types'
import { validateTemplate } from '../core/validate'
import ItemImporter from './ItemImporter'
import { toId } from '../store/infer'
import { nf } from '../ui/format'
import CoverPicker, { Cover } from '../ui/CoverPicker'

type Tab = 'general' | 'stats' | 'slots' | 'sets' | 'profiles' | 'objectives' | 'items'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'stats', label: 'Estadisticas' },
  { id: 'slots', label: 'Ranuras' },
  { id: 'sets', label: 'Conjuntos' },
  { id: 'profiles', label: 'Perfiles' },
  { id: 'objectives', label: 'Formulas' },
  { id: 'items', label: 'Objetos' },
]

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

export default function GameEditor({
  template: initialTemplate, items: initialItems, onSave, onCancel,
}: {
  template: GameTemplate
  items: Item[]
  onSave: (t: GameTemplate, i: Item[]) => void
  onCancel: () => void
}) {
  const [t, setT] = useState<GameTemplate>(() => clone(initialTemplate))
  const [items, setItems] = useState<Item[]>(() => clone(initialItems))
  const [tab, setTab] = useState<Tab>('general')
  const [dirty, setDirty] = useState(false)

  const upd = (patch: Partial<GameTemplate>) => { setT({ ...t, ...patch }); setDirty(true) }
  const updItems = (next: Item[]) => { setItems(next); setDirty(true) }

  const report = useMemo(() => validateTemplate(t, items), [t, items])
  const errores = report.issues.filter((i) => i.severity === 'error')
  const avisos = report.issues.filter((i) => i.severity === 'warning')

  /**
   * Pasos que faltan para que el juego funcione.
   *
   * Partiendo de cero, la lista de errores del validador no basta como guia:
   * dice que esta mal, no que hacer a continuacion. Esto convierte lo que falta
   * en una secuencia con un solo siguiente paso a la vez.
   */
  const pasos: { hecho: boolean; texto: string; tab: Tab }[] = [
    { hecho: t.stats.length > 0, texto: 'Define al menos una estadistica (ataque, vida, defensa…)', tab: 'stats' },
    { hecho: t.slots.length > 0, texto: 'Define al menos una ranura de equipo (arma, casco…)', tab: 'slots' },
    { hecho: t.baseProfiles.length > 0 && t.stats.length > 0, texto: 'Ajusta los valores del personaje sin equipo', tab: 'profiles' },
    { hecho: t.objectives.length > 0, texto: 'Define que se quiere maximizar', tab: 'objectives' },
    { hecho: items.length > 0 && t.slots.every((sl) => items.some((i) => i.slot === sl.id)), texto: 'Anade objetos: cada ranura necesita al menos uno', tab: 'items' },
  ]
  const siguiente = pasos.find((p) => !p.hecho)

  /** Donde se usa una estadistica: impide borrar algo de lo que dependen las formulas. */
  const statUsage = useMemo(() => {
    const m = new Map<string, string[]>()
    const add = (id: string, donde: string) => m.set(id, [...(m.get(id) ?? []), donde])
    for (const s of t.stats) {
      const re = new RegExp(`\\b(base_)?${s.id}\\b`)
      for (const d of t.derived ?? []) if (re.test(d.formula)) add(s.id, `derivado ${d.id}`)
      for (const o of t.objectives) if (re.test(o.formula)) add(s.id, `objetivo ${o.name}`)
      for (const st of t.sets ?? []) for (const tier of st.tiers) if (s.id in (tier.effects ?? {})) add(s.id, `conjunto ${st.name}`)
      if (items.some((it) => s.id in it.stats)) add(s.id, 'objetos')
    }
    return m
  }, [t, items])

  return (
    <>
      <div className="card">
        <h2>
          Editando: {t.name}
          {errores.length > 0
            ? <span className="chip" style={{ background: 'rgba(224,108,117,.12)', color: 'var(--danger)', borderColor: 'rgba(224,108,117,.3)' }}>
                {errores.length} error(es)
              </span>
            : <span className="chip">sin errores</span>}
          {dirty && <span className="chip g">cambios sin guardar</span>}
        </h2>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
          {TABS.map((x) => (
            <button key={x.id} className={`mini${x.id === tab ? ' on' : ''}`} onClick={() => setTab(x.id)}>
              {x.label}
              {x.id === 'items' && ` (${nf.format(items.length)})`}
              {x.id === 'stats' && ` (${t.stats.length})`}
              {x.id === 'slots' && ` (${t.slots.length})`}
              {x.id === 'sets' && ` (${(t.sets ?? []).length})`}
            </button>
          ))}
        </div>
      </div>

      {siguiente && (
        <div className="card">
          <h2>Pasos que faltan</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Vas construyendo el juego desde cero. Estos son los pasos minimos para que el motor
            pueda optimizar; puedes hacerlos en cualquier orden.
          </p>
          {pasos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontFamily: 'var(--mono)', color: p.hecho ? 'var(--accent-2)' : 'var(--dim)', width: 16 }}>
                {p.hecho ? '✓' : '·'}
              </span>
              <span style={{ fontSize: 13, color: p.hecho ? 'var(--dim)' : 'var(--text)', flex: 1, minWidth: 200 }}>
                {p.texto}
              </span>
              {!p.hecho && p === siguiente && (
                <button className="mini on" onClick={() => setTab(p.tab)}>ir</button>
              )}
              {!p.hecho && p !== siguiente && (
                <button className="mini" onClick={() => setTab(p.tab)}>ir</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'general' && <General t={t} upd={upd} />}
      {tab === 'stats' && <Stats t={t} upd={upd} usage={statUsage} />}
      {tab === 'slots' && <Slots t={t} upd={upd} items={items} />}
      {tab === 'sets' && <Sets t={t} upd={upd} />}
      {tab === 'profiles' && <Profiles t={t} upd={upd} />}
      {tab === 'objectives' && <Objectives t={t} upd={upd} />}
      {tab === 'items' && <Items t={t} items={items} setItems={updItems} />}

      {(errores.length > 0 || avisos.length > 0) && (
        <div className="card">
          <h2>Revision en vivo</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>
            {[...errores, ...avisos].slice(0, 12).map((i, k) => (
              <li key={k} style={{ marginBottom: 5 }}>
                <span style={{ color: i.severity === 'error' ? 'var(--danger)' : 'var(--warn)', fontFamily: 'var(--mono)' }}>
                  {i.severity === 'error' ? '✗' : '!'}
                </span>{' '}
                {i.where && <b style={{ color: 'var(--text)' }}>[{i.where}] </b>}{i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="primary" style={{ width: 'auto', padding: '11px 26px' }}
            disabled={errores.length > 0 || items.length === 0}
            onClick={() => { onSave(t, items); setDirty(false) }}>
            Guardar cambios
          </button>
          <button className="mini" onClick={onCancel}>Descartar y volver</button>
          {errores.length > 0 && <span style={{ fontSize: 12, color: 'var(--danger)' }}>Corrige los errores para poder guardar.</span>}
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- utilidades */

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>{children}</div>
}
function Del({ onClick, title = 'borrar' }: { onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--dim)', borderRadius: 6, cursor: 'pointer', padding: '4px 9px', fontSize: 13 }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dim)'; e.currentTarget.style.borderColor = 'var(--line)' }}>
      ×
    </button>
  )
}

/* ---------------------------------------------------------------- general */

function General({ t, upd }: { t: GameTemplate; upd: (p: Partial<GameTemplate>) => void }) {
  const [portada, setPortada] = useState(false)
  return (
    <div className="card">
      <h2>Datos del juego</h2>
      <label className="field" style={{ maxWidth: 420 }}>
        <span>Nombre</span>
        <input type="text" value={t.name} onChange={(e) => upd({ name: e.target.value })} />
      </label>
      <label className="field">
        <span>Descripcion — sale en la tarjeta de la vista Juegos</span>
        <input type="text" value={t.description} onChange={(e) => upd({ description: e.target.value })} />
      </label>
      <div className="idrow">
        <div>
          <Cover src={t.cover} name={t.name || 'Juego'} accent={t.accent} id={t.gameId} height={104} />
          <button className="mini" style={{ marginTop: 8, width: '100%' }}
            onClick={() => setPortada(true)}>cambiar portada</button>
        </div>
        <div>
          <label className="field">
            <span>Categoria — agrupa el juego en el catalogo</span>
            <input type="text" value={t.category ?? ''} placeholder="Action RPG, Roguelike…"
              onChange={(e) => upd({ category: e.target.value })} />
          </label>
          <p className="hint" style={{ margin: 0 }}>
            La portada y la categoria van DENTRO de la plantilla, no en un almacen aparte.
            Asi un juego que compartes llega al otro lado con su cara puesta.
          </p>
        </div>
      </div>

      {portada && (
        <CoverPicker
          id={t.gameId} name={t.name || 'Juego'} cover={t.cover} accent={t.accent} category={t.category}
          onChange={(p) => upd(p)} onClose={() => setPortada(false)}
        />
      )}

      <label className="field" style={{ marginBottom: 0 }}>
        <span>Notas y simplificaciones — para quien use tu plantilla</span>
        <textarea value={t.notes ?? ''} onChange={(e) => upd({ notes: e.target.value })}
          style={{ width: '100%', minHeight: 90, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, font: 'inherit', fontSize: 13, resize: 'vertical' }} />
      </label>
    </div>
  )
}

/* ------------------------------------------------------------ estadisticas */

function Stats({ t, upd, usage }: {
  t: GameTemplate; upd: (p: Partial<GameTemplate>) => void; usage: Map<string, string[]>
}) {
  const set = (i: number, patch: Partial<StatDef>) =>
    upd({ stats: t.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  return (
    <div className="card">
      <h2>Estadisticas</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        El <b>modo</b> decide como se combinan los aportes de varias piezas: sumandose (lo
        habitual) o multiplicandose como factores, que es lo que necesitan los modificadores
        tipo «more» de Path of Exile.
      </p>
      {t.stats.length === 0 && (
        <p className="hint">
          Todavia no hay ninguna. Una estadistica es cualquier numero que aporten las piezas:
          ataque, vida, defensa, probabilidad de critico…
        </p>
      )}
      {t.stats.map((s, i) => {
        const usos = usage.get(s.id) ?? []
        return (
          <Row key={i}>
            <input type="text" value={s.name} onChange={(e) => set(i, { name: e.target.value })}
              placeholder="Nombre visible" style={{ width: 190 }} />
            <code style={{ fontSize: 11, color: 'var(--dim)', minWidth: 110 }}>{s.id}</code>
            <select value={s.unit} onChange={(e) => set(i, { unit: e.target.value as 'flat' | 'percent' })} style={{ width: 118 }}>
              <option value="flat">valor plano</option>
              <option value="percent">porcentaje</option>
            </select>
            <select value={s.aggregate ?? 'sum'} onChange={(e) => set(i, { aggregate: e.target.value as 'sum' | 'multiply' })} style={{ width: 128 }}>
              <option value="sum">se suma</option>
              <option value="multiply">se multiplica</option>
            </select>
            {usos.length > 0
              ? <span style={{ fontSize: 11, color: 'var(--dim)' }} title={usos.join(', ')}>en uso ({usos.length})</span>
              : <Del onClick={() => upd({
                  stats: t.stats.filter((_, j) => j !== i),
                  constrainableStats: t.constrainableStats.filter((x) => x !== s.id),
                })} />}
          </Row>
        )
      })}
      <button className="mini" style={{ marginTop: 6 }} onClick={() => {
        let id = 'nueva'; let n = 2
        while (t.stats.some((s) => s.id === id)) id = `nueva_${n++}`
        upd({ stats: [...t.stats, { id, name: 'Nueva estadistica', unit: 'flat' }] })
      }}>+ anadir estadistica</button>

      <h3>Ajustables desde el optimizador</h3>
      <p className="hint" style={{ marginTop: 0 }}>Cuales aparecen en el panel de restricciones.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {t.stats.map((s) => {
          const on = t.constrainableStats.includes(s.id)
          return (
            <button key={s.id} className={`mini${on ? ' on' : ''}`} onClick={() => upd({
              constrainableStats: on
                ? t.constrainableStats.filter((x) => x !== s.id)
                : [...t.constrainableStats, s.id],
            })}>{s.name}</button>
          )
        })}
      </div>

      <h3>Presupuestos</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Un maximo por defecto sobre una estadistica de coste: carga de equipo, peso, capacidad.
        Ahi <b>menos es mejor</b> y el motor invierte la dominancia.
      </p>
      {(t.budgets ?? []).map((b, i) => (
        <Row key={i}>
          <select value={b.statId} style={{ width: 190 }}
            onChange={(e) => upd({ budgets: (t.budgets ?? []).map((x, j) => (j === i ? { ...x, statId: e.target.value } : x)) })}>
            {t.stats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>maximo</span>
          <input type="number" value={b.max} style={{ width: 96 }}
            onChange={(e) => upd({ budgets: (t.budgets ?? []).map((x, j) => (j === i ? { ...x, max: Number(e.target.value) } : x)) })} />
          <input type="text" value={b.name ?? ''} placeholder="etiqueta" style={{ width: 160 }}
            onChange={(e) => upd({ budgets: (t.budgets ?? []).map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
          <Del onClick={() => upd({ budgets: (t.budgets ?? []).filter((_, j) => j !== i) })} />
        </Row>
      ))}
      <button className="mini" onClick={() => upd({
        budgets: [...(t.budgets ?? []), { statId: t.stats[0]?.id ?? '', max: 100, name: '' }],
      })}>+ anadir presupuesto</button>
    </div>
  )
}

/* ----------------------------------------------------------------- ranuras */

function Slots({ t, upd, items }: { t: GameTemplate; upd: (p: Partial<GameTemplate>) => void; items: Item[] }) {
  return (
    <div className="card">
      <h2>Ranuras</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        El motor elige <b>una pieza por ranura</b>. Cada ranura necesita al menos un objeto o no
        habra solucion posible.
      </p>
      {t.slots.length === 0 && (
        <p className="hint">
          Todavia no hay ninguna. Una ranura es cada hueco de equipo del juego: arma, casco,
          anillo, talisman…
        </p>
      )}
      {t.slots.map((s, i) => {
        const n = items.filter((it) => it.slot === s.id).length
        return (
          <Row key={i}>
            <input type="text" value={s.name} style={{ width: 210 }}
              onChange={(e) => upd({ slots: t.slots.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <code style={{ fontSize: 11, color: 'var(--dim)', minWidth: 110 }}>{s.id}</code>
            <span style={{ fontSize: 12, color: n === 0 ? 'var(--danger)' : 'var(--dim)' }}>
              {n === 0 ? 'sin objetos' : `${nf.format(n)} objetos`}
            </span>
            {t.slots.length > 1 && n === 0 && (
              <Del onClick={() => upd({ slots: t.slots.filter((_, j) => j !== i) })} />
            )}
          </Row>
        )
      })}
      <button className="mini" style={{ marginTop: 6 }} onClick={() => {
        let id = 'ranura'; let n = 2
        while (t.slots.some((s) => s.id === id)) id = `ranura_${n++}`
        upd({ slots: [...t.slots, { id, name: 'Nueva ranura' } as SlotDef] })
      }}>+ anadir ranura</button>
    </div>
  )
}

/* --------------------------------------------------------------- conjuntos */

function Sets({ t, upd }: { t: GameTemplate; upd: (p: Partial<GameTemplate>) => void }) {
  const sets = t.sets ?? []
  const setSets = (next: SetDef[]) => upd({ sets: next })
  return (
    <div className="card">
      <h2>Conjuntos</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Bonos por llevar varias piezas de la misma familia. El motor los detecta solo al armar
        la build.
      </p>
      {sets.length === 0 && <p className="hint">Este juego no tiene conjuntos.</p>}
      {sets.map((s, i) => (
        <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 9, padding: 12, marginBottom: 10, background: 'var(--panel-2)' }}>
          <Row>
            <input type="text" value={s.name} style={{ width: 250 }}
              onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <code style={{ fontSize: 11, color: 'var(--dim)' }}>{s.id}</code>
            <div style={{ flex: 1 }} />
            <Del onClick={() => setSets(sets.filter((_, j) => j !== i))} title="borrar conjunto" />
          </Row>
          {s.tiers.map((tier, ti) => (
            <div key={ti} style={{ paddingLeft: 12, borderLeft: '2px solid var(--line)', marginBottom: 8 }}>
              <Row>
                <input type="number" min={2} max={t.slots.length} value={tier.pieces} style={{ width: 66 }}
                  onChange={(e) => setSets(sets.map((x, j) => j === i
                    ? { ...x, tiers: x.tiers.map((y, k) => (k === ti ? { ...y, pieces: Number(e.target.value) } : y)) } : x))} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>piezas otorgan</span>
                <input type="text" value={tier.label} placeholder="etiqueta" style={{ width: 150 }}
                  onChange={(e) => setSets(sets.map((x, j) => j === i
                    ? { ...x, tiers: x.tiers.map((y, k) => (k === ti ? { ...y, label: e.target.value } : y)) } : x))} />
                <Del onClick={() => setSets(sets.map((x, j) => j === i ? { ...x, tiers: x.tiers.filter((_, k) => k !== ti) } : x))} title="borrar escalon" />
              </Row>
              {Object.entries(tier.effects ?? {}).map(([k, v]) => (
                <Row key={k}>
                  <span style={{ width: 12 }} />
                  <select value={k} style={{ width: 190 }}
                    onChange={(e) => setSets(sets.map((x, j) => j === i ? {
                      ...x, tiers: x.tiers.map((y, kk) => {
                        if (kk !== ti) return y
                        const eff = { ...y.effects }; delete eff[k]; eff[e.target.value] = v
                        return { ...y, effects: eff }
                      }),
                    } : x))}>
                    {t.stats.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                  <input type="number" value={v} style={{ width: 96 }}
                    onChange={(e) => setSets(sets.map((x, j) => j === i ? {
                      ...x, tiers: x.tiers.map((y, kk) => (kk === ti ? { ...y, effects: { ...y.effects, [k]: Number(e.target.value) } } : y)),
                    } : x))} />
                  <Del onClick={() => setSets(sets.map((x, j) => j === i ? {
                    ...x, tiers: x.tiers.map((y, kk) => {
                      if (kk !== ti) return y
                      const eff = { ...y.effects }; delete eff[k]
                      return { ...y, effects: eff }
                    }),
                  } : x))} />
                </Row>
              ))}
              <button className="mini" style={{ marginLeft: 12 }} onClick={() => {
                const libre = t.stats.find((st) => !(st.id in (tier.effects ?? {})))
                if (!libre) return
                setSets(sets.map((x, j) => j === i ? {
                  ...x, tiers: x.tiers.map((y, kk) => (kk === ti ? { ...y, effects: { ...y.effects, [libre.id]: 10 } } : y)),
                } : x))
              }}>+ efecto</button>
            </div>
          ))}
          <button className="mini" onClick={() => setSets(sets.map((x, j) => j === i
            ? { ...x, tiers: [...x.tiers, { pieces: 2, label: '2 piezas', effects: {} }] } : x))}>
            + escalon
          </button>
        </div>
      ))}
      <button className="mini" onClick={() => {
        let id = 'conjunto'; let n = 2
        while (sets.some((s) => s.id === id)) id = `conjunto_${n++}`
        setSets([...sets, { id, name: 'Nuevo conjunto', tiers: [{ pieces: 2, label: '2 piezas', effects: {} }] }])
      }}>+ anadir conjunto</button>
    </div>
  )
}

/* ---------------------------------------------------------------- perfiles */

function Profiles({ t, upd }: { t: GameTemplate; upd: (p: Partial<GameTemplate>) => void }) {
  const extras = useMemo(() => {
    const s = new Set<string>()
    for (const p of t.baseProfiles) for (const k of Object.keys(p.base)) if (!t.stats.some((x) => x.id === k)) s.add(k)
    return [...s]
  }, [t])

  return (
    <div className="card">
      <h2>Perfiles base</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Con que valores parte el personaje antes de equiparse nada. Puedes tener varios
        —clases, personajes, arquetipos— y elegir cual optimizar.
      </p>
      {t.baseProfiles.map((p, i) => (
        <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 9, padding: 12, marginBottom: 10, background: 'var(--panel-2)' }}>
          <Row>
            <input type="text" value={p.name} style={{ width: 260 }}
              onChange={(e) => upd({ baseProfiles: t.baseProfiles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <code style={{ fontSize: 11, color: 'var(--dim)' }}>{p.id}</code>
            <div style={{ flex: 1 }} />
            {t.baseProfiles.length > 1 && (
              <Del onClick={() => upd({ baseProfiles: t.baseProfiles.filter((_, j) => j !== i) })} title="borrar perfil" />
            )}
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 8 }}>
            {[...t.stats.map((s) => ({ id: s.id, name: s.name })), ...extras.map((k) => ({ id: k, name: k }))].map((s) => (
              <label className="field" key={s.id} style={{ marginBottom: 0 }}>
                <span>{s.name}</span>
                <input type="number" value={p.base[s.id] ?? 0}
                  onChange={(e) => upd({
                    baseProfiles: t.baseProfiles.map((x, j) => (j === i
                      ? { ...x, base: { ...x.base, [s.id]: Number(e.target.value) } } : x)),
                  })} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="mini" onClick={() => {
        let id = 'perfil'; let n = 2
        while (t.baseProfiles.some((p) => p.id === id)) id = `perfil_${n++}`
        const base: Record<string, number> = {}
        for (const s of t.stats) base[s.id] = 0
        for (const k of extras) base[k] = 0
        upd({ baseProfiles: [...t.baseProfiles, { id, name: 'Nuevo perfil', base }] })
      }}>+ anadir perfil</button>
    </div>
  )
}

/* ---------------------------------------------------------------- formulas */

function Objectives({ t, upd }: { t: GameTemplate; upd: (p: Partial<GameTemplate>) => void }) {
  const derived = t.derived ?? []
  return (
    <div className="card">
      <h2>Formulas</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Los <b>valores intermedios</b> son piezas reutilizables; los <b>objetivos</b> son lo que
        el motor maximiza. En las formulas puedes usar los ids de las estadisticas,
        <code> base_&lt;id&gt;</code> para el valor del perfil, otros valores intermedios y las
        funciones <code>min max floor ceil round abs sqrt clamp</code>.
      </p>

      <h3>Valores intermedios</h3>
      {derived.map((d, i) => (
        <Row key={i}>
          <input type="text" value={d.id} style={{ width: 150 }}
            onChange={(e) => upd({ derived: derived.map((x, j) => (j === i ? { ...x, id: toId(e.target.value) } : x)) })} />
          <span style={{ color: 'var(--dim)' }}>=</span>
          <input type="text" value={d.formula} style={{ flex: 1, minWidth: 240, fontFamily: 'var(--mono)', fontSize: 12 }}
            onChange={(e) => upd({ derived: derived.map((x, j) => (j === i ? { ...x, formula: e.target.value } : x)) })} />
          <Del onClick={() => upd({ derived: derived.filter((_, j) => j !== i) })} />
        </Row>
      ))}
      <button className="mini" onClick={() => upd({
        derived: [...derived, { id: `valor${derived.length + 1}`, name: 'Valor', formula: '0' }],
      })}>+ valor intermedio</button>

      <h3>Objetivos</h3>
      {t.objectives.length === 0 && (
        <p className="hint">
          Todavia no hay ninguno. Un objetivo es la formula que el motor maximiza. Lo mas simple
          es el id de una estadistica; para algo como el dano critico, multiplica varias.
        </p>
      )}
      {t.objectives.map((o, i) => (
        <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 9, padding: 12, marginBottom: 10, background: 'var(--panel-2)' }}>
          <Row>
            <input type="text" value={o.name} style={{ width: 240 }} placeholder="Nombre visible"
              onChange={(e) => upd({ objectives: t.objectives.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <select value={o.monotonic ? 'si' : 'no'} style={{ width: 190 }}
              onChange={(e) => upd({ objectives: t.objectives.map((x, j) => (j === i ? { ...x, monotonic: e.target.value === 'si' } : x)) })}>
              <option value="si">modo exacto</option>
              <option value="no">modo heuristico</option>
            </select>
            <div style={{ flex: 1 }} />
            {t.objectives.length > 1 && (
              <Del onClick={() => upd({ objectives: t.objectives.filter((_, j) => j !== i) })} title="borrar objetivo" />
            )}
          </Row>
          <input type="text" value={o.formula} placeholder="formula"
            style={{ fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 7 }}
            onChange={(e) => upd({ objectives: t.objectives.map((x, j) => (j === i ? { ...x, formula: e.target.value } : x)) })} />
          <input type="text" value={o.description} placeholder="descripcion corta"
            onChange={(e) => upd({ objectives: t.objectives.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
        </div>
      ))}
      <button className="mini" onClick={() => {
        let id = 'objetivo'; let n = 2
        while (t.objectives.some((o) => o.id === id)) id = `objetivo_${n++}`
        upd({
          objectives: [...t.objectives, {
            id, name: 'Nuevo objetivo', description: '', kind: 'nonlinear',
            monotonic: true,
            formula: t.stats[0] ? `base_${t.stats[0].id} + ${t.stats[0].id}` : '0',
            decimals: 1,
          } as ObjectiveDef],
        })
      }}>+ anadir objetivo</button>
      <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
        El validador comprueba abajo si el objetivo es monotono <b>de verdad</b>. Si dice que baja
        con alguna estadistica, cambialo a modo heuristico: el motor seguira calculandolo, pero
        dejara de prometer que el resultado es el optimo.
      </p>
    </div>
  )
}

/* ----------------------------------------------------------------- objetos */

const PAGE = 40

function Items({ t, items, setItems }: {
  t: GameTemplate; items: Item[]; setItems: (i: Item[]) => void
}) {
  const [q, setQ] = useState('')
  const [slotF, setSlotF] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [sel, setSel] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return items.filter((i) => (!slotF || i.slot === slotF) && (!n || i.name.toLowerCase().includes(n)))
  }, [items, q, slotF])

  const item = items.find((i) => i.id === sel) ?? null
  const updItem = (patch: Partial<Item>) =>
    setItems(items.map((i) => (i.id === sel ? { ...i, ...patch } : i)))

  return (
    <>
      <div className="card">
        <h2>Objetos <span className="chip n">{nf.format(items.length)}</span></h2>
        <div className="invbar">
          <input type="text" placeholder="Buscar…" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE) }} />
          <select value={slotF} onChange={(e) => { setSlotF(e.target.value); setShown(PAGE) }}>
            <option value="">Todas las ranuras</option>
            {t.slots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--dim)' }}>{nf.format(filtered.length)} coinciden</span>
          <div style={{ flex: 1 }} />
          <button className="mini" disabled={t.slots.length === 0} onClick={() => {
            const id = `n${Date.now().toString(36)}`
            const nuevo: Item = { id, slot: t.slots[0].id, setId: null, name: 'Objeto nuevo', stats: {} }
            setItems([nuevo, ...items]); setSel(id); setQ(''); setSlotF('')
          }}>+ crear objeto</button>
          {filtered.length > 0 && filtered.length < items.length && (
            <button className="mini" onClick={() => {
              if (!confirm(`Borrar los ${filtered.length} objetos filtrados?`)) return
              const ids = new Set(filtered.map((i) => i.id))
              setItems(items.filter((i) => !ids.has(i.id))); setSel(null)
            }}>borrar los filtrados</button>
          )}
        </div>

        {filtered.slice(0, shown).map((i) => (
          <Row key={i.id}>
            <button className={`mini${sel === i.id ? ' on' : ''}`} style={{ minWidth: 210, textAlign: 'left' }}
              onClick={() => setSel(sel === i.id ? null : i.id)}>{i.name}</button>
            <span style={{ fontSize: 12, color: 'var(--dim)', minWidth: 100 }}>
              {t.slots.find((s) => s.id === i.slot)?.name ?? i.slot}
            </span>
            <span style={{ fontSize: 11, color: 'var(--accent-2)', flex: 1, minWidth: 140 }}>
              {Object.entries(i.stats).map(([k, v]) => `${t.stats.find((s) => s.id === k)?.name ?? k} ${v}`).join(' · ') || '—'}
            </span>
            <Del onClick={() => { setItems(items.filter((x) => x.id !== i.id)); if (sel === i.id) setSel(null) }} />
          </Row>
        ))}
        {shown < filtered.length && (
          <button className="mini" style={{ marginTop: 8 }} onClick={() => setShown(shown + PAGE * 3)}>
            mostrar mas ({nf.format(filtered.length - shown)} restantes)
          </button>
        )}
        {t.slots.length === 0 && (
          <p className="hint" style={{ marginTop: 10 }}>
            Primero define al menos una ranura en la pestana <b>Ranuras</b>: un objeto tiene que
            ir a alguna parte.
          </p>
        )}
        {t.slots.length > 0 && t.stats.length === 0 && (
          <p className="hint" style={{ marginTop: 10 }}>
            Aun no hay estadisticas, asi que los objetos no podrian aportar nada. Definelas en la
            pestana <b>Estadisticas</b>.
          </p>
        )}
        {t.slots.length > 0 && filtered.length === 0 && items.length > 0 && (
          <p className="hint">Ningun objeto coincide con el filtro.</p>
        )}
      </div>

      {item && (
        <div className="card">
          <h2>Editando objeto</h2>
          <Row>
            <input type="text" value={item.name} style={{ width: 260 }}
              onChange={(e) => updItem({ name: e.target.value })} />
            <select value={item.slot} style={{ width: 170 }} onChange={(e) => updItem({ slot: e.target.value })}>
              {t.slots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={item.setId ?? ''} style={{ width: 190 }}
              onChange={(e) => updItem({ setId: e.target.value || null })}>
              <option value="">sin conjunto</option>
              {(t.sets ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="text" value={item.exclusiveGroup ?? ''} placeholder="grupo exclusivo" style={{ width: 160 }}
              onChange={(e) => updItem({ exclusiveGroup: e.target.value || undefined })} />
          </Row>
          <h3>Estadisticas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 8 }}>
            {t.stats.map((s) => (
              <label className="field" key={s.id} style={{ marginBottom: 0 }}>
                <span>{s.name}{s.unit === 'percent' ? ' (%)' : ''}</span>
                <input type="number" value={item.stats[s.id] ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    const stats = { ...item.stats }
                    if (v) stats[s.id] = v; else delete stats[s.id]
                    updItem({ stats })
                  }} />
              </label>
            ))}
          </div>
          <h3>Requisitos para equiparla</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Se comparan contra el perfil base. Si no los cumple, la pieza se descarta antes de buscar.
          </p>
          {Object.entries(item.requires ?? {}).map(([k, v]) => (
            <Row key={k}>
              <input type="text" value={k} style={{ width: 170 }}
                onChange={(e) => {
                  const req = { ...item.requires }; delete req[k]; req[e.target.value] = v
                  updItem({ requires: req })
                }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>al menos</span>
              <input type="number" value={v} style={{ width: 96 }}
                onChange={(e) => updItem({ requires: { ...item.requires, [k]: Number(e.target.value) } })} />
              <Del onClick={() => { const req = { ...item.requires }; delete req[k]; updItem({ requires: Object.keys(req).length ? req : undefined }) }} />
            </Row>
          ))}
          <button className="mini" onClick={() => updItem({
            requires: { ...item.requires, [t.baseProfiles[0] ? Object.keys(t.baseProfiles[0].base)[0] ?? 'atributo' : 'atributo']: 10 },
          })}>+ requisito</button>
        </div>
      )}

      <ItemImporter
        template={t}
        existing={items}
        onImport={(nuevos, modo) => setItems(modo === 'reemplazar' ? nuevos : [...items, ...nuevos])}
      />
    </>
  )
}
