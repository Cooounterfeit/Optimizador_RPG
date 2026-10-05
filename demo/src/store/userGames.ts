/**
 * Juegos anadidos por el usuario
 * ===============================
 * Se guardan en el navegador (localStorage), fieles al principio offline-first:
 * una plantilla propia no necesita servidor para funcionar. El mismo objeto que
 * se guarda aqui es el que se exporta para compartir, asi que "guardar" y
 * "publicar en el catalogo" manipulan exactamente la misma estructura.
 */

import type { GameTemplate, Item } from '../core/types'

/**
 * Juego completamente vacio: sin estadisticas, sin ranuras, sin objetivos y sin
 * objetos. Es el punto de partida para construirlo todo a mano desde el editor
 * de formularios, sin pegar tablas ni escribir JSON.
 *
 * Se incluye un unico perfil base porque todo juego necesita al menos uno, y
 * dejarlo en cero solo produciria un error que el usuario no puede interpretar.
 */
export function emptyTemplate(id: string, name = 'Mi juego'): GameTemplate {
  return {
    schemaVersion: '0.1',
    gameId: id,
    name,
    description: '',
    stats: [],
    slots: [],
    sets: [],
    derived: [],
    objectives: [],
    baseProfiles: [{ id: 'base', name: 'Personaje base', base: {} }],
    constrainableStats: [],
  }
}

const KEY = 'zenith.userGames.v1'

export interface UserGame {
  id: string
  template: GameTemplate
  items: Item[]
  updatedAt: number
  /** De que plantilla se bifurco, si se bifurco de alguna. */
  forkedFrom?: string
  /** El usuario activo la copia en la nube para este juego (INV-8). */
  cloud?: boolean
  /** updatedAt de la ultima vez que este dispositivo y la nube coincidieron. */
  syncedAt?: number
}

// ----------------------------------------------------------- avisos de cambio
// La sincronizacion con la nube escucha los cambios locales para subirlos, y la
// app escucha los que llegan de la nube para refrescar la pantalla.
export type GamesChange = { id: string; kind: 'save' | 'delete'; source: 'local' | 'remote' }
const oyentes = new Set<(c: GamesChange) => void>()
export function onUserGamesChanged(fn: (c: GamesChange) => void): () => void {
  oyentes.add(fn)
  return () => { oyentes.delete(fn) }
}
const avisar = (c: GamesChange) => oyentes.forEach((fn) => { try { fn(c) } catch { /* un oyente no rompe el guardado */ } })

function read(): UserGame[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(list: UserGame[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch (e) {
    // Cuota llena o modo privado: mejor avisar que perder el trabajo en silencio.
    throw new Error('No se pudo guardar en este navegador. ' + (e as Error).message)
  }
}

export const listUserGames = (): UserGame[] => read().sort((a, b) => b.updatedAt - a.updatedAt)

export const getUserGame = (id: string): UserGame | undefined => read().find((g) => g.id === id)

export function saveUserGame(game: Omit<UserGame, 'updatedAt'>): UserGame[] {
  const all = read()
  const prev = all.find((g) => g.id === game.id)
  const list = all.filter((g) => g.id !== game.id)
  // Las marcas de la nube se conservan aunque quien guarda no las conozca.
  list.push({ cloud: prev?.cloud, syncedAt: prev?.syncedAt, forkedFrom: prev?.forkedFrom, ...game, updatedAt: Date.now() })
  write(list)
  avisar({ id: game.id, kind: 'save', source: 'local' })
  return list
}

/** Escribe un juego tal cual (con su updatedAt). Para la sincronizacion: no dispara subidas. */
export function putUserGame(game: UserGame, source: 'local' | 'remote' = 'remote'): UserGame[] {
  const list = read().filter((g) => g.id !== game.id)
  list.push(game)
  write(list)
  avisar({ id: game.id, kind: 'save', source })
  return list
}

/** Cambia solo las marcas de la nube, sin tocar updatedAt ni avisar de un cambio de contenido. */
export function setCloudMarks(id: string, marks: Pick<UserGame, 'cloud' | 'syncedAt'>): void {
  const list = read().map((g) => (g.id === id ? { ...g, ...marks } : g))
  write(list)
}

export function deleteUserGame(id: string): UserGame[] {
  const list = read().filter((g) => g.id !== id)
  write(list)
  avisar({ id, kind: 'delete', source: 'local' })
  return list
}

/** Convierte un nombre en un id usable: "Mi Juego 2" -> "mi-juego-2". */
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'juego'
}

/** Id libre dentro de los ya usados. */
export function freeId(base: string, taken: Set<string>): string {
  let id = slugify(base)
  let n = 2
  while (taken.has(id)) id = `${slugify(base)}-${n++}`
  return id
}

/**
 * Paquete estandar de intercambio: es lo que se exporta y lo que se importa.
 * `images` (opcional) son las imagenes propias de los objetos, por nombre: asi
 * un juego compartido llega con sus iconos y no "sin cara".
 */
export function makePackage(template: unknown, items: unknown, images?: Record<string, string>): unknown {
  const pkg: Record<string, unknown> = { zenith: '0.1', exportedAt: new Date().toISOString(), template, items }
  if (images && Object.keys(images).length > 0) pkg.images = images
  return pkg
}

export function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
