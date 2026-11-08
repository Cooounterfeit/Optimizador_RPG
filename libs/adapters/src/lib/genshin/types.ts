/** Forma de las entradas de `genshin.data.json` que usa el adaptador. */
export interface GiWeapon {
  name: string;
  icon: string;
  rarity: number;
  type: string | null;
  atk: number;
  maxLevel: number;
  sub: { stat: string; value: number } | null;
  init: { v: number; c: string } | null;
  subInit: { stat: string; v: number; c: string; pct: boolean } | null;
  ascAtk: number[];
}

export interface GiData {
  characters: Record<string, unknown>;
  weapons: Record<string, GiWeapon>;
  weaponCurves: Record<string, Record<string, number>>;
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
