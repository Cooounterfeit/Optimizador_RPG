/**
 * Deteccion del tipo de archivo JSON
 * ===================================
 * Un usuario va a soltar aqui cualquier cosa: la plantilla de otro, un paquete
 * exportado desde esta misma app, el export GOOD de Genshin Optimizer, o algo
 * que no tiene nada que ver.
 *
 * Sin esto, todos esos casos terminan en el mismo muro de "falta el campo
 * obligatorio gameId", que no le dice a nadie que hizo mal. Reconocer el
 * archivo permite responder lo unico util: que es lo que trajo y que se puede
 * hacer con ello.
 */

import type { GameTemplate, Item } from '../core/types'

export type Detected =
  | { kind: 'zenith-package'; template: GameTemplate; items: Item[] }
  | { kind: 'template'; template: GameTemplate }
  | { kind: 'items'; items: Item[] }
  | { kind: 'good'; artifacts: number; weapons: number; characters: number }
  | { kind: 'unknown'; reason: string }

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

const looksLikeTemplate = (x: unknown): x is GameTemplate =>
  isObj(x) && Array.isArray(x.stats) && Array.isArray(x.slots) && Array.isArray(x.objectives)

const looksLikeItems = (x: unknown): x is Item[] =>
  Array.isArray(x) && x.length > 0 && x.every((i) => isObj(i) && typeof i.slot === 'string' && isObj(i.stats))

export function detectJsonFile(data: unknown): Detected {
  // Paquete exportado por esta app: { template, items }
  if (isObj(data) && looksLikeTemplate(data.template)) {
    return {
      kind: 'zenith-package',
      template: data.template,
      items: looksLikeItems(data.items) ? data.items : [],
    }
  }

  // Plantilla suelta
  if (looksLikeTemplate(data)) return { kind: 'template', template: data }

  // Export GOOD (Genshin Optimizer, Amenoma Kageuchi y compania)
  if (isObj(data) && (data.format === 'GOOD' || Array.isArray(data.artifacts))) {
    return {
      kind: 'good',
      artifacts: Array.isArray(data.artifacts) ? data.artifacts.length : 0,
      weapons: Array.isArray(data.weapons) ? data.weapons.length : 0,
      characters: Array.isArray(data.characters) ? data.characters.length : 0,
    }
  }

  // Lista suelta de objetos
  if (looksLikeItems(data)) return { kind: 'items', items: data }

  // No es nada reconocible: se explica que falta, en una linea.
  if (isObj(data)) {
    const claves = Object.keys(data).slice(0, 6).join(', ')
    return {
      kind: 'unknown',
      reason: `El archivo es un objeto JSON con las claves [${claves}], pero no es una plantilla de Zenith (le faltan stats, slots u objectives) ni un export GOOD de Genshin.`,
    }
  }
  if (Array.isArray(data)) {
    return {
      kind: 'unknown',
      reason: 'El archivo es una lista, pero sus elementos no parecen objetos de inventario (necesitan al menos "slot" y "stats").',
    }
  }
  return { kind: 'unknown', reason: 'El contenido no es un objeto ni una lista JSON.' }
}

/** Descripcion corta para mostrarle al usuario que reconocio el sistema. */
export function describeDetected(d: Detected): string {
  switch (d.kind) {
    case 'zenith-package':
      return `Paquete de Zenith: la plantilla "${d.template.name}" con ${d.items.length} objetos.`
    case 'template':
      return `Plantilla de Zenith: "${d.template.name}", sin objetos incluidos.`
    case 'items':
      return `Lista de ${d.items.length} objetos, sin plantilla.`
    case 'good':
      return `Export GOOD de Genshin Optimizer: ${d.artifacts} artefactos, ${d.weapons} armas y ${d.characters} personajes.`
    default:
      return d.reason
  }
}
