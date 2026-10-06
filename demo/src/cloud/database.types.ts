/**
 * Tipos de la base de datos de Supabase (TEC-01, TEC-07).
 *
 * Son `type` y no `interface` a proposito: supabase-js exige filas indexables.
 * Escritos a mano con el mismo formato que genera `supabase gen types
 * typescript`, a partir de supabase/migrations. Cuando el proyecto este
 * enlazado, se pueden regenerar con:
 *   npx supabase gen types typescript --project-id <id> > src/cloud/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Tabla<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

export type ProfileRow = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export type SubscriptionRow = {
  user_id: string
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'expired'
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export type OptimizerRow = {
  id: string
  author_id: string
  game_name: string
  name: string
  description: string
  template: Json
  sample_items: Json
  published: boolean
  forked_from: string | null
  score: number
  votes_count: number
  created_at: string
  updated_at: string
}

export type VoteRow = { user_id: string; optimizer_id: string; value: -1 | 1; created_at: string; updated_at: string }
export type FavoriteRow = { user_id: string; optimizer_id: string; created_at: string }
export type ReportRow = {
  id: string
  reporter_id: string
  optimizer_id: string
  reason: 'contenido_inapropiado' | 'spam' | 'datos_falsos' | 'copia' | 'otro'
  detail: string
  status: 'open' | 'reviewed' | 'dismissed'
  created_at: string
}

export type CloudInventoryRow = {
  user_id: string
  game_key: string
  game_name: string
  template: Json
  items: Json
  state: Json
  forked_from: string | null
  client_updated_at: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: Tabla<ProfileRow, Pick<ProfileRow, 'id' | 'display_name'> & Partial<ProfileRow>, Partial<Pick<ProfileRow, 'display_name' | 'avatar_url' | 'bio'>>>
      subscriptions: Tabla<SubscriptionRow, never, never>
      app_settings: Tabla<{ id: boolean; cloud_requires_subscription: boolean }, never, never>
      optimizers: Tabla<OptimizerRow,
        Pick<OptimizerRow, 'game_name' | 'name' | 'template'> & Partial<Pick<OptimizerRow, 'description' | 'sample_items' | 'published' | 'forked_from'>>,
        Partial<Pick<OptimizerRow, 'game_name' | 'name' | 'description' | 'template' | 'sample_items' | 'published'>>>
      votes: Tabla<VoteRow, Pick<VoteRow, 'optimizer_id' | 'value'>, Pick<VoteRow, 'value'>>
      favorites: Tabla<FavoriteRow, Pick<FavoriteRow, 'optimizer_id'>, never>
      reports: Tabla<ReportRow, Pick<ReportRow, 'optimizer_id' | 'reason'> & Partial<Pick<ReportRow, 'detail'>>, Pick<ReportRow, 'status'>>
      cloud_inventory: Tabla<CloudInventoryRow,
        Pick<CloudInventoryRow, 'game_key' | 'game_name' | 'template' | 'client_updated_at'> & Partial<Pick<CloudInventoryRow, 'items' | 'state' | 'forked_from'>>,
        Partial<Pick<CloudInventoryRow, 'game_name' | 'template' | 'items' | 'state' | 'forked_from' | 'client_updated_at'>>>
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      can_write_cloud: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
