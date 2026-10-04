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
}

export async function listExamples(): Promise<ExampleInfo[]> {
  const r = await fetch('examples/index.json')
  if (!r.ok) throw new Error('No se encontro el catalogo de ejemplos.')
  return r.json()
}

export async function loadExample(file: string): Promise<ExamplePackage> {
  const r = await fetch(`examples/${file}`)
  if (!r.ok) throw new Error(`No se pudo cargar ${file}.`)
  const data = await r.json()
  return { template: data.template as GameTemplate, items: (data.items ?? []) as Item[] }
}
