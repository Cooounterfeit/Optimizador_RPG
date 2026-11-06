import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente unico de Supabase (F5).
 *
 * Sin VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY la app arranca en modo mock:
 * el hub usa fixtures y las pantallas de cuenta muestran un aviso. Nunca se
 * incluye la service_role: la clave publicable es publica por diseno y viaja al
 * navegador; lo que protege los datos es RLS.
 *
 * La sesion es la unica excepcion a "nada de localStorage": el token no es dato
 * de dominio, se lee al arrancar y Supabase lo rota. Con "Recordarme" marcado
 * vive en localStorage; sin marcar, en sessionStorage (se pierde al cerrar la
 * pestana). Ningun otro dato del jugador se guarda ahi.
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
/** Fuerza el modo mock (preview local, e2e); util cuando .env.local existe. */
const useMocks = import.meta.env.VITE_USE_MOCKS === '1';

const REMEMBER_KEY = 'zenith.remember-session';

export function setRememberSession(value: boolean): void {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? '1' : '0');
  } catch {
    // modo privado o almacenamiento bloqueado: vale para esta sesion
  }
}

export function rememberSession(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
}

const sessionStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (rememberSession()) {
        localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      // sin almacenamiento: la sesion dura lo que dure esta pagina
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // nada que limpiar
    }
  },
};

export const isSupabaseConfigured = !useMocks && Boolean(url && anonKey);

export const supabase: SupabaseClient | null =
  !useMocks && url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
