/**
 * Habilidades elegidas por juego, guardadas en este navegador.
 * Cuando haya cuentas, esto pasa al perfil del usuario; las vistas no cambian.
 */
import type { SkillSelection } from '../core/types'

const KEY = (gameId: string) => `zenith.skills.v1.${gameId}`

export function loadSelection(gameId: string): SkillSelection {
  try {
    const raw = localStorage.getItem(KEY(gameId))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function saveSelection(gameId: string, sel: SkillSelection): void {
  try {
    if (Object.keys(sel).length === 0) localStorage.removeItem(KEY(gameId))
    else localStorage.setItem(KEY(gameId), JSON.stringify(sel))
  } catch { /* sin espacio o modo privado: la seleccion vale para esta sesion */ }
}
