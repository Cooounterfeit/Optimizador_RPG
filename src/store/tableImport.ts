/**
 * Importador de tablas
 * ====================
 * La forma mas rapida de meter items en un juego nuevo no es un formulario:
 * es pegar la tabla de una wiki o de una planilla. Este modulo detecta el
 * separador, lee las cabeceras y propone a que corresponde cada columna.
 *
 * Es deliberadamente agnostico: no sabe de ningun juego, solo compara los
 * nombres de las columnas contra las estadisticas que declare la plantilla.
 */

import type { GameTemplate, Item } from '../core/types'

export type ColumnRole =
  | { kind: 'ignore' }
  | { kind: 'name' }
  | { kind: 'slot' }
  | { kind: 'set' }
  | { kind: 'rarity' }
  | { kind: 'level' }
  | { kind: 'stat'; statId: string }

export interface ParsedTable {
  headers: string[]
  rows: string[][]
  delimiter: string
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function parseTable(text: string): ParsedTable | null {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return null

  // Se elige el separador que produce mas columnas de forma consistente.
  const candidates = ['\t', ';', ',', '|']
  let delimiter = '\t'
  let bestScore = -1
  for (const d of candidates) {
    const counts = lines.slice(0, 12).map((l) => l.split(d).length)
    const first = counts[0]
    if (first < 2) continue
    const consistent = counts.filter((c) => c === first).length / counts.length
    const score = first * consistent
    if (score > bestScore) { bestScore = score; delimiter = d }
  }
  if (bestScore < 0) return null

  const split = (l: string) => l.split(delimiter).map((c) => c.trim())
  const headers = split(lines[0])
  const rows = lines.slice(1).map(split).filter((r) => r.some((c) => c.length > 0))
  return { headers, rows, delimiter }
}

const NAME_WORDS = ['nombre', 'name', 'item', 'objeto', 'pieza', 'arma', 'equipo']
const SLOT_WORDS = ['ranura', 'slot', 'tipo', 'type', 'parte', 'categoria', 'category']
const SET_WORDS = ['conjunto', 'set', 'familia', 'family']
const RARITY_WORDS = ['rareza', 'rarity', 'estrellas', 'stars', 'tier']
const LEVEL_WORDS = ['nivel', 'level', 'lvl', 'nv']

/** Propone un rol para cada columna comparando su cabecera con la plantilla. */
export function guessRoles(headers: string[], template: GameTemplate): ColumnRole[] {
  const statByNorm = new Map<string, string>()
  for (const s of template.stats) {
    statByNorm.set(norm(s.id), s.id)
    statByNorm.set(norm(s.name), s.id)
  }
  let nameTaken = false
  return headers.map((h) => {
    const n = norm(h)
    if (!n) return { kind: 'ignore' } as ColumnRole
    const stat = statByNorm.get(n)
    if (stat) return { kind: 'stat', statId: stat }
    if (!nameTaken && NAME_WORDS.some((w) => n.includes(w))) { nameTaken = true; return { kind: 'name' } }
    if (SLOT_WORDS.some((w) => n.includes(w))) return { kind: 'slot' }
    if (SET_WORDS.some((w) => n.includes(w))) return { kind: 'set' }
    if (RARITY_WORDS.some((w) => n.includes(w))) return { kind: 'rarity' }
    if (LEVEL_WORDS.some((w) => n.includes(w))) return { kind: 'level' }
    // Coincidencia parcial con alguna estadistica, como ultimo recurso.
    for (const [k, id] of statByNorm) if (k.length > 3 && (n.includes(k) || k.includes(n))) return { kind: 'stat', statId: id }
    return { kind: 'ignore' }
  })
}

export interface BuildResultReport {
  items: Item[]
  skipped: number
  problems: string[]
}

/** Acepta "12", "12%", "+12", "1.234,5" y devuelve un numero. */
function toNumber(raw: string): number | null {
  if (!raw) return null
  let s = raw.replace(/[%+\s]/g, '')
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function buildItems(
  table: ParsedTable, roles: ColumnRole[], template: GameTemplate, idPrefix = 'u',
): BuildResultReport {
  const problems: string[] = []
  const slotByNorm = new Map<string, string>()
  for (const s of template.slots) { slotByNorm.set(norm(s.id), s.id); slotByNorm.set(norm(s.name), s.id) }
  const setByNorm = new Map<string, string>()
  for (const s of template.sets ?? []) { setByNorm.set(norm(s.id), s.id); setByNorm.set(norm(s.name), s.id) }

  const hasSlotColumn = roles.some((r) => r.kind === 'slot')
  const unknownSlots = new Set<string>()
  const unknownSets = new Set<string>()
  const items: Item[] = []
  let skipped = 0

  table.rows.forEach((row, i) => {
    const stats: Record<string, number> = {}
    let name = ''
    let slot: string | null = hasSlotColumn ? null : template.slots[0].id
    let setId: string | null = null
    let rarity: number | undefined
    let level: number | undefined

    roles.forEach((role, c) => {
      const raw = row[c] ?? ''
      switch (role.kind) {
        case 'name': name = raw; break
        case 'slot': {
          const s = slotByNorm.get(norm(raw))
          if (s) slot = s
          else if (raw) unknownSlots.add(raw)
          break
        }
        case 'set': {
          const s = setByNorm.get(norm(raw))
          if (s) setId = s
          else if (raw) unknownSets.add(raw)
          break
        }
        case 'rarity': { const n = toNumber(raw); if (n !== null) rarity = n; break }
        case 'level': { const n = toNumber(raw); if (n !== null) level = n; break }
        case 'stat': { const n = toNumber(raw); if (n !== null && n !== 0) stats[role.statId] = n; break }
        default: break
      }
    })

    if (!slot) { skipped++; return }
    items.push({
      id: `${idPrefix}${i}`,
      slot,
      setId,
      name: name || `Pieza ${i + 1}`,
      rarity, level, stats,
    })
  })

  if (unknownSlots.size > 0) {
    problems.push(`Ranuras no reconocidas (esas filas se descartaron): ${[...unknownSlots].slice(0, 6).join(', ')}`)
  }
  if (unknownSets.size > 0) {
    problems.push(`Conjuntos no reconocidos (quedan sin bono): ${[...unknownSets].slice(0, 6).join(', ')}`)
  }
  if (!roles.some((r) => r.kind === 'stat')) {
    problems.push('Ninguna columna esta mapeada a una estadistica: los objetos no aportarian nada.')
  }
  return { items, skipped, problems }
}
