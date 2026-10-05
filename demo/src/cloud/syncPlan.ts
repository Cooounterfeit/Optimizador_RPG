/**
 * Plan de sincronizacion (TEC-08) — logica pura, sin red.
 * ======================================================
 * Para cada juego decide que hacer comparando tres marcas de tiempo:
 *
 *   local.updatedAt   cuando cambio en este dispositivo
 *   remote.updatedAt  cuando cambio en el dispositivo que lo subio a la nube
 *   local.syncedAt    la ultima vez que ambos lados coincidieron
 *
 * Si solo cambio un lado, gana ese lado. Si cambiaron los dos desde la ultima
 * sincronizacion, es un conflicto y se le pregunta al usuario (INV-8).
 */

/** `cloud`: true = sincronizar, false = el usuario la apago, ausente = nunca se decidio. */
export interface LocalMeta { id: string; updatedAt: number; cloud?: boolean; syncedAt?: number }
export interface RemoteMeta { id: string; updatedAt: number }

export type SyncAction =
  | { id: string; kind: 'push' }          // subir este dispositivo a la nube
  | { id: string; kind: 'pull' }          // bajar la nube a este dispositivo
  | { id: string; kind: 'conflict' }      // cambiaron los dos lados: preguntar
  | { id: string; kind: 'remote-only' }   // esta en la nube y el usuario lo quito de aqui
  | { id: string; kind: 'none' }

/** Margen para relojes de dispositivos distintos y redondeos de la base (ms). */
const MARGEN = 1000

export function planSync(local: LocalMeta[], remote: RemoteMeta[], ignored: Set<string> = new Set()): SyncAction[] {
  const L = new Map(local.map((g) => [g.id, g]))
  const R = new Map(remote.map((g) => [g.id, g]))
  const ids = [...new Set([...L.keys(), ...R.keys()])].sort()
  return ids.map((id): SyncAction => {
    const l = L.get(id)
    const r = R.get(id)
    if (l && !r) return { id, kind: l.cloud ? 'push' : 'none' }
    if (!l && r) return { id, kind: ignored.has(id) ? 'remote-only' : 'pull' }
    // Los dos existen. Si el usuario apago la nube para este juego, no se toca.
    if (l!.cloud === false) return { id, kind: 'none' }
    const base = l!.syncedAt ?? -Infinity
    const cambioLocal = l!.updatedAt > base + MARGEN
    const cambioNube = r!.updatedAt > base + MARGEN
    if (Math.abs(l!.updatedAt - r!.updatedAt) <= MARGEN) return { id, kind: 'none' }  // ya coinciden
    if (cambioLocal && cambioNube) return { id, kind: 'conflict' }
    if (cambioLocal) return { id, kind: 'push' }
    if (cambioNube) return { id, kind: 'pull' }
    return { id, kind: 'none' }
  })
}
