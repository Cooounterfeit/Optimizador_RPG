/**
 * Hoja de personaje
 * =================
 * Tres ideas tomadas de tres juegos:
 *
 *  - World of Warcraft: el personaje al centro con sus ranuras alrededor, y a la
 *    derecha las estadisticas agrupadas (General, Atributos, Ofensiva...).
 *  - Genshin Impact: el retrato grande con el nombre y las cifras clave.
 *  - Dark Souls 3: "subir de nivel". Se suben atributos con + y − y cada cifra
 *    muestra "actual ⇒ nueva", en azul si mejora y en rojo si empeora, antes de
 *    confirmar nada.
 *
 * Todos los numeros salen del motor (solve + explainBuild), no de una cuenta
 * paralela: la hoja y el optimizador no pueden contradecirse.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { BaseProfile, GameTemplate, Item } from '../core/types'
import { evaluar, conDelta, type Evaluacion } from './evaluar'
import { pointsSpent, sanitizeSelection } from '../core/skills'
import { loadSelection } from '../store/skillSelection'
import { loadEquipment, saveEquipment, type Equipment } from '../store/equipment'
import { portraitKey, removeImage, setImage, shrinkImage } from '../store/itemImages'
import { useItemImages } from '../ui/useItemImages'
import { Banner, Empty, Icon } from '../ui/components'
import { characterIcon, itemIcon, itemRarity } from '../adapters/genshinAssets'
import { fmt } from '../ui/format'
import { SkillSummary } from './SkillTreePanel'
import EvolutionView from './EvolutionView'
import { currentLevel, isPointsMode, levelKeyOf, pointAttributes } from '../core/leveling'
import { recordLevel } from '../store/levelHistory'
import { notify } from '../ui/errors'

export default function CharacterView({
  gameId, template, items, onSaveProfile,
}: {
  gameId: string
  template: GameTemplate
  items: Item[]
  /** Guarda los atributos base de un perfil (al confirmar la subida de nivel). */
  onSaveProfile: (profile: BaseProfile) => void
}) {
  const navigate = useNavigate()
  const { images, imageOf } = useItemImages(gameId)
  const [profileId, setProfileId] = useState(template.baseProfiles[0]?.id ?? '')
  const profile = template.baseProfiles.find((p) => p.id === profileId) ?? template.baseProfiles[0]
  const [eq, setEq] = useState<Equipment>(() => loadEquipment(gameId))
  useEffect(() => { saveEquipment(gameId, eq) }, [gameId, eq])
  const skills = useMemo(() => sanitizeSelection(template, loadSelection(gameId)), [template, gameId])
  const [delta, setDelta] = useState<Record<string, number>>({})
  const [ranura, setRanura] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const subirArchivo = useRef<HTMLInputElement>(null)
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') === 'evolucion' ? 'evolucion' : 'equipo'

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  // Piezas que ya no existen (se borraron del inventario) se descartan solas.
  useEffect(() => {
    const limpio = Object.fromEntries(Object.entries(eq).filter(([, id]) => byId.has(id)))
    if (Object.keys(limpio).length !== Object.keys(eq).length) setEq(limpio)
  }, [byId])  // eslint-disable-line react-hooks/exhaustive-deps

  const actual = useMemo(() => (profile ? evaluar(template, items, eq, profile.id, skills) : 'Sin perfil'), [template, items, eq, profile, skills])
  const hayDelta = Object.values(delta).some((v) => v !== 0)
  const nueva = useMemo(
    () => (profile && hayDelta ? evaluar(conDelta(template, profile.id, delta), items, eq, profile.id, skills) : null),
    [template, items, eq, profile, skills, delta, hayDelta],
  )

  if (!profile) return <div className="card"><Empty>Este juego no tiene perfiles de personaje.</Empty></div>

  // ---------------------------------------------------- ranuras alrededor de la figura
  const mitad = Math.ceil(template.slots.length / 2)
  const izquierda = template.slots.slice(0, mitad)
  const derecha = template.slots.slice(mitad)
  const fits = (it: Item, slotId: string) => it.slot === slotId || (it.slots ?? []).includes(slotId)
  const usadoEn = (id: string, salvo: string) => template.slots.some((s) => s.id !== salvo && eq[s.id] === id)

  const iconoDe = (it: Item) => imageOf(it) ?? itemIcon(gameId, it)
  const retrato = images[portraitKey(profile.id)] ?? characterIcon(gameId, (profile.assetKey ?? profile.id) as string)

  // ---------------------------------------------------- requisitos no cumplidos
  const statIds = new Set(template.stats.map((s) => s.id))
  const fin = typeof actual === 'string' ? {} : actual.finalStats
  const incumplidos = template.slots.flatMap((s) => {
    const it = byId.get(eq[s.id] ?? '')
    if (!it?.requires) return []
    return Object.entries(it.requires).filter(([k, need]) => {
      const tiene = template.requirementsFrom === 'final' && statIds.has(k) ? fin[k] ?? 0 : (profile.base[k] ?? 0) + (delta[k] ?? 0)
      return tiene < need
    }).map(([k, need]) => `${it.name} pide ${need} de ${etiqueta(template, profile, k)}`)
  })

  // ---------------------------------------------------- presupuestos (carga...)
  const presupuestos = (template.budgets ?? []).map((b) => ({
    name: b.name ?? template.stats.find((s) => s.id === b.statId)?.name ?? b.statId,
    usado: (fin[b.statId] ?? 0) - (profile.base[b.statId] ?? 0), max: b.max,
  }))

  const puntos = (template.skillTrees ?? []).reduce((a, t) => a + pointsSpent(t, skills), 0)
  // Con niveles por puntos (Souls), cada punto subido es un nivel: no se puede bajar
  // de lo que ya tienes y el nivel avanza con los puntos.
  const porPuntos = isPointsMode(template)
  const atributos = porPuntos
    ? pointAttributes(template).filter((k) => typeof profile.base[k] === 'number')
    : profile.levelable ?? Object.keys(profile.base).filter((k) => statIds.has(k))
  const nivelActual = currentLevel(template, profile)
  const porNivel = template.leveling?.points?.perLevel ?? 1
  const puntosPuestos = Object.values(delta).reduce((a, b) => a + b, 0)
  const nivelNuevo = nivelActual === null ? null : nivelActual + Math.ceil(puntosPuestos / porNivel)
  const topeAtributo = porPuntos ? template.leveling?.points?.maxValue ?? Infinity : Infinity
  const topeNivel = template.leveling?.max ?? Infinity

  const pestanas = (
    <div className="cs-tabs" role="tablist" aria-label="Hoja de personaje">
      <button role="tab" aria-selected={vista === 'equipo'} className={vista === 'equipo' ? 'on' : ''}
        onClick={() => setParams({}, { replace: true })}>Equipo y estadísticas</button>
      <button role="tab" aria-selected={vista === 'evolucion'} className={vista === 'evolucion' ? 'on' : ''}
        onClick={() => setParams({ vista: 'evolucion' }, { replace: true })}>Evolución por nivel</button>
      {vista === 'evolucion' && template.baseProfiles.length > 1 && (
        <select aria-label="Personaje" value={profile.id} onChange={(e) => { setProfileId(e.target.value); setDelta({}) }}>
          {template.baseProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  )

  if (vista === 'evolucion') {
    return (
      <>
        {pestanas}
        <EvolutionView gameId={gameId} template={template} items={items} profile={profile} eq={eq} skills={skills} onSaveProfile={onSaveProfile} />
      </>
    )
  }

  return (
    <>
    {pestanas}
    <div className="charsheet">
      {/* ======================================== figura y ranuras */}
      <div className="card cs-doll">
        <div className="cs-col">
          {izquierda.map((s) => <Ranura key={s.id} s={s} it={byId.get(eq[s.id] ?? '')} icono={iconoDe} gameId={gameId}
            activa={ranura === s.id} onClick={() => setRanura(ranura === s.id ? null : s.id)} />)}
        </div>

        <div className="cs-center">
          <div className="cs-portrait" onClick={() => subirArchivo.current?.click()} title="Cambiar el retrato">
            {retrato
              ? <img src={retrato} alt={profile.name} />
              : <>
                  {/* Silueta generica mientras no haya retrato: pulsa para subir uno. */}
                  <svg viewBox="0 0 100 140" aria-hidden="true">
                    <circle cx="50" cy="28" r="18" fill="currentColor" />
                    <path d="M18 138 C18 88 28 60 50 58 C72 60 82 88 82 138 Z" fill="currentColor" />
                  </svg>
                  <span className="cs-ini">{iniciales(profile.name)}</span>
                </>}
            <div className="cs-portrait-edit">cambiar imagen</div>
          </div>
          <input ref={subirArchivo} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f) return
            try { await setImage(gameId, portraitKey(profile.id), await shrinkImage(f, 360, 480)); setAviso(null) }
            catch (err) { setAviso((err as Error).message) }
          }} />
          {images[portraitKey(profile.id)] && (
            <button className="mini" onClick={() => removeImage(gameId, portraitKey(profile.id))}>quitar retrato</button>
          )}
          <h2 className="cs-name">{profile.name}</h2>
          {template.baseProfiles.length > 1 && (
            <select value={profile.id} onChange={(e) => { setProfileId(e.target.value); setDelta({}) }}>
              {template.baseProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="cs-actions">
            <button className="mini" onClick={() => { setEq({}); setRanura(null) }}>quitar todo</button>
            <button className="mini" onClick={() => navigate('/optimizador')}>buscar la mejor build</button>
          </div>
          {(template.skillTrees ?? []).length > 0 && (
            <p className="hint" style={{ textAlign: 'center', margin: '8px 0 0' }}>
              Habilidades: <b>{puntos} puntos</b> · <SkillSummary template={template} selection={skills} />
            </p>
          )}
        </div>

        <div className="cs-col">
          {derecha.map((s) => <Ranura key={s.id} s={s} it={byId.get(eq[s.id] ?? '')} icono={iconoDe} gameId={gameId}
            activa={ranura === s.id} onClick={() => setRanura(ranura === s.id ? null : s.id)} />)}
        </div>

        {ranura && (
          <Selector
            template={template} slotId={ranura}
            items={items.filter((it) => fits(it, ranura))}
            actual={eq[ranura]}
            ocupado={(id) => usadoEn(id, ranura)}
            icono={iconoDe} gameId={gameId}
            onPick={(id) => {
              const next = { ...eq }
              // Una pieza no puede estar en dos ranuras: si ya estaba en otra, se mueve.
              for (const s of template.slots) if (next[s.id] === id) delete next[s.id]
              if (id) next[ranura] = id; else delete next[ranura]
              setEq(next); setRanura(null)
            }}
            onClose={() => setRanura(null)} />
        )}
      </div>

      {/* ======================================== estadisticas */}
      <div className="card cs-stats">
        {aviso && <Banner kind="err">{aviso}</Banner>}
        {typeof actual === 'string'
          ? <Banner kind="err">{actual}</Banner>
          : <Estadisticas template={template} profile={profile} a={actual} b={typeof nueva === 'string' ? null : nueva} />}
        {typeof nueva === 'string' && <Banner kind="err">{nueva}</Banner>}
        {incumplidos.length > 0 && (
          <Banner kind="warn">Requisitos sin cumplir: {incumplidos.join(' · ')}. En el juego no podrias usar esas piezas.</Banner>
        )}
        {presupuestos.map((p) => (
          <div key={p.name} className={`cs-budget${p.usado > p.max ? ' over' : ''}`}>
            {p.name}: <b>{fmt(p.usado, 1)}</b> / {fmt(p.max, 1)}{p.usado > p.max ? ' — te pasaste' : ''}
          </div>
        ))}
      </div>

      {/* ======================================== subir de nivel (Dark Souls) */}
      {atributos.length > 0 && (
        <div className="card cs-level">
          <h2>
            Subir de nivel <span className="chip n">simulacion</span>
            {porPuntos && nivelActual !== null && (
              <span className="chip">Nivel {nivelActual}{puntosPuestos > 0 ? ` ⇒ ${nivelNuevo}` : ''}</span>
            )}
          </h2>
          <p className="hint" style={{ marginTop: 0 }}>
            {porPuntos
              ? <>Cada punto es un nivel. Sube atributos y mira qué cifras mueve cada uno antes de confirmar: </>
              : <>Sube o baja atributos y mira como cambia cada cifra antes de decidir: </>}
            <span className="cs-up">azul</span> si mejora, <span className="cs-down">rojo</span> si empeora.
          </p>
          <div className="cs-attrs">
            {atributos.map((k) => {
              const v = profile.base[k] ?? 0
              const d = delta[k] ?? 0
              return (
                <div className="cs-attr" key={k}>
                  <span className="cs-attr-name">{etiqueta(template, profile, k)}</span>
                  <span className="cs-attr-val">{fmt(v, 2)}</span>
                  <span className="cs-arrow">⇒</span>
                  <span className={`cs-attr-val ${d > 0 ? 'cs-up' : d < 0 ? 'cs-down' : ''}`}>{fmt(v + d, 2)}</span>
                  <button className="mini" aria-label={`Bajar ${etiqueta(template, profile, k)}`} disabled={porPuntos ? d <= 0 : v + d <= 0}
                    onClick={() => setDelta({ ...delta, [k]: d - 1 })}>−</button>
                  <button className="mini" aria-label={`Subir ${etiqueta(template, profile, k)}`}
                    disabled={v + d + 1 > topeAtributo || (porPuntos && nivelActual !== null && nivelActual + Math.ceil((puntosPuestos + 1) / porNivel) > topeNivel)}
                    onClick={() => setDelta({ ...delta, [k]: d + 1 })}>+</button>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="mini on" disabled={!hayDelta || (porPuntos && puntosPuestos % porNivel !== 0)} onClick={() => {
              const base = Object.fromEntries(Object.entries(profile.base).map(([k, v]) => [k, v + (delta[k] ?? 0)]))
              if (porPuntos && nivelActual !== null && nivelNuevo !== null && template.leveling) {
                // Queda en el historial de la evolucion por nivel, igual que al subir desde alli.
                base[levelKeyOf(template.leveling)] = nivelNuevo
                recordLevel(gameId, profile.id, nivelActual, profile.base)
                recordLevel(gameId, profile.id, nivelNuevo, base)
                notify(`${profile.name} subió al nivel ${nivelNuevo}.`, 'ok')
              }
              onSaveProfile({ ...profile, base })
              setDelta({})
            }}>Confirmar</button>
            <button className="mini" disabled={!hayDelta} onClick={() => setDelta({})}>Descartar</button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

function iniciales(name: string): string {
  return (name.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ][\w]*/g) ?? []).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function etiqueta(t: GameTemplate, p: BaseProfile, k: string): string {
  return p.labels?.[k] ?? t.stats.find((s) => s.id === k)?.name ?? (k.charAt(0).toUpperCase() + k.slice(1))
}

// ------------------------------------------------------------ ranura

function Ranura({ s, it, icono, gameId, activa, onClick }: {
  s: { id: string; name: string }; it?: Item; icono: (it: Item) => string | null; gameId: string
  activa: boolean; onClick: () => void
}) {
  void gameId
  return (
    <button className={`cs-slot${activa ? ' on' : ''}${it ? '' : ' empty'}`} onClick={onClick}
      title={it ? `${s.name}: ${it.name}` : `${s.name}: vacia`}>
      <Icon src={it ? icono(it) : null} alt={it?.name ?? s.name} rarity={it ? itemRarity(it) : 1} size={42} />
      <span className="cs-slot-txt">
        <span className="cs-slot-name">{s.name}</span>
        <span className="cs-slot-item">{it?.name ?? 'vacia'}</span>
      </span>
    </button>
  )
}

function Selector({ template, slotId, items, actual, ocupado, icono, onPick, onClose }: {
  template: GameTemplate; slotId: string; items: Item[]; actual?: string
  ocupado: (id: string) => boolean; icono: (it: Item) => string | null; gameId: string
  onPick: (id: string) => void; onClose: () => void
}) {
  const [q, setQ] = useState('')
  const slot = template.slots.find((s) => s.id === slotId)
  const stat = (k: string) => template.stats.find((s) => s.id === k)
  const lista = items.filter((it) => it.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 80)
  return (
    <div className="cs-picker">
      <div className="cs-picker-head">
        <b>{slot?.name}</b>
        <input type="text" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button className="mini" onClick={() => onPick('')}>dejar vacia</button>
        <button className="mini" onClick={onClose}>cerrar</button>
      </div>
      {lista.length === 0 && <p className="hint">No hay piezas para esta ranura en tu inventario.</p>}
      <div className="cs-picker-list">
        {lista.map((it) => (
          <button key={it.id} className={`cs-pick${it.id === actual ? ' on' : ''}`} onClick={() => onPick(it.id)}>
            <Icon src={icono(it)} alt={it.name} rarity={itemRarity(it)} size={36} />
            <span>
              <b>{it.name}</b>{ocupado(it.id) && <i> (puesta en otra ranura)</i>}
              <span className="cs-pick-stats">
                {Object.entries(it.stats).map(([k, v]) => `${stat(k)?.name ?? k} ${fmt(v, 1)}${stat(k)?.unit === 'percent' ? '%' : ''}`).join(' · ')}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ estadisticas

function Estadisticas({ template, profile, a, b }: {
  template: GameTemplate; profile: BaseProfile; a: Evaluacion; b: Evaluacion | null
}) {
  void profile
  const filas: { grupo: string; id: string; name: string; unit: string; va: number; vb?: number; dec: number }[] = []
  for (const o of template.objectives) {
    if (a.objetivos[o.id] === undefined) continue
    filas.push({ grupo: 'Resultado', id: `o:${o.id}`, name: o.name, unit: o.unit ?? '', va: a.objetivos[o.id], vb: b?.objetivos[o.id], dec: o.decimals ?? 1 })
  }
  for (const s of template.stats) {
    const mul = s.aggregate === 'multiply'
    filas.push({
      grupo: s.group || 'Estadisticas', id: s.id, name: s.name, unit: s.unit === 'percent' && !mul ? '%' : mul ? '×' : '',
      va: a.finalStats[s.id] ?? 0, vb: b?.finalStats[s.id], dec: mul ? 3 : 1,
    })
  }
  for (const d of template.derived ?? []) {
    filas.push({ grupo: d.group || 'Calculados', id: d.id, name: d.name || d.id, unit: d.unit ?? '', va: a.vars.get(d.id) ?? NaN, vb: b?.vars.get(d.id), dec: 2 })
  }
  const grupos = [...new Set(filas.map((f) => f.grupo))]
  return (
    <div className="cs-groups">
      {grupos.map((g) => (
        <section key={g} className="cs-group">
          <h3>{g}</h3>
          {filas.filter((f) => f.grupo === g).map((f) => {
            const cambia = f.vb !== undefined && Math.abs(f.vb - f.va) > 1e-9
            const sube = cambia && f.vb! > f.va
            const show = (v: number) => (f.unit === '×' ? `×${fmt(v, f.dec)}` : `${fmt(v, f.dec)}${f.unit}`)
            return (
              <div className="cs-row" key={f.id}>
                <span className="cs-row-name">{f.name}</span>
                <span className="cs-row-val">
                  {show(f.va)}
                  {f.vb !== undefined && (
                    <>
                      <span className="cs-arrow"> ⇒ </span>
                      <span className={cambia ? (sube ? 'cs-up' : 'cs-down') : ''}>{show(f.vb)}</span>
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </section>
      ))}
      {a.conjuntos.length > 0 && (
        <section className="cs-group">
          <h3>Conjuntos activos</h3>
          {a.conjuntos.map((c) => (
            <div className="cs-row" key={c.name}><span className="cs-row-name">{c.name} ({c.pieces})</span><span className="cs-row-val">{c.tiers.join(', ')}</span></div>
          ))}
        </section>
      )}
    </div>
  )
}
