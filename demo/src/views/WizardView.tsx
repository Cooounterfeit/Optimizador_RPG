import { useEffect, useMemo, useState } from 'react'
import type { GameTemplate, Item } from '../core/types'
import { buildItems, parseTable, type ParsedTable } from '../store/tableImport'
import { assembleTemplate, autofillRecipe, inferTemplateFromTable, RECIPES, type Inferred } from '../store/infer'
import { validateTemplate } from '../core/validate'
import { Banner } from '../ui/components'
import { nf } from '../ui/format'

const EJEMPLO = [
  'Nombre\tRanura\tConjunto\tAtaque\tDefensa\tProb. Critico\tDano Critico',
  'Espada de hierro\tArma\tHierro\t45\t0\t3%\t0%',
  'Espada rúnica\tArma\tRuna\t62\t0\t9%\t14%',
  'Hacha pesada\tArma\tHierro\t78\t0\t1%\t0%',
  'Daga veloz\tArma\tRuna\t34\t0\t18%\t22%',
  'Coraza de cuero\tArmadura\tCuero\t0\t22\t2%\t0%',
  'Coraza de placas\tArmadura\tHierro\t0\t41\t0%\t0%',
  'Túnica arcana\tArmadura\tRuna\t8\t14\t11%\t18%',
  'Yelmo de hierro\tCasco\tHierro\t0\t18\t0%\t0%',
  'Capucha de cuero\tCasco\tCuero\t2\t9\t6%\t8%',
  'Diadema rúnica\tCasco\tRuna\t5\t6\t9%\t26%',
].join('\n')

