/**
 * Ejemplos cargables
 * ==================
 * La aplicacion arranca VACIA: no trae ningun juego incorporado. Un optimizador
 * que ya viene con Genshin dentro parece una herramienta de Genshin; uno que
 * arranca en blanco deja claro que el producto es el motor y que los juegos son
 * contenido.
 *
 * Los tres juegos que antes venian compilados ahora son paquetes normales,
 * exactamente del mismo formato que exporta cualquier usuario. Se cargan desde
 * /examples solo si alguien los pide.
 */

import type { GameTemplate, Item } from '../core/types'
import { sanitizeImages, type ImageMap } from './itemImages'
import { fetchJson } from '../ui/errors'

export interface ExampleInfo {
  id: string
  file: string
  name: string
  items: number
  description: string
}

export interface ExamplePackage {
  template: GameTemplate
  items: Item[]
  images: ImageMap
}

export async function listExamples(): Promise<ExampleInfo[]> {
  const data = await fetchJson<unknown>(`${import.meta.env.BASE_URL}examples/index.json`)
  if (!Array.isArray(data)) throw new Error('El catálogo de ejemplos no tiene el formato esperado.')
  return data as ExampleInfo[]
}

export async function loadExample(file: string): Promise<ExamplePackage> {
  const data = await fetchJson<{ template?: GameTemplate; items?: Item[]; images?: unknown }>(`${import.meta.env.BASE_URL}examples/${file}`, { timeoutMs: 30_000 })
  if (!data?.template) throw new Error(`"${file}" no es un paquete de juego válido.`)
  return {
    template: data.template as GameTemplate,
    items: (data.items ?? []) as Item[],
    images: sanitizeImages(data.images),
  }
}
