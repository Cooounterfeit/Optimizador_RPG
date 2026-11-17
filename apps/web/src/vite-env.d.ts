/// <reference types="vite/client" />

/**
 * Variables de entorno del frontend. Vite las hornea en el bundle durante el
 * build, asi que son publicas: nunca poner secretos con prefijo VITE_.
 *
 * La anon key de Supabase es publica por diseno; la proteccion real son las
 * politicas RLS de la base de datos.
 */
interface ImportMetaEnv {
  /** URL del proyecto Supabase. Vacia desactiva el cliente real. */
  readonly VITE_SUPABASE_URL?: string;
  /** Anon key publica de Supabase. Vacia desactiva el cliente real. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "1" fuerza fixtures locales aunque existan las credenciales. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
