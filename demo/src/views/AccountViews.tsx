/**
 * Cuenta de usuario (AUT-1, AUT-2, AUT-3, INV-8)
 * ==============================================
 *   /registro         crear cuenta (nombre, correo, contrasena)
 *   /login            iniciar sesion, "recordarme", enlaces a registro y recuperacion
 *   /recuperar        pedir el correo de recuperacion
 *   /restablecer      elegir contrasena nueva (se llega desde el correo)
 *   /perfil           mi perfil: nombre, foto, descripcion y mis juegos en la nube
 *   /perfil/:id       perfil publico de cualquier creador (sin correo)
 *
 * Sin Supabase configurado, estas pantallas explican como activarlo y la app
 * sigue funcionando en el navegador.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { EMAIL_RE, passwordProblem, useAuth } from '../cloud/auth'
import { supabase } from '../cloud/supabase'
import type { ProfileRow } from '../cloud/database.types'
import { useCloudSync } from '../cloud/useCloudSync'
import { cloudPackage, deleteRemote, pull, resolveConflict, setCloud, syncAll } from '../cloud/sync'
import { downloadJson, getUserGame, listUserGames, makePackage, onUserGamesChanged, type UserGame } from '../store/userGames'
import { Banner } from '../ui/components'
import { notify } from '../ui/errors'

// ------------------------------------------------------------ piezas comunes

function SinNube() {
  return (
    <div className="card acc-card">
      <h2>Cuentas no disponibles</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Esta copia de Zenith no está conectada a Supabase. Todo sigue funcionando sin cuenta: tus juegos,
        inventario y personaje se guardan en este navegador.
      </p>
      <p className="hint">
        Para activarla, copia <code>.env.example</code> como <code>.env</code>, completa
        {' '}<code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> y reinicia la app.
        Los pasos completos están en <code>supabase/README.md</code>.
      </p>
      <Link to="/" className="mini">Volver a Juegos</Link>
    </div>
  )
}

function Campo({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className={`field${error ? ' invalid' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <em className="field-err" role="alert">{error}</em>}
    </label>
  )
}

/** Foto de perfil, o las iniciales sobre un fondo neutro si no hay foto (AUT-3). */
export function Avatar({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  const [rota, setRota] = useState(false)
  useEffect(() => setRota(false), [url])
  const ini = (name.match(/[\p{L}\p{N}]+/gu) ?? ['?']).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return url && !rota
    ? <img className="avatar" src={url} alt={name} width={size} height={size} onError={() => setRota(true)} />
    : <span className="avatar avatar-def" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-label={name}>{ini}</span>
}

// ------------------------------------------------------------ registro (AUT-1)

export function RegisterView() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!auth.configured) return <SinNube />
  if (auth.session && !hecho) return <Navigate to="/perfil" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const errores: Record<string, string> = {}
    if (!nombre.trim()) errores.nombre = 'Falta tu nombre'
    else if (nombre.trim().length > 40) errores.nombre = 'El nombre debe ser breve (máximo 40 caracteres)'
    if (!email.trim()) errores.email = 'Falta tu correo electrónico'
    else if (!EMAIL_RE.test(email.trim())) errores.email = 'Ingresa un correo electrónico válido'
    if (!pass) errores.pass = 'Falta la contraseña'
    else { const p = passwordProblem(pass); if (p) errores.pass = p }
    setErr(errores); setGeneral(null)
    if (Object.keys(errores).length) return
    setEnviando(true)
    const r = await auth.signUp(nombre, email, pass)
    setEnviando(false)
    if (!r.ok) { if (r.campo === 'email') setErr({ email: r.error }); else setGeneral(r.error); return }
    setHecho(r.mensaje ?? '¡Tu cuenta ha sido creada!')
    notify(r.mensaje ?? '¡Tu cuenta ha sido creada!', 'ok')
    if (r.mensaje === '¡Tu cuenta ha sido creada!') navigate('/')   // accede de inmediato (AUT-1)
  }

  if (hecho) {
    return (
      <div className="card acc-card">
        <h2>Cuenta creada</h2>
        <Banner kind="ok">{hecho}</Banner>
        <Link to="/login" className="mini">Ir a iniciar sesión</Link>
      </div>
    )
  }

  return (
    <form className="card acc-card" onSubmit={enviar} noValidate>
      <h2>Crear cuenta</h2>
      <p className="hint" style={{ marginTop: 0 }}>Con una cuenta puedes guardar tus juegos en la nube, publicar optimizadores y votar.</p>
      <Campo label="Nombre" error={err.nombre}>
        <input type="text" autoComplete="nickname" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>
      <Campo label="Correo electrónico" error={err.email}>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>
      <Campo label="Contraseña" error={err.pass}>
        <input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
      </Campo>
      <p className="hint">Al menos 8 caracteres, con letras y números.</p>
      {general && <Banner kind="err">{general}</Banner>}
      <button className="primary" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
      <p className="acc-links">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </form>
  )
}

