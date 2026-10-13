import { z } from 'zod';

/** Una pieza de equipamiento concreta del inventario del usuario. */
export const ItemSchema = z.object({
  id: z.string(),
  slot: z.string(),
  /**
   * Otras ranuras donde tambien cabe. Un anillo que vale para Anillo 1 y
   * Anillo 2 se declara una vez con `slot: 'ring1', slots: ['ring2']`; el motor
   * garantiza que no se equipe dos veces y no explora las permutaciones.
   */
  slots: z.array(z.string()).optional(),
  setId: z.string().nullable(),
  name: z.string(),
  rarity: z.number().optional(),
  level: z.number().optional(),
  stats: z.record(z.string(), z.number()),
  /**
   * Requisitos para poder equiparla, contra las estadisticas del perfil base.
   * Es el patron de Elden Ring, Dark Souls o cualquier RPG con requisitos:
   * "necesitas 40 de Fuerza". Las piezas que el perfil no cumple se descartan
   * antes de empezar a buscar.
   */
  requires: z.record(z.string(), z.number()).optional(),
  /**
   * Grupo de exclusion mutua: como mucho UNA pieza de cada grupo puede
   * equiparse a la vez, aunque haya varias ranuras compatibles. Resuelve el
   * problema del anillo repetido cuando varias ranuras comparten inventario.
   */
  exclusiveGroup: z.string().optional(),
});

export type Item = z.infer<typeof ItemSchema>;
