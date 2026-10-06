/**
 * Catalogo de juegos
 * ==================
 * Es la portada del producto, y por eso se parece a una tienda: buscador,
 * categorias a la izquierda y una rejilla de caratulas. La forma no es
 * decorativa — comunica la tesis del proyecto. Un optimizador es una pagina;
 * un catalogo de optimizadores hechos por la comunidad es una plataforma, y
 * eso es exactamente lo que el motor permite ser.
 *
 * Las caratulas las pone el usuario (ver CoverPicker): no distribuimos arte de
 * juegos que no es nuestro, pero si damos el hueco donde colocarlo.
 */

import { useMemo, useState } from 'react'
import type { GameTemplate, Item } from '../core/types'
import { artifactIcon } from '../adapters/genshinAssets'
import { Icon } from '../ui/components'
import { Cover, colorDe } from '../ui/CoverPicker'
import { nf } from '../ui/format'

import type { ExampleInfo } from '../store/examples'

const SIN_CAT = 'Sin categoria'

/**
 * Primer icono disponible del conjunto. Se prueban todas las ranuras porque la
 * primera no tiene por que tener arte: en Genshin la ranura 1 es el arma, que
 * no pertenece a ningun conjunto de artefactos.
 */
function iconoConjunto(gameId: string, setId: string, t: GameTemplate): string | null {
  for (const sl of t.slots) {
    const src = artifactIcon(gameId, setId, sl.id)
    if (src) return src
  }
  return null
}

