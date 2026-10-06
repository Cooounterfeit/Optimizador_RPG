/**
 * Zenith Optimizer — Esquema de Plantilla de Juego v0.1
 * ------------------------------------------------------
 * Este archivo ES el contrato del sistema. Todo lo demas (motor, UI, parsers)
 * depende unicamente de estas estructuras, nunca de un juego concreto.
 *
 * Anadir un juego nuevo = escribir un GameTemplate. Cero cambios de codigo.
 */

export type StatId = string
export type SlotId = string
export type SetId = string

/** Una estadistica del juego (Vida, ATQ%, Prob. Critico, Defensa...). */
export interface StatDef {
  id: StatId
  name: string
  /** 'flat' se suma tal cual; 'percent' se muestra con %. */
  unit: 'flat' | 'percent'
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
  aggregate?: 'sum' | 'multiply'
  /**
   * PRESENTACION: grupo en la hoja de personaje ("Atributos", "Ofensiva",
   * "Defensa"...). El motor lo ignora.
   */
  group?: string
}

/** Una ranura de equipamiento (Flor, Casco, Accesorio 1...). */
export interface SlotDef {
  id: SlotId
  name: string
  /**
   * La ranura puede quedar vacia. Imprescindible cuando hay presupuestos: en
   * Elden Ring ir sin casco para caber en la carga es una build legitima.
   */
  optional?: boolean
}

/** Un escalon de bono de conjunto: N piezas otorgan estos efectos. */
export interface SetTier {
  pieces: number
  label: string
  effects: Record<StatId, number>
}

/** Familia de items que otorga bonos al vestir varias piezas. */
export interface SetDef {
  id: SetId
  name: string
  tiers: SetTier[]
}

/** Valor intermedio calculado, reutilizable por objetivos y otros derivados. */
export interface DerivedDef {
  id: string
  name: string
  formula: string
  /** PRESENTACION: grupo en la hoja de personaje. Sin grupo va a "Calculados". */
  group?: string
  /** PRESENTACION: unidad para mostrar ("%", "s"...). */
  unit?: string
  /**
   * Curva por tramos: "este atributo da tanto de esto". Se dibuja con puntos
   * (valor del atributo -> resultado) y entre puntos se interpola en linea
   * recta; fuera del rango se queda en el extremo (los topes blandos de los
   * Souls). El editor genera `formula` a partir de la curva, asi que el motor
   * no necesita nada especial: es un valor calculado mas.
   */
  curve?: CurveDef
}

export interface CurveDef {
  /** Clave del perfil que entra a la curva (ej: "vigor"). */
  input: string
  /** Pares [valor del atributo, resultado], ordenados por el primero. */
  points: [number, number][]
}

/**
 * Que se quiere maximizar.
 *
 * `kind` es informativo para la UI. Lo que el motor exige de verdad es
 * `monotonic`: si el objetivo es no-decreciente respecto de cada estadistica,
 * la cota superior optimista del branch and bound es valida y la poda es
 * matematicamente segura (ver optimizer.ts).
 */
export interface ObjectiveDef {
  id: string
  name: string
  description: string
  kind: 'linear' | 'nonlinear'
  formula: string
  /**
   * Pista del autor, solo informativa. El motor no se fia de ella: la
   * direccion del objetivo respecto de cada estadistica sale del analisis
   * simbolico de la formula (analysis.ts). Si la plantilla dice `true` y el
   * objetivo baja con alguna estadistica, el resultado avisa.
   */
  monotonic?: boolean
  unit?: string
  decimals?: number
}

/** Estado base del personaje antes de equipar nada. */
export interface BaseProfile {
  id: string
  name: string
  /** Clave del juego para buscar el icono (opcional, solo presentacion). */
  assetKey?: string
  /** Se exponen a las formulas con el prefijo `base_` (ej: base_atk). */
  base: Record<StatId, number>
  /**
   * PRESENTACION: claves de `base` que el jugador sube de nivel (Vigor,
   * Fuerza...). La hoja de personaje deja simularlas con + y −, como el menu
   * de subir de nivel de Dark Souls. Si no se indica, se ofrecen las claves que
   * coinciden con una estadistica declarada.
   */
  levelable?: string[]
  /** PRESENTACION: nombre visible de las claves de `base` que no son estadisticas. */
  labels?: Record<string, string>
}

/**
 * Caso de prueba que la propia plantilla declara.
 *
 * Es el mecanismo de confianza de un catalogo comunitario: el autor afirma
 * "con estas piezas y este perfil, el resultado debe ser este", y la plataforma
 * lo verifica sola. Una plantilla sin pruebas puede devolver numeros equivocados
 * con total confianza, que es peor que no tener herramienta.
 */
export interface SelfTest {
  name: string
  profileId: string
  objectiveId: string
  /** Exactamente una pieza por ranura. */
  items: Item[]
  expectScore?: number
  expectStats?: Record<StatId, number>
  tolerance?: number
  /** Habilidades elegidas durante la prueba (opcional). */
  skills?: SkillSelection
}

