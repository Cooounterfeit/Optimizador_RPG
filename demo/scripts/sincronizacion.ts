/**
 * Pruebas del plan de sincronizacion con la nube (TEC-08). Sale con codigo 1 si algo falla.
 *   npx tsx scripts/sincronizacion.ts
 */
import { planSync, type LocalMeta, type RemoteMeta } from '../src/cloud/syncPlan'

let fallos = 0
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) fallos++
  console.log(`  [${ok ? 'OK ' : 'FALLO'}] ${label}${detail ? `  ${detail}` : ''}`)
}
const accion = (l: LocalMeta[], r: RemoteMeta[], ign?: Set<string>) => planSync(l, r, ign)[0]?.kind
const H = 3_600_000

console.log('Un solo lado')
check(accion([{ id: 'a', updatedAt: 10 * H, cloud: true }], []) === 'push', 'local con nube activa y nada arriba: sube')
check(accion([{ id: 'a', updatedAt: 10 * H }], []) === 'none', 'local sin nube activa: no se toca')
check(accion([], [{ id: 'a', updatedAt: 10 * H }]) === 'pull', 'solo en la nube: se baja (otro dispositivo)')
check(accion([], [{ id: 'a', updatedAt: 10 * H }], new Set(['a'])) === 'remote-only', 'borrado aqui a proposito: queda solo en la nube')

console.log('Los dos lados')
const base = 10 * H
check(accion([{ id: 'a', updatedAt: base, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base }]) === 'none', 'iguales: nada')
check(accion([{ id: 'a', updatedAt: base + H, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base }]) === 'push', 'cambio solo aqui: sube')
check(accion([{ id: 'a', updatedAt: base, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base + H }]) === 'pull', 'cambio solo en la nube: baja')
check(accion([{ id: 'a', updatedAt: base + H, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base + 2 * H }]) === 'conflict', 'cambiaron los dos: conflicto')
check(accion([{ id: 'a', updatedAt: base + 300, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base }]) === 'none', 'diferencias de menos de 1 s no cuentan')
check(accion([{ id: 'a', updatedAt: base }], [{ id: 'a', updatedAt: base + H }]) === 'conflict', 'dispositivo nuevo con el mismo juego distinto: pregunta')
check(accion([{ id: 'a', updatedAt: base }], [{ id: 'a', updatedAt: base }]) === 'none', 'dispositivo nuevo con el mismo juego identico: nada')
check(accion([{ id: 'a', updatedAt: base + H, cloud: false, syncedAt: base }], [{ id: 'a', updatedAt: base + 2 * H }]) === 'none', 'nube apagada para ese juego: no se toca')

console.log('Varios juegos')
const plan = planSync(
  [{ id: 'a', updatedAt: 5, cloud: true }, { id: 'b', updatedAt: 5 }, { id: 'c', updatedAt: base + H, cloud: true, syncedAt: base }],
  [{ id: 'c', updatedAt: base }, { id: 'd', updatedAt: 1 }],
)
check(plan.map((p) => `${p.id}:${p.kind}`).join(' ') === 'a:push b:none c:push d:pull', 'una accion por juego, en orden', plan.map((p) => `${p.id}:${p.kind}`).join(' '))

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
