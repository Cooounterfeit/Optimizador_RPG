import { useMemo, useState } from 'react'
import type { GameTemplate, Item } from '../core/types'
import { validateTemplate, type Issue, type ValidationReport } from '../core/validate'
import { Banner } from '../ui/components'
import { fmtBig } from '../ui/format'
import { describeDetected, detectJsonFile } from '../store/detectFile'

export default function ValidatorView({
  template, items,
}: { template: GameTemplate; items: Item[] }) {
  const [dropped, setDropped] = useState<{ name: string; tpl: unknown } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const target = dropped ? dropped.tpl : template
  const targetName = dropped ? dropped.name : template.name
  const report: ValidationReport = useMemo(
    () => validateTemplate(target, dropped ? undefined : items),
    [target, items, dropped],
  )

  function onFile(file: File) {
    setParseError(null)
    file.text().then((raw) => {
      let data: unknown
      try { data = JSON.parse(raw) } catch (e) {
        setParseError(`"${file.name}" no es un JSON valido: ${(e as Error).message}`)
        return
      }
      const d = detectJsonFile(data)
      if (d.kind === 'zenith-package') setDropped({ name: file.name, tpl: d.template })
      else if (d.kind === 'template') setDropped({ name: file.name, tpl: d.template })
      else setParseError(`${describeDetected(d)} Aqui se revisan plantillas de juego, no inventarios.`)
    })
  }

  const errors = report.issues.filter((i) => i.severity === 'error')
  const warnings = report.issues.filter((i) => i.severity === 'warning')
  const infos = report.issues.filter((i) => i.severity === 'info')

  return (
    <>
      <div className="hero">
        <h2>Validador de plantillas</h2>
        <p>
          Si las plantillas las escribe la comunidad, el motor pasa a ser un interprete de
          contenido ajeno. Una plantilla mal hecha no falla: devuelve builds equivocadas con
          total confianza, que es peor que no tener herramienta. Esto es lo que tendria que
          pasar toda plantilla antes de publicarse.
        </p>
      </div>

      <div className="card">
        <div
          className={`drop${dragging ? ' over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
          onClick={() => document.getElementById('tpl-in')?.click()}
        >
          Arrastra aqui una plantilla <b>.json</b> para revisarla<br />
          o haz clic para elegirla
        </div>
        <input id="tpl-in" type="file" accept=".json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        {parseError && <div style={{ marginTop: 10 }}><Banner kind="err">{parseError}</Banner></div>}
        {dropped && (
          <div style={{ marginTop: 11, display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="chip n">Revisando: {dropped.name}</span>
            <button className="mini" onClick={() => setDropped(null)}>volver a la plantilla cargada</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>
          {targetName}
          {report.ok
            ? <span className="chip">plantilla valida</span>
            : <span className="chip" style={{ background: 'rgba(224,108,117,.12)', color: 'var(--danger)', borderColor: 'rgba(224,108,117,.3)' }}>
                no se puede usar
              </span>}
        </h2>

        <div className="metrics" style={{ marginBottom: 14 }}>
          <M k="Estadisticas" v={String(report.summary.stats)} />
          <M k="Ranuras" v={String(report.summary.slots)} />
          <M k="Conjuntos" v={String(report.summary.sets)} />
          <M k="Objetivos" v={`${report.summary.monotonicOk}/${report.summary.objectives}`} s="monotonos" />
          <M k="Perfiles" v={String(report.summary.profiles)} />
          {report.summary.searchSpace !== undefined && (
            <M k="Espacio de busqueda" v={fmtBig(report.summary.searchSpace)} s="con el inventario actual" />
          )}
        </div>

        {report.ok
          ? <Banner kind="ok">
              Sin errores. Las formulas compilan, los derivados no tienen ciclos y los objetivos
              declarados como monotonos lo son de verdad.
            </Banner>
          : <Banner kind="err">
              {errors.length} problema(s) impiden usar esta plantilla.
            </Banner>}

        <Group title={`Errores (${errors.length})`} kind="err" issues={errors} />
        <Group title={`Avisos (${warnings.length})`} kind="warn" issues={warnings} />
        <Group title={`Sugerencias (${infos.length})`} kind="info" issues={infos} />
      </div>

      <div className="card">
        <h2>
          Autopruebas de la plantilla
          {report.selfTests.length > 0 && (
            <span className="chip">
              {report.selfTests.filter((t) => t.passed).length}/{report.selfTests.length} pasan
            </span>
          )}
        </h2>
        {report.selfTests.length === 0 ? (
          <Banner kind="warn">
            Esta plantilla no declara autopruebas. En un catalogo comunitario deberia ser
            requisito para publicar: es la unica forma <b>automatica</b> de distinguir una
            plantilla correcta de una que devuelve numeros equivocados.
          </Banner>
        ) : (
          <div className="tablescroll">
            <table className="cmp">
              <thead><tr><th style={{ width: 42 }}></th><th>Caso</th><th>Resultado</th></tr></thead>
              <tbody>
                {report.selfTests.map((t, i) => (
                  <tr key={i}>
                    <td className={t.passed ? 'yes' : 'no'} style={{ fontSize: 16 }}>{t.passed ? '✓' : '✗'}</td>
                    <td style={{ color: 'var(--text)' }}>{t.name}</td>
                    <td className={t.passed ? 'yes' : 'no'}>{t.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details className="tpl">
          <summary>Como se declara una autoprueba</summary>
          <pre className="code wrap">{`"selfTests": [{
  "name": "El bono de 4 piezas se aplica",
  "profileId": "navia",
  "objectiveId": "dps",
  "items": [ ... una pieza por ranura ... ],
  "expectStats": { "critRate_": 41.0 },
  "tolerance": 0.01
}]`}</pre>
        </details>
      </div>

      <div className="card">
        <h2>Que revisa, y por que</h2>
        <div className="tablescroll">
          <table className="cmp">
            <tbody>
              <tr><td>Ids repetidos y colisiones</td><td colSpan={2}>Una estadistica y un derivado con el mismo nombre hacen que una tape a la otra en silencio.</td></tr>
              <tr><td>Ciclos entre derivados</td><td colSpan={2}>Si <code>a</code> depende de <code>b</code> y <code>b</code> de <code>a</code>, no hay orden posible. El motor lo rechaza en vez de devolver un numero cualquiera.</td></tr>
              <tr><td>Referencias hacia adelante</td><td colSpan={2}>Un derivado que usa otro declarado mas abajo. El motor los reordena solo, pero conviene saberlo.</td></tr>
              <tr><td>Variables inexistentes</td><td colSpan={2}>Una errata en el nombre de una estadistica convierte la formula en algo que calcula otra cosa.</td></tr>
              <tr><td><b>Monotonia real</b></td><td colSpan={2}><b>La comprueba numericamente.</b> Es la propiedad de la que depende que la poda sea exacta. Si una plantilla la declara mal, el optimizador puede descartar el optimo sin enterarse. Ningun autor deberia tener que entender esto: el validador lo mide.</td></tr>
              <tr><td>NaN e infinitos</td><td colSpan={2}>Divisiones por cero que solo aparecen con ciertos valores.</td></tr>
              <tr><td>Conjuntos imposibles</td><td colSpan={2}>Bonos que piden mas piezas que ranuras tiene el juego, o que otorgan estadisticas inexistentes.</td></tr>
              <tr><td>Cobertura del inventario</td><td colSpan={2}>Ranuras sin ninguna pieza, estadisticas del inventario que la plantilla ignora, espacio de busqueda desmedido.</td></tr>
              <tr><td>Autopruebas</td><td colSpan={2}>Ejecuta los casos que la propia plantilla declara y comprueba los resultados.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function M({ k, v, s }: { k: string; v: string; s?: string }) {
  return <div className="metric"><div className="k">{k}</div><div className="v">{v}</div>{s && <div className="s">{s}</div>}</div>
}

function Group({ title, kind, issues }: { title: string; kind: 'err' | 'warn' | 'info'; issues: Issue[] }) {
  if (issues.length === 0) return null
  const color = kind === 'err' ? 'var(--danger)' : kind === 'warn' ? 'var(--warn)' : 'var(--accent)'
  const mark = kind === 'err' ? '✗' : kind === 'warn' ? '!' : '·'
  return (
    <>
      <h3 style={{ color, fontSize: 13 }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>
        {issues.map((i, k) => (
          <li key={k} style={{ marginBottom: 6 }}>
            <span style={{ color, fontFamily: 'var(--mono)' }}>{mark}</span>{' '}
            {i.where && <b style={{ color: 'var(--text)' }}>[{i.where}] </b>}
            {i.message}
          </li>
        ))}
      </ul>
    </>
  )
}