// ------------------------------------------------------- arbol de habilidades

/**
 * Un nodo de un arbol de habilidades. El autor del juego decide la forma: no
 * hay jerarquia impuesta, solo las reglas que el propio nodo declara.
 */
export interface SkillNode {
  /**
   * Identificador unico entre TODOS los arboles del juego. Se usa en las
   * formulas como `skill_<id>` (vale el rango elegido, 0 si no se eligio), asi
   * que solo admite letras sin tilde, numeros y guion bajo.
   */
  id: string
  name: string
  description?: string
  /** Puntos que cuesta cada rango. Por defecto 1. 0 = nodo gratuito. */
  cost?: number
  /** Rangos maximos. Por defecto 1. */
  maxRank?: number
  /** Hace falta tener TODOS estos nodos (con al menos un rango). */
  requires?: string[]
  /** Hace falta tener AL MENOS UNO de estos nodos. */
  requiresAny?: string[]
  /** Puntos que hay que haber gastado en el mismo arbol (en otros nodos) antes de tomarlo. */
  requiresPoints?: number
  /**
   * Eleccion excluyente: de todos los nodos con el mismo `choiceGroup` (en
   * cualquier arbol) solo uno puede tener rangos. Es el "elige uno de dos" de
   * World of Warcraft, o elegir una especializacion o una clase de heroe.
   */
  choiceGroup?: string
  /**
   * Efecto POR RANGO sobre las estadisticas declaradas, en el mismo formato que
   * `Item.stats`. Respeta el modo de cada estadistica: suma o multiplica.
   */
  effects?: Record<StatId, number>
  /** PRESENTACION: posicion en el editor visual. El motor la ignora. */
  x?: number
  y?: number
}

export interface SkillTreeDef {
  id: string
  name: string
  description?: string
  /** Puntos totales disponibles en este arbol. Sin valor = sin limite. */
  budget?: number
  /**
   * Si es true, un requisito solo cuenta cuando esa habilidad esta COMPLETA
   * (con todos sus rangos), como en World of Warcraft. Por defecto basta con
   * un rango.
   */
  requireFullRanks?: boolean
  nodes: SkillNode[]
}

/** Rango elegido por nodo: { golpeBrutal: 2, furia: 1 }. Lo que no aparece vale 0. */
export type SkillSelection = Record<string, number>

/** Plantilla completa de un juego. Es el unico input especifico del juego. */
export interface GameTemplate {
  schemaVersion: '0.1'
  gameId: string
  name: string
  description: string
  stats: StatDef[]
  slots: SlotDef[]
  sets: SetDef[]
  derived: DerivedDef[]
  objectives: ObjectiveDef[]
  baseProfiles: BaseProfile[]
  /** Estadisticas sobre las que la UI permite exigir un minimo (HU04). */
  constrainableStats: StatId[]
  /**
   * Estadisticas que funcionan como COSTE y traen un presupuesto por defecto.
   * Para ellas, menos es mejor: el filtro de dominancia invierte el sentido de
   * la comparacion.
   */
  budgets?: { statId: StatId; max: number; name?: string }[]
  /**
   * Contra que se comprueban los requisitos de las piezas (`Item.requires`).
   *
   *  'base'  (por defecto) contra el perfil base: la pieza se descarta antes de
   *          buscar si el perfil no llega.
   *  'final' contra las estadisticas FINALES de la build: un anillo de +5 de
   *          Fuerza puede habilitar el arma que pide 45. Las claves que no son
   *          estadisticas declaradas se siguen comprobando contra la base.
   */
  requirementsFrom?: 'base' | 'final'
  /** Casos que la plataforma ejecuta para verificar la plantilla. */
  selfTests?: SelfTest[]
  /** Arboles de habilidades del juego (opcional). */
  skillTrees?: SkillTreeDef[]
  /** Niveles del personaje y como crecen sus valores base (opcional). */
  leveling?: LevelingDef
  notes?: string
  /**
   * PRESENTACION. Nada de esto entra en el calculo: el motor ignora estos tres
   * campos por completo. Viven en la plantilla —y no en un almacen aparte—
   * porque en un catalogo comunitario la portada y la categoria son parte de lo
   * que se comparte: si viajaran por separado, una plantilla importada llegaria
   * sin cara.
   */
  cover?: string
  /** Categoria libre para el filtro lateral del catalogo. */
  category?: string
  /** Color de respaldo cuando no hay portada. */
  accent?: string
}

