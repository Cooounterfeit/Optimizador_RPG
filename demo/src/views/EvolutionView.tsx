/**
 * Evolucion por nivel (SIM-02, SIM-03, SIM-04)
 * ============================================
 * Tres miradas sobre los valores base del personaje:
 *
 *  - Proyectar (SIM-02): elige un nivel futuro y mira como quedarian tus
 *    estadisticas segun las curvas de crecimiento del juego (TEC-12).
 *  - Historial (SIM-03): consulta como estaban en un nivel anterior. Son
 *    registros reales, guardados cada vez que subes de nivel desde aqui.
 *  - Comparar (SIM-04): pasado, presente y futuro lado a lado.
 *
 * Colores: pasado en azul, presente en blanco, futuro en naranjo.
 *
 * Ademas de los atributos, cada vista muestra los resultados del juego
 * (danos, vida total...) con el equipo que llevas puesto, calculados con el
 * mismo motor que el optimizador, y las piezas que desbloquearias.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BaseProfile, GameTemplate, Item, SkillSelection } from '../core/types'
import {
  allocated, allocatePoints, currentLevel, growingKeys, isPointsMode, pointAttributes, pointsBetween, projectProfile,
  type Allocation, type Projection,
} from '../core/leveling'
import { loadHistory, recordLevel, removeLevel, type LevelSnapshot } from '../store/levelHistory'
import type { Equipment } from '../store/equipment'
import { normalizeKey, removeImage, setImage, shrinkIcon } from '../store/itemImages'
import { useItemImages } from '../ui/useItemImages'
import { Banner } from '../ui/components'
import { fmt } from '../ui/format'
import { notify } from '../ui/errors'
import { conBase, evaluar, scorer, type Evaluacion } from './evaluar'

type Modo = 'proyectar' | 'historial' | 'comparar'
type Tono = 'pasado' | 'presente' | 'futuro'

/** Clave de la imagen de una estadistica (se guarda junto a las de los objetos). */
export const statImageKey = (k: string) => normalizeKey(`estadistica ${k}`)

interface Columna {
  tono: Tono
  titulo: string
  /** Valores base del perfil en ese momento; null = sin datos (se muestra el motivo). */
  base: Record<string, number> | null
  motivo?: string
  eval?: Evaluacion | string | null
}