export default function GamesView({
  templates, current, itemCounts, userGameIds, examples, loadingExample,
  query, onQuery, onTryExample, onPick, onAdd, onEditCover,
}: {
  templates: Record<string, GameTemplate>
  current: string
  itemCounts: Record<string, number>
  userGameIds: Set<string>
  examples: ExampleInfo[]
  loadingExample: string | null
  query: string
  onQuery: (q: string) => void
  /** Importa el ejemplo (si hace falta) y lleva directo al optimizador. */
  onTryExample: (info: ExampleInfo) => void
  onPick: (id: string) => void
  onAdd: () => void
  onEditCover: (id: string) => void
}) {
  const [cat, setCat] = useState<string>('')
  const entradas = Object.entries(templates)
  const vacio = entradas.length === 0

  const categorias = useMemo(() => {
    const m = new Map<string, number>()
    for (const [, t] of entradas) {
      const c = (t.category ?? '').trim() || SIN_CAT
      m.set(c, (m.get(c) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [templates])

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entradas.filter(([, t]) => {
      const c = (t.category ?? '').trim() || SIN_CAT
      if (cat && c !== cat) return false
      if (q && !`${t.name} ${t.description} ${c}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [templates, cat, query])

  /** Ejemplos que el usuario todavia no importo (los importados ya salen en "Tus juegos"). */
  const ejemplosPendientes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return examples
      .filter((e) => !userGameIds.has(e.id))
      .filter((e) => !q || `${e.name} ${e.description}`.toLowerCase().includes(q))
  }, [examples, query, userGameIds])

  return (
    <>
      {/* --- banner ------------------------------------------------------ */}
      <div className="mkt-hero">
        <div className="mkt-hero-art" aria-hidden>
          {entradas.slice(0, 8).map(([id, t]) => (
            <div key={id} className="tile"
              style={t.cover
                ? { backgroundImage: `url(${t.cover})` }
                : { background: `linear-gradient(135deg, ${t.accent || colorDe(id)}66, #0b0e15)` }} />
          ))}
        </div>
        <div className="mkt-hero-in">
          <h2>Encuentra la mejor build de tu personaje</h2>
          <p>
            Elige un juego, carga tus objetos y el optimizador prueba todas las combinaciones por ti.
            Un mismo motor para cualquier juego.
          </p>
          <div className="mkt-search">
            <span aria-hidden>⌕</span>
            <input type="text" value={query} onChange={(e) => onQuery(e.target.value)}
              placeholder="Buscar un juego (por ejemplo: Genshin, Terraria)…" />
            {query && <button className="mini" onClick={() => onQuery('')}>limpiar</button>}
          </div>
        </div>
      </div>

      {/* --- catalogo ---------------------------------------------------- */}
      <div className="mkt">
        <aside className="mkt-side">
          <h3>Explorar</h3>
          <button className={cat === '' ? 'on' : ''} onClick={() => setCat('')}>
            Todos los juegos <span>{entradas.length}</span>
          </button>
          {categorias.map(([c, n]) => (
            <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(cat === c ? '' : c)}>
              {c} <span>{n}</span>
            </button>
          ))}

          <h3 style={{ marginTop: 20 }}>Crear</h3>
          <button onClick={onAdd}>+ Crear un juego</button>

        </aside>

        <div className="mkt-main">
          {!vacio && <h2 className="mkt-title">Tus juegos</h2>}
          {!vacio && visibles.length === 0 && (
            <div className="card"><div className="empty">Ningún juego tuyo coincide con la búsqueda.</div></div>
          )}

          {!vacio && <div className="gamegrid">
            {visibles.map(([id, t]) => {
              const previewSets = t.sets.slice(0, 5)
              return (
                <div
                  key={id}
                  className={`gamecard${id === current ? ' on' : ''}`}
                  onClick={() => onPick(id)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onPick(id) }}
                >
                  <Cover src={t.cover} name={t.name} accent={t.accent} id={id}>
                    <button className="cover-edit" title="Cambiar la portada"
                      onClick={(e) => { e.stopPropagation(); onEditCover(id) }}>
                      imagen
                    </button>
                    {t.category && <span className="cover-cat">{t.category}</span>}
                    {id === current && <span className="cover-cur">en uso</span>}
                  </Cover>

                  <div className="gbody">
                    <div className="gt">{t.name}</div>
                    <div className="gd">{t.description || <i style={{ color: 'var(--dim)' }}>sin descripcion</i>}</div>

                    {previewSets.length > 0 && (
                      <div className="thumbs">
                        {previewSets.map((s) => (
                          <Icon key={s.id} src={iconoConjunto(id, s.id, t)} alt={s.name} rarity={5} size={30} />
                        ))}
                        {t.sets.length > previewSets.length && (
                          <span className="thumbs-mas">+{t.sets.length - previewSets.length}</span>
                        )}
                      </div>
                    )}

                    <div className="gamefacts">
                      <div><b>{t.slots.length}</b><small>ranuras</small></div>
                      <div><b>{t.sets.length}</b><small>conjuntos</small></div>
                      <div><b>{nf.format(itemCounts[id] ?? 0)}</b><small>objetos</small></div>
                    </div>

                    <button className="primary" onClick={(e) => { e.stopPropagation(); onPick(id) }}>
                      {id === current ? 'Continuar' : 'Optimizar'}
                    </button>
                  </div>
                </div>
              )
            })}

          </div>}

          {/* --- ejemplos listos para probar ---------------------------- */}
          {ejemplosPendientes.length > 0 && (
            <>
              <h2 className="mkt-title">{vacio ? 'Empieza con un ejemplo' : 'Más juegos para probar'}</h2>
              {vacio && (
                <p className="hint" style={{ marginTop: -4 }}>
                  Vienen con objetos de muestra: pulsa <b>Probar</b> y optimiza en un clic. Después puedes cargar los tuyos.
                </p>
              )}
              <div className="gamegrid">
                {ejemplosPendientes.map((ex) => (
                  <div key={ex.id} className="gamecard ejemplo" role="button" tabIndex={0}
                    onClick={() => onTryExample(ex)} onKeyDown={(e) => { if (e.key === 'Enter') onTryExample(ex) }}>
                    <Cover name={ex.name} id={ex.id} height={96} />
                    <div className="gbody">
                      <div className="gt">{ex.name}</div>
                      <div className="gd">{ex.description}</div>
                      <div className="gd" style={{ color: 'var(--accent-2)' }}>
                        {ex.items > 0 ? `${nf.format(ex.items)} objetos incluidos` : 'Sin objetos: carga los tuyos'}
                      </div>
                      <button className="primary" disabled={loadingExample === ex.id}
                        onClick={(e) => { e.stopPropagation(); onTryExample(ex) }}>
                        {loadingExample === ex.id ? 'Cargando…' : 'Probar'}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="gamecard nuevo" onClick={onAdd} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onAdd() }}>
                  <div style={{ fontSize: 38, color: 'var(--dim)', lineHeight: 1 }}>+</div>
                  <div className="gt" style={{ marginTop: 10 }}>Crear tu propio juego</div>
                  <div className="gd" style={{ maxWidth: 260, textAlign: 'center' }}>
                    Desde una tabla de objetos o paso a paso con formularios. Sin escribir código.
                  </div>
                </div>
              </div>
            </>
          )}

          <details className="card mkt-about" style={{ marginTop: 16 }}>
            <summary>Sobre el proyecto</summary>
            <div className="twocol">
              <div>
                <h3>El motor no sabe de juegos</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  No hay un <code>if (juego === 'genshin')</code> en ninguna parte del optimizador.
                  Recibe una lista de objetos, un conjunto de formulas y devuelve la mejor
                  combinacion. Un juego tiene 6 ranuras y conjuntos de 2 y 4 piezas; otro tiene
                  7 ranuras y conjuntos de 3. Al motor le da exactamente igual.
                </p>
              </div>
              <div>
                <h3>Anadir un juego no deberia requerir un programador</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Esa es la apuesta del proyecto: que una plantilla JSON baste para modelar un
                  juego, y que la comunidad pueda escribirla, publicarla y bifurcarla sin tocar
                  codigo ni esperar a que alguien despliegue una version nueva. La portada y la
                  categoria viajan dentro de la plantilla, asi que un juego compartido llega con
                  su cara puesta.
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>
    </>
  )
}

export function countItems(items: Item[]): number { return items.length }
