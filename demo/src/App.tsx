import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { GameTemplate, Item } from './core/types'
import GamesView from './views/GamesView'
import OptimizerView from './views/OptimizerView'
import InventoryView from './views/InventoryView'
import ValidatorView from './views/ValidatorView'
import AddGameView from './views/AddGameView'
import CompareView from './views/CompareView'
import { freeId, listUserGames, onUserGamesChanged, saveUserGame, type UserGame } from './store/userGames'
import { listExamples, loadExample, type ExampleInfo } from './store/examples'
import { importImages } from './store/itemImages'
import { Empty } from './ui/components'
import CoverPicker from './ui/CoverPicker'
import { Avatar, LoginView, ProfileView, PublicProfileView, RecoverView, RegisterView, ResetView } from './views/AccountViews'
import { useAuth } from './cloud/auth'
import { startSync, stopSync } from './cloud/sync'
import { useCloudSync } from './cloud/useCloudSync'
import CharacterView from './views/CharacterView'
import ErrorBoundary from './ui/ErrorBoundary'
import Toasts from './ui/Toasts'
import { handleError } from './ui/errors'

/**
 * Rutas de la aplicacion (TEC-13). Cada vista tiene su URL propia: se puede
 * recargar, compartir el enlace y usar atras/adelante del navegador.
 * Las de cuenta usan Supabase (AUT-1..3); sin configurarlo, explican como activarlo.
 */
export const RUTAS = {
  juegos: '/',
  optimizador: '/optimizador',
  personaje: '/personaje',
  inventario: '/inventario',
  misJuegos: '/mis-juegos',
  validador: '/validador',
  comparativa: '/comparativa',
  login: '/login',
  registro: '/registro',
  recuperar: '/recuperar',
  restablecer: '/restablecer',
  perfil: '/perfil',
} as const

