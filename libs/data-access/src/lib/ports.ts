import type { Equipment, GameTemplate, Item, SkillSelection } from '@zenith/shared-types';

import type { GameRow } from './db.js';

/** Datos que se guardan de un juego. Las marcas de nube son opcionales. */
export interface GameInput {
  id: string;
  template: GameTemplate;
  forkedFrom?: string;
  cloud?: boolean;
  syncedAt?: number;
}

/** Puerto de optimizadores. En F5 lo implementa Supabase; localmente es cache. */
export interface GameRepository {
  list(): Promise<GameRow[]>;
  get(id: string): Promise<GameRow | undefined>;
  save(game: GameInput): Promise<GameRow>;
  remove(id: string): Promise<void>;
  /** Borra el inventario, equipo, historial, habilidades e imágenes de un juego. */
  clearLocalData(gameId: string): Promise<void>;
}

/** CRUD del inventario local (ZO-55). */
export interface InventoryRepository {
  addItem(item: Item, gameId: string): Promise<void>;
  getAll(gameId?: string): Promise<Item[]>;
  getById(id: string): Promise<Item | undefined>;
  updateItem(item: Item, gameId: string): Promise<void>;
  removeItem(id: string): Promise<void>;
  searchItems(query: string, gameId?: string): Promise<Item[]>;
  removeByGame(gameId: string): Promise<void>;
}

/** Equipo puesto, por juego y perfil (personaje). */
export interface EquipmentRepository {
  get(gameId: string, profileId: string): Promise<Equipment>;
  save(gameId: string, profileId: string, slots: Equipment): Promise<void>;
  removeProfile(gameId: string, profileId: string): Promise<void>;
  removeByGame(gameId: string): Promise<void>;
}

/** Historial de estadisticas por nivel (SIM-03). */
export interface LevelHistoryRepository {
  list(gameId: string, profileId: string): Promise<LevelSnapshot[]>;
  recordLevel(
    gameId: string,
    profileId: string,
    level: number,
    base: Record<string, number>,
  ): Promise<LevelSnapshot[]>;
  removeLevel(gameId: string, profileId: string, level: number): Promise<LevelSnapshot[]>;
  clear(gameId: string, profileId: string): Promise<void>;
}

export interface LevelSnapshot {
  level: number;
  base: Record<string, number>;
  at: string;
}

/** Habilidades elegidas en un juego (SIM-05). */
export interface SkillsRepository {
  load(gameId: string): Promise<SkillSelection>;
  save(gameId: string, selection: SkillSelection): Promise<void>;
}

/** Imagenes de objetos y retratos. */
export interface ImagesRepository {
  get(gameId: string): Promise<ImageMap>;
  set(gameId: string, key: string, data: string): Promise<void>;
  remove(gameId: string, key: string): Promise<void>;
  import(gameId: string, images: ImageMap): Promise<number>;
  removeByGame(gameId: string): Promise<void>;
  copy(fromGameId: string, toGameId: string): Promise<void>;
}

export type ImageMap = Record<string, string>;

/** Preferencias sueltas (`local_settings`). */
export interface SettingsRepository {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}
