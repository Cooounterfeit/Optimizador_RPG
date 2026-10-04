/**
 * Banco de pruebas del motor. Se ejecuta fuera del navegador:
 *   npx tsx scripts/bench.ts
 *
 * Verifica tres cosas:
 *   1. Que el branch and bound coincide EXACTAMENTE con la fuerza bruta
 *      sobre un subconjunto pequeno (correctitud del optimo).
 *   2. Que resuelve el inventario completo en tiempo razonable.
 *   3. Que las restricciones (HU04) se respetan y aceleran la busqueda.
 */
import { readFileSync } from 'node:fs'
import { solve, solveBruteForce } from '../src/core/optimizer'
import { importGood } from '../src/adapters/goodImport'
import type { GameTemplate, Item } from '../src/core/types'

const template = JSON.parse(readFileSync('public/examples/genshin.zenith.json', 'utf8')).template as GameTemplate
const good = JSON.parse(readFileSync(process.argv[2] ?? 'public/sample-good.json', 'utf8'))
const { items } = importGood(good, { minLevel: 0, minRarity: 4 })

const fmt = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 0 })

console.log(`\nInventario: ${fmt(items.length)} artefactos\n`)

// ---- 1. Correctitud contra fuerza bruta ----------------------------------
function subset(perSlot: number): Item[] {
  const out: Item[] = []
  for (const s of template.slots) out.push(...items.filter((i) => i.slot === s.id).slice(0, perSlot))
  return out
}

let allMatch = true
for (const objectiveId of ['maxHp', 'dps', 'dpsReaction']) {
  const small = subset(7)
  const req = { template, items: small, profileId: 'navia', objectiveId, constraints: [], topN: 1 }
  const bb = solve(req)
  const bf = solveBruteForce(req)
  const ok = bf !== null && Math.abs(bb.builds[0].score - bf.score) < 1e-6
  allMatch &&= ok
  console.log(`  [${ok ? 'OK ' : 'FALLO'}] ${objectiveId.padEnd(12)} B&B=${bb.builds[0].score.toFixed(4)}  fuerza bruta=${bf?.score.toFixed(4)}  (evaluadas ${fmt(bb.stats.evaluated)} de ${fmt(bb.stats.totalCombinations)})`)
}
console.log(`\n  Correctitud: ${allMatch ? 'el optimo coincide en todos los casos' : 'HAY DISCREPANCIAS'}\n`)

// ---- 2. Inventario completo ----------------------------------------------
for (const objectiveId of ['maxHp', 'dps', 'dpsReaction']) {
  const r = solve({ template, items, profileId: 'navia', objectiveId, constraints: [], topN: 3 })
  const pct = (100 * (1 - r.stats.evaluated / r.stats.totalCombinations)).toFixed(6)
  console.log(`  ${objectiveId.padEnd(12)} ${String(r.stats.elapsedMs).padStart(6)} ms  espacio ${fmt(r.stats.totalCombinations).padStart(20)}  evaluadas ${fmt(r.stats.evaluated).padStart(10)}  podado ${pct}%  dominados ${fmt(r.stats.dominated)}`)
}

// ---- 3. Restricciones (HU04) ---------------------------------------------
console.log('')
for (const min of [50, 70, 80]) {
  const r = solve({
    template, items, profileId: 'navia', objectiveId: 'dps',
    constraints: [{ statId: 'critRate_', min }], topN: 1,
  })
  const ok = r.builds.length > 0 ? r.builds[0].finalStats.critRate_ >= min - 1e-9 : false
  console.log(`  critRate_ >= ${String(min).padStart(3)}%  ${String(r.stats.elapsedMs).padStart(6)} ms  ${r.builds.length ? `logrado ${r.builds[0].finalStats.critRate_.toFixed(1)}% ${ok ? 'OK' : 'FALLO'}` : 'sin solucion factible'}`)
}
console.log('')