export default function WizardView({
  onDone, takenIds,
}: {
  onDone: (template: GameTemplate, items: Item[]) => void
  takenIds: Set<string>
}) {
  const [name, setName] = useState('Mi juego')
  const [text, setText] = useState('')
  const [nameCol, setNameCol] = useState<number | undefined>()
  const [slotCol, setSlotCol] = useState<number | undefined>()
  const [setCol, setSetCol] = useState<number | undefined>()
  const [recipeId, setRecipeId] = useState(RECIPES[2].id)
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [profileName, setProfileName] = useState('Personaje base')
  const [profileBase, setProfileBase] = useState<Record<string, number>>({})

  const table: ParsedTable | null = useMemo(() => (text.trim() ? parseTable(text) : null), [text])
  const inferred: Inferred | null = useMemo(
    () => (table ? inferTemplateFromTable(table, { nameCol, slotCol, setCol }) : null),
    [table, nameCol, slotCol, setCol],
  )
  const recipe = RECIPES.find((r) => r.id === recipeId)!

  // Rellenar los huecos de la receta en cuanto se conocen las estadisticas.
  useEffect(() => {
    if (!inferred || inferred.stats.length === 0) return
    setPicks(autofillRecipe(recipe, inferred.stats))
  }, [inferred, recipeId])

  const listo = !!inferred && recipe.inputs.every((i) => i.optional || picks[i.key])

  const { template, items, report } = useMemo(() => {
    if (!inferred || !table || !listo) return { template: null, items: [] as Item[], report: null }
    let gameId = (name || 'juego').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'juego'
    let n = 2
    const bIdBase = gameId
    while (takenIds.has(gameId)) gameId = `${bIdBase}-${n++}`
    const t = assembleTemplate({ name, gameId, inferred, recipe, picks, profileName, profileBase })
    const built = buildItems(table, inferred.roles, t, `${gameId}-`)
    return { template: t, items: built.items, report: validateTemplate(t, built.items) }
  }, [inferred, table, listo, name, recipe, picks, profileName, profileBase, takenIds])

  return (
    <>
      <div className="card">
        <h2>1 · Como se llama tu juego</h2>
        <label className="field" style={{ maxWidth: 380, marginBottom: 0 }}>
          <span>Nombre</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>

      <div className="card">
        <h2>2 · Pega tus objetos</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Copia una tabla de una wiki o de una planilla y pegala aqui. <b>De ahi se deduce todo
          lo demas</b>: cada columna numerica pasa a ser una estadistica, los valores distintos
          de la columna de tipo pasan a ser las ranuras, y los de la columna de familia, los
          conjuntos. No tienes que declarar nada.
        </p>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
          placeholder={EJEMPLO}
          style={{
            width: '100%', minHeight: 150, background: '#070910', color: '#c6cddf',
            border: '1px solid var(--line)', borderRadius: 9, padding: 12,
            fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
          }}
        />
        <button className="mini" style={{ marginTop: 9 }} onClick={() => setText(EJEMPLO)}>
          usar una tabla de ejemplo
        </button>
      </div>

      {table && inferred && (
        <>
          <div className="card">
            <h2>3 · Esto es lo que entendi <span className="chip">revisa y corrige</span></h2>
            <div className="row2" style={{ maxWidth: 620, marginBottom: 12 }}>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Columna con el nombre</span>
                <select value={nameCol ?? ''} onChange={(e) => setNameCol(e.target.value === '' ? undefined : Number(e.target.value))}>
                  <option value="">(deducir sola)</option>
                  {table.headers.map((h, c) => <option key={c} value={c}>{h || `columna ${c + 1}`}</option>)}
                </select>
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Columna con la ranura</span>
                <select value={slotCol ?? ''} onChange={(e) => setSlotCol(e.target.value === '' ? undefined : Number(e.target.value))}>
                  <option value="">(deducir sola)</option>
                  {table.headers.map((h, c) => <option key={c} value={c}>{h || `columna ${c + 1}`}</option>)}
                </select>
              </label>
            </div>
            <label className="field" style={{ maxWidth: 300 }}>
              <span>Columna con el conjunto (opcional)</span>
              <select value={setCol ?? ''} onChange={(e) => setSetCol(e.target.value === '' ? undefined : Number(e.target.value))}>
                <option value="">(ninguna)</option>
                {table.headers.map((h, c) => <option key={c} value={c}>{h || `columna ${c + 1}`}</option>)}
              </select>
            </label>

            <div className="metrics" style={{ marginBottom: 12 }}>
              <div className="metric"><div className="k">Objetos</div><div className="v">{nf.format(table.rows.length)}</div></div>
              <div className="metric"><div className="k">Estadisticas</div><div className="v">{inferred.stats.length}</div></div>
              <div className="metric"><div className="k">Ranuras</div><div className="v">{inferred.slots.length}</div></div>
              <div className="metric"><div className="k">Conjuntos</div><div className="v">{inferred.sets.length}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {inferred.slots.map((s) => <span className="chip g" key={s.id}>{s.name}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {inferred.stats.map((s) => (
                <span className="chip" key={s.id}>{s.name}{s.unit === 'percent' ? ' (%)' : ''}</span>
              ))}
            </div>
            {inferred.notes.map((nt, i) => <div key={i} style={{ marginTop: 10 }}><Banner kind="warn">{nt}</Banner></div>)}
          </div>

          <div className="card">
            <h2>4 · Que quieres maximizar</h2>
            <p className="hint" style={{ marginTop: 0 }}>
              Elige una forma y rellena los huecos con tus estadisticas. <b>No hay que escribir
              matematicas</b>: la formula se arma sola y puedes verla abajo.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 13 }}>
              {RECIPES.map((r) => (
                <button key={r.id} className={`mini${r.id === recipeId ? ' on' : ''}`}
                  onClick={() => setRecipeId(r.id)}>{r.name}</button>
              ))}
            </div>
            <p className="hint">{recipe.summary}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
              {recipe.inputs.map((inp) => (
                <label className="field" key={inp.key} style={{ marginBottom: 0 }}>
                  <span>{inp.label}{inp.optional ? ' (opcional)' : ''}</span>
                  <select value={picks[inp.key] ?? ''}
                    onChange={(e) => setPicks({ ...picks, [inp.key]: e.target.value })}>
                    {inp.optional && <option value="">— ninguna —</option>}
                    {inferred.stats.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.unit === 'percent' ? ' (%)' : ''}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: 11, color: 'var(--dim)', display: 'block', marginTop: 4 }}>{inp.help}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>5 · El personaje sin equipo</h2>
            <p className="hint" style={{ marginTop: 0 }}>
              Con que valores parte antes de equiparse nada. Deja en cero lo que no aplique.
            </p>
            <label className="field" style={{ maxWidth: 300 }}>
              <span>Nombre del perfil</span>
              <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 9 }}>
              {inferred.stats.map((s) => (
                <label className="field" key={s.id} style={{ marginBottom: 0 }}>
                  <span>{s.name}</span>
                  <input type="number" value={profileBase[s.id] ?? 0}
                    onChange={(e) => setProfileBase({ ...profileBase, [s.id]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>6 · Listo</h2>
            {report && (report.ok
              ? <Banner kind="ok">
                  Todo correcto: {nf.format(items.length)} objetos, {inferred.slots.length} ranuras y
                  una formula valida. El validador comprobo ademas que el objetivo sea monotono, que
                  es lo que permite demostrar el optimo.
                </Banner>
              : <Banner kind="err">
                  {report.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' · ')}
                </Banner>)}
            <details className="tpl">
              <summary>Ver la formula que se genero (por curiosidad, no hace falta tocarla)</summary>
              <pre className="code wrap">
                {template
                  ? `${template.objectives[0].id} = ${template.objectives[0].formula}\n\n` +
                    template.derived.map((d) => `${d.id} = ${d.formula}`).join('\n')
                  : ''}
              </pre>
            </details>
            <div style={{ marginTop: 13 }}>
              <button className="primary" style={{ width: 'auto', padding: '11px 26px' }}
                disabled={!template || !report?.ok || items.length === 0}
                onClick={() => template && onDone(template, items)}>
                Crear el juego
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
