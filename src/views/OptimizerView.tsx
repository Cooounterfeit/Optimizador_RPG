import { Suspense, lazy, useMemo, useState } from 'react'
import type { Constraint, GameTemplate, Item, SolveStats } from '../core/types'
import { useOptimizer } from '../ui/useOptimizer'
import { Banner, Empty, Icon, Metric } from '../ui/components'
import { fmt, fmtBig, nf, secs } from '../ui/format'
import { characterIcon, itemIcon, itemRarity } from '../adapters/genshinAssets'
/**
 * React Flow pesa mas que todo el motor junto. Se carga solo cuando alguien
 * abre de verdad el diagrama, para que el catalogo de juegos —que es la primera
 * pantalla— no pague por una libreria que quiza no llegue a usarse.
 */
const FormulaGraph = lazy(() => import('./FormulaGraph'))

export default function OptimizerView({
  gameId, template, items, inventoryPanel,
}: {
  gameId: string
  template: GameTemplate
  items: Item[]
  inventoryPanel: React.ReactNode
}) {
  const [profileId, setProfileId] = useState(template.baseProfiles[0].id)
  const [objectiveId, setObjectiveId] = useState(
    template.objectives.find((o) => o.kind === 'nonlinear')?.id ?? template.objectives[0].id,
  )
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [topN, setTopN] = useState(3)
  /** El mismo contenido en dos formas: el grafo explica, el codigo se copia. */
  const [forma, setForma] = useState<'grafo' | 'codigo'>('grafo')
  const { phase, progress, result, error, run, cancel } = useOptimizer()

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

  return (
    <div className="layout">
      <div>
        {inventoryPanel}

        <div className="card">
          <h2>Configuracion</h2>
          <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 13 }}>
            <Icon
              src={characterIcon(gameId, profileAsset ?? profile?.id ?? '')}
              alt={profile?.name ?? ''} rarity={5} size={54}
            />
            <label className="field" style={{ marginBottom: 0, flex: 1 }}>
              <span>Personaje / perfil base</span>
              <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                {template.baseProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Objetivo a maximizar</span>
            <select value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
              {template.objectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.kind === 'nonlinear' ? '· no lineal' : '· lineal'}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{objective.description}</p>

          <label className="field" style={{ marginBottom: 0 }}>
            <span>Cuantas builds devolver</span>
            <input type="number" min={1} max={10} value={topN}
              onChange={(e) => setTopN(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
          </label>
        </div>

        <div className="card">
          <h2>Restricciones <span className="chip n">HU04</span></h2>
          {constraints.length === 0 && (
            <p className="hint" style={{ marginTop: 0 }}>
              Exige un minimo y observa el efecto: cuanto mas dura la restriccion,
              <b> mas rapido</b> termina la busqueda. Ramas enteras se descartan antes de calcularse.
            </p>
          )}
          {constraints.map((c, i) => {
            const esMax = c.max !== undefined
            const upd = (patch: Partial<Constraint>) =>
              setConstraints(constraints.map((x, j) => (j === i ? { ...x, ...patch } : x)))
            return (
              <div className="cons-row" key={i}>
                <select value={c.statId} onChange={(e) => upd({ statId: e.target.value })}>
                  {template.constrainableStats.map((sid) => <option key={sid} value={sid}>{statName(sid)}</option>)}
                </select>
                <select
                  value={esMax ? 'max' : 'min'}
                  onChange={(e) => {
                    const v = c.max ?? c.min ?? 0
                    upd(e.target.value === 'max' ? { min: undefined, max: v } : { max: undefined, min: v })
                  }}
                >
                  <option value="min">minimo</option>
                  <option value="max">maximo</option>
                </select>
                <input type="number" value={esMax ? c.max : c.min}
                  onChange={(e) => upd(esMax ? { max: Number(e.target.value) } : { min: Number(e.target.value) })} />
                <button onClick={() => setConstraints(constraints.filter((_, j) => j !== i))} title="quitar">×</button>
              </div>
            )
          })}
          <button className="mini" style={{ marginTop: 7 }}
            onClick={() => setConstraints([...constraints, { statId: template.constrainableStats[0], min: 0 }])}>
            + anadir restriccion
          </button>
          {(template.budgets ?? []).length > 0 && (
            <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
              Esta plantilla trae un presupuesto propio:{' '}
              {(template.budgets ?? []).map((b) => (
                <b key={b.statId}>{b.name ?? statName(b.statId)} ≤ {b.max}</b>
              ))}. Un maximo invierte la logica: ahi <b>menos es mejor</b>, y el filtro de
              dominancia lo tiene en cuenta.
            </p>
          )}
        </div>

        <div className="card">
          {phase === 'running'
            ? <button className="ghost" onClick={cancel}>Cancelar busqueda</button>
            : <button className="primary" disabled={items.length === 0} onClick={() =>
                run({ template, items, profileId, objectiveId, constraints, topN }, 30_000)}>
                Optimizar
              </button>}
        </div>
      </div>

      <div>
        <div className="card">
          <h2>Estado del motor <span className="chip n">{huTag}</span></h2>

          {phase === 'idle' && (
            <Empty>
              Elige un objetivo y pulsa <b>Optimizar</b>.<br />
              El calculo corre en un Web Worker: la interfaz sigue respondiendo mientras tanto.
            </Empty>
          )}

          {phase === 'running' && (
            <>
              <div className="bar"><i /></div>
              <div className="metrics" style={{ marginTop: 14 }}>
                <Metric k="Combinaciones evaluadas" v={fmt(progress?.evaluated ?? 0)} />
                <Metric k="Ramas podadas" v={fmt(progress?.pruned ?? 0)} />
                <Metric k="Tiempo" v={secs(progress?.elapsedMs ?? 0)} />
                <Metric k="Mejor hasta ahora" v={fmt(progress?.bestScore ?? 0, 1)} tone="accent" />
              </div>
            </>
          )}

          {phase === 'error' && <Banner kind="err">{error}</Banner>}
          {phase === 'cancelled' && <Banner kind="warn">Busqueda cancelada.</Banner>}
          {phase === 'done' && result && <Metrics stats={result.stats} template={template} />}
        </div>

        {phase === 'done' && result?.builds.length === 0 && (
          <div className="card">
            <Banner kind="warn">
              Ninguna combinacion cumple las restricciones. Baja algun minimo y vuelve a intentarlo.
            </Banner>
          </div>
        )}

        {phase === 'done' && result && result.builds.length > 0 && (
          <div className="card">
            <h2>Mejores builds</h2>
            {result.builds.map((b, i) => (
              <div className="build" key={i}>
                <div className="head">
                  <span className="rank">#{i + 1}</span>
                  <span className="score">{fmt(b.score, objective.decimals ?? 1)}</span>
                  <span className="unit">{objective.name}</span>
                </div>

                <div className="pieces">
                  {template.slots.map((slot, si) => {
                    const it = itemById.get(b.itemIds[si])
                    const setName = it?.setId
                      ? template.sets.find((s) => s.id === it.setId)?.name ?? it.setId : ''
                    return (
                      <div className="piece" key={slot.id}>
                        <Icon
                          src={it ? itemIcon(gameId, it) : null}
                          alt={setName || slot.name}
                          rarity={it ? itemRarity(it) : 5} size={44}
                        />
                        <div className="meta">
                          <div className="sl">{slot.name}</div>
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
                    <span className="chip n">HU02 · sinergias detectadas</span>
                  </div>
                )}

                <div className="statgrid">
                  {template.stats
                    .filter((s) => Math.abs(b.finalStats[s.id] ?? 0) > 0.05)
                    .map((s) => (
                      <div key={s.id}>
                        <span>{s.name}</span>
                        <span>{fmt(b.finalStats[s.id], 1)}{statUnit(s.id)}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
      </div>
    </div>
  )
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
      ) : (
        <Banner kind="warn">
          <b>Se agoto el tiempo de busqueda.</b> Esta es la mejor build encontrada, pero no se
          alcanzo a demostrar que sea la optima. Sube el nivel minimo o anade una restriccion.
        </Banner>
      )}

      <div className="metrics">
        <Metric k="Espacio de busqueda" v={fmtBig(st.totalCombinations)} s="combinaciones posibles" />
        <Metric k="Evaluadas de verdad" v={fmt(st.evaluated)} s={`${prunedPct.toFixed(4)} % podado`} tone="good" />
        <Metric k="Ramas cortadas" v={fmt(st.pruned)} s="por cota o restriccion" />
        <Metric k="Tiempo" v={secs(st.elapsedMs)} />
        <Metric k="Modo" v={st.mode === 'exacto' ? 'exacto' : 'heuristico'}
          s={st.mode === 'exacto' ? 'poda demostrable' : 'objetivo no monotono'} />
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
