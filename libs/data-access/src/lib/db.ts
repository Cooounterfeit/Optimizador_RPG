import Dexie, { type Table } from 'dexie';

import type { Equipment, GameTemplate, Item, SkillSelection } from '@zenith/shared-types';

/** Una pieza del inventario local, atada al juego al que pertenece. */
export interface InventoryRow extends Item {
  gameId: string;
  updatedAt: number;
}

/** Preferencia suelta (ZO-54: `local_settings` con key y value). */
export interface SettingRow {
  key: string;
  value: unknown;
}

/**
 * Cache local de un optimizador publicado. La fuente de verdad es Supabase
 * (`optimizers`); aca solo se guarda una copia para leer sin red.
 */
export interface GameRow {
  id: string;
  template: GameTemplate;
  updatedAt: number;
  forkedFrom?: string;
  cloud?: boolean;
  syncedAt?: number;
}

/** Equipo puesto por un personaje (perfil) de un juego. */
export interface EquipmentRow {
  gameId: string;
  profileId: string;
  slots: Equipment;
  updatedAt: number;
}

/** Valores base de un perfil que el jugador cambio subiendo de nivel. */
export interface ProfileBaseRow {
  gameId: string;
  profileId: string;
  base: Record<string, number>;
  updatedAt: number;
}

/** Un nivel registrado del historial de estadisticas (SIM-03). */
export interface LevelRow {
  gameId: string;
  profileId: string;
  level: number;
  base: Record<string, number>;
  at: string;
}

/** Habilidades elegidas en un juego (SIM-05). */
export interface SkillsRow {
  gameId: string;
  selection: SkillSelection;
}

/** Imagen de un objeto o retrato, por juego y clave normalizada. */
export interface ImageRow {
  id: string;
  gameId: string;
  key: string;
  data: string;
  updatedAt: number;
}

/** Base local del navegador. Una sola instancia por nombre. */
export class ZenithDatabase extends Dexie {
  local_inventory!: Table<InventoryRow, string>;
  local_settings!: Table<SettingRow, string>;
  games!: Table<GameRow, string>;
  equipment!: Table<EquipmentRow, [string, string]>;
  profile_base!: Table<ProfileBaseRow, [string, string]>;
  level_history!: Table<LevelRow, [string, string, number]>;
  skills!: Table<SkillsRow, string>;
  images!: Table<ImageRow, string>;

  constructor(name = 'zenith') {
    super(name);
    this.version(1).stores({
      local_inventory: 'id, gameId, slot, updatedAt',
      local_settings: 'key',
      games: 'id, updatedAt',
      equipment: '[gameId+profileId], gameId',
      level_history: '[gameId+profileId+level], gameId',
      skills: 'gameId',
      images: 'id, gameId, key',
    });
    this.version(2).stores({
      profile_base: '[gameId+profileId], gameId',
    });
  }
}

/** Fabrica de bases: las pruebas usan un nombre propio para no compartir estado. */
export const createDb = (name = 'zenith'): ZenithDatabase => new ZenithDatabase(name);

/** Instancia de la app. */
export const db = createDb();