/** Una pieza de equipamiento concreta del inventario del usuario. */
export interface Item {
  id: string
  slot: SlotId
  /**
   * Otras ranuras donde tambien cabe. Un anillo que vale para Anillo 1 y
   * Anillo 2 se declara una vez con `slot: 'ring1', slots: ['ring2']`; el motor
   * garantiza que no se equipe dos veces y no explora las permutaciones.
   */
  slots?: SlotId[]
  setId: SetId | null
  name: string
  rarity?: number
  level?: number
  stats: Record<StatId, number>
  /**
   * Requisitos para poder equiparla, contra las estadisticas del perfil base.
   * Es el patron de Elden Ring, Dark Souls o cualquier RPG con requisitos:
   * "necesitas 40 de Fuerza". Las piezas que el perfil no cumple se descartan
   * antes de empezar a buscar.
   */
  requires?: Record<StatId, number>
  /**
   * Grupo de exclusion mutua: como mucho UNA pieza de cada grupo puede
   * equiparse a la vez, aunque haya varias ranuras compatibles. Resuelve el
   * problema del anillo repetido cuando varias ranuras comparten inventario.
   */
  exclusiveGroup?: string
}

/**
 * Restriccion dura sobre una estadistica.
 *
 *  min → tiene que llegar al menos a este valor (HU04).
 *  max → no puede pasarse de este valor. Es lo que modela un PRESUPUESTO:
 *        carga de equipo en Elden Ring, capacidad de gemas, peso, coste.
 *
 * Se pueden usar las dos a la vez para exigir una ventana.
 */
export interface Constraint {
  statId: StatId
  min?: number
  max?: number
}

export interface SolveRequest {
  template: GameTemplate
  items: Item[]
  profileId: string
  objectiveId: string
  constraints: Constraint[]
  topN: number
  /** Habilidades elegidas. Sus efectos se suman como una pieza fija mas. */
  skills?: SkillSelection
}

export interface BuildResult {
  score: number
  /** Una por ranura, en el orden de la plantilla. '' = ranura opcional vacia. */
  itemIds: string[]
  finalStats: Record<StatId, number>
  activeSets: { setId: SetId; name: string; pieces: number; tiers: string[] }[]
}

export interface SolveStats {
  /** Producto de candidatos por ranura tras el filtro de dominancia. */
  totalCombinations: number
  /** Espacio que quedo realmente por explorar tras el filtro por cota. */
  searchSpace: number
  /** Candidatos descartados porque su mejor caso no alcanzaba al top N. */
  boundFiltered: number
  /** Combinaciones completas efectivamente evaluadas. */
  evaluated: number
  /** Nodos del arbol descartados por cota superior o por restriccion. */
  pruned: number
  /** Items eliminados por dominancia antes de empezar. */
  dominated: number
  candidatesPerSlot: { slotId: SlotId; before: number; after: number }[]
  elapsedMs: number
  feasible: boolean
  /** false si la busqueda se detuvo por tiempo o cancelacion antes de terminar. */
  provenOptimal: boolean
  /** Estadisticas que el motor detecto que afectan al objetivo elegido. */
  relevantStats: string[]
  /**
   * Como se acoto el objetivo:
   *  'monotono'   → vector utopico evaluado en un punto (rapido).
   *  'intervalos' → aritmetica de intervalos sobre la caja del subarbol
   *                 (para objetivos no monotonos; igual de exacto, mas lento).
   */
  bound?: 'monotono' | 'intervalos'
  /**
   * Aviso cuando la plantilla declara `monotonic: true` y el motor encontro que
   * el objetivo baja al subir alguna estadistica. El motor ya se protegio
   * (acoto por intervalos); el aviso es para que el autor corrija la plantilla.
   */
  monotonicWarning?: string
  /** Ejes colapsados por entrar en el objetivo de forma identica. */
  mergedDimensions: number
  /** Piezas descartadas porque el perfil no cumple sus requisitos. */
  requirementFiltered: number
  /**
   * 'exacto'      → poda por cota; si termina, el optimo esta demostrado.
   * 'heuristico'  → ya no lo produce el motor (los objetivos no monotonos se
   *                 acotan por intervalos). Se conserva por compatibilidad con
   *                 resultados guardados.
   */
  mode: 'exacto' | 'heuristico'
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
  stoppedBy?: 'tiempo' | 'usuario'
}

export interface SolveResponse {
  builds: BuildResult[]
  stats: SolveStats
}

// ------------------------------------------------------------------ niveles

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
export interface LevelingDef {
  /** Clave de `base` que guarda el nivel actual. Por defecto "nivel". */
  levelKey?: string
  min: number
  max: number
  /**
   * Como se sube de nivel:
   *  - 'growth' (por defecto): los atributos crecen solos segun `growth`.
   *  - 'points': cada nivel da puntos que el jugador reparte entre los
   *    atributos de `points.attributes` (Souls, Elden Ring, Diablo...). Los
   *    atributos a su vez mueven otras cifras mediante formulas o curvas.
   *    `growth` puede seguir existiendo para lo que sube solo.
   */
  mode?: 'growth' | 'points'
  points?: {
    attributes: string[]
    /** Puntos por nivel. Por defecto 1. */
    perLevel?: number
    /** Tope de cada atributo (99 en los Souls). Sin tope si falta. */
    maxValue?: number
  }
  growth: Record<string, string>
}
