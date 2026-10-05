import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { Constraint, GameTemplate, Item, SkillSelection, SolveStats } from '../core/types'
import { pointsSpent, sanitizeSelection } from '../core/skills'
import { loadSelection, saveSelection } from '../store/skillSelection'
import SkillTreePanel, { SkillSummary } from './SkillTreePanel'
import { useNavigate } from 'react-router-dom'
import { saveEquipment } from '../store/equipment'
import { useOptimizer } from '../ui/useOptimizer'
import { Banner, Icon, Metric } from '../ui/components'
import { dur, fmt, fmtBig, nf, secs } from '../ui/format'
import { characterIcon, itemIcon, itemRarity } from '../adapters/genshinAssets'
import { useItemImages } from '../ui/useItemImages'
import { useAdvanced } from '../ui/useAdvanced'
/**
 * React Flow pesa mas que todo el motor junto. Se carga solo cuando alguien
 * abre de verdad el diagrama, para que el catalogo de juegos —que es la primera
 * pantalla— no pague por una libreria que quiza no llegue a usarse.
 */
const FormulaGraph = lazy(() => import('./FormulaGraph'))

export default function OptimizerView({
  gameId, template, items,
}: {
  gameId: string
  template: GameTemplate
  items: Item[]
}) {
  const { imageOf } = useItemImages(gameId)
  const navigate = useNavigate()
  const [avanzado, setAvanzado] = useAdvanced()
  const [profileId, setProfileId] = useState(template.baseProfiles[0].id)
  const [objectiveId, setObjectiveId] = useState(
    template.objectives.find((o) => o.kind === 'nonlinear')?.id ?? template.objectives[0].id,
  )
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [topN, setTopN] = useState(3)
  /** El mismo contenido en dos formas: el grafo explica, el codigo se copia. */
  const [forma, setForma] = useState<'grafo' | 'codigo'>('grafo')
  /**
   * Limite de tiempo, en ms. `0` = sin limite, que es el valor por defecto.
   *
   * Antes habia un tope fijo de 30 s y el motor se paraba solo. Es la decision
   * equivocada: quien sabe si merece la pena esperar cuatro horas por un optimo
   * demostrado es el usuario, no el programa. Ahora el motor corre hasta que
   * termina o hasta que lo paran, y detenerlo NO cuesta el trabajo hecho.
   */
  const [limite, setLimite] = useState(0)
  const { phase, progress, result, error, run, cancel } = useOptimizer()

  // Habilidades elegidas: se guardan por juego y se sanean al cargar, por si el
  // autor cambio el arbol desde la ultima vez (un nodo borrado, un requisito nuevo).
  const tieneArbol = (template.skillTrees ?? []).some((t) => t.nodes.length > 0)
  const [skills, setSkills] = useState<SkillSelection>(() => sanitizeSelection(template, loadSelection(gameId)))
  useEffect(() => { saveSelection(gameId, skills) }, [gameId, skills])
  const [verArbol, setVerArbol] = useState(false)
  /** Habilidades con las que se calculo el resultado visible (el diagrama las necesita). */
  const [skillsDelResultado, setSkillsDelResultado] = useState<SkillSelection>({})

  const objective = template.objectives.find((o) => o.id === objectiveId) ?? template.objectives[0]
  const statName = (id: string) => template.stats.find((s) => s.id === id)?.name ?? id
  const statUnit = (id: string) => (template.stats.find((s) => s.id === id)?.unit === 'percent' ? '%' : '')
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const huTag =
    constraints.length > 0 ? 'HU04 · poda por restricciones'
    : objective.kind === 'nonlinear' ? 'HU03 · formula no lineal'
    : 'HU01 · variable lineal fija'

  const profile = template.baseProfiles.find((p) => p.id === profileId)
  /** La build ganadora, si ya hay resultado: da los numeros que anota el grafo. */
  const mejor = result?.builds?.[0]
  const profileAsset = profile?.assetKey as string | undefined

  const nItems = items.length
  const ref = result?.builds?.[0]
  const decs = objective.decimals ?? 1
  const correr = () => {
    setSkillsDelResultado(skills)
    run({ template, items, profileId, objectiveId, constraints, topN, skills }, limite === 0 ? undefined : limite)
  }
  const opcionesActivas = constraints.length + (topN !== 3 ? 1 : 0) + (limite !== 0 ? 1 : 0)

  return (
    <div className="layout opt">
      <div className="opt-side">
        {/* ------------------------------------------------ 1. que mejorar */}
        <div className="card">
          <h2>Tu personaje</h2>
          <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 14 }}>
            <Icon
              src={characterIcon(gameId, profileAsset ?? profile?.id ?? '')}
              alt={profile?.name ?? ''} rarity={5} size={48}
            />
            {template.baseProfiles.length > 1 ? (
              <label className="field" style={{ marginBottom: 0, flex: 1 }}>
                <span className="sr-only">Personaje</span>
                <select value={profileId} onChange={(e) => setProfileId(e.target.value)} aria-label="Personaje">
                  {template.baseProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            ) : <b style={{ fontSize: 14 }}>{profile?.name}</b>}
          </div>

          <h2 style={{ marginTop: 4 }}>¿Qué quieres mejorar?</h2>
          <div className="obj-list" role="radiogroup" aria-label="Objetivo a maximizar">
            {template.objectives.map((o) => (
              <button key={o.id} role="radio" aria-checked={o.id === objectiveId}
                className={`obj-opt${o.id === objectiveId ? ' on' : ''}`} onClick={() => setObjectiveId(o.id)}>
                <b>{o.name}</b>
                {o.description && <span>{avanzado ? o.description : sinJerga(o.description)}</span>}
              </button>
            ))}
          </div>

          <div className="opt-run">
            {phase === 'running'
              ? <>
                  <button className="primary" onClick={cancel}>Detener y quedarme con la mejor</button>
                  <p className="hint" style={{ margin: '8px 0 0' }}>
                    Buscando… llevas <b>{dur(progress?.elapsedMs ?? 0)}</b>. Puedes cambiar de pestaña: el cálculo sigue.
                  </p>
                </>
              : <>
                  <button className="primary" disabled={nItems === 0} onClick={correr}>
                    {phase === 'done' ? 'Volver a optimizar' : 'Optimizar'}
                  </button>
                  <p className="hint" style={{ margin: '8px 0 0' }}>
                    {nItems === 0
                      ? <>No tienes objetos todavía. <button className="link" onClick={() => navigate('/inventario')}>Cargar mis objetos</button></>
                      : <>Probará todas las combinaciones de tus <b>{nf.format(nItems)} objetos</b>. <button className="link" onClick={() => navigate('/inventario')}>Ver inventario</button></>}
                  </p>
                </>}
          </div>
        </div>

        {/* ------------------------------------------------ 2. habilidades */}
        {tieneArbol && (
          <div className="card">
            <h2>
              Habilidades
              <span className="chip n">
                {(template.skillTrees ?? []).reduce((a, t) => a + pointsSpent(t, skills), 0)} puntos
              </span>
            </h2>
            <p style={{ margin: '0 0 10px' }}><SkillSummary template={template} selection={skills} /></p>
            <button className="mini" onClick={() => setVerArbol(true)}>Elegir habilidades</button>
            <p className="hint" style={{ marginBottom: 0 }}>
              El optimizador busca el mejor equipo <b>con</b> las habilidades que elijas.
            </p>
          </div>
        )}

        {/* ------------------------------------------------ 3. opciones */}
        <details className="card opt-more" open={opcionesActivas > 0 || undefined}>
          <summary>
            Opciones
            {opcionesActivas > 0 && <span className="chip n">{opcionesActivas} activa(s)</span>}
          </summary>

          <h3>Exigir un mínimo o un máximo</h3>
          {constraints.length === 0 && (
            <p className="hint" style={{ marginTop: 0 }}>
              Por ejemplo: "al menos 30% de crítico" o "no pasar de 58 de carga".
            </p>
          )}
          {constraints.map((c, i) => {
            const esMax = c.max !== undefined
            const upd = (patch: Partial<Constraint>) =>
              setConstraints(constraints.map((x, j) => (j === i ? { ...x, ...patch } : x)))
            return (
              <div className="cons-row" key={i}>
                <select value={c.statId} onChange={(e) => upd({ statId: e.target.value })} aria-label="Estadística">
                  {template.constrainableStats.map((sid) => <option key={sid} value={sid}>{statName(sid)}</option>)}
                </select>
                <select value={esMax ? 'max' : 'min'} aria-label="Mínimo o máximo"
                  onChange={(e) => {
                    const v = c.max ?? c.min ?? 0
                    upd(e.target.value === 'max' ? { min: undefined, max: v } : { max: undefined, min: v })
                  }}>
                  <option value="min">mínimo</option>
                  <option value="max">máximo</option>
                </select>
                <input type="number" value={esMax ? c.max : c.min} aria-label="Valor"
                  onChange={(e) => upd(esMax ? { max: Number(e.target.value) } : { min: Number(e.target.value) })} />
                <button onClick={() => setConstraints(constraints.filter((_, j) => j !== i))} title="quitar" aria-label="Quitar">×</button>
              </div>
            )
          })}
          {template.constrainableStats.length > 0 && (
            <button className="mini" style={{ marginTop: 4 }}
              onClick={() => setConstraints([...constraints, { statId: template.constrainableStats[0], min: 0 }])}>
              + añadir
            </button>
          )}
          {(template.budgets ?? []).length > 0 && (
            <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
              Este juego ya limita:{' '}
              {(template.budgets ?? []).map((b) => <b key={b.statId}>{b.name ?? statName(b.statId)} ≤ {b.max}</b>)}.
            </p>
          )}

          <h3>Resultados</h3>
          <label className="field">
            <span>Cuántas builds mostrar</span>
            <input type="number" min={1} max={10} value={topN}
              onChange={(e) => setTopN(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Tiempo máximo de búsqueda</span>
            <select value={limite} onChange={(e) => setLimite(Number(e.target.value))}>
              <option value={0}>sin límite (la detienes tú)</option>
              <option value={30_000}>30 segundos</option>
              <option value={120_000}>2 minutos</option>
              <option value={600_000}>10 minutos</option>
              <option value={3_600_000}>1 hora</option>
              <option value={14_400_000}>4 horas</option>
            </select>
          </label>
        </details>
      </div>

      <div className="opt-main">
        <div className="opt-toolbar">
          <label className="switch" title="Métricas de poda, historias de usuario y diagrama de fórmulas">
            <input type="checkbox" checked={avanzado} onChange={(e) => setAvanzado(e.target.checked)} />
            <span>Ver detalles del motor</span>
          </label>
        </div>

        {/* ------------------------------------------------ estado */}
        {phase === 'idle' && (
          <div className="card opt-empty">
            <ol className="steps">
              <li className="on"><b>Elige qué mejorar</b><span>{objective.name}</span></li>
              <li><b>Pulsa Optimizar</b><span>Prueba todas las combinaciones por ti</span></li>
              <li><b>Compara y equípate</b><span>Las mejores builds aparecen aquí</span></li>
            </ol>
          </div>
        )}

        {phase === 'running' && (
          <div className="card">
            <h2>Buscando la mejor build…</h2>
            <div className="bar"><i /></div>
            <p className="hint" style={{ marginBottom: 0 }}>
              Mejor hasta ahora: <b>{fmt(progress?.bestScore ?? 0, decs)}</b> · {fmt(progress?.evaluated ?? 0)} combinaciones revisadas
            </p>
            {avanzado && (
              <div className="metrics" style={{ marginTop: 14 }}>
                <Metric k="Combinaciones evaluadas" v={fmt(progress?.evaluated ?? 0)} />
                <Metric k="Ramas podadas" v={fmt(progress?.pruned ?? 0)} />
                <Metric k="Tiempo" v={dur(progress?.elapsedMs ?? 0)} />
                <Metric k="Mejor hasta ahora" v={fmt(progress?.bestScore ?? 0, 1)} tone="accent" />
              </div>
            )}
          </div>
        )}

        {phase === 'error' && <div className="card"><Banner kind="err">{error}</Banner></div>}
        {phase === 'cancelled' && <div className="card"><Banner kind="warn">Búsqueda cancelada.</Banner></div>}

        {phase === 'done' && result?.builds.length === 0 && (
          <div className="card">
            <Banner kind="warn">
              Ninguna combinación cumple lo que pediste en Opciones. Baja algún mínimo y vuelve a intentarlo.
            </Banner>
          </div>
        )}

        {phase === 'done' && result && ref && (
          <div className="card">
            <h2>Tus mejores builds</h2>
            <Banner kind={result.stats.provenOptimal ? 'ok' : 'warn'}>
              {result.stats.provenOptimal
                ? <>Es la <b>mejor combinación posible</b> con tus {nf.format(nItems)} objetos.</>
                : result.stats.stoppedBy === 'usuario'
                  ? <>Búsqueda detenida: es la mejor que encontró <b>hasta ese momento</b>.</>
                  : <>Se acabó el tiempo: es la mejor encontrada, <b>puede existir una mejor</b>.</>}
            </Banner>

            {result.builds.map((b, i) => {
              const dif = b.score - ref.score
              const empate = i > 0 && Math.abs(dif) <= 1e-9 * Math.max(1, Math.abs(ref.score))
              return (
                <div className={`build${i === 0 ? ' best' : ''}`} key={i}>
                  <div className="head">
                    <span className="rank">{i === 0 ? 'Mejor' : `#${i + 1}`}</span>
                    <span className="score">{fmt(b.score, decs)}</span>
                    <span className="unit">{objective.name}</span>
                    {i > 0 && (
                      <span className={`delta ${empate ? '' : 'down'}`}>
                        {empate ? 'empata con la mejor' : `${fmt(dif, decs)} respecto a la mejor`}
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className={`mini${i === 0 ? ' on' : ''}`} title="Ponerte esta build en la hoja de personaje" onClick={() => {
                      saveEquipment(gameId, Object.fromEntries(template.slots.map((s, si) => [s.id, b.itemIds[si]]).filter(([, id]) => id)))
                      navigate('/personaje')
                    }}>Equipar en el personaje</button>
                  </div>

                  {i > 0 && (
                    <p className="hint" style={{ margin: '-4px 0 10px' }}>
                      Cambia {template.slots.filter((_, si) => b.itemIds[si] !== ref.itemIds[si]).length} pieza(s) respecto a la mejor; están marcadas.
                    </p>
                  )}

                  <div className="pieces">
                    {template.slots.map((slot, si) => {
                      const it = itemById.get(b.itemIds[si])
                      const cambia = i > 0 && b.itemIds[si] !== ref.itemIds[si]
                      const setName = it?.setId
                        ? template.sets.find((s) => s.id === it.setId)?.name ?? it.setId : ''
                      return (
                        <div className={`piece${cambia ? ' changed' : ''}`} key={slot.id}>
                          <Icon
                            src={it ? imageOf(it) ?? itemIcon(gameId, it) : null}
                            alt={setName || slot.name}
                            rarity={it ? itemRarity(it) : 5} size={44}
                          />
                          <div className="meta">
                            <div className="sl">{slot.name}{cambia && <em> · distinta</em>}</div>
                            <div className="nm">{it?.name ?? '—'}</div>
                            {setName && <div className="st">{setName}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {b.activeSets.length > 0 && (
                    <div className="chips">
                      {b.activeSets.map((s) => (
                        <span className="chip" key={s.setId}>{s.name} · {s.pieces} piezas</span>
                      ))}
                      {avanzado && <span className="chip n">HU02 · sinergias detectadas</span>}
                    </div>
                  )}

                  <div className="statgrid">
                    {template.stats
                      .filter((s) => Math.abs(b.finalStats[s.id] ?? 0) > 0.05)
                      .map((s) => {
                        const d = i > 0 ? (b.finalStats[s.id] ?? 0) - (ref.finalStats[s.id] ?? 0) : 0
                        return (
                          <div key={s.id}>
                            <span>{s.name}</span>
                            <span>
                              {fmt(b.finalStats[s.id], 1)}{statUnit(s.id)}
                              {Math.abs(d) > 0.05 && <small className={d > 0 ? 'up' : 'down'}> {d > 0 ? '+' : ''}{fmt(d, 1)}</small>}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ------------------------------------------------ modo avanzado */}
        {avanzado && phase === 'done' && result && (
          <div className="card">
            <h2>Estado del motor <span className="chip n">{huTag}</span></h2>
            <Metrics stats={result.stats} template={template} />
          </div>
        )}

        {avanzado && (
        <div className="card">
          <h2>La plantilla del juego</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Nada de esto esta escrito en el codigo del motor: sale del JSON de <b>{template.name}</b>.
          </p>
          <details className="tpl" open>
            <summary>Como se calcula {objective.name}</summary>

            <div className="segmented" role="tablist" aria-label="Forma de ver las formulas">
              <button role="tab" aria-selected={forma === 'grafo'}
                className={forma === 'grafo' ? 'on' : ''} onClick={() => setForma('grafo')}>
                Diagrama
              </button>
              <button role="tab" aria-selected={forma === 'codigo'}
                className={forma === 'codigo' ? 'on' : ''} onClick={() => setForma('codigo')}>
                Codigo
              </button>
              <div style={{ flex: 1 }} />
              {mejor && <span className="chip n">con los numeros de la mejor build</span>}
            </div>

            {forma === 'grafo' ? (
              <>
                <p className="hint" style={{ marginTop: 0 }}>
                  Se lee de izquierda a derecha: a la izquierda lo que aportan las piezas y el
                  personaje, a la derecha el numero que se maximiza.
                  {mejor
                    ? ' Los valores son los de la build ganadora, calculados con el mismo compilador que usa el motor.'
                    : ' Optimiza y cada nodo mostrara ademas su valor real.'}
                </p>
                <Suspense fallback={<div className="empty">cargando el diagrama…</div>}>
                  <FormulaGraph
                    key={objective.id}
                    template={template}
                    objective={objective}
                    finalStats={mejor?.finalStats}
                    profileId={profileId}
                    skills={skillsDelResultado}
                  />
                </Suspense>
              </>
            ) : (
              <pre className="code wrap">
                <span className="c">{'// objetivo'}</span>{'\n'}
                <span className="f">{objective.id}</span>{` = ${objective.formula}\n\n`}
                <span className="c">{'// valores intermedios'}</span>{'\n'}
                {template.derived.map((d) => `${d.id} = ${d.formula}`).join('\n')}
              </pre>
            )}
          </details>
          <details className="tpl">
            <summary>Ranuras y conjuntos</summary>
            <pre className="code wrap">
              {`ranuras: ${template.slots.map((s) => s.id).join(', ')}\nconjuntos: ${template.sets.length}\n\n`}
              {template.sets.slice(0, 5).map((s) =>
                `${s.name}\n${s.tiers.map((t) => `  ${t.pieces}pz → ${JSON.stringify(t.effects)}`).join('\n')}`).join('\n')}
              {template.sets.length > 5 ? `\n… y ${template.sets.length - 5} conjuntos mas` : ''}
            </pre>
          </details>
          {template.notes && (
            <details className="tpl">
              <summary>Notas y simplificaciones de la plantilla</summary>
              <pre className="code wrap">{template.notes}</pre>
            </details>
          )}
        </div>
        )}
      </div>
      {verArbol && (
        <div className="modal-bg" onClick={() => setVerArbol(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>
              Arbol de habilidades
              <div style={{ flex: 1 }} />
              <button className="mini" onClick={() => setVerArbol(false)}>listo</button>
            </h2>
            <p style={{ margin: '0 0 12px' }}><SkillSummary template={template} selection={skills} /></p>
            <SkillTreePanel template={template} selection={skills} onChange={setSkills} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Las plantillas de ejemplo nacieron como demo de la tesis y algunas
 * descripciones empiezan con la historia de usuario ("HU03 - ..."). Fuera del
 * modo avanzado eso es ruido para el jugador.
 */
function sinJerga(texto: string): string {
  return texto.replace(/^\s*HU\d+\s*[-·:—]\s*/i, '')
}

function Metrics({ stats: st, template }: { stats: SolveStats; template: GameTemplate }) {
  const prunedPct = st.totalCombinations > 0 ? 100 * (1 - st.evaluated / st.totalCombinations) : 0
  const slotName = (id: string) => template.slots.find((s) => s.id === id)?.name ?? id
  return (
    <>
      {st.provenOptimal ? (
        <Banner kind="ok">
          <b>Optimo global demostrado.</b> La poda es exacta: ninguna de las combinaciones
          descartadas podia superar a esta.
        </Banner>
      ) : st.mode === 'heuristico' ? (
        <Banner kind="info">
          <b>Modo heuristico.</b> Este objetivo no es monotono — sube y luego baja — asi que la
          cota superior deja de ser valida y podar podria descartar la mejor build. El motor
          desactiva la poda por cota y busca con reinicios y ascenso de colina. El resultado es
          bueno, pero <b>no esta demostrado que sea el optimo</b>.
        </Banner>
      ) : st.stoppedBy === 'usuario' ? (
        <Banner kind="info">
          <b>Busqueda detenida.</b> Esta es la mejor build encontrada en {dur(st.elapsedMs)}, y
          esta calculada igual de bien que cualquier otra. Lo unico que falta es la
          <b> demostracion</b> de que no habia otra mejor — para eso habria que dejarla terminar.
        </Banner>
      ) : (
        <Banner kind="warn">
          <b>Se alcanzo el limite de tiempo.</b> Esta es la mejor build encontrada, pero no se
          alcanzo a demostrar que sea la optima. Puedes subir el limite —o quitarlo— en
          Configuracion, o restringir la busqueda: <b>restringir la acelera</b>, porque descarta
          ramas enteras antes de calcularlas.
        </Banner>
      )}

      {st.monotonicWarning && <Banner kind="warn">{st.monotonicWarning}</Banner>}

      <div className="metrics">
        <Metric k="Espacio de busqueda" v={fmtBig(st.totalCombinations)} s="combinaciones posibles" />
        <Metric k="Evaluadas de verdad" v={fmt(st.evaluated)} s={`${prunedPct.toFixed(4)} % podado`} tone="good" />
        <Metric k="Ramas cortadas" v={fmt(st.pruned)} s="por cota o restriccion" />
        <Metric k="Tiempo" v={st.elapsedMs < 60_000 ? secs(st.elapsedMs) : dur(st.elapsedMs)} />
        <Metric k="Cota" v={st.mode === 'heuristico' ? 'heuristico' : st.bound === 'intervalos' ? 'intervalos' : 'monotona'}
          s={st.mode === 'heuristico' ? 'objetivo no monotono' : st.bound === 'intervalos' ? 'objetivo no monotono, poda exacta' : 'poda demostrable'} />
        <Metric k="Objetos descartados" v={fmt(st.dominated + st.boundFiltered)} s="por dominancia y cota" />
        {st.requirementFiltered > 0 && (
          <Metric k="No equipables" v={fmt(st.requirementFiltered)} s="requisitos no cumplidos" />
        )}
        <Metric k="Dimensiones activas" v={String(st.relevantStats.length)}
          s={st.mergedDimensions > 0 ? `${st.mergedDimensions} eje(s) fusionado(s)` : 'detectadas solas'} />
      </div>

      <p className="hint" style={{ marginTop: 12, marginBottom: 8 }}>
        El motor dedujo por si solo que solo importan <b>{st.relevantStats.join(', ')}</b>.
        El resto de estadisticas no afecta a este objetivo y se elimino del problema.
      </p>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {st.candidatesPerSlot.map((c) => (
          <span className="chip g" key={c.slotId}>
            {slotName(c.slotId)}: {nf.format(c.before)} → {nf.format(c.after)}
          </span>
        ))}
      </div>
    </>
  )
}
