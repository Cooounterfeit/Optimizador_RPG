import { useEffect, useMemo, useState } from 'react'
import type { GameTemplate, Item } from './core/types'
import GamesView from './views/GamesView'
import OptimizerView from './views/OptimizerView'
import InventoryView from './views/InventoryView'
import ValidatorView from './views/ValidatorView'
import AddGameView from './views/AddGameView'
import CompareView from './views/CompareView'
import { freeId, listUserGames, saveUserGame, type UserGame } from './store/userGames'
import { listExamples, loadExample, type ExampleInfo } from './store/examples'
import { Empty } from './ui/components'
import CoverPicker from './ui/CoverPicker'
import { nf } from './ui/format'

type View = 'games' | 'optimizer' | 'inventory' | 'addgame' | 'validator' | 'compare'

const VIEWS: { id: View; label: string }[] = [
  { id: 'games', label: 'Juegos' },
  { id: 'optimizer', label: 'Optimizador' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'addgame', label: 'Mis juegos' },
  { id: 'validator', label: 'Validador' },
  { id: 'compare', label: 'Comparativa' },
]

export default function App() {
  const [view, setView] = useState<View>('games')
  const [userGames, setUserGames] = useState<UserGame[]>(() => listUserGames())
  const [gameId, setGameId] = useState<string | null>(() => listUserGames()[0]?.id ?? null)
  const [navTick, setNavTick] = useState(0)
  const [examples, setExamples] = useState<ExampleInfo[]>([])
  const [cargando, setCargando] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  /** Id del juego cuya portada se esta editando, o null. */
  const [portada, setPortada] = useState<string | null>(null)

  useEffect(() => { listExamples().then(setExamples).catch(() => setExamples([])) }, [])

  // No hay juegos incorporados: todo lo que existe lo creo o lo cargo el usuario.
  const templates: Record<string, GameTemplate> = useMemo(() => {
    const out: Record<string, GameTemplate> = {}
    for (const g of userGames) out[g.id] = g.template
    return out
  }, [userGames])

  const current = userGames.find((g) => g.id === gameId) ?? null
  const template = current?.template ?? null
  const items: Item[] = current?.items ?? []

  const itemCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const g of userGames) out[g.id] = g.items.length
    return out
  }, [userGames])

  const refresh = () => {
    const list = listUserGames()
    setUserGames(list)
    if (!list.some((g) => g.id === gameId)) setGameId(list[0]?.id ?? null)
  }

  /** Carga uno de los paquetes de ejemplo como si el usuario lo hubiera importado. */
  async function importExample(info: ExampleInfo) {
    setCargando(info.id)
    try {
      const pkg = await loadExample(info.file)
      const taken = new Set(listUserGames().map((g) => g.id))
      const repetido = taken.has(pkg.template.gameId)
      const id = repetido ? freeId(pkg.template.name, taken) : pkg.template.gameId
      const name = repetido ? `${pkg.template.name} (${taken.size + 1})` : pkg.template.name
      saveUserGame({ id, template: { ...pkg.template, gameId: id, name }, items: pkg.items })
      const list = listUserGames()
      setUserGames(list)
      setGameId(id)
    } finally {
      setCargando(null)
    }
  }

  /**
   * Guarda un cambio de presentacion (portada, color, categoria). Va contra la
   * plantilla y no contra un almacen aparte, para que la caratula viaje dentro
   * del paquete cuando el juego se exporte o se comparta.
   */
  function updPresentacion(id: string, patch: Partial<GameTemplate>) {
    const g = listUserGames().find((x) => x.id === id)
    if (!g) return
    try {
      saveUserGame({ id: g.id, template: { ...g.template, ...patch }, items: g.items })
      refresh()
    } catch (e) {
      alert((e as Error).message + '\n\nSi la imagen es muy grande, prueba con una mas pequena.')
    }
  }

  const juegoPortada = userGames.find((g) => g.id === portada) ?? null

  const inventoryPanel = template && (
    <div className="card">
      <h2>Inventario</h2>
      <p className="hint" style={{ marginTop: 0, marginBottom: 10 }}>
        <b>{nf.format(items.length)}</b> objetos en <b>{template.name}</b>.
      </p>
      <button className="mini" onClick={() => setView('inventory')}>+ cargar mis objetos</button>
    </div>
  )

  const sinJuegos = (
    <Empty>
      Todavia no hay ningun juego.<br />
      Ve a <b>Mis juegos</b> para crear el tuyo, o carga un ejemplo desde <b>Juegos</b>.
    </Empty>
  )

  return (
    <div className="app">
      <header className="top">
        <div className="inner">
          <div className="brand">
            <h1>Zenith Optimizer</h1>
            <span className="tag">demo del Core Engine · v0.1</span>
          </div>
          <div className="topsearch">
            <span aria-hidden>⌕</span>
            <input type="text" value={busqueda} placeholder="Buscar un juego…"
              onChange={(e) => { setBusqueda(e.target.value); setView('games') }}
              onFocus={() => setView('games')} />
          </div>
          <div className="spacer" />
          {view !== 'games' && template && (
            <div className="current-game">
              <b>{template.name}</b>
              <button onClick={() => setView('games')}>cambiar</button>
            </div>
          )}
          <nav className="tabs">
            {VIEWS.map((v) => (
              <button key={v.id} className={v.id === view ? 'on' : ''}
                onClick={() => { setView(v.id); if (v.id === 'addgame') setNavTick((n) => n + 1) }}>
                {v.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="wrap">
        {view === 'games' && (
          <GamesView
            templates={templates}
            current={gameId ?? ''}
            itemCounts={itemCounts}
            userGameIds={new Set(userGames.map((g) => g.id))}
            examples={examples}
            loadingExample={cargando}
            query={busqueda}
            onQuery={setBusqueda}
            onLoadExample={importExample}
            onPick={(id) => { setGameId(id); setView('optimizer') }}
            onAdd={() => { setView('addgame'); setNavTick((n) => n + 1) }}
            onEditCover={setPortada}
          />
        )}

        {view === 'optimizer' && (template
          ? <OptimizerView key={gameId ?? ''} gameId={gameId ?? ''} template={template}
              items={items} inventoryPanel={inventoryPanel} />
          : <div className="card">{sinJuegos}</div>)}

        {view === 'inventory' && (template
          ? <InventoryView gameId={gameId ?? ''} template={template} items={items}
              onItemsChange={(nuevos) => {
                if (!current) return
                saveUserGame({ id: current.id, template: current.template, items: nuevos })
                refresh()
              }} />
          : <div className="card">{sinJuegos}</div>)}

        {view === 'addgame' && (
          <AddGameView
            forkables={userGames.map((g) => ({ id: g.id, template: g.template, items: g.items }))}
            examples={examples}
            onLoadExample={importExample}
            onChanged={refresh}
            onPlay={(id) => { setGameId(id); setView('optimizer') }}
            navTick={navTick}
          />
        )}

        {view === 'validator' && (template
          ? <ValidatorView template={template} items={items} />
          : <div className="card">{sinJuegos}</div>)}

        {view === 'compare' && <CompareView />}
      </div>

      {juegoPortada && (
        <CoverPicker
          id={juegoPortada.id}
          name={juegoPortada.template.name}
          cover={juegoPortada.template.cover}
          accent={juegoPortada.template.accent}
          category={juegoPortada.template.category}
          onChange={(p) => updPresentacion(juegoPortada.id, p)}
          onClose={() => setPortada(null)}
        />
      )}

      <footer className="note">
        Demo del motor de optimizacion de Zenith Optimizer. La aplicacion arranca sin ningun juego:
        todo lo que aparece lo creo o lo importo el usuario. El algoritmo es branch and bound con
        poda exacta: cuando termina sin agotar el tiempo, la build mostrada es el optimo global
        demostrado, no una aproximacion.
      </footer>
    </div>
  )
}
