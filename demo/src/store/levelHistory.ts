/**
 * Historial de estadisticas por nivel (SIM-03), por juego y perfil, en este
 * navegador. Un registro por nivel: si se vuelve a registrar el mismo nivel,
 * reemplaza al anterior. Cuando exista Supabase, esto pasa a una tabla
 * `historial_estadisticas (usuario, juego, perfil, nivel, valores, fecha)`.
 */
export interface LevelSnapshot {
  level: number
  /** Valores base del perfil en ese nivel. */
  base: Record<string, number>
  /** ISO 8601. */
  at: string
}

const KEY = (gameId: string, profileId: string) => `zenith.historial.v1.${gameId}.${profileId}`

const valido = (s: unknown): s is LevelSnapshot =>
  !!s && typeof s === 'object' &&
  Number.isFinite((s as LevelSnapshot).level) &&
  !!(s as LevelSnapshot).base && typeof (s as LevelSnapshot).base === 'object' &&
  typeof (s as LevelSnapshot).at === 'string'

/** Registros ordenados por nivel ascendente. */
export function loadHistory(gameId: string, profileId: string): LevelSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY(gameId, profileId))
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter(valido).sort((a, b) => a.level - b.level) : []
  } catch {
    return []
  }
}

function save(gameId: string, profileId: string, list: LevelSnapshot[]) {
  try { localStorage.setItem(KEY(gameId, profileId), JSON.stringify(list)) } catch { /* sin espacio */ }
}

/** Guarda (o reemplaza) el registro de un nivel y devuelve la lista nueva. */
export function recordLevel(gameId: string, profileId: string, level: number, base: Record<string, number>): LevelSnapshot[] {
  const list = loadHistory(gameId, profileId).filter((s) => s.level !== level)
  list.push({ level, base: { ...base }, at: new Date().toISOString() })
  list.sort((a, b) => a.level - b.level)
  save(gameId, profileId, list)
  return list
}

export function removeLevel(gameId: string, profileId: string, level: number): LevelSnapshot[] {
  const list = loadHistory(gameId, profileId).filter((s) => s.level !== level)
  save(gameId, profileId, list)
  return list
}

export function clearHistory(gameId: string, profileId: string): void {
  try { localStorage.removeItem(KEY(gameId, profileId)) } catch { /* nada */ }
}
