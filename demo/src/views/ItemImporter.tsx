import { useMemo, useState } from 'react'
import type { GameTemplate, Item } from '../core/types'
import { buildItems, guessRoles, parseTable, type ColumnRole, type ParsedTable } from '../store/tableImport'
import { detectJsonFile, describeDetected } from '../store/detectFile'
import { importGood } from '../adapters/goodImport'
import { Banner } from '../ui/components'
import { nf } from '../ui/format'

type Modo = 'anadir' | 'reemplazar'

/**
 * Carga de objetos del usuario.
 *
 * Es el flujo mas frecuente de todos: mucha mas gente va a meter SUS piezas en
 * un juego que ya existe que a crear un juego nuevo. Por eso acepta las tres
 * vias reales por las que llegan los datos —una tabla pegada, un archivo de
 * inventario, un paquete de Zenith— y siempre dice cuantas estadisticas
 * reconocio antes de dejar confirmar.
 */
export default function ItemImporter({
  template, existing, onImport,
}: {
  template: GameTemplate
  existing: Item[]
  onImport: (items: Item[], modo: Modo) => void
}) {
  const [texto, setTexto] = useState('')
  const [roles, setRoles] = useState<ColumnRole[]>([])
  const [tabla, setTabla] = useState<ParsedTable | null>(null)
  const [modo, setModo] = useState<Modo>('anadir')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null)
  const [archivo, setArchivo] = useState<Item[] | null>(null)
  const [dragging, setDragging] = useState(false)
  const [minLevel, setMinLevel] = useState(0)
  const [minRarity, setMinRarity] = useState(4)
  const [good, setGood] = useState<unknown | null>(null)
  const [conArmas, setConArmas] = useState(true)

  const statIds = useMemo(() => new Set(template.stats.map((s) => s.id)), [template])

  /** Cuantas estadisticas de los objetos entiende esta plantilla. */
  function compat(items: Item[]) {
    const vistas = new Set<string>()
    for (const it of items) for (const k of Object.keys(it.stats)) vistas.add(k)
    const conocidas = [...vistas].filter((k) => statIds.has(k))
    const desconocidas = [...vistas].filter((k) => !statIds.has(k))
    const slots = new Set(template.slots.map((s) => s.id))
    const sinRanura = items.filter((i) => !slots.has(i.slot)).length
    return { conocidas, desconocidas, sinRanura }
  }

  function leerTabla(t: string) {
    setTexto(t)
    setArchivo(null); setGood(null)
    const p = t.trim() ? parseTable(t) : null
    setTabla(p)
    setRoles(p ? guessRoles(p.headers, template) : [])
    setMsg(null)
  }

  const previaTabla = useMemo(
    () => (tabla ? buildItems(tabla, roles, template, `imp${Date.now().toString(36)}-`) : null),
    [tabla, roles, template],
  )

  // Los objetos de un export GOOD dependen de los filtros, asi que se recalculan.
  const previaGood = useMemo(() => {
    if (!good) return null
    const slotArma = template.slots.find((sl) => /arma|weapon/i.test(sl.id) || /arma|weapon/i.test(sl.name))
    const r = importGood(good, {
      minLevel, minRarity,
      includeWeapons: conArmas && !!slotArma,
      weaponSlot: slotArma?.id,
    })
    return {
      items: r.items.map((i, k) => ({ ...i, id: `good-${k}-${i.id}` })),
      artefactos: r.artifacts,
      armas: r.weapons,
      tieneSlotArma: !!slotArma,
    }
  }, [good, minLevel, minRarity, conArmas, template])

  const propuestos = previaGood?.items ?? archivo ?? previaTabla?.items ?? null
  const info = propuestos ? compat(propuestos) : null

  function onFile(file: File) {
    setMsg(null); setTexto(''); setTabla(null); setArchivo(null); setGood(null)
    file.text().then((raw) => {
      let data: unknown
      try { data = JSON.parse(raw) } catch (e) {
        setMsg({ kind: 'err', text: `"${file.name}" no es un JSON valido: ${(e as Error).message}` })
        return
      }
      const d = detectJsonFile(data)
      switch (d.kind) {
        case 'good':
          setGood(data)
          setMsg({ kind: 'ok', text: `${describeDetected(d)} Ajusta los filtros y confirma.` })
          break
        case 'items':
          setArchivo(d.items)
          setMsg({ kind: 'ok', text: `${d.items.length} objetos leidos del archivo.` })
          break
        case 'zenith-package':
          setArchivo(d.items)
          setMsg({
            kind: d.items.length ? 'ok' : 'warn',
            text: d.items.length
              ? `Paquete de "${d.template.name}": se tomaran sus ${d.items.length} objetos. La plantilla del paquete se ignora; los objetos van a "${template.name}".`
              : 'Ese paquete no trae objetos.',
          })
          break
        case 'template':
          setMsg({ kind: 'err', text: 'Eso es una plantilla (las reglas del juego), no objetos. Para crear un juego usa la vista Mis juegos.' })
          break
        default:
          setMsg({ kind: 'err', text: describeDetected(d) })
      }
    })
  }

  const confirmar = () => {
    if (!propuestos?.length) return
    onImport(propuestos, modo)
    setMsg({
      kind: 'ok',
      text: modo === 'reemplazar'
        ? `Inventario reemplazado: ahora hay ${propuestos.length} objetos.`
        : `${propuestos.length} objetos anadidos. Total: ${existing.length + propuestos.length}.`,
    })
    setTexto(''); setTabla(null); setArchivo(null); setGood(null)
  }

  return (
    <div className="card">
      <h2>Cargar mis objetos <span className="chip n">{nf.format(existing.length)} ahora</span></h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Mete tus piezas en <b>{template.name}</b>. Puedes pegar una tabla, soltar un archivo de
        inventario o un paquete exportado. Se comprueba que las estadisticas encajen antes de
        confirmar.
      </p>

      <div
        className={`drop${dragging ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
        onClick={() => document.getElementById('item-file')?.click()}
      >
        Arrastra aqui un archivo de inventario<br />
        <span style={{ color: 'var(--muted)' }}>
          export <b>GOOD</b> de Genshin Optimizer · paquete <b>.zenith.json</b> · lista de objetos
        </span>
      </div>
      <input id="item-file" type="file" accept=".json" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />

      <p className="hint" style={{ margin: '14px 0 7px' }}>…o pega una tabla desde una wiki o una planilla:</p>
      <textarea
        value={texto} onChange={(e) => leerTabla(e.target.value)} spellCheck={false}
        placeholder={'Nombre\tRanura\tAtaque\tDefensa\nEspada\tArma\t45\t0'}
        style={{
          width: '100%', minHeight: 110, background: '#070910', color: '#c6cddf',
          border: '1px solid var(--line)', borderRadius: 9, padding: 12,
          fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
        }}
      />

      {msg && <div style={{ marginTop: 12 }}>
        <Banner kind={msg.kind === 'ok' ? 'ok' : msg.kind === 'warn' ? 'warn' : 'err'}>{msg.text}</Banner>
      </div>}

      {good !== null && previaGood && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="chip">{nf.format(previaGood.artefactos)} artefactos</span>
          {previaGood.tieneSlotArma
            ? <>
                <span className="chip g">{nf.format(previaGood.armas)} armas</span>
                <button className={`mini${conArmas ? ' on' : ''}`} onClick={() => setConArmas(!conArmas)}>
                  {conArmas ? 'armas incluidas' : 'armas excluidas'}
                </button>
              </>
            : <span className="chip" style={{ color: 'var(--warn)', borderColor: 'rgba(224,163,85,.3)', background: 'rgba(224,163,85,.09)' }}>
                esta plantilla no tiene ranura de arma
              </span>}
        </div>
      )}
      {good !== null && (
        <div className="row2" style={{ maxWidth: 380, marginTop: 12 }}>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Nivel minimo</span>
            <input type="number" min={0} max={20} value={minLevel}
              onChange={(e) => setMinLevel(Number(e.target.value))} />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Rareza minima</span>
            <input type="number" min={1} max={5} value={minRarity}
              onChange={(e) => setMinRarity(Number(e.target.value))} />
          </label>
        </div>
      )}

      {tabla && template && (
        <div className="tablescroll" style={{ marginTop: 12 }}>
          <table className="cmp">
            <thead><tr><th>Columna</th><th>Es…</th><th>Ejemplo</th></tr></thead>
            <tbody>
              {tabla.headers.map((h, c) => (
                <tr key={c}>
                  <td style={{ color: 'var(--text)' }}>{h || <i>(sin cabecera)</i>}</td>
                  <td>
                    <select
                      value={roles[c]?.kind === 'stat' ? `stat:${(roles[c] as { statId: string }).statId}` : roles[c]?.kind ?? 'ignore'}
                      onChange={(e) => {
                        const v = e.target.value
                        const next = [...roles]
                        next[c] = v.startsWith('stat:') ? { kind: 'stat', statId: v.slice(5) } : { kind: v as 'ignore' }
                        setRoles(next)
                      }}
                    >
                      <option value="ignore">— ignorar —</option>
                      <option value="name">nombre</option>
                      <option value="slot">ranura</option>
                      <option value="set">conjunto</option>
                      <option value="rarity">rareza</option>
                      <option value="level">nivel</option>
                      {template.stats.map((s) => <option key={s.id} value={`stat:${s.id}`}>{s.name}</option>)}
                    </select>
                  </td>
                  <td style={{ color: 'var(--dim)' }}>{tabla.rows[0]?.[c] ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previaTabla?.problems.map((p, i) => (
        <div key={i} style={{ marginTop: 10 }}><Banner kind="warn">{p}</Banner></div>
      ))}

      {propuestos && info && (
        <>
          <div className="metrics" style={{ marginTop: 14 }}>
            <div className="metric"><div className="k">Objetos leidos</div><div className="v">{nf.format(propuestos.length)}</div></div>
            <div className="metric">
              <div className="k">Estadisticas reconocidas</div>
              <div className={`v${info.conocidas.length ? ' good' : ''}`}>{info.conocidas.length}</div>
              <div className="s">{info.conocidas.slice(0, 4).join(', ') || 'ninguna'}</div>
            </div>
            {info.desconocidas.length > 0 && (
              <div className="metric">
                <div className="k">Se ignoran</div>
                <div className="v">{info.desconocidas.length}</div>
                <div className="s">{info.desconocidas.slice(0, 4).join(', ')}</div>
              </div>
            )}
            {info.sinRanura > 0 && (
              <div className="metric">
                <div className="k">Sin ranura valida</div>
                <div className="v">{nf.format(info.sinRanura)}</div>
                <div className="s">no se podran usar</div>
              </div>
            )}
          </div>

          {info.conocidas.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <Banner kind="err">
                Ninguna estadistica de estos objetos existe en <b>{template.name}</b>. O el
                inventario es de otro juego, o hay que anadir esas estadisticas a la plantilla
                (Mis juegos → editar → Estadisticas).
              </Banner>
            </div>
          )}
          {info.sinRanura > 0 && info.sinRanura === propuestos.length && (
            <div style={{ marginTop: 12 }}>
              <Banner kind="err">
                Ninguna de las ranuras de estos objetos existe en <b>{template.name}</b>. Revisa
                el mapeo de la columna de ranura, o anade esas ranuras a la plantilla.
              </Banner>
            </div>
          )}

          <div style={{ marginTop: 13, display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={modo} onChange={(e) => setModo(e.target.value as Modo)} style={{ width: 210 }}>
              <option value="anadir">anadir a los que ya tengo</option>
              <option value="reemplazar">reemplazar todo el inventario</option>
            </select>
            <button className="primary" style={{ width: 'auto', padding: '10px 22px' }}
              disabled={info.conocidas.length === 0 || info.sinRanura === propuestos.length}
              onClick={confirmar}>
              Cargar {nf.format(propuestos.length)} objetos
            </button>
          </div>

          <details className="tpl">
            <summary>Ver los 3 primeros objetos interpretados</summary>
            <pre className="code wrap">{JSON.stringify(propuestos.slice(0, 3), null, 1)}</pre>
          </details>
        </>
      )}
    </div>
  )
}