// ------------------------------------------------------------ inicio de sesion (AUT-2)

export function LoginView() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [recordar, setRecordar] = useState(true)
  const [err, setErr] = useState<Record<string, string>>({})
  const [general, setGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!auth.configured) return <SinNube />
  if (auth.session) return <Navigate to="/perfil" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const errores: Record<string, string> = {}
    if (!email.trim()) errores.email = 'Falta tu correo electrónico'
    if (!pass) errores.pass = 'Falta la contraseña'
    setErr(errores); setGeneral(null)
    if (Object.keys(errores).length) return
    setEnviando(true)
    const r = await auth.signIn(email, pass, recordar)
    setEnviando(false)
    if (!r.ok) { setGeneral(r.error); return }
    navigate('/')
  }

  return (
    <form className="card acc-card" onSubmit={enviar} noValidate>
      <h2>Iniciar sesión</h2>
      <Campo label="Correo electrónico" error={err.email}>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>
      <Campo label="Contraseña" error={err.pass}>
        <input type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
      </Campo>
      <label className="acc-check">
        <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
        Recordarme en este dispositivo
      </label>
      {general && <Banner kind="err">{general}</Banner>}
      <button className="primary" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      <p className="acc-links">
        <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        <span> · </span>
        <Link to="/registro">Crear una cuenta nueva</Link>
      </p>
    </form>
  )
}

// ------------------------------------------------------------ recuperar contrasena

export function RecoverView() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  if (!auth.configured) return <SinNube />
  return (
    <form className="card acc-card" noValidate onSubmit={async (e) => {
      e.preventDefault()
      if (!email.trim()) { setErr('Falta tu correo electrónico'); return }
      if (!EMAIL_RE.test(email.trim())) { setErr('Ingresa un correo electrónico válido'); return }
      setErr(null)
      const r = await auth.sendReset(email)
      if (r.ok) setOk(r.mensaje ?? 'Listo.'); else setErr(r.error)
    }}>
      <h2>Recuperar contraseña</h2>
      <p className="hint" style={{ marginTop: 0 }}>Te enviaremos un enlace para crear una contraseña nueva.</p>
      <Campo label="Correo electrónico" error={err ?? undefined}>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>
      {ok && <Banner kind="ok">{ok}</Banner>}
      <button className="primary">Enviar enlace</button>
      <p className="acc-links"><Link to="/login">Volver a iniciar sesión</Link></p>
    </form>
  )
}

export function ResetView() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [pass, setPass] = useState('')
  const [err, setErr] = useState<string | null>(null)
  if (!auth.configured) return <SinNube />
  if (!auth.session && !auth.loading) {
    return <div className="card acc-card"><h2>Enlace vencido</h2><p className="hint">Pide un enlace nuevo desde <Link to="/recuperar">Recuperar contraseña</Link>.</p></div>
  }
  return (
    <form className="card acc-card" noValidate onSubmit={async (e) => {
      e.preventDefault()
      const r = await auth.setNewPassword(pass)
      if (!r.ok) { setErr(r.error); return }
      notify(r.mensaje ?? 'Contraseña actualizada.', 'ok')
      navigate('/perfil')
    }}>
      <h2>Contraseña nueva</h2>
      <Campo label="Contraseña nueva" error={err ?? undefined}>
        <input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
      </Campo>
      <p className="hint">Al menos 8 caracteres, con letras y números.</p>
      <button className="primary">Guardar contraseña</button>
    </form>
  )
}

// ------------------------------------------------------------ mi perfil (AUT-3 + INV-8)

