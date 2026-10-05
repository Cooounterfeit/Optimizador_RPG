/**
 * Editor de niveles (pestana "Niveles" del editor de juegos)
 * ==========================================================
 * El creador del juego decide, sin escribir codigo:
 *   - si el juego tiene niveles, y entre que minimo y maximo;
 *   - en que nivel esta cada clase o personaje;
 *   - que atributos suben al subir de nivel y cuanto:
 *       · "Igual para todos": un numero fijo por nivel.
 *       · "Distinto por clase": cada perfil guarda su propio crecimiento
 *         (`crec<Atributo>`) y la curva lo lee con `base_crec<Atributo>`.
 *       · "Fórmula": para curvas que aceleran o dependen del nivel
 *         (variable `nivel`), solo para quien la necesite.
 * Abajo, una vista previa con el primer perfil a +1, +5 y +10 niveles.
 *
 * Juegos tipo Souls: cada nivel da puntos que el jugador reparte, y cada
 * atributo mueve otras cifras con topes blandos. Para eso estan el modo "por
 * puntos" y las curvas ("Vigor da vida"), que se dibujan con puntos.
 */

import { useState } from 'react'
import type { DerivedDef, GameTemplate, LevelingDef } from '../core/types'
import { checkLeveling, levelKeyOf, projectProfile } from '../core/leveling'
import { checkCurves, cleanPoints, evalCurve, syncCurve } from '../core/curves'
import { Banner } from '../ui/components'
import { fmt } from '../ui/format'

type Modo = 'igual' | 'clase' | 'formula'

const cap = (k: string) => k.charAt(0).toUpperCase() + k.slice(1)
const crecKey = (k: string) => `crec${cap(k)}`
const toKey = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, ' ').trim()
  .split(/\s+/).map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : cap(w))).join('')

function modoDe(k: string, f: string): Modo {
  if (/^\s*-?\d+(\.\d+)?\s*$/.test(f)) return 'igual'
  if (f.trim() === `base_${crecKey(k)}`) return 'clase'
  return 'formula'
}

