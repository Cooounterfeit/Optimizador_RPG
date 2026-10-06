/**
 * Sincronizacion de "Mis juegos" con la nube (INV-8, TEC-08)
 * ==========================================================
 * - Al iniciar sesion: compara este dispositivo con la nube (planSync) y
 *   sube, baja o marca conflictos.
 * - Al guardar un juego con la nube activa: lo sube al momento.
 * - Cambios desde otro dispositivo: llegan en vivo por Realtime y se bajan.
 * - Conflictos: no se resuelven solos; el usuario elige en su perfil.
 *
 * Lo que viaja: la plantilla, los objetos y el estado del personaje (equipo y
 * habilidades elegidas). Las imagenes propias siguen en este navegador.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { CloudInventoryRow, Json } from './database.types'
import { planSync, type SyncAction } from './syncPlan'
import {
  getUserGame, listUserGames, onUserGamesChanged, putUserGame, setCloudMarks, type UserGame,
} from '../store/userGames'
import { loadEquipment, saveEquipment } from '../store/equipment'
import { loadSelection, saveSelection } from '../store/skillSelection'
import type { GameTemplate, Item } from '../core/types'

export type CloudGame = Pick<CloudInventoryRow, 'game_key' | 'game_name' | 'client_updated_at' | 'updated_at'> & { items_count: number }

export interface SyncState {
  status: 'off' | 'syncing' | 'ok' | 'error'
  error: string | null
  /** La plataforma exige suscripcion y el usuario no la tiene: la nube es de solo lectura. */
  readOnly: boolean
  conflicts: string[]
  /** Juegos que estan en la nube pero no en este dispositivo. */
  remoteOnly: CloudGame[]
  remote: CloudGame[]
  lastSync: number | null
}

const IGNORADOS = 'zenith.nube.ignorados'
const leerIgnorados = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(IGNORADOS) ?? '[]')) } catch { return new Set() } }
const guardarIgnorados = (s: Set<string>) => { try { localStorage.setItem(IGNORADOS, JSON.stringify([...s])) } catch { /* nada */ } }

let state: SyncState = { status: 'off', error: null, readOnly: false, conflicts: [], remoteOnly: [], remote: [], lastSync: null }
const oyentes = new Set<(s: SyncState) => void>()
const set = (patch: Partial<SyncState>) => { state = { ...state, ...patch }; oyentes.forEach((fn) => fn(state)) }
export const getSyncState = () => state
export function onSyncState(fn: (s: SyncState) => void): () => void { oyentes.add(fn); return () => { oyentes.delete(fn) } }

// Borrar un juego de este dispositivo no lo borra de la nube, pero tampoco debe
// volver a bajarse solo en la proxima sincronizacion.
onUserGamesChanged((c) => { if (c.kind === 'delete' && c.source === 'local') ignoreRemote(c.id) })

let uid: string | null = null
let canal: RealtimeChannel | null = null
let dejarDeOir: (() => void) | null = null

const t = (iso: string) => new Date(iso).getTime()

function mensaje(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/row-level security|permission denied/i.test(m)) return 'Tu plan no permite modificar la copia en la nube. Lo ya guardado sigue disponible para leer y descargar.'
  if (/failed to fetch|network/i.test(m)) return 'Sin conexión con la nube. Los cambios quedan en este dispositivo y se suben al volver.'
  return m
}

// ----------------------------------------------------------- ciclo de vida