export function ProfileView() {
  const auth = useAuth()
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const foto = useRef<HTMLInputElement>(null)
  const p = auth.profile
  useEffect(() => { if (p) { setNombre(p.display_name); setBio(p.bio) } }, [p])

  if (!auth.configured) return <SinNube />
  if (auth.loading) return <div className="card acc-card"><p className="hint">Cargando…</p></div>
  if (!auth.session) return <Navigate to="/login" replace />
  if (!p) return <div className="card acc-card"><p className="hint">Cargando tu perfil…</p></div>

  const cambios = nombre.trim() !== p.display_name || bio !== p.bio
  return (
    <div className="acc-grid">
      <form className="card" noValidate onSubmit={async (e) => {
        e.preventDefault()
        if (!nombre.trim()) { setErr('Falta tu nombre'); return }
        if (nombre.trim().length > 40) { setErr('El nombre debe ser breve (máximo 40 caracteres)'); return }
        setErr(null); setGuardando(true)
        const r = await auth.updateProfile({ display_name: nombre.trim(), bio })
        setGuardando(false)
        if (r.ok) notify('Perfil actualizado', 'ok'); else setErr(r.error)
      }}>
        <h2>Mi perfil</h2>
        <div className="acc-head">
          <button type="button" className="acc-photo" onClick={() => foto.current?.click()} title="Cambiar la foto">
            <Avatar url={p.avatar_url} name={p.display_name} size={88} />
            <span>cambiar foto</span>
          </button>
          <input ref={foto} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f) return
            const r = await auth.uploadAvatar(f)
            if (r.ok) notify('Perfil actualizado', 'ok'); else notify(r.error, 'error')
          }} />
          <div>
            <div className="acc-name">{p.display_name}</div>
            <div className="hint" style={{ margin: 0 }}>{auth.session.user.email} · solo tú ves tu correo</div>
            {p.avatar_url && <button type="button" className="link" onClick={async () => { const r = await auth.removeAvatar(); if (!r.ok) notify(r.error, 'error') }}>quitar foto</button>}
          </div>
        </div>
        <Campo label="Nombre" error={err ?? undefined}>
          <input type="text" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo label={`Descripción (${bio.length}/280)`}>
          <textarea maxLength={280} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Qué juegos optimizas, tu estilo…" />
        </Campo>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="mini on" disabled={!cambios || guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
          <Link to={`/perfil/${p.id}`} className="mini">ver mi perfil público</Link>
          <div style={{ flex: 1 }} />
          <button type="button" className="mini" onClick={() => auth.signOut()}>Cerrar sesión</button>
        </div>
      </form>
      <CloudPanel />
    </div>
  )
}

// ------------------------------------------------------------ mis juegos en la nube (INV-8)

const fecha = (ms: number) => new Date(ms).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

