/**
 * Prueba de los ejes nuevos del motor: requisitos, presupuesto, exclusion
 * mutua y agregacion multiplicativa.
 *   npx tsx scripts/ejes.ts
 */
import { readFileSync } from 'node:fs'
import { solve, solveBruteForce } from '../src/core/optimizer'
import type { GameTemplate, Item } from '../src/core/types'

const t = JSON.parse(readFileSync('public/examples/souls.zenith.json', 'utf8')).template as GameTemplate
const items = JSON.parse(readFileSync('public/examples/souls.zenith.json', 'utf8')).items as Item[]
const f = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 0 })
const name = (id: string) => items.find((i) => i.id === id)?.name ?? id

console.log(`\n  ${t.name} — ${f(items.length)} piezas, 8 ranuras\n`)

// ---- 1. Requisitos de atributo -------------------------------------------
console.log('  1. REQUISITOS DE ATRIBUTO')
for (const p of t.baseProfiles) {
  const r = solve({ template: t, items, profileId: p.id, objectiveId: 'dano', constraints: [], topN: 1 })
  console.log(`     ${p.name.padEnd(26)} descarta ${String(r.stats.requirementFiltered).padStart(2)} piezas  →  empuna ${name(r.builds[0]?.itemIds[0] ?? '')}`)
}

// ---- 2. Presupuesto de carga ---------------------------------------------
console.log('\n  2. PRESUPUESTO DE CARGA (un maximo: menos es mejor)')
for (const max of [58, 40, 26, 18]) {
  const r = solve({
    template: { ...t, budgets: [{ statId: 'weight', max }] },
    items, profileId: 'guerrero', objectiveId: 'tanque', constraints: [], topN: 1,
  })
  const b = r.builds[0]
  console.log(b
    ? `     carga <= ${String(max).padStart(2)}   ${String(r.stats.elapsedMs).padStart(5)} ms   peso usado ${b.finalStats.weight.toFixed(1).padStart(5)}   supervivencia ${f(b.score)}`
    : `     carga <= ${String(max).padStart(2)}   sin solucion factible`)
}

// ---- 3. Exclusion mutua entre ranuras -------------------------------------
console.log('\n  3. EXCLUSION MUTUA (3 ranuras de talisman, mismo inventario)')
const r3 = solve({ template: t, items, profileId: 'guerrero', objectiveId: 'tanque', constraints: [], topN: 1 })
const tals = r3.builds[0].itemIds.slice(5).map(name)
console.log(`     talismanes elegidos: ${tals.join(' · ')}`)
console.log(`     ${new Set(tals).size === 3 ? 'los tres son distintos — correcto' : '⚠ HAY REPETIDOS'}`)

// ---- 4. Agregacion multiplicativa -----------------------------------------
console.log('\n  4. AGREGACION MULTIPLICATIVA (dmgMult acumula multiplicando)')
const r4 = solve({ template: t, items, profileId: 'bandido', objectiveId: 'dano', constraints: [], topN: 1 })
const b4 = r4.builds[0]
const fuentes = b4.itemIds.map((id) => items.find((i) => i.id === id)!)
  .filter((i) => i.stats.dmgMult).map((i) => `${i.name} +${i.stats.dmgMult}%`)
const sumado = fuentes.reduce((a, s) => a + Number(s.match(/\+(\d+)%/)![1]), 0)
console.log(`     fuentes: ${fuentes.join(' · ')}`)
console.log(`     si se sumaran seria x${(1 + sumado / 100).toFixed(4)}   |   multiplicando da x${b4.finalStats.dmgMult.toFixed(4)}`)

// ---- 5. Correctitud contra fuerza bruta -----------------------------------
console.log('\n  5. CORRECTITUD (subconjunto pequeno, contra fuerza bruta)')
const sub: Item[] = []
for (const s of t.slots) sub.push(...items.filter((i) => i.slot === s.id).slice(0, 3))
for (const obj of ['dano', 'tanque', 'defensa']) {
  const req = { template: t, items: sub, profileId: 'guerrero', objectiveId: obj, constraints: [], topN: 1 }
  const bb = solve(req); const bf = solveBruteForce(req)
  const ok = bf && Math.abs(bb.builds[0].score - bf.score) < 1e-6
  console.log(`     [${ok ? 'OK ' : 'FALLO'}] ${obj.padEnd(8)} B&B=${bb.builds[0].score.toFixed(4)}  fuerza bruta=${bf?.score.toFixed(4)}`)
}
console.log('')

// ---- 6. Objetivo no monotono: el motor cambia de modo ---------------------
console.log('  6. OBJETIVO NO MONOTONO (el motor lo detecta y cambia de modo)')
for (const obj of ['tanque', 'tanqueAgil']) {
  const r = solve({ template: t, items, profileId: 'guerrero', objectiveId: obj, constraints: [], topN: 1 })
  const b = r.builds[0]
  console.log(`     ${obj.padEnd(11)} modo ${r.stats.mode.padEnd(11)} demostrado=${String(r.stats.provenOptimal).padEnd(5)} ` +
              `${String(r.stats.elapsedMs).padStart(5)} ms   peso ${b.finalStats.weight.toFixed(1).padStart(5)}   puntaje ${f(b.score)}`)
}
console.log('')
