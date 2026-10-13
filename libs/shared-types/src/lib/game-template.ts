import { z } from 'zod';

import { ItemSchema } from './item.js';
import { LevelingDefSchema } from './leveling.js';
import { SkillSelectionSchema, SkillTreeDefSchema } from './skills.js';

/** Una estadistica del juego (Vida, ATQ%, Prob. Critico, Defensa...). */
export const StatDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 'flat' se suma tal cual; 'percent' se muestra con %. */
  unit: z.enum(['flat', 'percent']),
  /**
   * Como se combinan los aportes de varias piezas.
   *
   *  'sum'      (por defecto) se suman: 30 + 30 = 60.
   *  'multiply' se multiplican como factores: 30 y 30 dan 1,30 x 1,30 = 1,69.
   *
   * El segundo modo existe porque muchos juegos distinguen dos familias de
   * modificadores. En Path of Exile, "increased" suma e "increased" y "more"
   * multiplica; tratar los "more" como sumas da resultados equivocados.
   *
   * Ojo: una estadistica 'multiply' llega a las formulas ya como MULTIPLICADOR
   * (1,69), no como porcentaje. Se escribe `dano * more`, no `dano * (1 + more/100)`.
   */
  aggregate: z.enum(['sum', 'multiply']).optional(),
  /**
   * PRESENTACION: grupo en la hoja de personaje ("Atributos", "Ofensiva",
   * "Defensa"...). El motor lo ignora.
   */
  group: z.string().optional(),
});

export type StatDef = z.infer<typeof StatDefSchema>;

/** Una ranura de equipamiento (Flor, Casco, Accesorio 1...). */
export const SlotDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  /**
   * La ranura puede quedar vacia. Imprescindible cuando hay presupuestos: en
   * Elden Ring ir sin casco para caber en la carga es una build legitima.
   */
  optional: z.boolean().optional(),
});

export type SlotDef = z.infer<typeof SlotDefSchema>;

/** Un escalon de bono de conjunto: N piezas otorgan estos efectos. */
export const SetTierSchema = z.object({
  pieces: z.number(),
  label: z.string(),
  effects: z.record(z.string(), z.number()),
});

export type SetTier = z.infer<typeof SetTierSchema>;

/** Familia de items que otorga bonos al vestir varias piezas. */
export const SetDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  tiers: z.array(SetTierSchema),
});

export type SetDef = z.infer<typeof SetDefSchema>;

export const CurveDefSchema = z.object({
  /** Clave del perfil que entra a la curva (ej: "vigor"). */
  input: z.string(),
  /** Pares [valor del atributo, resultado], ordenados por el primero. */
  points: z.array(z.tuple([z.number(), z.number()])),
});

export type CurveDef = z.infer<typeof CurveDefSchema>;

/** Valor intermedio calculado, reutilizable por objetivos y otros derivados. */
export const DerivedDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  formula: z.string(),
  /** PRESENTACION: grupo en la hoja de personaje. Sin grupo va a "Calculados". */
  group: z.string().optional(),
  /** PRESENTACION: unidad para mostrar ("%", "s"...). */
  unit: z.string().optional(),
  /**
   * Curva por tramos: "este atributo da tanto de esto". Se dibuja con puntos
   * (valor del atributo -> resultado) y entre puntos se interpola en linea
   * recta; fuera del rango se queda en el extremo (los topes blandos de los
   * Souls). El editor genera `formula` a partir de la curva, asi que el motor
   * no necesita nada especial: es un valor calculado mas.
   */
  curve: CurveDefSchema.optional(),
});

export type DerivedDef = z.infer<typeof DerivedDefSchema>;

/**
 * Que se quiere maximizar.
 *
 * `kind` es informativo para la UI. Lo que el motor exige de verdad es
 * `monotonic`: si el objetivo es no-decreciente respecto de cada estadistica,
 * la cota superior optimista del branch and bound es valida y la poda es
 * matematicamente segura (ver optimizer.ts).
 */
export const ObjectiveDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  kind: z.enum(['linear', 'nonlinear']),
  formula: z.string(),
  /**
   * Pista del autor, solo informativa. El motor no se fia de ella: la
   * direccion del objetivo respecto de cada estadistica sale del analisis
   * simbolico de la formula (analysis.ts). Si la plantilla dice `true` y el
   * objetivo baja con alguna estadistica, el resultado avisa.
   */
  monotonic: z.boolean().optional(),
  unit: z.string().optional(),
  decimals: z.number().optional(),
});