function CloudPanel() {
  const s = useCloudSync()
  const [locales, setLocales] = useState<UserGame[]>(() => listUserGames())
  useEffect(() => onUserGamesChanged(() => setLocales(listUserGames())), [])
  useEffect(() => { setLocales(listUserGames()) }, [s])
  const remoto = new Map(s.remote.map((r) => [r.game_key, r]))

  return (
    <div className="card" id="nube">
      <h2>
        Mis juegos en la nube
        <span className={`chip${s.status === 'error' ? ' err' : ''}`}>
          {s.status === 'syncing' ? 'sincronizando…' : s.status === 'error' ? 'con problemas' : s.lastSync ? `al día · ${new Date(s.lastSync).toLocaleTimeString('es-CL', { timeStyle: 'short' })}` : 'sin sincronizar'}
        </span>
      </h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Activa la copia en la nube para tener un juego, sus objetos y tu equipo en cualquier dispositivo. Lo que guardas aquí
        sigue también en este navegador. Las imágenes propias de los objetos todavía no viajan.
      </p>
      {s.readOnly && <Banner kind="warn">Tu plan no permite modificar la copia en la nube. Puedes seguir leyendo y descargando lo que ya guardaste.</Banner>}
      {s.error && <Banner kind="err">{s.error}</Banner>}

      {s.conflicts.length > 0 && (
        <div className="cloud-conflicts">
          <b>Cambios en los dos lados</b>
          <p className="hint" style={{ margin: '2px 0 8px' }}>Estos juegos cambiaron aquí y en otro dispositivo desde la última sincronización. Elige qué versión conservar.</p>
          {s.conflicts.map((id) => {
            const l = getUserGame(id)
            const r = remoto.get(id)
            return (
              <div key={id} className="cloud-row">
                <span className="cloud-name">{l?.template.name ?? r?.game_name ?? id}</span>
                <span className="hint">Este dispositivo: {l ? `${fecha(l.updatedAt)} · ${l.items.length} objetos` : '—'}</span>
                <span className="hint">Nube: {r ? `${fecha(new Date(r.client_updated_at).getTime())} · ${r.items_count} objetos` : '—'}</span>
                <span className="cloud-actions">
                  <button className="mini" onClick={() => resolveConflict(id, 'local')}>conservar este dispositivo</button>
                  <button className="mini" onClick={() => resolveConflict(id, 'cloud')}>conservar la nube</button>
                </span>
              </div>
            )
          })}
        </div>
      )}

      <h3 className="cloud-h">En este dispositivo</h3>
      {locales.length === 0 && <p className="hint">No tienes juegos en este navegador.</p>}
      {locales.map((g) => {
        const r = remoto.get(g.id)
        return (
          <div key={g.id} className="cloud-row">
            <span className="cloud-name">{g.template.name}</span>
            <span className="hint">{g.items.length} objetos{r ? ` · en la nube desde ${fecha(new Date(r.updated_at).getTime())}` : ''}</span>
            <label className="acc-check cloud-toggle">
              <input type="checkbox" checked={!!g.cloud} disabled={s.readOnly && !g.cloud}
                onChange={async (e) => { const pendiente = setCloud(g.id, e.target.checked); setLocales(listUserGames()); await pendiente; setLocales(listUserGames()) }} />
              copia en la nube
            </label>
          </div>
        )
      })}

      {s.remoteOnly.length > 0 && (
        <>
          <h3 className="cloud-h">Solo en la nube</h3>
          {s.remoteOnly.map((r) => (
            <div key={r.game_key} className="cloud-row">
              <span className="cloud-name">{r.game_name}</span>
              <span className="hint">{r.items_count} objetos · {fecha(new Date(r.updated_at).getTime())}</span>
              <span className="cloud-actions">
                <button className="mini" onClick={async () => { if (await pull(r.game_key)) notify(`${r.game_name} está de nuevo en este dispositivo.`, 'ok'); void syncAll() }}>traer a este dispositivo</button>
                <button className="mini" onClick={async () => {
                  const pkg = await cloudPackage(r.game_key)
                  if (pkg) downloadJson(`${r.game_key}.zenith.json`, makePackage(pkg.template, pkg.items))
                }}>descargar archivo</button>
                <button className="mini" onClick={() => { if (confirm(`¿Borrar ${r.game_name} de la nube? No se puede deshacer.`)) void deleteRemote(r.game_key) }}>borrar de la nube</button>
              </span>
            </div>
          ))}
        </>
      )}
      <div style={{ marginTop: 10 }}><button className="mini" onClick={() => syncAll()} disabled={s.status === 'syncing'}>sincronizar ahora</button></div>
    </div>
  )
}

// ------------------------------------------------------------ perfil publico (AUT-3)

export function PublicProfileView() {
  const { id } = useParams()
  const auth = useAuth()
  const [p, setP] = useState<Pick<ProfileRow, 'id' | 'display_name' | 'avatar_url' | 'bio' | 'created_at'> | null | undefined>(undefined)
  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('profiles').select('id, display_name, avatar_url, bio, created_at').eq('id', id).maybeSingle()
      .then(({ data }) => setP(data ?? null))
  }, [id])
  if (!auth.configured) return <SinNube />
  if (p === undefined) return <div className="card acc-card"><p className="hint">Cargando…</p></div>
  if (p === null) return <div className="card acc-card"><h2>Perfil no encontrado</h2><Link to="/" className="mini">Volver a Juegos</Link></div>
  return (
    <div className="card acc-card">
      <div className="acc-head">
        <Avatar url={p.avatar_url} name={p.display_name} size={88} />
        <div>
          <div className="acc-name">{p.display_name}</div>
          <div className="hint" style={{ margin: 0 }}>Creador desde {new Date(p.created_at).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      <p className="acc-bio">{p.bio || <span className="hint">Sin descripción.</span>}</p>
      {auth.session?.user.id === p.id && <Link to="/perfil" className="mini">editar mi perfil</Link>}
    </div>
  )
}