/** Empieza a sincronizar para el usuario `id` (al iniciar sesion). */
export async function startSync(id: string): Promise<void> {
  if (!supabase || uid === id) return
  stopSync()
  uid = id
  dejarDeOir = onUserGamesChanged((c) => {
    if (c.source !== 'local' || c.kind !== 'save') return
    const g = getUserGame(c.id)
    if (g?.cloud) void push(g)
  })
  canal = supabase.channel(`cloud-${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cloud_inventory', filter: `user_id=eq.${id}` }, () => { void syncAll() })
    .subscribe()
  await syncAll()
}

export function stopSync(): void {
  dejarDeOir?.(); dejarDeOir = null
  if (canal && supabase) void supabase.removeChannel(canal)
  canal = null
  uid = null
  set({ status: 'off', error: null, conflicts: [], remoteOnly: [], remote: [], lastSync: null })
}

// ----------------------------------------------------------- operaciones

async function listRemote(): Promise<CloudGame[]> {
  const { data, error } = await supabase!.from('cloud_inventory')
    .select('game_key, game_name, client_updated_at, updated_at, items')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    game_key: r.game_key, game_name: r.game_name, client_updated_at: r.client_updated_at, updated_at: r.updated_at,
    items_count: Array.isArray(r.items) ? r.items.length : 0,
  }))
}

// Una sola pasada a la vez; si piden otra mientras corre, se hace una mas al final.
let corriendo: Promise<void> | null = null
let pendiente = false

/** Compara todo y aplica lo que no necesita preguntar. */
export async function syncAll(): Promise<void> {
  if (corriendo) { pendiente = true; return corriendo }
  corriendo = (async () => {
    do { pendiente = false; await pasada() } while (pendiente)
  })().finally(() => { corriendo = null })
  return corriendo
}

async function pasada(): Promise<void> {
  if (!supabase || !uid) return
  set({ status: 'syncing', error: null })
  try {
    const { data: puede } = await supabase.rpc('can_write_cloud')
    const remote = await listRemote()
    const local = listUserGames()
    const ignorados = leerIgnorados()
    const plan = planSync(
      local.map((g) => ({ id: g.id, updatedAt: g.updatedAt, cloud: g.cloud, syncedAt: g.syncedAt })),
      remote.map((r) => ({ id: r.game_key, updatedAt: t(r.client_updated_at) })),
      ignorados,
    )
    const conflicts: string[] = []
    for (const a of plan) {
      if (a.kind === 'push' && puede !== false) await push(local.find((g) => g.id === a.id)!, { quiet: true })
      else if (a.kind === 'pull') await pull(a.id)
      else if (a.kind === 'conflict') conflicts.push(a.id)
      else if (a.kind === 'none') {
        const g = local.find((x) => x.id === a.id)
        const r = remote.find((x) => x.game_key === a.id)
        // Ya coinciden pero este dispositivo no lo sabia: se marca como sincronizado.
        if (g && r && g.cloud !== false && (!g.cloud || g.syncedAt !== g.updatedAt)) setCloudMarks(g.id, { cloud: true, syncedAt: g.updatedAt })
      }
    }
    const remote2 = await listRemote()
    const enLocal = new Set(listUserGames().map((g) => g.id))
    set({
      status: 'ok', readOnly: puede === false, conflicts, remote: remote2,
      remoteOnly: remote2.filter((r) => !enLocal.has(r.game_key)), lastSync: Date.now(),
    })
  } catch (e) {
    set({ status: 'error', error: mensaje(e) })
  }
}

function estadoDe(id: string): Json {
  return { equipo: loadEquipment(id), habilidades: loadSelection(id) } as unknown as Json
}

/** Sube un juego de este dispositivo a la nube. */
export async function push(g: UserGame, opts: { quiet?: boolean } = {}): Promise<boolean> {
  if (!supabase || !uid) return false
  const { error } = await supabase.from('cloud_inventory').upsert({
    game_key: g.id,
    game_name: g.template.name.slice(0, 80) || g.id,
    template: g.template as unknown as Json,
    items: g.items as unknown as Json,
    state: estadoDe(g.id),
    forked_from: g.forkedFrom ?? null,
    client_updated_at: new Date(g.updatedAt).toISOString(),
  } as never, { onConflict: 'user_id,game_key' })
  if (error) {
    set({ status: 'error', error: mensaje(error), readOnly: /row-level security|permission denied/i.test(error.message) || state.readOnly })
    return false
  }
  setCloudMarks(g.id, { cloud: true, syncedAt: g.updatedAt })
  if (!opts.quiet) set({ status: 'ok', error: null, lastSync: Date.now(), conflicts: state.conflicts.filter((c) => c !== g.id) })
  return true
}

/** Baja un juego de la nube a este dispositivo (lo crea o lo reemplaza). */
export async function pull(id: string): Promise<boolean> {
  if (!supabase || !uid) return false
  const { data, error } = await supabase.from('cloud_inventory').select('*').eq('game_key', id).single()
  if (error || !data) { set({ status: 'error', error: mensaje(error ?? 'No se encontró el juego en la nube.') }); return false }
  const updatedAt = t(data.client_updated_at)
  putUserGame({
    id, template: data.template as unknown as GameTemplate, items: data.items as unknown as Item[],
    forkedFrom: data.forked_from ?? undefined, updatedAt, cloud: true, syncedAt: updatedAt,
  })
  const st = (data.state ?? {}) as { equipo?: Record<string, string>; habilidades?: Record<string, number> }
  if (st.equipo && typeof st.equipo === 'object') saveEquipment(id, st.equipo)
  if (st.habilidades && typeof st.habilidades === 'object') saveSelection(id, st.habilidades)
  const ign = leerIgnorados(); if (ign.delete(id)) guardarIgnorados(ign)
  set({ conflicts: state.conflicts.filter((c) => c !== id), remoteOnly: state.remoteOnly.filter((r) => r.game_key !== id) })
  return true
}

/** Activa o apaga la copia en la nube de un juego. Apagarla no borra lo que ya esta arriba. */
export async function setCloud(id: string, on: boolean): Promise<void> {
  const g = getUserGame(id)
  if (!g) return
  if (!on) { setCloudMarks(id, { cloud: false, syncedAt: g.syncedAt }); set({}); return }
  setCloudMarks(id, { cloud: true, syncedAt: g.syncedAt })
  await syncAll()
}

/** Resuelve un conflicto quedandose con un lado. */
export async function resolveConflict(id: string, keep: 'local' | 'cloud'): Promise<void> {
  if (keep === 'cloud') await pull(id)
  else { const g = getUserGame(id); if (g) await push(g) }
  await syncAll()
}

/** Borra la copia de la nube (lo local no se toca). */
export async function deleteRemote(id: string): Promise<void> {
  if (!supabase || !uid) return
  const { error } = await supabase.from('cloud_inventory').delete().eq('game_key', id)
  if (error) { set({ status: 'error', error: mensaje(error) }); return }
  const g = getUserGame(id)
  if (g) setCloudMarks(id, { cloud: false, syncedAt: undefined })
  await syncAll()
}

/** Al borrar un juego de este dispositivo, no se vuelve a bajar solo. */
export function ignoreRemote(id: string): void {
  const s = leerIgnorados(); s.add(id); guardarIgnorados(s)
}

/** Paquete .zenith.json de un juego de la nube, para descargarlo (INV-8). */
export async function cloudPackage(id: string): Promise<{ template: unknown; items: unknown } | null> {
  if (!supabase) return null
  const { data } = await supabase.from('cloud_inventory').select('template, items').eq('game_key', id).single()
  return data ? { template: data.template, items: data.items } : null
}

export type { SyncAction }
