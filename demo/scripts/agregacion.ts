/** ¿Que hace el motor cuando dos objetos aportan "30% more damage" cada uno? */
import { solve } from '../src/core/optimizer'
import type { GameTemplate, Item } from '../src/core/types'

const tpl: GameTemplate = {
  schemaVersion: '0.1', gameId: 'poe-test', name: 'PoE (prueba)', description: '',
  stats: [
    { id: 'increased', name: 'increased', unit: 'percent' },
    { id: 'more', name: 'more', unit: 'percent' },
  ],
  slots: [{ id: 'a', name: 'Arma' }, { id: 'b', name: 'Guantes' }],
  sets: [], derived: [],
  objectives: [{
    id: 'dps', name: 'DPS', description: '', kind: 'nonlinear', monotonic: true,
    formula: 'base_baseDmg * (1 + increased/100) * (1 + more/100)',
  }],
  baseProfiles: [{ id: 'p', name: 'Perfil', base: { baseDmg: 100, increased: 0, more: 0 } }],
  constrainableStats: [],
}
const items: Item[] = [
  { id: 'a1', slot: 'a', setId: null, name: 'Arma  +30% more', stats: { more: 30 } },
  { id: 'b1', slot: 'b', setId: null, name: 'Guantes +30% more', stats: { more: 30 } },
]

const r = solve({ template: tpl, items, profileId: 'p', objectiveId: 'dps', constraints: [], topN: 1 })
const motor = r.builds[0].score
const correcto = 100 * 1.30 * 1.30

console.log('\n  Dos objetos, cada uno "+30% more damage", dano base 100\n')
console.log(`  Lo que calcula el motor hoy : ${motor.toFixed(2)}   (suma: 30 + 30 = 60  ->  100 x 1,60)`)
console.log(`  Lo correcto en PoE          : ${correcto.toFixed(2)}   (multiplica: 1,30 x 1,30 = 1,69)`)
console.log(`  Error                       : ${(100 * (correcto - motor) / correcto).toFixed(1)} %\n`)
console.log('  El lenguaje de formulas no tiene la culpa: la formula estaba bien escrita.')
console.log('  El problema es el ACUMULADOR: el motor suma todas las estadisticas.\n')
