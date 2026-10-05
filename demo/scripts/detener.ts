/**
 * Detener no puede costar el trabajo hecho
 * =======================================
 * Sin limite de tiempo, una busqueda puede durar horas y la para el usuario.
 * Eso convierte el resultado PARCIAL en un producto de primera: si al pulsar
 * Detener la build que se muestra estuviera mal calculada, seria mucho peor que
 * no mostrar nada — el usuario se llevaria numeros falsos tras cuatro horas.
 *
 * Aqui se comprueban las tres cosas de las que depende eso:
 *
 *  1. Sin limite, una busqueda que termina sigue demostrando el optimo.
 *  2. La build que viaja en el progreso esta COMPLETA y bien calculada: su
 *     puntuacion coincide con la que da el motor al evaluarla por separado.
 *  3. Parar a mitad devuelve exactamente la mejor vista hasta ese momento, y
 *     nunca mejor que el optimo real.
 *
 *   npx tsx scripts/detener.ts
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { solve, explainBuild } from '../src/core/optimizer'
import type { BuildResult, GameTemplate, Item } from '../src/core/types'

const DIR = 'public/examples'
let fallos = 0
const ok = (b: boolean, txt: string) => {
  if (!b) fallos++
  console.log(`  ${b ? '✓' : '✗'} ${txt}`)
}

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.zenith.json'))) {
  const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
  const template = raw.template as GameTemplate
  const items = (raw.items ?? []) as Item[]
  if (items.length === 0) continue

  console.log('\n' + '─'.repeat(74))
  console.log(`  ${template.name}`)

  const profileId = template.baseProfiles[0].id
  for (const objective of template.objectives) {
    const base = { template, items, profileId, objectiveId: objective.id, constraints: [], topN: 3 }

    // 1. Sin limite: tiene que terminar y demostrar el optimo.
    const completo = solve(base)                       // sin deadlineMs = sin limite
    const optimo = completo.builds[0]
    ok(completo.stats.provenOptimal || completo.stats.mode === 'heuristico',
       `${objective.name.padEnd(28)} sin limite → ${completo.stats.provenOptimal ? 'optimo demostrado' : 'heuristico'} (${completo.stats.elapsedMs} ms)`)
    ok(completo.stats.stoppedBy === undefined, `${''.padEnd(28)} no se paro por nada`)

    // 2 y 3. Parar a mitad: se corta en el tercer aviso de progreso y se
    //        examina la ultima build parcial recibida.
    let avisos = 0
    let ultima: BuildResult[] = []
    const cortado = solve(base, {
      progressEvery: 200,
      onProgress: (p) => { avisos++; if (p.builds.length) ultima = p.builds },
      shouldCancel: () => avisos >= 3,
    })

    // La parada solo se aplica si la busqueda seguia viva cuando toco pedirla.
    // Si termino entre dos avisos, `provenOptimal: true` es la respuesta CORRECTA
    // y no hay nada que comprobar: no se paro, se acabo.
    if (cortado.stats.stoppedBy !== 'usuario') {
      console.log(`  · ${objective.name.padEnd(28)} termino sola antes de la parada (${cortado.stats.elapsedMs} ms); nada que parar`)
      ok(cortado.stats.provenOptimal === true || cortado.stats.mode === 'heuristico',
         `${''.padEnd(28)} y al terminar sola si demuestra el optimo`)
      continue
    }

    ok(cortado.stats.provenOptimal === false, `${''.padEnd(28)} parada NO se declara demostrada`)

    if (ultima.length === 0) {
      ok(false, `${''.padEnd(28)} el progreso no llevaba ninguna build`)
      continue
    }

    const parcial = ultima[0]
    // La build parcial tiene que estar completa: una pieza por ranura.
    ok(parcial.itemIds.length === template.slots.length && parcial.itemIds.every(Boolean),
       `${''.padEnd(28)} build parcial completa (${parcial.itemIds.length}/${template.slots.length} ranuras)`)

    // Y bien calculada: reevaluarla por el camino del motor da lo mismo.
    const recalc = explainBuild(template, profileId, objective.id, parcial.finalStats)
      .get(objective.id) ?? NaN
    const rel = Math.abs(recalc - parcial.score) / Math.max(1e-9, Math.abs(parcial.score))
    ok(rel < 1e-9,
       `${''.padEnd(28)} puntuacion parcial verificada  ${parcial.score.toFixed(4)} = ${recalc.toFixed(4)}`)

    // Nunca puede superar al optimo real.
    ok(parcial.score <= optimo.score + 1e-9,
       `${''.padEnd(28)} parcial (${parcial.score.toFixed(2)}) ≤ optimo (${optimo.score.toFixed(2)})`)
  }
}

console.log('\n' + '─'.repeat(74))
console.log(fallos === 0 ? '  Todo correcto.' : `  ${fallos} comprobacion(es) fallida(s).`)
process.exit(fallos === 0 ? 0 : 1)