export default function LevelingEditor({ t, upd }: { t: GameTemplate; upd: (p: Partial<GameTemplate>) => void }) {
  const lv = t.leveling
  const [nuevo, setNuevo] = useState('')
  const [nuevoPunto, setNuevoPunto] = useState('')
  const [vista, setVista] = useState(t.baseProfiles[0]?.id ?? '')

  if (!lv) {
    return (
      <div className="card">
        <h2>Niveles</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Activa los niveles si los personajes de tu juego suben de nivel y sus atributos crecen al hacerlo.
          Los jugadores podrán proyectar sus estadísticas a un nivel futuro, guardar su historial y comparar
          pasado, presente y futuro desde la hoja de personaje.
        </p>
        <button className="mini on" onClick={() => upd({
          leveling: { levelKey: 'nivel', min: 1, max: 60, growth: {} },
          baseProfiles: t.baseProfiles.map((p) => ('nivel' in p.base ? p : { ...p, base: { nivel: 1, ...p.base } })),
        })}>Activar niveles</button>
        <CurvesEditor t={t} upd={upd} nombre={(k) => t.baseProfiles.find((p) => p.labels?.[k])?.labels?.[k] ?? cap(k)}
          atributos={[...new Set(t.baseProfiles.flatMap((p) => Object.keys(p.base)))].filter((k) => !t.stats.some((x) => x.id === k))} />
      </div>
    )
  }

  const key = levelKeyOf(lv)
  const setLv = (patch: Partial<LevelingDef>) => upd({ leveling: { ...lv, ...patch } })
  const setGrowth = (g: Record<string, string>) => setLv({ growth: g })
  const setBase = (pid: string, k: string, v: number) => upd({
    baseProfiles: t.baseProfiles.map((p) => (p.id === pid ? { ...p, base: { ...p.base, [k]: v } } : p)),
  })

  const porPuntos = lv.mode === 'points'
  const statIds = new Set(t.stats.map((x) => x.id))
  // Atributos del perfil (no estadisticas de equipo, ni el nivel, ni los crecimientos).
  const atributosPerfil = [...new Set(t.baseProfiles.flatMap((p) => Object.keys(p.base)))]
    .filter((k) => k !== key && !/^crec[A-Z]/.test(k) && !statIds.has(k) && !/^es[A-Z]/.test(k))
  const anadirPunto = () => {
    const k = toKey(nuevoPunto)
    if (!k || k === key) return
    const at = lv.points?.attributes ?? []
    upd({
      leveling: { ...lv, points: { ...lv.points, attributes: at.includes(k) ? at : [...at, k] } },
      baseProfiles: t.baseProfiles.map((p) => (k in p.base ? p : { ...p, base: { ...p.base, [k]: 10 } })),
    })
    setNuevoPunto('')
  }

  // Atributos que se pueden hacer crecer: todo lo del perfil salvo el nivel y los crecimientos.
  const candidatos = [...new Set(t.baseProfiles.flatMap((p) => Object.keys(p.base)))]
    .filter((k) => k !== key && !/^crec[A-Z]/.test(k) && !(k in lv.growth))
  const nombre = (k: string) => t.baseProfiles.find((p) => p.labels?.[k])?.labels?.[k] ?? t.stats.find((s) => s.id === k)?.name ?? cap(k)

  const anadir = (k: string) => {
    if (!k || k === key || k in lv.growth) return
    upd({
      leveling: { ...lv, growth: { ...lv.growth, [k]: '1' } },
      // Si el atributo es nuevo, los perfiles lo reciben en 0 para que se pueda ajustar.
      baseProfiles: t.baseProfiles.map((p) => (k in p.base ? p : { ...p, base: { ...p.base, [k]: 0 } })),
    })
  }

  const cambiarModo = (k: string, m: Modo) => {
    const f = lv.growth[k]
    const actual = Number(f)
    if (m === 'igual') setGrowth({ ...lv.growth, [k]: String(Number.isFinite(actual) ? actual : 1) })
    if (m === 'formula') setGrowth({ ...lv.growth, [k]: f })
    if (m === 'clase') {
      const ck = crecKey(k)
      upd({
        leveling: { ...lv, growth: { ...lv.growth, [k]: `base_${ck}` } },
        baseProfiles: t.baseProfiles.map((p) => (ck in p.base ? p : { ...p, base: { ...p.base, [ck]: Number.isFinite(actual) ? actual : 1 } })),
      })
    }
  }

  const check = checkLeveling(t)
  const perfil = t.baseProfiles.find((p) => p.id === vista) ?? t.baseProfiles[0]
  const actual = perfil?.base[key]
  const saltos = typeof actual === 'number' ? [1, 5, 10].map((d) => Math.min(actual + d, lv.max)).filter((n, i, a) => n > actual && a.indexOf(n) === i) : []
  const proy = perfil ? saltos.map((n) => projectProfile(t, perfil, n)) : []

  return (
    <div className="card lv-ed">
      <h2>Niveles</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Define cuánto crece cada atributo <b>por cada nivel que se sube</b>. Es lo que usa la hoja de personaje
        para proyectar al futuro.
      </p>

      <div className="lv-row">
        <label className="field"><span>Nivel mínimo</span>
          <input type="number" min={0} value={lv.min} onChange={(e) => setLv({ min: Math.trunc(Number(e.target.value)) })} />
        </label>
        <label className="field"><span>Nivel máximo</span>
          <input type="number" min={1} value={lv.max} onChange={(e) => setLv({ max: Math.trunc(Number(e.target.value)) })} />
        </label>
        <div style={{ flex: 1 }} />
        <button className="mini" onClick={() => upd({ leveling: undefined })}>Desactivar niveles</button>
      </div>

      <h3>¿Cómo se sube de nivel?</h3>
      <div className="lv-modes" role="radiogroup" aria-label="Cómo se sube de nivel">
        <button role="radio" aria-checked={!porPuntos} className={`lv-mode${!porPuntos ? ' on' : ''}`} onClick={() => setLv({ mode: 'growth' })}>
          <b>Los atributos crecen solos</b>
          <span>Cada clase sube lo mismo en cada nivel (RPG clásico, Pokémon).</span>
        </button>
        <button role="radio" aria-checked={porPuntos} className={`lv-mode${porPuntos ? ' on' : ''}`}
          onClick={() => setLv({ mode: 'points', points: lv.points ?? { attributes: [], perLevel: 1, maxValue: 99 } })}>
          <b>Cada nivel da puntos para repartir</b>
          <span>El jugador elige qué atributo sube, y cada atributo mueve otras cifras (Dark Souls, Elden Ring).</span>
        </button>
      </div>

      {porPuntos && (
        <>
          <div className="lv-row">
            <label className="field"><span>Puntos por nivel</span>
              <input type="number" min={1} value={lv.points?.perLevel ?? 1}
                onChange={(e) => setLv({ points: { attributes: [], ...lv.points, perLevel: Math.max(1, Math.trunc(Number(e.target.value))) } })} />
            </label>
            <label className="field"><span>Tope de cada atributo (vacío = sin tope)</span>
              <input type="number" min={1} value={lv.points?.maxValue ?? ''}
                onChange={(e) => setLv({ points: { attributes: [], ...lv.points, maxValue: e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)) } })} />
            </label>
          </div>
          <div className="field"><span>Atributos que reciben puntos</span></div>
          <div className="lv-checks">
            {atributosPerfil.map((k) => {
              const on = (lv.points?.attributes ?? []).includes(k)
              return (
                <label key={k} className={`lv-check${on ? ' on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => {
                    const at = lv.points?.attributes ?? []
                    setLv({ points: { ...lv.points, attributes: on ? at.filter((x) => x !== k) : [...at, k] } })
                  }} />
                  {nombre(k)}
                </label>
              )
            })}
          </div>
          <div className="lv-row" style={{ alignItems: 'flex-end' }}>
            <label className="field"><span>Atributo nuevo</span>
              <input type="text" placeholder="Ej: Vigor" value={nuevoPunto} onChange={(e) => setNuevoPunto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') anadirPunto() }} />
            </label>
            <button className="mini" disabled={!toKey(nuevoPunto)} onClick={anadirPunto} style={{ marginBottom: 12 }}>+ añadir</button>
          </div>
        </>
      )}

      <h3>Nivel actual de cada personaje</h3>
      <div className="lv-row">
        {t.baseProfiles.map((p) => (
          <label className="field" key={p.id}><span>{p.name}</span>
            <input type="number" min={lv.min} max={lv.max} value={p.base[key] ?? ''}
              onChange={(e) => setBase(p.id, key, Math.trunc(Number(e.target.value)))} />
          </label>
        ))}
      </div>

      {porPuntos && (
        <>
          <h3>Atributos de cada personaje</h3>
          <div className="lv-table-wrap">
            <table className="ev-table">
              <thead><tr><th className="ev-name">Personaje</th>{(lv.points?.attributes ?? []).map((k) => <th key={k}>{nombre(k)}</th>)}</tr></thead>
              <tbody>
                {t.baseProfiles.map((p) => (
                  <tr key={p.id}>
                    <td className="ev-name">{p.name}</td>
                    {(lv.points?.attributes ?? []).map((k) => (
                      <td key={k}><input type="number" className="lv-num" aria-label={`${nombre(k)} de ${p.name}`} value={p.base[k] ?? 0}
                        onChange={(e) => setBase(p.id, k, Number(e.target.value))} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>{porPuntos ? 'Además, sube solo con cada nivel (opcional)' : 'Qué sube al subir de nivel'}</h3>
      {Object.keys(lv.growth).length === 0 && (
        <p className="hint">{porPuntos ? 'Nada sube solo: todo depende de los puntos.' : 'Todavía no crece nada. Añade un atributo abajo.'}</p>
      )}
      {Object.entries(lv.growth).map(([k, f]) => {
        const m = modoDe(k, f)
        return (
          <div key={k} className="lv-attr">
            <div className="lv-attr-head">
              <b>{nombre(k)}</b>
              <select value={m} onChange={(e) => cambiarModo(k, e.target.value as Modo)} aria-label={`Cómo crece ${nombre(k)}`}>
                <option value="igual">Igual para todos</option>
                <option value="clase">Distinto por clase</option>
                <option value="formula">Fórmula (avanzado)</option>
              </select>
              <div style={{ flex: 1 }} />
              <button className="mini" aria-label={`Quitar ${nombre(k)}`} onClick={() => {
                const g = { ...lv.growth }; delete g[k]; setGrowth(g)
              }}>quitar</button>
            </div>
            {m === 'igual' && (
              <label className="field lv-inline"><span>+ por nivel</span>
                <input type="number" step="0.1" value={Number(f)} onChange={(e) => setGrowth({ ...lv.growth, [k]: String(Number(e.target.value)) })} />
              </label>
            )}
            {m === 'clase' && (
              <div className="lv-row">
                {t.baseProfiles.map((p) => (
                  <label className="field" key={p.id}><span>{p.name}: + por nivel</span>
                    <input type="number" step="0.1" value={p.base[crecKey(k)] ?? 0}
                      onChange={(e) => setBase(p.id, crecKey(k), Number(e.target.value))} />
                  </label>
                ))}
              </div>
            )}
            {m === 'formula' && (
              <label className="field"><span>Cuánto sube al llegar a cada nivel. Puedes usar <code>nivel</code> y los valores del perfil (<code>base_fuerza</code>…).</span>
                <input type="text" value={f} style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
                  onChange={(e) => setGrowth({ ...lv.growth, [k]: e.target.value })} />
              </label>
            )}
          </div>
        )
      })}
      <div className="lv-row" style={{ alignItems: 'flex-end' }}>
        {candidatos.length > 0 && (
          <label className="field"><span>Añadir un atributo del perfil</span>
            <select value="" onChange={(e) => anadir(e.target.value)}>
              <option value="">Elige…</option>
              {candidatos.map((k) => <option key={k} value={k}>{nombre(k)}</option>)}
            </select>
          </label>
        )}
        <label className="field"><span>…o uno nuevo</span>
          <input type="text" placeholder="Ej: Fuerza" value={nuevo} onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && toKey(nuevo)) { anadir(toKey(nuevo)); setNuevo('') } }} />
        </label>
        <button className="mini" disabled={!toKey(nuevo)} onClick={() => { anadir(toKey(nuevo)); setNuevo('') }} style={{ marginBottom: 12 }}>+ añadir</button>
      </div>

      <CurvesEditor t={t} upd={upd} nombre={nombre} atributos={porPuntos ? (lv.points?.attributes ?? []) : atributosPerfil} />

      {check.errors.map((e) => <Banner key={e} kind="err">{e}</Banner>)}
      {check.warnings.map((e) => <Banner key={e} kind="warn">{e}</Banner>)}

      {perfil && Object.keys(lv.growth).length > 0 && check.errors.length === 0 && (
        <>
          <h3>Vista previa</h3>
          {t.baseProfiles.length > 1 && (
            <select value={perfil.id} onChange={(e) => setVista(e.target.value)} style={{ marginBottom: 8 }} aria-label="Perfil de la vista previa">
              {t.baseProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {saltos.length === 0
            ? <p className="hint">Este perfil ya está en el nivel máximo.</p>
            : (
              <div className="ev-table-wrap">
                <table className="ev-table">
                  <thead><tr>
                    <th className="ev-name">Atributo</th>
                    <th>Nivel {actual}</th>
                    {saltos.map((n) => <th key={n} style={{ color: '#f0a14a' }}>Nivel {n}</th>)}
                  </tr></thead>
                  <tbody>
                    {Object.keys(lv.growth).filter((k) => typeof perfil.base[k] === 'number').map((k) => (
                      <tr key={k}>
                        <td className="ev-name">{nombre(k)}</td>
                        <td><span className="ev-v">{fmt(perfil.base[k], 2)}</span></td>
                        {proy.map((r, i) => <td key={i}><span className="ev-v">{r.ok ? fmt(r.base[k], 2) : '—'}</span></td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------ curvas

/**
 * "Qué da cada atributo": curvas por tramos dibujadas con puntos. Cada curva es
 * un valor calculado (aparece en la hoja y se usa en las formulas por su
 * nombre interno), con la formula generada a partir de los puntos.
 */
function CurvesEditor({ t, upd, nombre, atributos }: {
  t: GameTemplate; upd: (p: Partial<GameTemplate>) => void; nombre: (k: string) => string; atributos: string[]
}) {
  const derived = t.derived ?? []
  const curvas = derived.filter((d) => d.curve)
  const chk = checkCurves(t)
  const setD = (id: string, patch: Partial<DerivedDef>) => upd({
    derived: derived.map((d) => (d.id === id ? syncCurve(t, { ...d, ...patch }) : d)),
  })
  const usadaEn = (id: string) => {
    const re = new RegExp(`\\b${id}\\b`)
    return [...derived.filter((d) => d.id !== id && re.test(d.formula)).map((d) => d.name || d.id),
      ...t.objectives.filter((o) => re.test(o.formula)).map((o) => o.name)]
  }
  const opciones = [...new Set([...atributos, ...curvas.map((c) => c.curve!.input)])]

  return (
    <>
      <h3>Qué da cada atributo</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Dibuja con puntos cuánto da un atributo: «con 10 de Vigor, 580 de vida; con 27, 1000; con 50, 1400…».
        Entre puntos se interpola en línea recta y pasado el último se queda plano, como los topes blandos de los Souls.
        Cada curva aparece en la hoja de personaje y se puede usar en las fórmulas por su nombre interno.
      </p>
      {curvas.map((d) => {
        const c = d.curve!
        const pts = c.points
        const usos = usadaEn(d.id)
        return (
          <div key={d.id} className="lv-attr">
            <div className="lv-attr-head">
              <input type="text" value={d.name} aria-label="Nombre de la curva" style={{ width: 220 }}
                onChange={(e) => setD(d.id, { name: e.target.value })} />
              <span className="hint" style={{ margin: 0 }}>según</span>
              <select value={c.input} aria-label={`Atributo de ${d.name}`} onChange={(e) => setD(d.id, { curve: { ...c, input: e.target.value } })}>
                {opciones.map((k) => <option key={k} value={k}>{nombre(k)}</option>)}
              </select>
              <code className="lv-id" title="Nombre interno para las fórmulas">{d.id}</code>
              <div style={{ flex: 1 }} />
              <button className="mini" disabled={usos.length > 0} title={usos.length ? `La usan: ${usos.join(', ')}` : 'Quitar la curva'}
                onClick={() => upd({ derived: derived.filter((x) => x.id !== d.id) })}>quitar</button>
            </div>
            <div className="lv-curve">
              <div className="lv-points">
                <div className="lv-pt lv-pt-h"><span>{nombre(c.input)}</span><span>{d.name || 'Resultado'}</span><span /></div>
                {pts.map(([x, y], i) => (
                  <div key={i} className="lv-pt">
                    <input type="number" aria-label={`Punto ${i + 1}: ${nombre(c.input)}`} value={x}
                      onChange={(e) => setD(d.id, { curve: { ...c, points: pts.map((p, j) => (j === i ? [Number(e.target.value), p[1]] : p)) } })} />
                    <input type="number" step="any" aria-label={`Punto ${i + 1}: resultado`} value={y}
                      onChange={(e) => setD(d.id, { curve: { ...c, points: pts.map((p, j) => (j === i ? [p[0], Number(e.target.value)] : p)) } })} />
                    <button className="ev-x" aria-label={`Quitar el punto ${i + 1}`} disabled={pts.length <= 2}
                      onClick={() => setD(d.id, { curve: { ...c, points: pts.filter((_, j) => j !== i) } })}>×</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button className="mini" onClick={() => {
                    const last = pts[pts.length - 1] ?? [0, 0]
                    setD(d.id, { curve: { ...c, points: [...pts, [last[0] + 10, last[1]]] } })
                  }}>+ punto</button>
                  <button className="mini" onClick={() => setD(d.id, { curve: { ...c, points: cleanPoints(pts) } })}>ordenar</button>
                </div>
              </div>
              <CurveChart points={pts} />
            </div>
          </div>
        )
      })}
      <button className="mini" disabled={opciones.length === 0} title={opciones.length ? '' : 'Primero añade atributos al perfil'} onClick={() => {
        const ids = new Set([...derived.map((d) => d.id), ...t.stats.map((s) => s.id)])
        let id = 'curva'; let n = 2
        while (ids.has(id)) id = `curva${n++}`
        const input = opciones[0]
        const nueva = syncCurve(t, { id, name: `Bonus de ${nombre(input)}`, formula: '0', group: 'Atributos', curve: { input, points: [[1, 0], [40, 40], [99, 60]] } })
        upd({ derived: [nueva, ...derived] })
      }}>+ nueva curva</button>
      {chk.errors.map((e) => <Banner key={e} kind="err">{e}</Banner>)}
      {chk.warnings.map((e) => <Banner key={e} kind="warn">{e}</Banner>)}
      {curvas.length > 0 && (
        <p className="hint">Para que una curva afecte el resultado, úsala en una fórmula (pestaña Fórmulas), por ejemplo
          {' '}<code>{curvas[0].id} * (1 + hp_ / 100)</code>.</p>
      )}
    </>
  )
}

function CurveChart({ points }: { points: [number, number][] }) {
  const pts = cleanPoints(points)
  if (pts.length < 2) return <div className="lv-chart" />
  const W = 260, H = 140, P = 22
  const x0 = pts[0][0], x1 = pts[pts.length - 1][0]
  const ys = pts.map((p) => p[1])
  const y0 = Math.min(0, ...ys), y1 = Math.max(...ys) || 1
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P)
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P)
  const linea = Array.from({ length: 61 }, (_, i) => x0 + ((x1 - x0) * i) / 60).map((x) => `${sx(x)},${sy(evalCurve(pts, x))}`).join(' ')
  return (
    <svg className="lv-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de la curva">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} className="lv-ax" />
      <line x1={P} y1={P} x2={P} y2={H - P} className="lv-ax" />
      <polyline points={linea} className="lv-line" />
      {pts.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={3.2} className="lv-dot"><title>{`${x} → ${fmt(y, 2)}`}</title></circle>)}
      <text x={P} y={H - 6} className="lv-tx">{fmt(x0, 0)}</text>
      <text x={W - P} y={H - 6} className="lv-tx" textAnchor="end">{fmt(x1, 0)}</text>
      <text x={P + 4} y={P - 6} className="lv-tx">{fmt(y1, 2)}</text>
    </svg>
  )
}
