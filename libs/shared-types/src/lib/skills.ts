import { z } from 'zod';

/**
 * Un nodo de un arbol de habilidades. El autor del juego decide la forma: no
 * hay jerarquia impuesta, solo las reglas que el propio nodo declara.
 */
export const SkillNodeSchema = z.object({
  /**
   * Identificador unico entre TODOS los arboles del juego. Se usa en las
   * formulas como `skill_<id>` (vale el rango elegido, 0 si no se eligio), asi
   * que solo admite letras sin tilde, numeros y guion bajo.
   */
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** Puntos que cuesta cada rango. Por defecto 1. 0 = nodo gratuito. */
  cost: z.number().optional(),
  /** Rangos maximos. Por defecto 1. */
  maxRank: z.number().optional(),
  /** Hace falta tener TODOS estos nodos (con al menos un rango). */
  requires: z.array(z.string()).optional(),
  /** Hace falta tener AL MENOS UNO de estos nodos. */
  requiresAny: z.array(z.string()).optional(),
  /** Puntos que hay que haber gastado en el mismo arbol (en otros nodos) antes de tomarlo. */
  requiresPoints: z.number().optional(),
  /**
   * Eleccion excluyente: de todos los nodos con el mismo `choiceGroup` (en
   * cualquier arbol) solo uno puede tener rangos. Es el "elige uno de dos" de
   * World of Warcraft, o elegir una especializacion o una clase de heroe.
   */
  choiceGroup: z.string().optional(),
  /**
   * Efecto POR RANGO sobre las estadisticas declaradas, en el mismo formato que
   * `Item.stats`. Respeta el modo de cada estadistica: suma o multiplica.
   */
  effects: z.record(z.string(), z.number()).optional(),
  /** PRESENTACION: posicion en el editor visual. El motor la ignora. */
  x: z.number().optional(),
  y: z.number().optional(),
});

export type SkillNode = z.infer<typeof SkillNodeSchema>;

export const SkillTreeDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** Puntos totales disponibles en este arbol. Sin valor = sin limite. */
  budget: z.number().optional(),
  /**
   * Si es true, un requisito solo cuenta cuando esa habilidad esta COMPLETA
   * (con todos sus rangos), como en World of Warcraft. Por defecto basta con
   * un rango.
   */
  requireFullRanks: z.boolean().optional(),
  nodes: z.array(SkillNodeSchema),
});

export type SkillTreeDef = z.infer<typeof SkillTreeDefSchema>;

/** Rango elegido por nodo: { golpeBrutal: 2, furia: 1 }. Lo que no aparece vale 0. */
export const SkillSelectionSchema = z.record(z.string(), z.number());

export type SkillSelection = z.infer<typeof SkillSelectionSchema>;
