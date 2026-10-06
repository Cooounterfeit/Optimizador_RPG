/**
 * Valida las plantillas incluidas y, de paso, una rota a proposito.
 *   npx tsx scripts/validar.ts
 */
import { readFileSync } from 'node:fs'
import { validateTemplate } from '../src/core/validate'
import { importGood } from '../src/adapters/goodImport'
import type { GameTemplate, Item } from '../src/core/types'

const ICON = { error: '  ✗', warning: '  !', info: '  ·' } as const

function informe(nombre: string, tpl: unknown, items?: Item[]) {
  const r = validateTemplate(tpl, items)
  console.log(`\n${'─'.repeat(78)}\n  ${nombre}   →   ${r.ok ? 'VALIDA' : 'NO SE PUEDE USAR'}`)
  const s = r.summary
  console.log(`  ${s.stats} estadisticas · ${s.slots} ranuras · ${s.sets} conjuntos · ` +
              `${s.objectives} objetivos (${s.monotonicOk} monotonos) · ${s.profiles} perfiles`)
  if (r.issues.length === 0) console.log('  sin observaciones')
  for (const i of r.issues) {
    console.log(`${ICON[i.severity]} ${i.where ? `[${i.where}] ` : ''}${i.message}`)
  }
  if (r.selfTests.length) {
    console.log('  autopruebas:')
    for (const t of r.selfTests) console.log(`    ${t.passed ? '✓' : '✗'} ${t.name} — ${t.detail}`)
  }
}

const genshin = JSON.parse(readFileSync('public/examples/genshin.zenith.json', 'utf8')).template as GameTemplate
const terraria = JSON.parse(readFileSync('public/examples/terraria.zenith.json', 'utf8')).template as GameTemplate
const terrariaItems = JSON.parse(readFileSync('public/examples/terraria.zenith.json', 'utf8')).items as Item[]
const { items: giItems } = importGood(JSON.parse(readFileSync('public/sample-good.json', 'utf8')), { minLevel: 16 })

const souls = JSON.parse(readFileSync('public/examples/souls.zenith.json', 'utf8')).template as GameTemplate
const soulsItems = JSON.parse(readFileSync('public/examples/souls.zenith.json', 'utf8')).items as Item[]

informe('Genshin Impact', genshin, giItems)
informe('Souls (simplificado)', souls, soulsItems)
informe('Terraria', terraria, terrariaItems)

// --- Una plantilla escrita por alguien que se equivoco en todo lo que se puede ---
const rota = {
  schemaVersion: '0.2',
  gameId: 'rota', name: 'Plantilla rota', description: '',
  stats: [{ id: 'atk', name: 'atk', unit: 'flat' }, { id: 'atk', name: 'repetida', unit: 'flat' },
          { id: 'er', name: 'recarga', unit: 'percent' }],
  slots: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  sets: [{ id: 's1', name: 'Conjunto imposible', tiers: [{ pieces: 7, label: '7pz', effects: { noExiste: 10 } }] }],
  derived: [
    { id: 'x', name: 'x', formula: 'y * 2' },
    { id: 'y', name: 'y', formula: 'x + 1' },
  ],
  objectives: [{ id: 'o', name: 'o', description: '', kind: 'linear', monotonic: true, formula: 'atk * ' }],
  baseProfiles: [{ id: 'p', name: 'p', base: { atk: 100 } }],
  constrainableStats: [],
}
informe('Plantilla rota (a proposito)', rota)

// --- Una plantilla valida pero con un objetivo que NO es monotono ---
const noMonotona = {
  ...terraria,
  selfTests: [],
  objectives: [{
    id: 'exacto', name: 'Defensa exactamente 100', description: '',
    kind: 'nonlinear', monotonic: true,
    formula: '1000 - abs(defense - 100)',
  }],
}
informe('Objetivo no monotono declarado como monotono', noMonotona, terrariaItems)
console.log('')
