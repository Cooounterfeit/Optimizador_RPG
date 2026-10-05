/**
 * Equipo puesto en la hoja de personaje, por juego (en este navegador).
 * Ranura -> id de la pieza ('' = vacia).
 */
const KEY = (gameId: string) => `zenith.equipo.v1.${gameId}`

export type Equipment = Record<string, string>

export function loadEquipment(gameId: string): Equipment {
  try {
    const raw = localStorage.getItem(KEY(gameId))
    const v = raw ? JSON.parse(raw) : {}
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

export function saveEquipment(gameId: string, eq: Equipment): void {
  try { localStorage.setItem(KEY(gameId), JSON.stringify(eq)) } catch { /* sin espacio: vale para esta sesion */ }
}
