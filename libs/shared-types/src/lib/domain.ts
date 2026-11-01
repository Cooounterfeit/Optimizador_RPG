/**
 * Tipos de dominio de la aplicacion (TEC-07).
 *
 * `database.types.ts` lo genera Supabase y se sobrescribe. Este archivo es
 * nuestro y expone nombres estables para el resto del codigo.
 */
import type { Database } from './database.types.js';
import type { Item } from './item.js';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Optimizer = Database['public']['Tables']['optimizers']['Row'];
export type Vote = Database['public']['Tables']['votes']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

/** Una pieza del inventario del jugador. Mismo contrato que `Item`. */
export type InventoryItem = Item;

/** Una pieza guardada en el navegador (Dexie). Mismo contrato que `Item`. */
export type LocalInventoryItem = Item;
