/**
 * Cliente de Supabase (TEC-01)
 * ============================
 * Se crea solo si existen VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (archivo
 * .env). Sin ellas la app funciona igual que antes, todo en el navegador, y las
 * pantallas de cuenta explican como activarla. Asi la demo nunca se rompe por
 * falta de configuracion.
 *
 * "Recordarme" (AUT-2): la sesion se guarda en localStorage si el usuario lo
 * marca (sobrevive a cerrar el navegador) o en sessionStorage si no.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const RECORDAR = 'zenith.recordarSesion'

export function setRemember(v: boolean): void {
  try { localStorage.setItem(RECORDAR, v ? '1' : '0') } catch { /* sin almacenamiento */ }
}
const remember = () => { try { return localStorage.getItem(RECORDAR) !== '0' } catch { return true } }

/** Guarda la sesion donde corresponde segun "Recordarme", y la busca en ambos lados. */
const storage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => {
    try {
      if (remember()) { localStorage.setItem(k, v); sessionStorage.removeItem(k) }
      else { sessionStorage.setItem(k, v); localStorage.removeItem(k) }
    } catch { /* modo privado */ }
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k) } catch { /* nada */ } },
}

export const supabase: SupabaseClient<Database> | null = url && anonKey
  ? createClient<Database>(url, anonKey, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export const cloudConfigured = supabase !== null
