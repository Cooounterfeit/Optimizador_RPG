/**
 * Sesion y perfil (AUT-1, AUT-2, AUT-3)
 * =====================================
 * Un contexto con la sesion de Supabase y el perfil publico del usuario. Las
 * funciones devuelven mensajes listos para mostrar, con los textos del Jira.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, setRemember } from './supabase'
import type { ProfileRow } from './database.types'

export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string; campo?: string }

interface AuthValue {
  configured: boolean
  /** true mientras se recupera la sesion guardada al abrir la app. */
  loading: boolean
  session: Session | null
  profile: ProfileRow | null
  /** El usuario llego desde el correo de recuperacion: debe elegir contrasena nueva. */
  recovering: boolean
  signUp: (nombre: string, email: string, password: string) => Promise<Resultado>
  signIn: (email: string, password: string, recordar: boolean) => Promise<Resultado>
  signOut: () => Promise<void>
  sendReset: (email: string) => Promise<Resultado>
  setNewPassword: (password: string) => Promise<Resultado>
  updateProfile: (patch: { display_name?: string; bio?: string }) => Promise<Resultado>
  uploadAvatar: (file: File) => Promise<Resultado>
  removeAvatar: () => Promise<Resultado>
}

const Ctx = createContext<AuthValue | null>(null)

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Contrasena segura (AUT-1): 8 o mas caracteres, con letras y numeros. */
export function passwordProblem(p: string): string | null {
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(p) || !/\d/.test(p)) return 'La contraseña debe combinar letras y números.'
  return null
}

function traducir(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) return 'Correo o contraseña incorrectos'
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user_already_exists')) return 'Ya existe una cuenta con este correo'
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de entrar: te enviamos un enlace.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a probar.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con el servidor. Revisa tu internet.'
  if (m.includes('password should be')) return 'La contraseña es demasiado débil.'
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(!!supabase)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s)
      if (evento === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!supabase || !uid) { setProfile(null); return }
    let vivo = true
    supabase.from('profiles').select('*').eq('id', uid).single().then(({ data }) => { if (vivo) setProfile(data ?? null) })
    return () => { vivo = false }
  }, [uid])

  const value = useMemo<AuthValue>(() => ({
    configured: !!supabase,
    loading,
    session,
    profile,
    recovering,

    async signUp(nombre, email, password) {
      if (!supabase) return { ok: false, error: 'La nube no está configurada.' }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { display_name: nombre.trim() }, emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}` },
      })
      if (error) return { ok: false, error: traducir(error.message), campo: /correo/.test(traducir(error.message)) ? 'email' : undefined }
      // Con la confirmacion por correo activa, Supabase no revela si el correo ya
      // existia: responde un usuario sin identidades. Se trata como duplicado.
      if (data.user && (data.user.identities?.length ?? 0) === 0) return { ok: false, error: 'Ya existe una cuenta con este correo', campo: 'email' }
      if (!data.session) return { ok: true, mensaje: '¡Tu cuenta ha sido creada! Revisa tu correo para confirmarla y luego inicia sesión.' }
      return { ok: true, mensaje: '¡Tu cuenta ha sido creada!' }
    },

    async signIn(email, password, recordar) {
      if (!supabase) return { ok: false, error: 'La nube no está configurada.' }
      setRemember(recordar)
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      return error ? { ok: false, error: traducir(error.message) } : { ok: true }
    },

    async signOut() {
      if (!supabase) return
      await supabase.auth.signOut()
      setProfile(null)
    },

    async sendReset(email) {
      if (!supabase) return { ok: false, error: 'La nube no está configurada.' }
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${location.origin}${import.meta.env.BASE_URL}restablecer`,
      })
      // Mismo mensaje exista o no la cuenta: no se revela que correos estan registrados.
      return error && !/not found/i.test(error.message)
        ? { ok: false, error: traducir(error.message) }
        : { ok: true, mensaje: 'Si el correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva.' }
    },

    async setNewPassword(password) {
      if (!supabase) return { ok: false, error: 'La nube no está configurada.' }
      const problema = passwordProblem(password)
      if (problema) return { ok: false, error: problema, campo: 'password' }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return { ok: false, error: traducir(error.message) }
      setRecovering(false)
      return { ok: true, mensaje: 'Contraseña actualizada.' }
    },

    async updateProfile(patch) {
      if (!supabase || !uid) return { ok: false, error: 'Inicia sesión para editar tu perfil.' }
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid).select('*').single()
      if (error) return { ok: false, error: traducir(error.message) }
      setProfile(data)
      return { ok: true, mensaje: 'Perfil actualizado' }
    },

    async uploadAvatar(file) {
      if (!supabase || !uid) return { ok: false, error: 'Inicia sesión para cambiar tu foto.' }
      let blob: Blob
      try { blob = await cuadrado(file, 256) } catch (e) { return { ok: false, error: (e as Error).message } }
      const path = `${uid}/avatar.webp`
      const up = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '60' })
      if (up.error) return { ok: false, error: traducir(up.error.message) }
      // El parametro v evita que el navegador muestre la foto anterior en cache.
      const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
      const { data, error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid).select('*').single()
      if (error) return { ok: false, error: traducir(error.message) }
      setProfile(data)
      return { ok: true, mensaje: 'Perfil actualizado' }
    },

    async removeAvatar() {
      if (!supabase || !uid) return { ok: false, error: 'Inicia sesión para cambiar tu foto.' }
      await supabase.storage.from('avatars').remove([`${uid}/avatar.webp`])
      const { data, error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', uid).select('*').single()
      if (error) return { ok: false, error: traducir(error.message) }
      setProfile(data)
      return { ok: true, mensaje: 'Perfil actualizado' }
    },
  }), [loading, session, profile, recovering, uid])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuera de AuthProvider')
  return v
}

/** Recorta al centro y reduce a un cuadrado de `size` px en WebP (fotos de perfil livianas). */
function cuadrado(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('El archivo no es una imagen.')); return }
    const img = new Image()
    const src = URL.createObjectURL(file)
    img.onload = () => {
      const lado = Math.min(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = size; c.height = size
      c.getContext('2d')!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, size, size)
      URL.revokeObjectURL(src)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen.'))), 'image/webp', 0.86)
    }
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('No se pudo leer la imagen.')) }
    img.src = src
  })
}
