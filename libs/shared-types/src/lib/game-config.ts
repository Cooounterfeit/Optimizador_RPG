import { z } from 'zod';

/**
 * Version del contrato de configuracion de juego.
 * Todo cambio incompatible debe incrementar esta version.
 */
export const GAME_SCHEMA_VERSION = '0.1.0';

/**
 * Esquema base de una configuracion de juego.
 * Es un esqueleto: se amplia con stats, slots, tags, formulas y constraints (TEC-07).
 */
export const GameConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().default(GAME_SCHEMA_VERSION),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;
