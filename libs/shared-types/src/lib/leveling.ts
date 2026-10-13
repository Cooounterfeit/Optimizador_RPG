import { z } from 'zod';

/**
 * Niveles del personaje y curvas de crecimiento (TEC-12, SIM-02..04).
 *
 * El nivel actual vive en el perfil, en `base[levelKey]`. Cada entrada de
 * `growth` dice cuanto SUBE una clave de `base` al pasar al nivel `nivel`
 * (de nivel-1 a nivel). Puede ser un numero ("2") o una formula con la
 * variable `nivel` y los valores base del perfil (`base_crecFuerza`), lo que
 * permite curvas distintas por clase o crecimiento que acelera con el nivel.
 *
 * Proyectar del nivel actual N al nivel L suma el crecimiento de N+1 a L.
 */
export const LevelingDefSchema = z.object({
  /** Clave de `base` que guarda el nivel actual. Por defecto "nivel". */
  levelKey: z.string().optional(),
  min: z.number(),
  max: z.number(),
  /**
   * Como se sube de nivel:
   *  - 'growth' (por defecto): los atributos crecen solos segun `growth`.
   *  - 'points': cada nivel da puntos que el jugador reparte entre los
   *    atributos de `points.attributes` (Souls, Elden Ring, Diablo...). Los
   *    atributos a su vez mueven otras cifras mediante formulas o curvas.
   *    `growth` puede seguir existiendo para lo que sube solo.
   */
  mode: z.enum(['growth', 'points']).optional(),
  points: z
    .object({
      attributes: z.array(z.string()),
      /** Puntos por nivel. Por defecto 1. */
      perLevel: z.number().optional(),
      /** Tope de cada atributo (99 en los Souls). Sin tope si falta. */
      maxValue: z.number().optional(),
    })
    .optional(),
  growth: z.record(z.string(), z.string()),
});

export type LevelingDef = z.infer<typeof LevelingDefSchema>;
