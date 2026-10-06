/**
 * El diagrama no puede mentir
 * ===========================
 * El grafo de formulas anota cada nodo con su valor en la build ganadora. Si
 * ese numero no es EXACTAMENTE el que calculo el motor, el diagrama esta
 * explicando un calculo que no ocurrio, y eso es peor que no dibujar nada.
 *
 * Este script resuelve de verdad y compara, objetivo por objetivo, el valor que
 * reconstruye `explainBuild` con la puntuacion que devolvio `solve`.
 *
 *   npx tsx scripts/grafo.ts
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { solve, explainBuild } from '../src/core/optimizer'
import { buildGraph, varsOf } from '../src/core/graph'
import type { GameTemplate, Item } from '../src/core/types'

const DIR = 'public/examples'
const paquetes = readdirSync(DIR).filter((f) => f.endsWith('.zenith.json'))

let fallos = 0

for (const f of paquetes) {
  const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
  const template = raw.template as GameTemplate
  const items = (raw.items ?? []) as Item[]
  console.log('\n' + '─'.repeat(74))
  console.log(`  ${template.name}`)

  if (items.length === 0) {
    console.log('  (sin objetos en el paquete: solo se comprueba la forma del grafo)')
  }

  for (const objective of template.objectives) {
    const g = buildGraph(template, objective)

    // 1. Toda variable de toda formula alcanzada tiene que ser un nodo.
    const ids = new Set(g.nodes.map((n) => n.id))
    const huerfanas: string[] = []
    for (const n of g.nodes) {
      if (!n.formula) continue
      for (const v of varsOf(n.formula)) if (v !== n.id && !ids.has(v)) huerfanas.push(v)
    }

    // 2. Ninguna arista puede ir hacia atras: seria imposible de leer.
    const capa = new Map(g.nodes.map((n) => [n.id, n.layer]))
    const atras = g.edges.filter((e) => (capa.get(e.from) ?? 0) >= (capa.get(e.to) ?? 0))

    const forma = huerfanas.length === 0 && atras.length === 0
    if (!forma) fallos++

    // 3. Y lo que de verdad importa: el numero del grafo es el del motor.
    let numeros = '—'
    if (items.length > 0) {
      const profileId = template.baseProfiles[0].id
      const r = solve({ template, items, profileId, objectiveId: objective.id, constraints: [], topN: 1 },
        { deadlineMs: 20_000 })
      const best = r.builds[0]
      if (!best) {
        numeros = 'sin build'
      } else {
        const vals = explainBuild(template, profileId, objective.id, best.finalStats)
        const enGrafo = vals.get(objective.id) ?? NaN
        const rel = Math.abs(enGrafo - best.score) / Math.max(1e-9, Math.abs(best.score))
        const ok = rel < 1e-9
        if (!ok) fallos++
        numeros = ok
          ? `motor ${best.score.toFixed(4)} = grafo ${enGrafo.toFixed(4)}`
          : `✗ motor ${best.score.toFixed(4)} ≠ grafo ${enGrafo.toFixed(4)}`
      }
    }

    console.log(
      `  ${forma && !numeros.startsWith('✗') ? '✓' : '✗'} ${objective.name.padEnd(26)}` +
      `${String(g.nodes.length).padStart(3)} nodos · ${g.layers} niveles · ${numeros}`,
    )
    if (huerfanas.length) console.log(`      variables sin nodo: ${huerfanas.join(', ')}`)
    if (atras.length) console.log(`      aristas hacia atras: ${atras.map((e) => `${e.from}→${e.to}`).join(', ')}`)
  }
}

console.log('\n' + '─'.repeat(74))
console.log(fallos === 0 ? '  Todo correcto.' : `  ${fallos} comprobacion(es) fallida(s).`)
process.exit(fallos === 0 ? 0 : 1)
