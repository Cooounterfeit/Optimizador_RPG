import { useEffect, useMemo, useState } from 'react'
import type { GameTemplate, Item } from '../core/types'
import { validateTemplate } from '../core/validate'
import {
  deleteUserGame, downloadJson, emptyTemplate, freeId, listUserGames, makePackage,
  saveUserGame, slugify, type UserGame,
} from '../store/userGames'
import { describeDetected, detectJsonFile } from '../store/detectFile'
import type { ExampleInfo } from '../store/examples'
import {
  buildItems, guessRoles, parseTable, type ColumnRole, type ParsedTable,
} from '../store/tableImport'
import { Banner } from '../ui/components'
import { nf } from '../ui/format'
import WizardView from './WizardView'
import GameEditor from './GameEditor'

interface Forkable { id: string; template: GameTemplate; items: Item[] }

export default function AddGameView({
  forkables, examples, onLoadExample, onChanged, onPlay, navTick,
}: {
  /** Juegos que ya tiene el usuario, para partir de uno de ellos. */
  forkables: Forkable[]
  examples: ExampleInfo[]
  onLoadExample: (info: ExampleInfo) => void
  onChanged: () => void
  onPlay: (id: string) => void
  /** Cambia cada vez que se pulsa la pestana: sirve para volver a la lista. */
  navTick: number
}) {
  const [mine, setMine] = useState<UserGame[]>(() => listUserGames())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [json, setJson] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [tableText, setTableText] = useState('')
  const [roles, setRoles] = useState<ColumnRole[]>([])
  const [table, setTable] = useState<ParsedTable | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [modo, setModo] = useState<'guiado' | 'json'>('guiado')
  const [pantalla, setPantalla] = useState<'lista' | 'crear' | 'editar'>('lista')
  const [editando, setEditando] = useState<UserGame | null>(null)

  useEffect(() => {
    if (navTick > 0) { setPantalla('lista'); setEditando(null) }
  }, [navTick])

  const taken = useMemo(() => new Set(mine.map((g) => g.id)), [mine])

  // Plantilla que se esta editando, parseada en vivo.
  const parsed = useMemo(() => {
    if (!json.trim()) return null
    try { return JSON.parse(json) as GameTemplate } catch (e) { return { __error: (e as Error).message } as never }
  }, [json])
  const parseError = parsed && (parsed as never as { __error?: string }).__error
  const template = parseError ? null : (parsed as GameTemplate | null)

  const report = useMemo(
    () => (template ? validateTemplate(template, items.length ? items : undefined) : null),
    [template, items],
  )

  // Al pegar una tabla, se propone el mapeo de columnas.
  useEffect(() => {
    if (!template || !tableText.trim()) { setTable(null); setRoles([]); return }
    const t = parseTable(tableText)
    setTable(t)
    setRoles(t ? guessRoles(t.headers, template) : [])
  }, [tableText, template])

  const preview = useMemo(
    () => (table && template ? buildItems(table, roles, template, 'p') : null),
    [table, roles, template],
  )

  function startFork(id: string) {
    const src = forkables.find((f) => f.id === id)
    if (!src) return
    const clone: GameTemplate = JSON.parse(JSON.stringify(src.template))
    clone.gameId = freeId(`${clone.name} copia`, taken)
    clone.name = `${clone.name} (mi version)`
    clone.selfTests = []
    setEditingId(null)
    setJson(JSON.stringify(clone, null, 1))
    setItems(JSON.parse(JSON.stringify(src.items)))
    setMsg({ kind: 'ok', text: `Partiste de ${src.template.name}. Cambia lo que quieras y guarda.` })
  }

  /** Crea un juego completamente vacio y abre el editor de formularios. */
  function empezarDeCero() {
    const id = freeId('mi juego', taken)
    setEditando({ id, template: emptyTemplate(id), items: [], updatedAt: Date.now() })
    setPantalla('editar')
    setMsg(null)
  }

  function startBlank() {
    const skeleton: GameTemplate = {
      schemaVersion: '0.1',
      gameId: freeId('mi juego', taken),
      name: 'Mi juego',
      description: 'Descripcion corta del juego.',
      stats: [
        { id: 'ataque', name: 'Ataque', unit: 'flat' },
        { id: 'defensa', name: 'Defensa', unit: 'flat' },
        { id: 'critico', name: 'Prob. Critico', unit: 'percent' },
      ],
      slots: [{ id: 'arma', name: 'Arma' }, { id: 'armadura', name: 'Armadura' }],
      sets: [],
      derived: [{ id: 'critMult', name: 'Multiplicador critico', formula: '1 + min(critico, 100) / 100' }],
      objectives: [{
        id: 'dano', name: 'Dano', description: 'Ataque afectado por el critico.',
        kind: 'nonlinear', monotonic: true, formula: '(base_ataque + ataque) * critMult', decimals: 1,
      }],
      baseProfiles: [{ id: 'base', name: 'Personaje base', base: { ataque: 100, defensa: 0, critico: 5 } }],
      constrainableStats: ['critico', 'defensa'],
    }
    setEditingId(null)
    setJson(JSON.stringify(skeleton, null, 1))
    setItems([])
    setMsg({ kind: 'ok', text: 'Esqueleto minimo listo. Edita el JSON y pega tus objetos abajo.' })
  }

  function onFile(file: File) {
    file.text().then((raw) => {
      let data: unknown
      try { data = JSON.parse(raw) } catch (e) {
        setMsg({ kind: 'err', text: `"${file.name}" no es un JSON valido: ${(e as Error).message}` })
        return
      }
      const d = detectJsonFile(data)
      switch (d.kind) {
        case 'zenith-package':
          setEditingId(null)
          setJson(JSON.stringify(d.template, null, 1))
          setItems(d.items)
          setMsg({ kind: 'ok', text: `${describeDetected(d)} Listo para revisar y guardar.` })
          break
        case 'template':
          setEditingId(null)
          setJson(JSON.stringify(d.template, null, 1))
          setItems([])
          setMsg({ kind: 'ok', text: `${describeDetected(d)} Pega tu tabla de objetos abajo para completarla.` })
          break
        case 'items':
          if (!template) {
            setMsg({ kind: 'err', text: `${describeDetected(d)} Carga o crea una plantilla primero: sin ella no se sabe a que ranuras ni estadisticas corresponden.` })
          } else {
            setItems([...items, ...d.items])
            setMsg({ kind: 'ok', text: `${d.items.length} objetos anadidos a "${template.name}".` })
          }
          break
        case 'good': {
          // Un inventario no es un juego, pero casi siempre se puede meter en uno
          // que ya exista: se busca el primero cuyas estadisticas encajen.
          const destino = mine.find((g) => {
            const ids = new Set(g.template.stats.map((x) => x.id))
            return ['critRate_', 'critDMG_', 'atk_', 'eleMas'].filter((k) => ids.has(k)).length >= 3
          })
          setMsg({
            kind: destino ? 'ok' : 'err',
            text: destino
              ? `${describeDetected(d)} Eso es un INVENTARIO, no un juego. Tienes "${destino.template.name}", que es compatible: abrelo y cargalo desde Inventario → «cargar mis objetos».`
              : `${describeDetected(d)} Eso es un INVENTARIO, no un juego: describe que piezas tienes, no como funciona el juego. Importa primero el ejemplo de Genshin Impact desde la vista Juegos —o crea una plantilla con esas estadisticas— y despues carga tu inventario ahi.`,
          })
          break
        }
        default:
          setMsg({ kind: 'err', text: describeDetected(d) })
      }
    })
  }

  function save() {
    if (!template || !report?.ok) return
    const id = editingId ?? freeId(template.gameId || slugify(template.name), taken)
    try {
      const list = saveUserGame({ id, template: { ...template, gameId: id }, items })
      setMine(list.sort((a, b) => b.updatedAt - a.updatedAt))
      setEditingId(id)
      onChanged()
      setMsg({ kind: 'ok', text: `Guardado. Ya aparece en la vista Juegos.` })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message })
    }
  }

  const canSave = !!template && !!report?.ok && items.length > 0

  return (
    <>
      {pantalla === 'crear' && (
      <div className="hero">
        <h2>Crear un juego</h2>
        <p>
          Dos caminos. El <b>asistente</b> deduce la plantilla a partir de tu tabla de objetos y
          arma la formula por ti: no hay que escribir JSON ni matematicas. El <b>modo avanzado</b>
          abre el archivo en crudo para quien quiera control total. Los dos producen exactamente
          lo mismo, asi que se puede empezar en uno y terminar en el otro.
        </p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
          <button className={`mini${modo === 'guiado' ? ' on' : ''}`} onClick={() => setModo('guiado')}>
            Asistente — sin JSON
          </button>
          <button className={`mini${modo === 'json' ? ' on' : ''}`} onClick={() => setModo('json')}>
            Modo avanzado — JSON
          </button>
          <button className="mini" onClick={() => setPantalla('lista')}>volver a mis juegos</button>
        </div>
      </div>
      )}

      {/* ------------------------------------------------ mis juegos */}
      {pantalla === 'lista' && (
        <div className="card">
          <h2>Mis juegos <span className="chip n">{mine.length}</span></h2>
          {mine.length === 0 && (
            <p className="hint" style={{ marginTop: 0 }}>
              Todavia no has creado ninguno. Pulsa «crear un juego nuevo» y en dos minutos tienes
              el tuyo funcionando sobre el mismo motor que los incluidos.
            </p>
          )}
          <div className="invgrid">
            {mine.map((g) => (
              <div className="invcard" key={g.id} style={{ alignItems: 'flex-start' }}>
                <div className="meta">
                  <div className="t">{g.template.name}</div>
                  <div className="m">
                    {nf.format(g.items.length)} objetos · {g.template.slots.length} ranuras ·{' '}
                    {g.template.stats.length} estadisticas
                  </div>
                  <div className="subs">
                    {g.template.objectives.length} objetivo(s) · editado{' '}
                    {new Date(g.updatedAt).toLocaleDateString('es-CL')}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                    <button className="mini on" onClick={() => onPlay(g.id)}>usar</button>
                    <button className="mini" onClick={() => { setEditando(g); setPantalla('editar') }}>editar</button>
                    <button className="mini" onClick={() => {
                      const copia: UserGame = {
                        id: freeId(`${g.template.name} copia`, taken),
                        template: JSON.parse(JSON.stringify(g.template)),
                        items: JSON.parse(JSON.stringify(g.items)),
                        updatedAt: Date.now(),
                        forkedFrom: g.id,
                      }
                      copia.template.gameId = copia.id
                      copia.template.name = `${g.template.name} (copia)`
                      setMine(saveUserGame(copia).sort((a, b) => b.updatedAt - a.updatedAt))
                      onChanged()
                      setMsg({ kind: 'ok', text: `Duplicado como "${copia.template.name}".` })
                    }}>duplicar</button>
                    <button className="mini" onClick={() =>
                      downloadJson(`${g.id}.zenith.json`, makePackage(g.template, g.items))}>
                      exportar
                    </button>
                    <button className="mini" onClick={() => {
                      if (!confirm(`Borrar "${g.template.name}"? No se puede deshacer.`)) return
                      setMine(deleteUserGame(g.id).sort((a, b) => b.updatedAt - a.updatedAt))
                      if (editingId === g.id) { setEditingId(null); setJson(''); setItems([]) }
                      onChanged()
                      setMsg({ kind: 'ok', text: `"${g.template.name}" borrado.` })
                    }}>borrar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <button className="primary" style={{ width: 'auto', padding: '11px 24px' }}
              onClick={() => { setPantalla('crear'); setModo('guiado') }}>
              Crear desde una tabla
            </button>
            <button className="mini" style={{ padding: '11px 20px' }} onClick={empezarDeCero}>
              Empezar de cero
            </button>
          </div>
          <p className="hint" style={{ marginTop: 11, marginBottom: 0 }}>
            <b>Desde una tabla</b> es lo mas rapido si ya tienes los datos en algun lado.
            <b> De cero</b> abre el editor vacio y lo construyes todo a mano: estadisticas,
            ranuras, objetos y formulas, paso a paso y sin JSON.
          </p>
          {examples.length > 0 && (
            <>
              <h3>O parte de un ejemplo</h3>
              <p className="hint" style={{ marginTop: 0 }}>
                Se importan como juegos tuyos: despues puedes editarlos, bifurcarlos o borrarlos.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {examples.map((ex) => (
                  <button className="mini" key={ex.id} onClick={() => { onLoadExample(ex); onChanged() }}>
                    importar {ex.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {msg && <div style={{ marginTop: 12 }}><Banner kind={msg.kind === 'ok' ? 'ok' : 'err'}>{msg.text}</Banner></div>}
        </div>
      )}

      {pantalla === 'editar' && editando && (
        <GameEditor
          key={editando.id}
          template={editando.template}
          items={editando.items}
          onCancel={() => { setPantalla('lista'); setEditando(null) }}
          onSave={(tpl, its) => {
            const list = saveUserGame({ id: editando.id, template: { ...tpl, gameId: editando.id }, items: its })
            setMine(list.sort((a, b) => b.updatedAt - a.updatedAt))
            onChanged()
            setPantalla('lista'); setEditando(null)
            setMsg({ kind: 'ok', text: `"${tpl.name}" actualizado.` })
          }}
        />
      )}

      {pantalla === 'crear' && modo === 'guiado' && (
        <WizardView
          takenIds={taken}
          onDone={(tpl, its) => {
            setEditingId(null)
            setJson(JSON.stringify(tpl, null, 1))
            setItems(its)
            try {
              const list = saveUserGame({ id: tpl.gameId, template: tpl, items: its })
              setMine(list.sort((a, b) => b.updatedAt - a.updatedAt))
              setEditingId(tpl.gameId)
              onChanged()
              setMsg({ kind: 'ok', text: `"${tpl.name}" creado y guardado. Ya aparece en Juegos.` })
              setPantalla('lista')
            } catch (e) {
              setMsg({ kind: 'err', text: (e as Error).message })
            }
          }}
        />
      )}

      {pantalla === 'crear' && modo === 'json' && (
      <>
      {/* ------------------------------------------------ paso 1 */}
      <div className="card">
        <h2>1 · De donde partes</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Nadie escribe una plantilla desde cero. Lo mas rapido casi siempre es copiar una que
          ya funciona y cambiarle lo que haga falta — que es, literalmente, el mecanismo de
          bifurcacion del catalogo comunitario usado como herramienta de autoria.
        </p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {forkables.map((f) => (
            <button className="mini" key={f.id} onClick={() => startFork(f.id)}>
              bifurcar {f.template.name}
            </button>
          ))}
          {forkables.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--dim)', alignSelf: 'center' }}>
              (aun no tienes ningun juego del que partir)
            </span>
          )}
          <button className="mini" onClick={startBlank}>esqueleto minimo</button>
          <button className="mini" onClick={() => document.getElementById('tpl-file')?.click()}>
            abrir archivo .json
          </button>
        </div>
        <p className="hint" style={{ marginTop: 11, marginBottom: 0 }}>
          El boton de abrir acepta una <b>plantilla</b>, un <b>paquete exportado</b> desde aqui
          (plantilla + objetos) o una <b>lista de objetos</b>. Si sueltas un export GOOD de
          Genshin Optimizer, se reconoce y se carga como inventario del Genshin incluido — un
          export GOOD es un inventario, no un juego.
        </p>
        <div style={{ display: 'none' }}>
          <input id="tpl-file" type="file" accept=".json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        </div>
        {msg && <div style={{ marginTop: 12 }}><Banner kind={msg.kind === 'ok' ? 'ok' : 'err'}>{msg.text}</Banner></div>}
      </div>

      {json && (
        <>
          {/* ------------------------------------------------ paso 2 */}
          <div className="card">
            <h2>
              2 · La plantilla
              {report && (report.ok
                ? <span className="chip">valida</span>
                : <span className="chip" style={{ background: 'rgba(224,108,117,.12)', color: 'var(--danger)', borderColor: 'rgba(224,108,117,.3)' }}>
                    {report.issues.filter((i) => i.severity === 'error').length} error(es)
                  </span>)}
            </h2>
            <textarea
              value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false}
              style={{
                width: '100%', minHeight: 260, background: '#070910', color: '#c6cddf',
                border: '1px solid var(--line)', borderRadius: 9, padding: 12,
                fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
              }}
            />
            {parseError && <div style={{ marginTop: 10 }}><Banner kind="err">JSON invalido: {parseError}</Banner></div>}
            {report && (
              <div style={{ marginTop: 12 }}>
                {report.issues.filter((i) => i.severity !== 'info').length === 0 ? (
                  <Banner kind="ok">Sin problemas. Las formulas compilan y los objetivos monotonos lo son de verdad.</Banner>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>
                    {report.issues.filter((i) => i.severity !== 'info').map((i, k) => (
                      <li key={k} style={{ marginBottom: 5 }}>
                        <span style={{ color: i.severity === 'error' ? 'var(--danger)' : 'var(--warn)', fontFamily: 'var(--mono)' }}>
                          {i.severity === 'error' ? '✗' : '!'}
                        </span>{' '}
                        {i.where && <b style={{ color: 'var(--text)' }}>[{i.where}] </b>}{i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
              La validacion corre mientras escribes. Lo mas util que hace es medir la
              <b> monotonia</b> de cada objetivo: es la propiedad de la que depende que el motor
              pueda demostrar el optimo, y nadie deberia tener que entenderla para escribir una
              plantilla.
            </p>
          </div>

          {/* ------------------------------------------------ paso 3 */}
          <div className="card">
            <h2>
              3 · Los objetos
              <span className="chip n">{nf.format(items.length)} cargados</span>
            </h2>
            <p className="hint" style={{ marginTop: 0 }}>
              Pega aqui una tabla copiada de una wiki o de una planilla. Detecta el separador y
              propone a que corresponde cada columna comparandola con las estadisticas de tu
              plantilla. No sabe nada de ningun juego en particular.
            </p>
            <textarea
              value={tableText} onChange={(e) => setTableText(e.target.value)} spellCheck={false}
              placeholder={'Nombre\tRanura\tAtaque\tDefensa\nEspada de hierro\tArma\t45\t0\nCoraza\tArmadura\t0\t28'}
              style={{
                width: '100%', minHeight: 130, background: '#070910', color: '#c6cddf',
                border: '1px solid var(--line)', borderRadius: 9, padding: 12,
                fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
              }}
            />

            {table && template && (
              <>
                <div style={{ marginTop: 13, fontSize: 12, color: 'var(--dim)' }}>
                  Separador detectado: <b style={{ color: 'var(--text)' }}>
                    {table.delimiter === '\t' ? 'tabulacion' : `"${table.delimiter}"`}
                  </b> · {nf.format(table.rows.length)} filas · {table.headers.length} columnas
                </div>
                <div className="tablescroll" style={{ marginTop: 10 }}>
                  <table className="cmp">
                    <thead><tr><th>Columna</th><th>Es…</th><th>Ejemplo</th></tr></thead>
                    <tbody>
                      {table.headers.map((h, c) => (
                        <tr key={c}>
                          <td style={{ color: 'var(--text)' }}>{h || <i>(sin cabecera)</i>}</td>
                          <td>
                            <select
                              value={roles[c]?.kind === 'stat' ? `stat:${(roles[c] as { statId: string }).statId}` : roles[c]?.kind ?? 'ignore'}
                              onChange={(e) => {
                                const v = e.target.value
                                const next = [...roles]
                                next[c] = v.startsWith('stat:')
                                  ? { kind: 'stat', statId: v.slice(5) }
                                  : { kind: v as 'ignore' }
                                setRoles(next)
                              }}
                            >
                              <option value="ignore">— ignorar —</option>
                              <option value="name">nombre</option>
                              <option value="slot">ranura</option>
                              <option value="set">conjunto</option>
                              <option value="rarity">rareza</option>
                              <option value="level">nivel</option>
                              {template.stats.map((s) => (
                                <option key={s.id} value={`stat:${s.id}`}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ color: 'var(--dim)' }}>{table.rows[0]?.[c] ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview && (
                  <>
                    {preview.problems.map((p, i) => (
                      <div key={i} style={{ marginTop: 10 }}><Banner kind="warn">{p}</Banner></div>
                    ))}
                    <div style={{ marginTop: 12, display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button className="mini on" onClick={() => {
                        const r = buildItems(table, roles, template, `${template.gameId}-`)
                        setItems(r.items)
                        setMsg({ kind: 'ok', text: `${r.items.length} objetos importados.` })
                      }}>
                        importar {nf.format(preview.items.length)} objetos
                      </button>
                      <button className="mini" onClick={() => {
                        const r = buildItems(table, roles, template, `${template.gameId}-x${items.length}-`)
                        setItems([...items, ...r.items])
                      }}>anadir a los ya cargados</button>
                      {preview.skipped > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--warn)' }}>{preview.skipped} filas descartadas</span>
                      )}
                    </div>
                    <details className="tpl">
                      <summary>Ver las 3 primeras filas interpretadas</summary>
                      <pre className="code wrap">{JSON.stringify(preview.items.slice(0, 3), null, 1)}</pre>
                    </details>
                  </>
                )}
              </>
            )}
          </div>

          {/* ------------------------------------------------ guardar */}
          <div className="card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="primary" style={{ width: 'auto', padding: '11px 26px' }}
                disabled={!canSave} onClick={save}>
                {editingId ? 'Guardar cambios' : 'Guardar juego'}
              </button>
              {template && (
                <button className="mini" onClick={() =>
                  downloadJson(`${template.gameId || 'plantilla'}.zenith.json`, makePackage(template, items))}>
                  exportar para compartir
                </button>
              )}
              {!canSave && (
                <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                  {!template ? 'Falta una plantilla valida.'
                    : !report?.ok ? 'Corrige los errores de la plantilla.'
                    : 'Carga al menos un objeto.'}
                </span>
              )}
            </div>
          </div>
        </>
      )}
      </>
      )}
    </>
  )
}