export default function EvolutionView({
  gameId, template, items, profile, eq, skills, onSaveProfile,
}: {
  gameId: string
  template: GameTemplate
  items: Item[]
  profile: BaseProfile
  eq: Equipment
  skills: SkillSelection
  onSaveProfile: (profile: BaseProfile) => void
}) {
  const [modo, setModo] = useState<Modo>('proyectar')
  const [objetivo, setObjetivo] = useState<number | null>(null)
  const [pasado, setPasado] = useState<number | null>(null)
  const [historial, setHistorial] = useState<LevelSnapshot[]>(() => loadHistory(gameId, profile.id))
  // Modo por puntos (Souls): como reparte el jugador los puntos de los niveles que sube.
  const [alloc, setAlloc] = useState<Allocation>({})
  const [metaReparto, setMetaReparto] = useState(template.objectives[0]?.id ?? '')
  const [avisoReparto, setAvisoReparto] = useState<string | null>(null)
  useEffect(() => {
    setHistorial(loadHistory(gameId, profile.id)); setObjetivo(null); setPasado(null); setAlloc({}); setAvisoReparto(null)
  }, [gameId, profile.id])

  const lv = template.leveling
  const actual = currentLevel(template, profile)
  const claves = growingKeys(template, profile)

  // Si el nivel actual cambia (subiste), los niveles elegidos pueden dejar de tener sentido.
  useEffect(() => {
    if (actual === null) return
    if (objetivo !== null && objetivo <= actual) setObjetivo(null)
    if (pasado !== null && pasado >= actual) setPasado(null)
  }, [actual])  // eslint-disable-line react-hooks/exhaustive-deps

  const porPuntos = isPointsMode(template)
  const allocKey = JSON.stringify(alloc)
  const proyeccion: Projection | null = useMemo(
    () => (objetivo === null ? null : projectProfile(template, profile, objetivo, porPuntos ? alloc : {})),
    [template, profile, objetivo, porPuntos, allocKey],  // eslint-disable-line react-hooks/exhaustive-deps
  )
  const registrosPasados = historial.filter((s) => actual !== null && s.level < actual)
  const registro = pasado === null ? undefined : historial.find((s) => s.level === pasado)

  // Resultados del juego con el equipo puesto, en cada momento.
  const evalPresente = useMemo(() => evaluar(template, items, eq, profile.id, skills), [template, items, eq, profile.id, skills])
  const baseFutura = proyeccion?.ok ? proyeccion.base : null
  const evalFuturo = useMemo(
    () => (baseFutura ? evaluar(conBase(template, profile.id, baseFutura), items, eq, profile.id, skills) : null),
    [template, items, eq, profile.id, skills, baseFutura],
  )
  const basePasada = registro?.base ?? null
  const evalPasado = useMemo(
    () => (basePasada ? evaluar(conBase(template, profile.id, { ...profile.base, ...basePasada }), items, eq, profile.id, skills) : null),
    [template, items, eq, profile, skills, basePasada],
  )

  // ------------------------------------------------------------ sin niveles
  if (!lv) {
    return (
      <div className="card ev">
        <h2>Evolución por nivel</h2>
        <Banner kind="info">Simulación futura no disponible</Banner>
        <p className="hint">
          Este juego no define niveles. Quien creó el juego puede activarlos en <b>Mis juegos → Editar → Niveles</b>,
          indicando cuánto crece cada atributo al subir.
        </p>
      </div>
    )
  }
  if (actual === null || claves.length === 0) {
    return (
      <div className="card ev">
        <h2>Evolución por nivel</h2>
        <Banner kind="warn">No tienes estadísticas base para simular. Sube de nivel primero.</Banner>
        <label className="ev-pick futuro" style={{ marginTop: 10 }}>
          <span>Nivel a simular</span>
          <select disabled><option>Sin estadísticas</option></select>
        </label>
      </div>
    )
  }

  // ------------------------------------------------------------ subir de nivel
  const subirHasta = (hasta: number) => {
    const p = projectProfile(template, profile, hasta, porPuntos ? alloc : {})
    if (!p.ok) { notify(p.error, 'error'); return }
    let lista = recordLevel(gameId, profile.id, actual, profile.base)
    if (!porPuntos) {
      // Registra cada nivel intermedio: el historial queda completo. Con puntos no
      // se sabe en que orden se habrian repartido, asi que solo queda el destino.
      for (let n = actual + 1; n < hasta; n++) {
        const pn = projectProfile(template, profile, n)
        if (pn.ok) lista = recordLevel(gameId, profile.id, n, pn.base)
      }
    }
    lista = recordLevel(gameId, profile.id, hasta, p.base)
    setHistorial(lista)
    onSaveProfile({ ...profile, base: p.base })
    setAlloc({}); setAvisoReparto(null)
    notify(`${profile.name} subió al nivel ${hasta}.`, 'ok')
  }

  // ------------------------------------------------------------ reparto de puntos
  const atributosPuntos = pointAttributes(template).filter((k) => typeof profile.base[k] === 'number')
  const disponibles = objetivo !== null && objetivo > actual ? pointsBetween(template, actual, objetivo) : 0
  const usados = allocated(alloc)
  const tope = lv.points?.maxValue ?? Infinity
  // Requisitos de las piezas puestas que dependen de atributos: el reparto los cubre primero.
  const requisitos: Record<string, number> = {}
  for (const id of Object.values(eq)) {
    const it = items.find((i) => i.id === id)
    for (const [k, need] of Object.entries(it?.requires ?? {})) {
      if (atributosPuntos.includes(k)) requisitos[k] = Math.max(requisitos[k] ?? 0, need)
    }
  }
  const sugerir = () => {
    if (objetivo === null || objetivo <= actual) return
    const sc = scorer(template, items, eq, profile.id, skills, metaReparto)
    if (!sc) { notify('No se pudo evaluar tu equipo para repartir los puntos.', 'error'); return }
    const r = allocatePoints(template, profile, objetivo, sc, requisitos)
    setAlloc(r.alloc)
    const partes: string[] = []
    if (r.unmet.length) partes.push(`Los puntos no alcanzan para cumplir los requisitos de ${r.unmet.map(nombreDe).join(', ')}.`)
    if (r.leftover) partes.push(`${r.leftover} punto(s) no mejoran «${template.objectives.find((o) => o.id === metaReparto)?.name}»: repártelos a tu gusto.`)
    setAvisoReparto(partes.join(' ') || null)
  }
  function nombreDe(k: string) {
    return profile.labels?.[k] ?? template.stats.find((s) => s.id === k)?.name ?? (k.charAt(0).toUpperCase() + k.slice(1))
  }

  const presente: Columna = { tono: 'presente', titulo: `Presente · nivel ${actual}`, base: profile.base, eval: evalPresente }
  const futuro: Columna = !proyeccion
    ? { tono: 'futuro', titulo: 'Futuro', base: null, motivo: actual >= lv.max ? 'Simulación futura no disponible' : 'Elige un nivel superior al actual' }
    : proyeccion.ok
      ? { tono: 'futuro', titulo: `Futuro · nivel ${proyeccion.level}`, base: proyeccion.base, eval: evalFuturo }
      : { tono: 'futuro', titulo: 'Futuro', base: null, motivo: proyeccion.error }
  const pasadoCol: Columna = registrosPasados.length === 0
    ? { tono: 'pasado', titulo: 'Pasado', base: null, motivo: modo === 'comparar' ? 'Sin datos previos disponibles' : 'Aún no tienes historial de estadísticas. Sube de nivel para generar registros.' }
    : pasado === null
      ? { tono: 'pasado', titulo: 'Pasado', base: null, motivo: 'Elige un nivel anterior' }
      : registro
        ? { tono: 'pasado', titulo: `Pasado · nivel ${pasado}`, base: { ...profile.base, ...registro.base }, eval: evalPasado }
        : { tono: 'pasado', titulo: `Pasado · nivel ${pasado}`, base: null, motivo: `No hay registros de estadísticas para el nivel ${pasado}` }

  const columnas = modo === 'proyectar' ? [presente, futuro] : modo === 'historial' ? [pasadoCol, presente] : [pasadoCol, presente, futuro]

  // Piezas que pasan a cumplir sus requisitos en el nivel proyectado.
  const desbloqueos = baseFutura ? items.filter((it) => {
    const req = Object.entries(it.requires ?? {})
    return req.length > 0 &&
      req.some(([k, need]) => (profile.base[k] ?? 0) < need) &&
      req.every(([k, need]) => (baseFutura[k] ?? 0) >= need)
  }) : []

  return (
    <div className="card ev">
      <div className="ev-head">
        <h2>Evolución por nivel</h2>
        <span className="chip n">Nivel actual {actual} · máximo {lv.max}</span>
      </div>

      <div className="ev-modes" role="tablist" aria-label="Vista de la evolución">
        {([['proyectar', 'Proyectar'], ['historial', 'Historial'], ['comparar', 'Comparar los tres']] as [Modo, string][]).map(([m, t]) => (
          <button key={m} role="tab" aria-selected={modo === m} className={`mini${modo === m ? ' on' : ''}`} onClick={() => setModo(m)}>{t}</button>
        ))}
      </div>

      <div className="ev-pickers">
        {modo !== 'proyectar' && (
          <label className="ev-pick pasado">
            <span>Nivel anterior</span>
            <select value={pasado ?? ''} onChange={(e) => setPasado(e.target.value === '' ? null : Number(e.target.value))}
              disabled={registrosPasados.length === 0}>
              <option value="">{registrosPasados.length === 0 ? 'Sin registros' : 'Elige un nivel…'}</option>
              {Array.from({ length: actual - lv.min }, (_, i) => lv.min + i).reverse().map((n) => {
                const hay = historial.some((s) => s.level === n)
                return <option key={n} value={n}>Nivel {n}{hay ? '' : ' (sin registro)'}</option>
              })}
            </select>
          </label>
        )}
        {modo !== 'historial' && (
          <label className="ev-pick futuro">
            <span>Nivel a simular</span>
            <select value={objetivo ?? ''} onChange={(e) => setObjetivo(e.target.value === '' ? null : Number(e.target.value))}
              disabled={actual >= lv.max}>
              <option value="">{actual >= lv.max ? 'Ya estás en el nivel máximo' : 'Elige un nivel…'}</option>
              {Array.from({ length: lv.max - lv.min + 1 }, (_, i) => lv.min + i).map((n) => (
                // El nivel actual no se puede elegir; los anteriores si, para que el
                // mensaje explique por que no sirven (criterio de SIM-02).
                <option key={n} value={n} disabled={n === actual}>Nivel {n}{n === actual ? ' (actual)' : ''}</option>
              ))}
            </select>
          </label>
        )}
        {modo !== 'historial' && actual < lv.max && (
          <div className="ev-quick">
            {[1, 5, 10].filter((d) => actual + d <= lv.max).map((d) => (
              <button key={d} className="mini" onClick={() => setObjetivo(actual + d)}>+{d}</button>
            ))}
            <button className="mini" onClick={() => setObjetivo(lv.max)}>máx.</button>
          </div>
        )}
      </div>

      {porPuntos && modo !== 'historial' && objetivo !== null && objetivo > actual && (
        <div className="ev-alloc">
          <div className="ev-alloc-head">
            <b>Reparte tus puntos</b>
            <span className={`chip${usados === disponibles ? '' : ' n'}`}>
              {usados} de {disponibles} {usados === disponibles ? '· listo' : `· te quedan ${disponibles - usados}`}
            </span>
          </div>
          <p className="hint" style={{ margin: '0 0 8px' }}>
            Subir del nivel {actual} al {objetivo} da {disponibles} punto(s). Cada atributo mueve otras cifras: míralas cambiar en la tabla.
          </p>
          <div className="ev-alloc-rows">
            {atributosPuntos.map((k) => {
              const n = alloc[k] ?? 0
              const v = (proyeccion?.ok ? proyeccion.base[k] - n : profile.base[k]) ?? 0
              return (
                <div key={k} className="ev-alloc-row">
                  <span className="ev-alloc-name">{nombreDe(k)}{requisitos[k] ? <i className="hint"> · tu equipo pide {requisitos[k]}</i> : null}</span>
                  <span className="ev-v">{fmt(v, 2)}</span>
                  <span className="cs-arrow">⇒</span>
                  <span className={`ev-v${n > 0 ? ' ev-fut' : ''}`}>{fmt(v + n, 2)}</span>
                  <button className="mini" aria-label={`Quitar un punto a ${nombreDe(k)}`} disabled={n <= 0}
                    onClick={() => setAlloc({ ...alloc, [k]: n - 1 })}>−</button>
                  <button className="mini" aria-label={`Poner un punto en ${nombreDe(k)}`} disabled={usados >= disponibles || v + n + 1 > tope}
                    onClick={() => setAlloc({ ...alloc, [k]: n + 1 })}>+</button>
                </div>
              )
            })}
          </div>
          <div className="ev-alloc-auto">
            <button className="mini on" onClick={sugerir}>Sugerir reparto</button>
            <span className="hint">para</span>
            <select aria-label="Objetivo del reparto" value={metaReparto} onChange={(e) => setMetaReparto(e.target.value)}>
              {template.objectives.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button className="mini" disabled={usados === 0} onClick={() => { setAlloc({}); setAvisoReparto(null) }}>limpiar</button>
          </div>
          <p className="hint" style={{ margin: '6px 0 0' }}>
            La sugerencia usa el equipo que llevas puesto{Object.keys(requisitos).length ? ' y primero cubre sus requisitos' : ''}.
          </p>
          {avisoReparto && <Banner kind="warn">{avisoReparto}</Banner>}
        </div>
      )}

      <Tabla template={template} profile={profile} gameId={gameId} claves={claves} columnas={columnas} eq={eq} />

      {modo === 'proyectar' && desbloqueos.length > 0 && (
        <Banner kind="ok">
          Al nivel {objetivo} podrías usar: {desbloqueos.map((it) => it.name).join(', ')}.
        </Banner>
      )}

      <div className="ev-actions">
        {modo === 'proyectar' && (
          <>
            {porPuntos ? (
              <>
                <button className="mini on" disabled={!proyeccion?.ok || usados !== disponibles}
                  onClick={() => proyeccion?.ok && subirHasta(proyeccion.level)}>
                  {objetivo !== null && objetivo > actual ? `Subir al nivel ${objetivo} con este reparto` : 'Elige un nivel para subir'}
                </button>
                {objetivo !== null && objetivo > actual && usados !== disponibles && (
                  <span className="hint">Reparte los {disponibles - usados} punto(s) que quedan para confirmar.</span>
                )}
              </>
            ) : (
              <>
                {actual < lv.max && (
                  <button className="mini on" onClick={() => subirHasta(actual + 1)}>Subir al nivel {actual + 1}</button>
                )}
                {proyeccion?.ok && proyeccion.level > actual + 1 && (
                  <button className="mini" onClick={() => subirHasta(proyeccion.level)}>Subir hasta el nivel {proyeccion.level}</button>
                )}
              </>
            )}
            <span className="hint">Subir guarda tus estadísticas actuales en el historial.</span>
          </>
        )}
        {modo === 'historial' && (
          <button className="mini" onClick={() => { setHistorial(recordLevel(gameId, profile.id, actual, profile.base)); notify(`Nivel ${actual} registrado.`, 'ok') }}>
            Registrar el nivel actual
          </button>
        )}
      </div>

      {modo === 'historial' && historial.length > 0 && (
        <details className="ev-log">
          <summary>Registros guardados ({historial.length})</summary>
          {historial.slice().reverse().map((s) => (
            <div key={s.level} className="ev-log-row">
              <span>Nivel {s.level}</span>
              <span className="hint">{new Date(s.at).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <button className="mini" aria-label={`Borrar el registro del nivel ${s.level}`}
                onClick={() => setHistorial(removeLevel(gameId, profile.id, s.level))}>borrar</button>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}

// ------------------------------------------------------------ tabla

type Orden = 'valor' | 'nombre'

function Tabla({ template, profile, gameId, claves, columnas, eq }: {
  template: GameTemplate; profile: BaseProfile; gameId: string; claves: string[]; columnas: Columna[]; eq: Equipment
}) {
  const [orden, setOrden] = useState<Orden>('valor')
  const { images } = useItemImages(gameId)
  const subir = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const nombre = (k: string) => profile.labels?.[k] ?? template.stats.find((s) => s.id === k)?.name ?? (k.charAt(0).toUpperCase() + k.slice(1))
  const iPresente = columnas.findIndex((c) => c.tono === 'presente')

  // Atributos que crecen con el nivel.
  const filasAttr = claves.map((k) => ({ k, name: nombre(k), vals: columnas.map((c) => c.base?.[k]) }))
  // Resultados con el equipo puesto (objetivos y calculados).
  const ev = (c: Columna) => (c.eval && typeof c.eval !== 'string' ? c.eval : null)
  const filasRes = [
    ...template.objectives.map((o) => ({ k: `o:${o.id}`, name: o.name, dec: o.decimals ?? 1, vals: columnas.map((c) => ev(c)?.objetivos[o.id]) })),
    ...(template.derived ?? []).map((d) => ({ k: d.id, name: d.name || d.id, dec: 2, vals: columnas.map((c) => ev(c)?.vars.get(d.id)) })),
  ]
  const ordenar = <T extends { name: string; vals: (number | undefined)[] }>(l: T[]) => l.slice().sort((a, b) =>
    orden === 'nombre'
      ? a.name.localeCompare(b.name, 'es')
      : (b.vals[iPresente] ?? -Infinity) - (a.vals[iPresente] ?? -Infinity) || a.name.localeCompare(b.name, 'es'))

  const celda = (vals: (number | undefined)[], i: number, dec: number, name: string) => {
    const c = columnas[i]
    if (!c.base) return <td key={i} className={`ev-c ${c.tono} vacio`} />
    const v = vals[i]
    // La diferencia se mide contra la columna anterior: el tiempo avanza a la derecha.
    const prev = i > 0 && columnas[i - 1].base ? vals[i - 1] : undefined
    const d = v !== undefined && prev !== undefined ? v - prev : 0
    const titulo = v !== undefined && prev !== undefined ? `${name}: ${fmt(prev, dec)} → ${fmt(v, dec)} (${d >= 0 ? '+' : '−'}${fmt(Math.abs(d), dec)})` : undefined
    return (
      <td key={i} className={`ev-c ${c.tono}`} title={titulo}>
        <span className="ev-v">{v === undefined ? '—' : fmt(v, dec)}</span>
        {Math.abs(d) > 1e-9 && fmt(Math.abs(d), dec) !== '0' && (
          <span className={`ev-d ${d > 0 ? 'sube' : 'baja'}`}>{d > 0 ? '↑' : '↓'} {d > 0 ? '+' : '−'}{fmt(Math.abs(d), dec)}</span>
        )}
      </td>
    )
  }

  return (
    <div className="ev-table-wrap">
      <input ref={subir} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ''
        if (!f || !subiendo) return
        try { await setImage(gameId, statImageKey(subiendo), await shrinkIcon(f)) } catch (err) { notify((err as Error).message, 'error') }
      }} />
      <table className="ev-table">
        <thead>
          <tr>
            <th className="ev-name">
              <button className={`ev-sort${orden === 'nombre' ? ' on' : ''}`} onClick={() => setOrden(orden === 'nombre' ? 'valor' : 'nombre')}
                title={orden === 'nombre' ? 'Ordenado por nombre. Pulsa para ordenar por valor.' : 'Ordenado por valor. Pulsa para ordenar por nombre.'}>
                Nombre {orden === 'nombre' ? 'A→Z' : '· por valor'}
              </button>
            </th>
            {columnas.map((c, i) => <th key={i} className={`ev-c ${c.tono}`}>{c.titulo}</th>)}
          </tr>
          {columnas.some((c) => !c.base) && (
            <tr className="ev-motivos">
              <th />
              {columnas.map((c, i) => <th key={i} className={`ev-c ${c.tono}`}>{c.base ? '' : <span className="ev-motivo">{c.motivo}</span>}</th>)}
            </tr>
          )}
        </thead>
        <tbody>
          <tr className="ev-sec"><td colSpan={columnas.length + 1}>Estadísticas</td></tr>
          {ordenar(filasAttr).map((f) => {
            const img = images[statImageKey(f.k)]
            return (
              <tr key={f.k}>
                <td className="ev-name"><div className="ev-name-in">
                  <button className="ev-badge" title={`${f.name} · pulsa para ${img ? 'cambiar' : 'poner'} su imagen`}
                    onClick={() => { setSubiendo(f.k); subir.current?.click() }}>
                    {img ? <img src={img} alt="" /> : <span>{f.name.slice(0, 2).toUpperCase()}</span>}
                  </button>
                  <span>{f.name}</span>
                  {img && <button className="ev-x" aria-label={`Quitar la imagen de ${f.name}`} onClick={() => removeImage(gameId, statImageKey(f.k))}>×</button>}
                </div></td>
                {columnas.map((_, i) => celda(f.vals, i, 2, f.name))}
              </tr>
            )
          })}
          {filasRes.length > 0 && columnas.some((c) => ev(c)) && (
            <>
              <tr className="ev-sec"><td colSpan={columnas.length + 1}>
                Con tu equipo puesto
                {!Object.values(eq).some(Boolean) && <span className="ev-sec-hint"> · no llevas nada puesto: equípate en «Equipo y estadísticas»</span>}
              </td></tr>
              {ordenar(filasRes).map((f) => (
                <tr key={f.k}>
                  <td className="ev-name"><span>{f.name}</span></td>
                  {columnas.map((_, i) => celda(f.vals, i, f.dec, f.name))}
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