const NAV: { to: string; label: string }[] = [
  { to: RUTAS.juegos, label: 'Juegos' },
  { to: RUTAS.optimizador, label: 'Optimizador' },
  { to: RUTAS.personaje, label: 'Personaje' },
  { to: RUTAS.inventario, label: 'Inventario' },
  { to: RUTAS.misJuegos, label: 'Mis juegos' },
  { to: RUTAS.validador, label: 'Validador' },
  { to: RUTAS.comparativa, label: 'Comparativa' },
]

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Al cambiar de seccion se empieza arriba: si no, se llega a mitad de pagina
  // (por ejemplo, al pulsar "Probar" al final de la portada).
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const enJuegos = pathname === RUTAS.juegos
  const [userGames, setUserGames] = useState<UserGame[]>(() => listUserGames())
  const [gameId, setGameId] = useState<string | null>(() => listUserGames()[0]?.id ?? null)
  const [navTick, setNavTick] = useState(0)
  const [examples, setExamples] = useState<ExampleInfo[]>([])
  const [cargando, setCargando] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  /** Id del juego cuya portada se esta editando, o null. */
  const [portada, setPortada] = useState<string | null>(null)

  useEffect(() => {
    listExamples().then(setExamples).catch((e) => {
      setExamples([])
      handleError(e, 'cargar el catalogo de ejemplos', 'No se pudieron cargar los juegos de ejemplo. Revisa tu conexión y recarga la página.')
    })
  }, [])

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

  // Cuenta y nube: con sesion se sincroniza; lo que llega de otro dispositivo refresca la pantalla.
  const auth = useAuth()
  const nube = useCloudSync()
  const uid = auth.session?.user.id
  useEffect(() => {
    if (uid) void startSync(uid); else stopSync()
  }, [uid])
  useEffect(() => onUserGamesChanged((c) => { if (c.source === 'remote') refresh() }))

  /** Carga uno de los paquetes de ejemplo como si el usuario lo hubiera importado. */
  /** Devuelve true si el juego quedo importado (los errores se avisan, no se lanzan). */
  async function importExample(info: ExampleInfo): Promise<boolean> {
    setCargando(info.id)
    try {
      const pkg = await loadExample(info.file)
      const taken = new Set(listUserGames().map((g) => g.id))
      const repetido = taken.has(pkg.template.gameId)
      const id = repetido ? freeId(pkg.template.name, taken) : pkg.template.gameId
      const name = repetido ? `${pkg.template.name} (${taken.size + 1})` : pkg.template.name
      saveUserGame({ id, template: { ...pkg.template, gameId: id, name }, items: pkg.items })
      await importImages(id, pkg.images).catch(() => 0)
      const list = listUserGames()
      setUserGames(list)
      setGameId(id)
      return true
    } catch (e) {
      handleError(e, `importar el ejemplo ${info.id}`)
      return false
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
      handleError(e, 'guardar la portada', `${(e as Error).message} Si la imagen es muy grande, prueba con una más pequeña.`)
    }
  }

  const juegoPortada = userGames.find((g) => g.id === portada) ?? null

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
              onChange={(e) => { setBusqueda(e.target.value); if (!enJuegos) navigate(RUTAS.juegos) }}
              onFocus={() => { if (!enJuegos) navigate(RUTAS.juegos) }} />
          </div>
          <div className="spacer" />
          {!enJuegos && template && (
            <div className="current-game">
              <b>{template.name}</b>
              <button onClick={() => navigate(RUTAS.juegos)}>cambiar</button>
            </div>
          )}
          <nav className="tabs">
            {NAV.map((v) => (
              <NavLink key={v.to} to={v.to} end={v.to === RUTAS.juegos}
                className={({ isActive }) => (isActive ? 'on' : '')}
                onClick={() => { if (v.to === RUTAS.misJuegos) setNavTick((n) => n + 1) }}>
                {v.label}
              </NavLink>
            ))}
          </nav>
          {auth.session ? (
            <div className="account-box">
              <NavLink to={RUTAS.perfil} end className={({ isActive }) => `account user${isActive ? ' on' : ''}`} title="Mi perfil">
                <Avatar url={auth.profile?.avatar_url} name={auth.profile?.display_name ?? '…'} size={24} />
                <span className="account-name">{auth.profile?.display_name ?? 'Mi perfil'}</span>
                {nube.status === 'syncing' && <span className="sync-dot" title="Sincronizando con la nube" />}
                {nube.conflicts.length > 0 && <span className="sync-dot warn" title="Hay juegos con cambios en dos dispositivos" />}
              </NavLink>
              <button className="account logout" onClick={() => { void auth.signOut(); navigate(RUTAS.juegos) }} title="Cerrar sesión">Salir</button>
            </div>
          ) : (
            <NavLink to={RUTAS.login} className={({ isActive }) => `account${isActive ? ' on' : ''}`} title="Iniciar sesion">
              Entrar
            </NavLink>
          )}
        </div>
      </header>

      <main className="wrap">
        {/* Un fallo en una seccion no tumba la cabecera; cambiar de seccion lo reinicia. */}
        <ErrorBoundary where={`seccion ${pathname}`} resetKey={pathname}>
        {import.meta.env.DEV && <ProbarErrores />}
        {nube.conflicts.length > 0 && pathname !== RUTAS.perfil && (
          <div className="banner warn sync-banner">
            {nube.conflicts.length === 1 ? 'Un juego cambió' : `${nube.conflicts.length} juegos cambiaron`} aquí y en otro dispositivo.{' '}
            <button className="link" onClick={() => navigate(RUTAS.perfil)}>Elegir qué versión conservar</button>
          </div>
        )}
        {auth.recovering && pathname !== RUTAS.restablecer && <Navigate to={RUTAS.restablecer} replace />}
        <Routes>
          <Route path={RUTAS.juegos} element={
            <GamesView
              templates={templates}
              current={gameId ?? ''}
              itemCounts={itemCounts}
              userGameIds={new Set(userGames.map((g) => g.id))}
              examples={examples}
              loadingExample={cargando}
              query={busqueda}
              onQuery={setBusqueda}
              onTryExample={async (ex) => {
                if (userGames.some((g) => g.id === ex.id)) setGameId(ex.id)
                else if (!(await importExample(ex))) return
                navigate(RUTAS.optimizador)
              }}
              onPick={(id) => { setGameId(id); navigate(RUTAS.optimizador) }}
              onAdd={() => { navigate(RUTAS.misJuegos); setNavTick((n) => n + 1) }}
              onEditCover={setPortada}
            />
          } />

          <Route path={RUTAS.optimizador} element={template
            ? <OptimizerView key={gameId ?? ''} gameId={gameId ?? ''} template={template}
                items={items} />
            : <div className="card">{sinJuegos}</div>} />

          <Route path={RUTAS.personaje} element={template && current
            ? <CharacterView key={gameId ?? ''} gameId={gameId ?? ''} template={template} items={items}
                onSaveProfile={(p) => {
                  saveUserGame({ id: current.id, template: { ...current.template, baseProfiles: current.template.baseProfiles.map((x) => (x.id === p.id ? p : x)) }, items: current.items })
                  refresh()
                }} />
            : <div className="card">{sinJuegos}</div>} />

          <Route path={RUTAS.inventario} element={template
            ? <InventoryView gameId={gameId ?? ''} template={template} items={items}
                onItemsChange={(nuevos) => {
                  if (!current) return
                  saveUserGame({ id: current.id, template: current.template, items: nuevos })
                  refresh()
                }} />
            : <div className="card">{sinJuegos}</div>} />

          <Route path={RUTAS.misJuegos} element={
            <AddGameView
              forkables={userGames.map((g) => ({ id: g.id, template: g.template, items: g.items }))}
              examples={examples}
              onLoadExample={importExample}
              onChanged={refresh}
              onPlay={(id) => { setGameId(id); navigate(RUTAS.optimizador) }}
              navTick={navTick}
            />
          } />

          <Route path={RUTAS.validador} element={template
            ? <ValidatorView template={template} items={items} />
            : <div className="card">{sinJuegos}</div>} />

          <Route path={RUTAS.comparativa} element={<CompareView />} />

          <Route path={RUTAS.login} element={<LoginView />} />
          <Route path={RUTAS.registro} element={<RegisterView />} />
          <Route path={RUTAS.recuperar} element={<RecoverView />} />
          <Route path={RUTAS.restablecer} element={<ResetView />} />
          <Route path={RUTAS.perfil} element={<ProfileView />} />
          <Route path={`${RUTAS.perfil}/:id`} element={<PublicProfileView />} />

          {/* Rutas antiguas o mal escritas: de vuelta al inicio en vez de una pantalla en blanco. */}
          <Route path="*" element={<Navigate to={RUTAS.juegos} replace />} />
        </Routes>
        </ErrorBoundary>
      </main>

      <Toasts />

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
        <p>
          Demo del motor de optimizacion de Zenith Optimizer. La aplicacion arranca sin ningun juego:
          todo lo que aparece lo creo o lo importo el usuario. El algoritmo es branch and bound con
          poda exacta: cuando termina sin agotar el tiempo, la build mostrada es el optimo global
          demostrado, no una aproximacion.
        </p>
        <p className="legal">© {new Date().getFullYear()} Zenith Optimizer · Proyecto academico · Las marcas e imagenes de cada juego pertenecen a sus duenos.</p>
      </footer>
    </div>
  )
}

/**
 * Solo en desarrollo: provoca errores a proposito para probar TEC-18.
 *   ?forzarError=render   → la seccion falla al dibujarse (la atrapa el Error Boundary)
 *   ?forzarError=promesa  → una promesa rechazada sin catch (la atrapa el manejador global)
 * En el build de produccion este componente no existe.
 */
function ProbarErrores() {
  const modo = new URLSearchParams(useLocation().search).get('forzarError')
  useEffect(() => {
    if (modo === 'promesa') Promise.reject(new Error('Fallo de prueba en una promesa'))
  }, [modo])
  if (modo === 'render') throw new Error('Fallo de prueba al dibujar la sección')
  return null
}
