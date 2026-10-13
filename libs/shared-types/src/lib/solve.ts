import { z } from 'zod';

import { GameTemplateSchema } from './game-template.js';
import { ItemSchema } from './item.js';
import { SkillSelectionSchema } from './skills.js';

/**
 * Restriccion dura sobre una estadistica.
 *
 *  min → tiene que llegar al menos a este valor (HU04).
 *  max → no puede pasarse de este valor. Es lo que modela un PRESUPUESTO:
 *        carga de equipo en Elden Ring, capacidad de gemas, peso, coste.
 *
 * Se pueden usar las dos a la vez para exigir una ventana.
 */
export const ConstraintSchema = z.object({
  statId: z.string(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export type Constraint = z.infer<typeof ConstraintSchema>;

export const SolveRequestSchema = z.object({
  template: GameTemplateSchema,
  items: z.array(ItemSchema),
  profileId: z.string(),
  objectiveId: z.string(),
  constraints: z.array(ConstraintSchema),
  topN: z.number(),
  /** Habilidades elegidas. Sus efectos se suman como una pieza fija mas. */
  skills: SkillSelectionSchema.optional(),
});

export type SolveRequest = z.infer<typeof SolveRequestSchema>;

export const BuildResultSchema = z.object({
  score: z.number(),
  /** Una por ranura, en el orden de la plantilla. '' = ranura opcional vacia. */
  itemIds: z.array(z.string()),
  finalStats: z.record(z.string(), z.number()),
  activeSets: z.array(
    z.object({
      setId: z.string(),
      name: z.string(),
      pieces: z.number(),
      tiers: z.array(z.string()),
    }),
  ),
});

export type BuildResult = z.infer<typeof BuildResultSchema>;

export const SolveStatsSchema = z.object({
  /** Producto de candidatos por ranura tras el filtro de dominancia. */
  totalCombinations: z.number(),
  /** Espacio que quedo realmente por explorar tras el filtro por cota. */
  searchSpace: z.number(),
  /** Candidatos descartados porque su mejor caso no alcanzaba al top N. */
  boundFiltered: z.number(),
  /** Combinaciones completas efectivamente evaluadas. */
  evaluated: z.number(),
  /** Nodos del arbol descartados por cota superior o por restriccion. */
  pruned: z.number(),
  /** Items eliminados por dominancia antes de empezar. */
  dominated: z.number(),
  candidatesPerSlot: z.array(
    z.object({
      slotId: z.string(),
      before: z.number(),
      after: z.number(),
    }),
  ),
  elapsedMs: z.number(),
  feasible: z.boolean(),
  /** false si la busqueda se detuvo por tiempo o cancelacion antes de terminar. */
  provenOptimal: z.boolean(),
  /** Estadisticas que el motor detecto que afectan al objetivo elegido. */
  relevantStats: z.array(z.string()),
  /**
   * Como se acoto el objetivo:
   *  'monotono'   → vector utopico evaluado en un punto (rapido).
   *  'intervalos' → aritmetica de intervalos sobre la caja del subarbol
   *                 (para objetivos no monotonos; igual de exacto, mas lento).
   */
  bound: z.enum(['monotono', 'intervalos']).optional(),
  /**
   * Aviso cuando la plantilla declara `monotonic: true` y el motor encontro que
   * el objetivo baja al subir alguna estadistica. El motor ya se protegio
   * (acoto por intervalos); el aviso es para que el autor corrija la plantilla.
   */
  monotonicWarning: z.string().optional(),
  /** Ejes colapsados por entrar en el objetivo de forma identica. */
  mergedDimensions: z.number(),
  /** Piezas descartadas porque el perfil no cumple sus requisitos. */
  requirementFiltered: z.number(),
  /**
   * 'exacto'      → poda por cota; si termina, el optimo esta demostrado.
   * 'heuristico'  → ya no lo produce el motor (los objetivos no monotonos se
   *                 acotan por intervalos). Se conserva por compatibilidad con
   *                 resultados guardados.
   */
  mode: z.enum(['exacto', 'heuristico']),
  /**
   * Por que se paro antes de agotar el arbol, si es que se paro.
   *
   *  undefined  → termino sola: el arbol se recorrio entero.
   *  'tiempo'   → se alcanzo el limite configurado.
   *  'usuario'  → alguien pulso Detener.
   *
   * Importa distinguirlos porque el mensaje al usuario es distinto: un limite
   * alcanzado sugiere subirlo o restringir mas; una parada manual no sugiere
   * nada, la decision ya fue suya.
   */
  stoppedBy: z.enum(['tiempo', 'usuario']).optional(),
});

export type SolveStats = z.infer<typeof SolveStatsSchema>;

export const SolveResponseSchema = z.object({
  builds: z.array(BuildResultSchema),
  stats: SolveStatsSchema,
});

export type SolveResponse = z.infer<typeof SolveResponseSchema>;
