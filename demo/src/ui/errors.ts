/**
 * Manejo global de errores y registro (TEC-18)
 * ============================================
 * Un solo lugar por donde pasan todos los errores de la app:
 *
 *  - En desarrollo se escriben completos en la consola (con su contexto y su
 *    traza), para depurar sin adivinar.
 *  - En produccion la consola recibe una linea corta y el usuario un mensaje
 *    claro; nunca una pantalla en blanco ni una traza de JavaScript.
 *  - Los ultimos errores se guardan en memoria para el boton "copiar detalles",
 *    asi un usuario puede mandar el reporte exacto sin abrir la consola.
 *
 * Cuando llegue un servicio de reportes (Sentry o similar), se conecta solo
 * aqui, en `reportError`; el resto de la app no cambia.
 */

export interface ErrorRecord {
  at: string
  context: string
  message: string
  stack?: string
}

const MAX = 20
const registro: ErrorRecord[] = []
const DEV = import.meta.env.DEV

/** Convierte cualquier cosa lanzada (Error, string, objeto) en un Error. */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (typeof e === 'string') return new Error(e)
  try { return new Error(JSON.stringify(e)) } catch { return new Error(String(e)) }
}

/** Registra un error. `context` dice donde paso: "importar ejemplo", "render /optimizador"... */
export function reportError(e: unknown, context: string): ErrorRecord {
  const err = toError(e)
  const rec: ErrorRecord = { at: new Date().toISOString(), context, message: err.message, stack: err.stack }
  registro.unshift(rec)
  if (registro.length > MAX) registro.pop()
  if (DEV) {
    console.error(`[Zenith] ${context}:`, err)
  } else {
    console.warn(`[Zenith] ${context}: ${err.message}`)
  }
  return rec
}

export const recentErrors = (): readonly ErrorRecord[] => registro

/** Texto listo para pegar en un reporte. */
export function errorReport(): string {
  const env = `${navigator.userAgent} · ${location.href}`
  return [`Zenith Optimizer — reporte de errores`, env, '',
    ...registro.map((r) => `[${r.at}] ${r.context}: ${r.message}${r.stack ? `\n${r.stack}` : ''}`)].join('\n')
}

// ------------------------------------------------------------- avisos al usuario

export interface Toast { id: number; kind: 'error' | 'ok' | 'info'; text: string }
type Listener = (t: Toast) => void
const listeners = new Set<Listener>()
let seq = 0

/** Muestra un aviso breve en pantalla (lo pinta <Toasts />). */
export function notify(text: string, kind: Toast['kind'] = 'info'): void {
  const t = { id: ++seq, kind, text }
  listeners.forEach((fn) => fn(t))
}

export function onToast(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Registra el error y avisa al usuario con un mensaje entendible. */
export function handleError(e: unknown, context: string, userMessage?: string): void {
  const rec = reportError(e, context)
  notify(userMessage ?? friendlyMessage(rec.message), 'error')
}

/**
 * Traduce errores tecnicos frecuentes a algo que un jugador entienda.
 * Lo que no se reconoce se muestra tal cual: es mejor que "error desconocido".
 */
export function friendlyMessage(message: string): string {
  if (/Failed to fetch|NetworkError|Load failed|ERR_INTERNET|network/i.test(message)) {
    return 'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.'
  }
  if (/dynamically imported module|Loading chunk|Importing a module script failed/i.test(message)) {
    return 'Hay una versión nueva del sitio. Recarga la página para continuar.'
  }
  if (/QuotaExceeded|quota/i.test(message)) {
    return 'El navegador se quedó sin espacio para guardar. Borra algún juego o imagen que no uses.'
  }
  return message
}

// ------------------------------------------------------------- red

/**
 * fetch con tiempo limite y errores claros. Lo usaran tambien las llamadas a
 * Supabase: cualquier fallo de red llega aqui con un mensaje entendible.
 */
export async function fetchJson<T = unknown>(url: string, opts: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000)
  let res: Response
  try {
    res = await fetch(url, { ...opts, signal: ctrl.signal })
  } catch (e) {
    const err = toError(e)
    throw new Error(err.name === 'AbortError'
      ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
      : 'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.')
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    throw new Error(res.status === 404
      ? `No se encontró el recurso (${url}).`
      : res.status >= 500
        ? `El servidor tuvo un problema (error ${res.status}). Inténtalo en unos minutos.`
        : `La solicitud falló (error ${res.status}).`)
  }
  try {
    return await res.json() as T
  } catch {
    throw new Error(`La respuesta de ${url} no es un JSON válido.`)
  }
}

// ------------------------------------------------------------- errores sueltos

let instalado = false
/**
 * Errores que no pasan por React (promesas sin catch, errores en eventos o en
 * temporizadores): se registran y se avisan, sin tumbar la app.
 */
export function installGlobalHandlers(): void {
  if (instalado) return
  instalado = true
  window.addEventListener('error', (ev) => {
    // Los errores de carga de recursos (una imagen rota) llegan sin `error`: no son fallos de la app.
    if (!ev.error) return
    const msg = toError(ev.error).message
    // En desarrollo React tambien re-lanza aqui los errores que ya atrapo un Error
    // Boundary. Se espera un instante: si el Boundary lo registro, no se duplica.
    setTimeout(() => {
      const yaAtrapado = registro.some((r) => r.context.startsWith('render ') && r.message === msg &&
        Date.now() - Date.parse(r.at) < 2000)
      if (!yaAtrapado) handleError(ev.error, 'error no capturado')
    }, 50)
  })
  window.addEventListener('unhandledrejection', (ev) => {
    handleError(ev.reason, 'promesa rechazada sin manejar')
  })
}
