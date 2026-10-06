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
}

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

export function saveUserGame(game: Omit<UserGame, 'updatedAt'>): UserGame[] {
  const list = read().filter((g) => g.id !== game.id)
  list.push({ ...game, updatedAt: Date.now() })
  write(list)
  return list
}

export function deleteUserGame(id: string): UserGame[] {
  const list = read().filter((g) => g.id !== id)
  write(list)
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

/** Paquete estandar de intercambio: es lo que se exporta y lo que se importa. */
export function makePackage(template: unknown, items: unknown): unknown {
  return { zenith: '0.1', exportedAt: new Date().toISOString(), template, items }
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
