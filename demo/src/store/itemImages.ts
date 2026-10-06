/**
 * Imagenes de objetos subidas por el usuario
 * ==========================================
 * La imagen pertenece al TIPO de objeto, no a cada copia del inventario: si
 * tienes cinco "Espada larga", las cinco comparten una sola imagen. La clave es
 * el nombre del objeto normalizado (sin tildes, sin mayusculas, sin el sufijo
 * " · Nv. 90" que agregan algunos importadores).
 *
 * Se guardan en IndexedDB y no en localStorage: localStorage tiene ~5 MB para
 * todo el sitio, y unos cientos de iconos lo llenarian y harian perder los
 * juegos. IndexedDB aguanta cientos de MB.
 *
 * El motor no sabe que existen: son solo presentacion, igual que la portada.
 * Cuando llegue Supabase, este modulo es el que se reemplaza por Storage; las
 * vistas solo usan `useItemImages`.
 */

import type { Item } from '../core/types'

/** Mapa clave de imagen -> data URL, para un juego. */
export type ImageMap = Record<string, string>

const DB_NAME = 'zenith'
const DB_VERSION = 1
const STORE = 'itemImages'

/** Lado del icono guardado, en pixeles. Se muestra a 44-52 px: 128 sobra para pantallas retina. */
export const ICON_SIZE = 128
/** Tope por imagen en un paquete importado (data URL, en caracteres). */
const MAX_DATA_URL = 300_000
const DATA_URL_OK = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/

// ------------------------------------------------------------------ claves

/** "Espada Larga · Nv. 90" -> "espada larga". */
export function normalizeKey(name: string): string {
  return name.split('·')[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export const imageKeyOf = (item: Item): string => normalizeKey(item.name)

/** Nombre de archivo -> clave: "Espada_Larga.png" -> "espada larga". */
export const keyFromFileName = (file: string): string => normalizeKey(file.replace(/\.[a-z0-9]+$/i, ''))

// --------------------------------------------------------------- IndexedDB

interface Row { id: string; gameId: string; key: string; data: string; updatedAt: number }

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const d = req.result
        if (!d.objectStoreNames.contains(STORE)) {
          const s = d.createObjectStore(STORE, { keyPath: 'id' })
          s.createIndex('gameId', 'gameId')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => { dbPromise = null; reject(req.error ?? new Error('No se pudo abrir IndexedDB.')) }
    })
  }
  return dbPromise
}

/** Ejecuta una operacion en una transaccion y espera a que termine de verdad. */
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(req ? req.result : undefined)
    t.onerror = () => reject(t.error ?? new Error('Error de IndexedDB.'))
    t.onabort = () => reject(t.error ?? new Error('Operacion cancelada (¿sin espacio?).'))
  })
}

const rowId = (gameId: string, key: string) => `${gameId}::${key}`

async function rowsOf(gameId: string): Promise<Row[]> {
  const rows = await tx<Row[]>('readonly', (s) => s.index('gameId').getAll(gameId) as IDBRequest<Row[]>)
  return rows ?? []
}

// ------------------------------------------------------------- avisos

/** Las vistas se suscriben para refrescarse cuando cambia algo de un juego. */
const listeners = new Set<(gameId: string) => void>()
export function onImagesChanged(fn: (gameId: string) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const notify = (gameId: string) => listeners.forEach((fn) => fn(gameId))

// ------------------------------------------------------------- API

export async function getImages(gameId: string): Promise<ImageMap> {
  const out: ImageMap = {}
  for (const r of await rowsOf(gameId)) out[r.key] = r.data
  return out
}

export async function setImage(gameId: string, key: string, data: string): Promise<void> {
  if (!DATA_URL_OK.test(data)) throw new Error('Formato de imagen no admitido.')
  await tx('readwrite', (s) => s.put({ id: rowId(gameId, key), gameId, key, data, updatedAt: Date.now() } satisfies Row))
  notify(gameId)
}

export async function removeImage(gameId: string, key: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(rowId(gameId, key)))
  notify(gameId)
}

/** Borra todas las imagenes de un juego (al borrar el juego). */
export async function deleteGameImages(gameId: string): Promise<void> {
  const rows = await rowsOf(gameId)
  if (rows.length === 0) return
  await tx('readwrite', (s) => { for (const r of rows) s.delete(r.id) })
  notify(gameId)
}

/** Copia las imagenes de un juego a otro (al duplicar o bifurcar). */
export async function copyGameImages(fromId: string, toId: string): Promise<void> {
  const imgs = await getImages(fromId)
  await importImages(toId, imgs)
}

/**
 * Guarda un lote de imagenes. Lo que no sea una imagen valida y razonable se
 * descarta en silencio: un paquete ajeno no puede meter otra cosa ni llenar el
 * disco con un archivo de 20 MB disfrazado de icono.
 */
export async function importImages(gameId: string, images: ImageMap): Promise<number> {
  const ok = Object.entries(sanitizeImages(images))
  if (ok.length === 0) return 0
  const now = Date.now()
  await tx('readwrite', (s) => {
    for (const [key, data] of ok) s.put({ id: rowId(gameId, key), gameId, key, data, updatedAt: now } satisfies Row)
  })
  notify(gameId)
  return ok.length
}

/** Filtra un mapa de imagenes que viene de fuera (paquete importado). */
export function sanitizeImages(raw: unknown): ImageMap {
  const out: ImageMap = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string' || v.length > MAX_DATA_URL || !DATA_URL_OK.test(v)) continue
    const key = normalizeKey(k)
    if (key) out[key] = v
  }
  return out
}

/** Solo las imagenes de objetos que existen en el inventario (para exportar). */
export function imagesForItems(all: ImageMap, items: Item[]): ImageMap {
  const keys = new Set(items.map(imageKeyOf))
  const out: ImageMap = {}
  for (const [k, v] of Object.entries(all)) if (keys.has(k)) out[k] = v
  return out
}

// ---------------------------------------------------------- redimensionar

/**
 * Redibuja la imagen en un cuadrado de ICON_SIZE, ENTERA y centrada (sin
 * recortar: un icono de espada alargado no puede perder la punta), con fondo
 * transparente. WebP conserva la transparencia y pesa poco; si el navegador no
 * sabe generar WebP, toDataURL devuelve PNG, que tambien sirve.
 */
export function shrinkIcon(file: File): Promise<string> {
  return shrinkImage(file, ICON_SIZE, ICON_SIZE)
}

/** Clave de imagen del retrato de un perfil (personaje) en la hoja de personaje. */
export const portraitKey = (profileId: string) => normalizeKey(`retrato ${profileId}`)

/**
 * Redimensiona a un rectangulo de `W` x `H`, con la imagen ENTERA y centrada.
 * Comprime a WebP con dos pasadas para que no pase de ~120 KB.
 */
export function shrinkImage(file: File, W: number, H: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error(`"${file.name}" no es una imagen.`)); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const ctx = c.getContext('2d')
      if (!ctx) { reject(new Error('Este navegador no permite redimensionar.')); return }
      const escala = Math.min(W / img.width, H / img.height)
      const w = img.width * escala, h = img.height * escala
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
      let out = c.toDataURL('image/webp', 0.86)
      if (out.length > 160_000) out = c.toDataURL('image/webp', 0.6)
      resolve(out)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`No se pudo leer "${file.name}".`)) }
    img.src = url
  })
}
