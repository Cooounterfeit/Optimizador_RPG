/** Un arma dentro de un catalogo gacha. */
export interface GachaWeapon {
  key: string;
  name: string;
  rarity: number;
  type: string | null;
  maxLevel: number;
  atk?: number;
  sub?: { stat: string; value: number } | null;
  init?: { v: number; c: string } | null;
  subInit?: { stat: string; v: number; c: string; pct: boolean } | null;
  ascAtk?: number[];
}

/** Datos de un genero gacha, guardados en `template.extensions.gacha`. */
export interface GachaCatalog {
  kind: 'gacha';
  weaponSlot?: string;
  weapons: GachaWeapon[];
  curves: Record<string, Record<string, number>>;
}

/** Apunta al catalogo publicado junto al optimizador. */
export interface GachaPointer {
  kind: 'gacha';
  catalogUrl: string;
  catalogVersion?: string;
  weaponSlot?: string;
}

/** Resumen para la pantalla de catalogo. */
export interface WeaponSummary {
  key: string;
  name: string;
  rarity: number;
  type: string | null;
  maxLevel: number;
}

/** Subestadistica de un artefacto en el formato GOOD. */
export interface GoodSubstat {
  key: string;
  value: number;
}

export interface GoodArtifact {
  setKey: string;
  rarity: number;
  level: number;
  slotKey: string;
  mainStatKey: string;
  substats: GoodSubstat[];
  id?: string;
  location?: string;
}

export interface GoodWeapon {
  key: string;
  level?: number;
  ascension?: number;
  refinement?: number;
  location?: string;
  id?: string;
}

export interface GoodFile {
  format?: string;
  artifacts?: GoodArtifact[];
  weapons?: GoodWeapon[];
}