export type ObjectiveDef = z.infer<typeof ObjectiveDefSchema>;

/** Estado base del personaje antes de equipar nada. */
export const BaseProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Clave del juego para buscar el icono (opcional, solo presentacion). */
  assetKey: z.string().optional(),
  /** Se exponen a las formulas con el prefijo `base_` (ej: base_atk). */
  base: z.record(z.string(), z.number()),
  /**
   * PRESENTACION: claves de `base` que el jugador sube de nivel (Vigor,
   * Fuerza...). La hoja de personaje deja simularlas con + y −, como el menu
   * de subir de nivel de Dark Souls. Si no se indica, se ofrecen las claves que
   * coinciden con una estadistica declarada.
   */
  levelable: z.array(z.string()).optional(),
  /** PRESENTACION: nombre visible de las claves de `base` que no son estadisticas. */
  labels: z.record(z.string(), z.string()).optional(),
});

export type BaseProfile = z.infer<typeof BaseProfileSchema>;

/**
 * Caso de prueba que la propia plantilla declara.
 *
 * Es el mecanismo de confianza de un catalogo comunitario: el autor afirma
 * "con estas piezas y este perfil, el resultado debe ser este", y la plataforma
 * lo verifica sola. Una plantilla sin pruebas puede devolver numeros equivocados
 * con total confianza, que es peor que no tener herramienta.
 */
export const SelfTestSchema = z.object({
  name: z.string(),
  profileId: z.string(),
  objectiveId: z.string(),
  /** Exactamente una pieza por ranura. */
  items: z.array(ItemSchema),
  expectScore: z.number().optional(),
  expectStats: z.record(z.string(), z.number()).optional(),
  tolerance: z.number().optional(),
  /** Habilidades elegidas durante la prueba (opcional). */
  skills: SkillSelectionSchema.optional(),
});

export type SelfTest = z.infer<typeof SelfTestSchema>;

/** Plantilla completa de un juego. Es el unico input especifico del juego. */
export const GameTemplateSchema = z.object({
  schemaVersion: z.literal('0.1'),
  gameId: z.string(),
  name: z.string(),
  description: z.string(),
  stats: z.array(StatDefSchema),
  slots: z.array(SlotDefSchema),
  sets: z.array(SetDefSchema),
  derived: z.array(DerivedDefSchema),
  objectives: z.array(ObjectiveDefSchema),
  baseProfiles: z.array(BaseProfileSchema),
  /** Estadisticas sobre las que la UI permite exigir un minimo (HU04). */
  constrainableStats: z.array(z.string()),
  /**
   * Estadisticas que funcionan como COSTE y traen un presupuesto por defecto.
   * Para ellas, menos es mejor: el filtro de dominancia invierte el sentido de
   * la comparacion.
   */
  budgets: z
    .array(
      z.object({
        statId: z.string(),
        max: z.number(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  /**
   * Contra que se comprueban los requisitos de las piezas (`Item.requires`).
   *
   *  'base'  (por defecto) contra el perfil base: la pieza se descarta antes de
   *          buscar si el perfil no llega.
   *  'final' contra las estadisticas FINALES de la build: un anillo de +5 de
   *          Fuerza puede habilitar el arma que pide 45. Las claves que no son
   *          estadisticas declaradas se siguen comprobando contra la base.
   */
  requirementsFrom: z.enum(['base', 'final']).optional(),
  /** Casos que la plataforma ejecuta para verificar la plantilla. */
  selfTests: z.array(SelfTestSchema).optional(),
  /** Arboles de habilidades del juego (opcional). */
  skillTrees: z.array(SkillTreeDefSchema).optional(),
  /** Niveles del personaje y como crecen sus valores base (opcional). */
  leveling: LevelingDefSchema.optional(),
  notes: z.string().optional(),
  /**
   * PRESENTACION. Nada de esto entra en el calculo: el motor ignora estos tres
   * campos por completo. Viven en la plantilla —y no en un almacen aparte—
   * porque en un catalogo comunitario la portada y la categoria son parte de lo
   * que se comparte: si viajaran por separado, una plantilla importada llegaria
   * sin cara.
   */
  cover: z.string().optional(),
  /** Categoria libre para el filtro lateral del catalogo. */
  category: z.string().optional(),
  /** Color de respaldo cuando no hay portada. */
  accent: z.string().optional(),
});

export type GameTemplate = z.infer<typeof GameTemplateSchema>;
