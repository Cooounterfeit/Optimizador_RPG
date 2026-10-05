import { useEffect, useState } from 'react'

/**
 * "Modo avanzado": muestra los detalles del motor (metricas de poda, historias
 * de usuario, diagrama de formulas). Apagado por defecto: al jugador le basta
 * con el resultado; la demo del proyecto lo enciende con un clic.
 *
 * Se recuerda en este navegador y se sincroniza entre componentes abiertos.
 */
const KEY = 'zenith.modoAvanzado'
const EVENTO = 'zenith:modo-avanzado'

function leer(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function useAdvanced(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(leer)
  useEffect(() => {
    const sync = () => setOn(leer())
    window.addEventListener(EVENTO, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVENTO, sync); window.removeEventListener('storage', sync) }
  }, [])
  const set = (v: boolean) => {
    try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* sin almacenamiento: vale para esta sesion */ }
    setOn(v)
    window.dispatchEvent(new Event(EVENTO))
  }
  return [on, set]
}
